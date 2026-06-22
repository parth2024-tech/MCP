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
      const result = await orch.acquireFileLock(file_path, agent_id, task_id, lock_type, ttl_seconds);
      return result;
    }
  };
};
