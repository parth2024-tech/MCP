'use strict';

module.exports = function createClaimTask(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'claim_task',
    description: 'Claim the next available task from the orchestration task graph. Returns the task details if one is available, or indicates no work is available. Tasks are only claimable when all upstream dependencies are completed.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Unique identifier for the claiming agent' },
        skill_affinity: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional skill IDs to prefer tasks matching these skills'
        }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, skill_affinity = [] } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();

      // Check if system is degraded
      try {
        const redis = orch.getRedisClient();
        const isDegraded = await redis.get('ase:system_degraded') === 'true';
        if (isDegraded) {
          try {
            const { httpContextStorage } = require('../transports/http-keepalive');
            if (httpContextStorage) {
              const store = httpContextStorage.getStore();
              if (store && store.res) {
                store.res.setHeader('Retry-After', '30');
              }
            }
          } catch (e) {}

          return {
            error_code: 'SERVICE_DEGRADED',
            message: 'System is currently degraded due to metrics threshold breach. task claiming is paused.',
            retry_after: 30,
            retryable: true
          };
        }
      } catch (err) {}

      const task = await orch.claimTask(agent_id, skill_affinity);

      if (!task) {
        return { status: 'no_work_available' };
      }

      orch.emitEvent('task_claimed', { task_id: task.id, agent_id }, agent_id, task.id);
      return task;
    }
  };
};
