'use strict';

module.exports = function createReleaseFileLock(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'release_file_lock',
    description: 'Release a file lock after writing is complete. Only the lock owner can release it.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path of the locked file' },
        agent_id: { type: 'string', description: 'The agent releasing the lock' }
      },
      required: ['file_path', 'agent_id']
    },
    handler: async (args, extra) => {
      const { file_path, agent_id } = args;
      if (!file_path || !agent_id) throw new Error('file_path and agent_id are required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      const changes = db.prepare(
        `DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`
      ).run(file_path, agent_id);

      return { released: changes.changes > 0, file_path };
    }
  };
};
