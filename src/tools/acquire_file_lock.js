'use strict';

module.exports = function createAcquireFileLock(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'acquire_file_lock',
    description: 'Acquire an exclusive or shared lock on a file before writing. Prevents concurrent file conflicts between agents. Locks auto-expire after TTL.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to the file' },
        agent_id: { type: 'string', description: 'The requesting agent ID' },
        task_id: { type: 'string', description: 'The task this lock is for' },
        lock_type: { type: 'string', enum: ['exclusive', 'shared'], default: 'exclusive', description: 'Lock type' },
        ttl_seconds: { type: 'number', default: 120, description: 'Lock TTL in seconds' }
      },
      required: ['file_path', 'agent_id', 'task_id']
    },
    handler: async (args, extra) => {
      const { file_path, agent_id, task_id, lock_type = 'exclusive', ttl_seconds = 120 } = args;
      if (!file_path || !agent_id || !task_id) {
        throw new Error('file_path, agent_id, and task_id are required');
      }

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      const result = db.transaction(() => {
        // Expire stale locks first
        orch.expireStaleLocks();

        const existing = db.prepare(
          `SELECT * FROM file_locks WHERE file_path = ?`
        ).get(file_path);

        if (existing) {
          // Shared locks can coexist with other shared locks, not with exclusive
          if (existing.lock_type === 'exclusive' || lock_type === 'exclusive') {
            return {
              granted: false,
              blocked_by: existing.locked_by,
              blocked_by_task: existing.task_id,
              retry_after_seconds: Math.max(0, existing.expires_at - Math.floor(Date.now() / 1000)),
            };
          }
        }

        const expiresAt = Math.floor(Date.now() / 1000) + ttl_seconds;
        db.prepare(`
          INSERT OR REPLACE INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(file_path, agent_id, task_id, lock_type, expiresAt);

        return { granted: true, expires_at: expiresAt };
      })();

      return result;
    }
  };
};
