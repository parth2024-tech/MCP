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
      const redis = await orch.getRedisClient();
      const db = orch.getDB();

      orch.expireStaleLocks();
      orch.expireMemory();

      const pendingIds = await redis.smembers('ase:tasks:pending');
      const claimedIds = await redis.smembers('ase:tasks:claimed');
      const revisionIds = await redis.smembers('ase:tasks:needs_revision');
      const completedIds = await redis.smembers('ase:tasks:completed');
      const failedIds = await redis.smembers('ase:tasks:failed');

      const activeIds = [...pendingIds, ...claimedIds, ...revisionIds, ...failedIds];
      if (include_completed) activeIds.push(...completedIds);

      const tasks = [];
      for (const id of activeIds) {
        const data = await redis.get(`ase:task:${id}`);
        if (data) {
          tasks.push(JSON.parse(data));
        } else {
          const t = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
          if (t) {
            tasks.push({
              ...t,
              depends_on: JSON.parse(t.depends_on || '[]'),
              blocks: JSON.parse(t.blocks || '[]'),
              skill_ids: JSON.parse(t.skill_ids || '[]')
            });
          }
        }
      }

      const agentKeys = await redis.keys('ase:agent:*');
      const agents = [];
      const now = Math.floor(Date.now() / 1000);
      for (const key of agentKeys) {
        const data = await redis.get(key);
        if (data) {
          const a = JSON.parse(data);
          agents.push({
            agent_id: a.agent_id,
            status: a.status,
            current_task: a.current_task,
            seconds_since_ping: Math.max(0, now - a.last_heartbeat)
          });
        }
      }
      const dbAgents = db.prepare(`SELECT * FROM agents`).all();
      const activeAgentIds = new Set(agents.map(a => a.agent_id));
      for (const da of dbAgents) {
        if (!activeAgentIds.has(da.agent_id)) {
          agents.push({
            agent_id: da.agent_id,
            status: da.status,
            current_task: da.current_task,
            seconds_since_ping: Math.max(0, now - da.last_heartbeat)
          });
        }
      }

      const lockKeys = await redis.keys('ase:lock:*');
      const locks = [];
      for (const key of lockKeys) {
        const data = await redis.get(key);
        if (data) {
          const l = JSON.parse(data);
          const filePath = key.substring('ase:lock:'.length);
          if (l.lock_type === 'exclusive') {
            locks.push({
              file_path: filePath,
              locked_by: l.locked_by,
              lock_type: l.lock_type,
              expires_in_seconds: Math.max(0, l.expires_at - now)
            });
          } else {
            for (const sl of (l.locks || [])) {
              locks.push({
                file_path: filePath,
                locked_by: sl.locked_by,
                lock_type: 'shared',
                expires_in_seconds: Math.max(0, sl.expires_at - now)
              });
            }
          }
        }
      }

      const memKeys = await redis.keys('ase:memory:*');
      const memoryKeys = [];
      for (const key of memKeys) {
        const data = await redis.get(key);
        if (data) {
          const m = JSON.parse(data);
          memoryKeys.push({
            key: m.key,
            scope: m.scope,
            written_by: m.written_by,
            version: m.version,
            age_seconds: Math.max(0, now - m.created_at)
          });
        }
      }

      const bottlenecks = db.prepare(`
        SELECT t.id, t.title, COUNT(d.downstream_task_id) as blocking_count
        FROM tasks t
        JOIN task_dependencies d ON d.upstream_task_id = t.id
        JOIN tasks downstream ON downstream.id = d.downstream_task_id
        WHERE t.status != 'completed' AND downstream.status = 'pending'
        GROUP BY t.id ORDER BY blocking_count DESC LIMIT 5
      `).all();

      const deadlockState = orch.getDeadlockState();

      return {
        snapshot_at: new Date().toISOString(),
        tasks,
        agents,
        file_locks: locks,
        memory_keys: memoryKeys,
        bottlenecks,
        deadlock_status: {
          has_deadlock: deadlockState.has_deadlock,
          cycles: deadlockState.cycles,
          deadlock_broken_tasks: deadlockState.deadlock_broken_tasks
        }
      };
    }
  };
};
