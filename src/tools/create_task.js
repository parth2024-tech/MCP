'use strict';

const crypto = require('crypto');

module.exports = function createCreateTask(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'create_task',
    description: 'Create a new task in the orchestration task graph. Specify dependencies to build a DAG of work items that agents can claim and complete autonomously.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the task' },
        description: { type: 'string', description: 'Detailed description of the work to be done' },
        depends_on: { type: 'array', items: { type: 'string' }, description: 'Array of upstream task IDs that must complete before this task can be claimed' },
        blocks: { type: 'array', items: { type: 'string' }, description: 'Array of downstream task IDs that this task blocks' },
        skill_ids: { type: 'array', items: { type: 'string' }, description: 'Array of skill IDs relevant to this task' },
        priority: { type: 'number', minimum: 1, maximum: 10, default: 5, description: 'Task priority (1-10, with 10 being highest)' }
      },
      required: ['title']
    },
    handler: async (args, extra) => {
      const { title, description = '', depends_on = [], blocks = [], skill_ids = [], priority = 5 } = args;
      if (priority < 1 || priority > 10) {
        throw new Error('Priority must be between 1 and 10');
      }
      const orch = OrchestrationDB.getInstance();
      const taskId = crypto.randomUUID();

      const redis = await orch.getRedisClient();
      for (const depId of depends_on) {
        const exists = await redis.exists(`ase:task:${depId}`);
        if (!exists) {
          throw new Error(`Dependency task not found: ${depId}`);
        }
      }

      const result = await orch.createTask(taskId, title, description, depends_on, blocks, skill_ids, priority);

      orch.emitEvent('task_created', { task_id: taskId, title }, null, taskId);
      return result;
    }
  };
};
