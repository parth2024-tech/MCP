'use strict';

module.exports = function createReadMemory(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'read_memory',
    description: 'Read structured data from shared memory written by other agents. Supports scoped access and optional history retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key to read' },
        scope: { type: 'string', default: 'global', description: 'Scope to read from (e.g., global, task:id, agent:id)' },
        include_history: { type: 'boolean', default: false, description: 'Include last 20 changelog entries' }
      },
      required: ['key']
    },
    handler: async (args, extra) => {
      const { key, scope = 'global', include_history = false } = args;
      if (!key) throw new Error('key is required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      // Clean up expired entries first
      orch.expireMemory();

      const row = db.prepare(`
        SELECT * FROM shared_memory
        WHERE key = ? AND scope = ?
          AND (expires_at IS NULL OR expires_at > unixepoch())
      `).get(key, scope);

      if (!row) {
        return { found: false };
      }

      const result = {
        found: true,
        value: JSON.parse(row.value),
        written_by: row.written_by,
        version: row.version,
      };

      if (include_history) {
        result.history = db.prepare(`
          SELECT changed_by, old_value, new_value, changed_at
          FROM memory_changelog
          WHERE key = ? AND scope = ?
          ORDER BY changed_at DESC LIMIT 20
        `).all(key, scope);
      }

      return result;
    }
  };
};
