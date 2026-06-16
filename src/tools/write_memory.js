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
      const db = orch.getDB();
      const fullScope = scope_id ? `${scope}:${scope_id}` : scope;
      const expiresAt = ttl_seconds
        ? Math.floor(Date.now() / 1000) + ttl_seconds
        : null;

      const result = db.transaction(() => {
        const existing = db.prepare(
          `SELECT value, version FROM shared_memory WHERE key = ? AND scope = ?`
        ).get(key, fullScope);

        db.prepare(`
          INSERT INTO shared_memory (key, scope, value, written_by, expires_at, version)
          VALUES (?, ?, ?, ?, ?, 1)
          ON CONFLICT(key, scope) DO UPDATE SET
            value = excluded.value,
            written_by = excluded.written_by,
            expires_at = excluded.expires_at,
            version = shared_memory.version + 1
        `).run(key, fullScope, JSON.stringify(value), agent_id, expiresAt);

        // Audit trail
        db.prepare(`
          INSERT INTO memory_changelog (key, scope, old_value, new_value, changed_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(key, fullScope, existing ? existing.value : null, JSON.stringify(value), agent_id);

        const newVersion = existing ? existing.version + 1 : 1;
        return { key, scope: fullScope, version: newVersion };
      })();

      orch.emitEvent('memory_updated', { key, scope: fullScope }, agent_id);
      return result;
    }
  };
};
