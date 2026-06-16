import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class PreemptTaskTool extends BaseTool<any> {
  name = 'preempt_task';
  description = 'Suspend a lower-priority claimed task and return it to pending, using a higher-priority task context.';

  schema = z.object({
    task_id: z.string().describe('The ID of the claimed task to preempt'),
    reason: z.string().describe('The reason for preemption'),
    preempting_task_id: z.string().optional().describe('Optional. The ID of the higher-priority task initiating preemption')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { task_id, reason, preempting_task_id } = args;
    const dbManager = context.container.resolve<any>('OrchestrationDB');
    const redis = await dbManager.getRedisClient();
    const db = dbManager.getDB();

    // 1. Retrieve target task
    const targetTaskData = await redis.get(`ase:task:${task_id}`);
    if (!targetTaskData) {
      throw new Error(`Target task not found: ${task_id}`);
    }
    const targetTask = JSON.parse(targetTaskData);

    // 2. Check if target task is claimed or running
    if (targetTask.status !== 'claimed' && targetTask.status !== 'running') {
      throw new Error(`Target task ${task_id} is not in a preemptible state (current status: ${targetTask.status})`);
    }

    const targetPriority = targetTask.priority || 0;

    // 3. Determine preempting priority
    let callingAgentId = context.extra?.agentId;
    let preemptingPriority = 0;
    let finalPreemptingTaskId = preempting_task_id;

    if (finalPreemptingTaskId) {
      const pTaskData = await redis.get(`ase:task:${finalPreemptingTaskId}`);
      if (!pTaskData) {
        throw new Error(`Preempting task not found: ${finalPreemptingTaskId}`);
      }
      preemptingPriority = JSON.parse(pTaskData).priority || 0;
    } else if (callingAgentId) {
      // Find tasks assigned to calling agent that are claimed/running
      const tasks = db.prepare("SELECT id, priority FROM tasks WHERE assigned_to = ? AND status IN ('claimed', 'running')").all(callingAgentId);
      if (tasks.length > 0) {
        let maxPriority = -1;
        let maxId = '';
        for (const t of tasks) {
          if (t.priority > maxPriority) {
            maxPriority = t.priority;
            maxId = t.id;
          }
        }
        preemptingPriority = maxPriority;
        finalPreemptingTaskId = maxId;
      }
    }

    if (!finalPreemptingTaskId) {
      throw new Error('Preemption unauthorized: No active task associated with the calling agent or provided via preempting_task_id.');
    }

    if (preemptingPriority <= targetPriority) {
      throw new Error(`Preemption unauthorized: Preempting task priority (${preemptingPriority}) is not higher than target task priority (${targetPriority}).`);
    }

    // 4. Perform preemption: return target task to pending
    const multi = redis.multi();
    multi.srem('ase:tasks:claimed', task_id);
    multi.srem('ase:tasks:running', task_id);
    multi.sadd('ase:tasks:pending', task_id);

    const updatedTask = {
      ...targetTask,
      status: 'pending',
      assigned_to: null,
      claimed_at: null,
      timeout_at: null
    };
    multi.set(`ase:task:${task_id}`, JSON.stringify(updatedTask));
    await multi.exec();

    db.prepare(`
      UPDATE tasks SET
        status = 'pending',
        assigned_to = NULL,
        claimed_at = NULL,
        timeout_at = NULL
      WHERE id = ?
    `).run(task_id);

    // 5. Emit event
    dbManager.emitEvent('task_preempted', {
      task_id,
      preempted_by_agent: callingAgentId,
      preempting_task_id: finalPreemptingTaskId,
      reason
    }, callingAgentId, task_id);

    return {
      success: true,
      preempted_task_id: task_id,
      status: 'pending',
      preempted_by_agent: callingAgentId,
      preempting_task_id: finalPreemptingTaskId,
      reason
    };
  }
}
