'use strict';

module.exports = function createWriteMemory(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'write_memory',
    description: `Write structured data to shared memory for other agents to read.

Supports namespaced scopes (global, task, agent) with optional TTL and automatic versioning.

Fix 7 — Optimistic concurrency control (CAS):
  Pass the version number you last read as \`expected_version\` to opt into
  compare-and-swap enforcement. If another agent has written since your last
  read, the write is rejected with conflict=true, the current version, and
  the current value so you can merge and retry.
  Omit expected_version for unconditional (last-writer-wins) writes.`,
    inputSchema: {
      type: 'object',
      properties: {
        key:              { type: 'string',  description: 'Memory key identifier' },
        value:            { type: 'object',  description: 'Structured JSON data to store' },
        scope:            { type: 'string',  enum: ['global', 'task', 'agent'], default: 'global', description: 'Visibility scope' },
        scope_id:         { type: 'string',  description: 'Task ID or agent ID when scope is not global' },
        ttl_seconds:      { type: 'number',  description: 'Optional time-to-live in seconds' },
        agent_id:         { type: 'string',  description: 'The writing agent ID' },
        expected_version: {
          type: 'number',
          description:
            'Optional. If provided, the write is conditional on the current version matching this value. ' +
            'Use the version returned by read_memory or a prior write_memory response. ' +
            'On mismatch, returns { conflict: true, current_version, current_value } — read, merge, and retry. ' +
            'Omit for unconditional writes (last-writer-wins).'
        }
      },
      required: ['key', 'value', 'agent_id']
    },
    handler: async (args, extra) => {
      const { key, value, scope = 'global', scope_id, ttl_seconds, agent_id, expected_version } = args;
      if (!key || !agent_id) throw new Error('key and agent_id are required');

      const orch = OrchestrationDB.getInstance();
      const fullScope = scope_id ? `${scope}:${scope_id}` : scope;

      const result = await orch.writeMemory(
        key, fullScope, value, agent_id,
        scope === 'task' ? scope_id : null,
        ttl_seconds,
        expected_version !== undefined ? expected_version : null
      );

      // Only emit the event if the write actually succeeded (no conflict).
      if (!result.conflict) {
        orch.emitEvent('memory_updated', { key, scope: fullScope, version: result.version }, agent_id);
      }

      return result;
    }
  };
};
