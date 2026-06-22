'use strict';

module.exports = function createCompleteTask(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'complete_task',
    description: 'Mark a claimed task as completed or failed. Writes structured output to shared memory for downstream agents. Returns list of newly unblocked downstream tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The agent completing the task' },
        task_id: { type: 'string', description: 'The task ID to complete' },
        validate_output_id: { type: 'string', description: 'The run ID of a green validation run' },
        output: { type: 'object', description: 'Structured output data from the task' },
        status: { type: 'string', enum: ['completed', 'failed'], description: 'Final status' },
        failure_reason: { type: 'string', description: 'Reason for failure (when status is failed)' },
        dry_run: { type: 'boolean', default: false, description: 'Optional. Run validation but do not commit results' }
      },
      required: ['agent_id', 'task_id', 'status', 'validate_output_id']
    },
    handler: async (args, extra) => {
      const { agent_id, task_id, validate_output_id, output = {}, status, failure_reason, dry_run = false } = args;
      if (!agent_id || !task_id || !status || !validate_output_id) {
        throw new Error('agent_id, task_id, status, and validate_output_id are required');
      }

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      const loopState = await orch.getLoopState(task_id);
      const loop5 = loopState.taskLoops.find(l => l.loop_number === 5);

      if (!loop5 || !loop5.completed_at) {
        throw new Error(`Task cannot be completed — only ${loopState.taskLoops.length}/5 loops have run. Call run_task_loop for loops ${loopState.taskLoops.length + 1} through 5 before completing.`);
      }

      const validationRun = db.prepare(
        `SELECT passed FROM validation_runs WHERE id = ?`
      ).get(validate_output_id);

      if (!validationRun) {
        throw new Error(`Validation run ${validate_output_id} not found`);
      }

      let targetStatus = status;
      if (status === 'completed') {
        if (!validationRun.passed) {
          targetStatus = 'needs_revision';
        }
      }

      const unblocked = [];
      if (targetStatus === 'completed') {
        const redis = await orch.getRedisClient();
        const downstreamIds = await redis.smembers(`ase:task:blocked_by:${task_id}`);
        for (const downId of downstreamIds) {
          const upstreamIds = await redis.smembers(`ase:task:depends_on:${downId}`);
          let allCompleted = true;
          for (const upId of upstreamIds) {
            if (upId === task_id) {
              continue;
            }
            const isCompleted = await redis.sismember('ase:tasks:completed', upId);
            if (!isCompleted) {
              allCompleted = false;
              break;
            }
          }
          if (allCompleted) {
            const downTaskData = await redis.get(`ase:task:${downId}`);
            if (downTaskData) {
              const downTask = JSON.parse(downTaskData);
              unblocked.push({ id: downId, title: downTask.title });
            }
          }
        }
      }

      if (dry_run) {
        return {
          status: 'DRY_RUN_PREVIEW',
          task_id,
          target_status: targetStatus,
          would_unblock: unblocked
        };
      }

      const updatedTask = await orch.completeTask(task_id, agent_id, targetStatus, output, failure_reason);

      orch.emitEvent(
        targetStatus === 'completed' ? 'task_completed' : 'task_failed',
        { task_id, agent_id, unblocked_tasks: unblocked, failure_reason, validation_status: targetStatus === 'completed' ? 'passed' : 'failed' },
        agent_id,
        task_id
      );

      return { task_id, status: targetStatus, unblocked_tasks: unblocked };
    }
  };
};
