'use strict';

module.exports = function createHeartbeat(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'heartbeat',
    description: 'Agent liveness ping. Call every 30 seconds to prevent timeout recovery. Also performs dead agent detection and recovery: releases file locks, requeues tasks, and emits agent_timeout events for crashed agents.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent ID' },
        current_task_id: { type: 'string', description: 'ID of the task you are currently working on' }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, current_task_id } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();

      await orch.registerAgentHeartbeat(agent_id, current_task_id);

      const recoveredAgents = await orch.recoverDeadAgents();

      if (recoveredAgents.length > 0) {
        for (const deadId of recoveredAgents) {
          orch.emitEvent(
            'agent_timeout',
            { dead_agent: deadId, tasks_requeued: true },
            'orchestrator'
          );
        }
      }

      return {
        status: 'alive',
        recovered_agents: recoveredAgents,
      };
    }
  };
};
