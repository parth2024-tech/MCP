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
        output: { type: 'object', description: 'Structured output data from the task' },
        status: { type: 'string', enum: ['completed', 'failed'], description: 'Final status' },
        failure_reason: { type: 'string', description: 'Reason for failure (when status is failed)' }
      },
      required: ['agent_id', 'task_id', 'status']
    },
    handler: async (args, extra) => {
      const { agent_id, task_id, output = {}, status, failure_reason } = args;
      if (!agent_id || !task_id || !status) {
        throw new Error('agent_id, task_id, and status are required');
      }

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      db.transaction(() => {
        // Verify agent ownership
        const task = db.prepare(
          `SELECT * FROM tasks WHERE id = ? AND assigned_to = ?`
        ).get(task_id, agent_id);

        if (!task) {
          throw new Error(`Agent ${agent_id} does not own task ${task_id}`);
        }

        // Update task status
        db.prepare(`
          UPDATE tasks SET
            status = ?,
            output = ?,
            completed_at = unixepoch()
          WHERE id = ?
        `).run(status, JSON.stringify({ ...output, failure_reason }), task_id);

        // Write output to shared memory for downstream agents
        if (status === 'completed') {
          db.prepare(`
            INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id)
            VALUES (?, 'global', ?, ?, ?)
          `).run(`task_output:${task_id}`, JSON.stringify(output), agent_id, task_id);
        }
      })();

      // Find newly unblocked downstream tasks
      const unblocked = db.prepare(`
        SELECT t.id, t.title FROM tasks t
        JOIN task_dependencies d ON d.downstream_task_id = t.id
        WHERE d.upstream_task_id = ?
          AND t.status = 'pending'
          AND NOT EXISTS (
            SELECT 1 FROM task_dependencies d2
            JOIN tasks dep ON dep.id = d2.upstream_task_id
            WHERE d2.downstream_task_id = t.id
              AND dep.status != 'completed'
          )
      `).all(task_id);

      // Emit event
      orch.emitEvent(
        status === 'completed' ? 'task_completed' : 'task_failed',
        { task_id, agent_id, unblocked_tasks: unblocked, failure_reason },
        agent_id,
        task_id
      );

      return { task_id, status, unblocked_tasks: unblocked };
    }
  };
};
