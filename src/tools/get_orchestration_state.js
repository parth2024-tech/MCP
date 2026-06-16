'use strict';

module.exports = function createGetOrchestrationState(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'get_orchestration_state',
    description: 'Full system snapshot of the orchestration engine: task graph status, agent states, active file locks, shared memory keys, and bottleneck detection. Use this to understand the complete state of multi-agent coordination.',
    inputSchema: {
      type: 'object',
      properties: {
        include_completed: {
          type: 'boolean',
          default: false,
          description: 'Include completed tasks in the snapshot'
        }
      },
      required: []
    },
    handler: async (args, extra) => {
      const { include_completed = false } = args;
      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      // Clean up expired entries
      orch.expireStaleLocks();
      orch.expireMemory();

      const statusFilter = include_completed
        ? `status IN ('pending','claimed','running','blocked','failed','completed')`
        : `status IN ('pending','claimed','running','blocked','failed')`;

      const tasks = db.prepare(
        `SELECT id, title, status, assigned_to, depends_on, blocks, skill_ids, completed_at
         FROM tasks WHERE ${statusFilter} ORDER BY created_at`
      ).all();

      const agents = db.prepare(
        `SELECT agent_id, status, current_task,
         CAST(unixepoch() - last_heartbeat AS INTEGER) as seconds_since_ping
         FROM agents ORDER BY last_heartbeat DESC`
      ).all();

      const locks = db.prepare(
        `SELECT file_path, locked_by, lock_type,
         CAST(expires_at - unixepoch() AS INTEGER) as expires_in_seconds
         FROM file_locks WHERE expires_at > unixepoch()`
      ).all();

      const memoryKeys = db.prepare(
        `SELECT key, scope, written_by, version,
         CAST(unixepoch() - created_at AS INTEGER) as age_seconds
         FROM shared_memory WHERE expires_at IS NULL OR expires_at > unixepoch()
         ORDER BY created_at DESC LIMIT 50`
      ).all();

      const bottlenecks = db.prepare(`
        SELECT t.id, t.title, COUNT(d.downstream_task_id) as blocking_count
        FROM tasks t
        JOIN task_dependencies d ON d.upstream_task_id = t.id
        JOIN tasks downstream ON downstream.id = d.downstream_task_id
        WHERE t.status != 'completed' AND downstream.status = 'pending'
        GROUP BY t.id ORDER BY blocking_count DESC LIMIT 5
      `).all();

      return {
        snapshot_at: new Date().toISOString(),
        tasks,
        agents,
        file_locks: locks,
        memory_keys: memoryKeys,
        bottlenecks,
      };
    }
  };
};
