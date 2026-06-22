'use strict';

module.exports = function createWriteMemory(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'write_memory',
    description: 'Write structured data to shared memory for other agents to read. Supports namespaced scopes (global, task, agent) with optional TTL and automatic versioning.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key identifier' },
        value: { type: 'object', description: 'Structured JSON data to store' },
        scope: { type: 'string', enum: ['global', 'task', 'agent'], default: 'global', description: 'Visibility scope' },
        scope_id: { type: 'string', description: 'Task ID or agent ID when scope is not global' },
        ttl_seconds: { type: 'number', description: 'Optional time-to-live in seconds' },
        agent_id: { type: 'string', description: 'The writing agent ID' }
      },
      required: ['key', 'value', 'agent_id']
    },
    handler: async (args, extra) => {
      const { key, value, scope = 'global', scope_id, ttl_seconds, agent_id } = args;
      if (!key || !agent_id) throw new Error('key and agent_id are required');

      const orch = OrchestrationDB.getInstance();
      const fullScope = scope_id ? `${scope}:${scope_id}` : scope;

      const result = await orch.writeMemory(key, fullScope, value, agent_id, scope === 'task' ? scope_id : null, ttl_seconds);

      orch.emitEvent('memory_updated', { key, scope: fullScope }, agent_id);
      return result;
    }
  };
};
