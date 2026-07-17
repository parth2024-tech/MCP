'use strict';

module.exports = function createGetOrchestrationState(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  /**
   * Safe Redis helper — wraps any Redis call with a hard timeout.
   * If Redis is unavailable or the call takes >3s, returns the fallback value.
   */
  async function safeRedis(fn, fallback, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(fallback), timeoutMs);
      Promise.resolve().then(fn).then(
        (v) => { clearTimeout(timer); resolve(v); },
        ()  => { clearTimeout(timer); resolve(fallback); }
      );
    });
  }

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
      const redisUp = orch.isRedisAvailable();

      // Expire stale items — these are synchronous SQLite calls, always safe
      orch.expireStaleLocks();
      orch.expireMemory();

      // ── Task Graph ──────────────────────────────────────────────────────────
      let tasks = [];
      if (redisUp) {
        const redis = orch.getRedisClient();
        const [pendingIds, claimedIds, revisionIds, completedIds, failedIds] = await Promise.all([
          safeRedis(() => redis.smembers('ase:tasks:pending'), []),
          safeRedis(() => redis.smembers('ase:tasks:claimed'), []),
          safeRedis(() => redis.smembers('ase:tasks:needs_revision'), []),
          safeRedis(() => redis.smembers('ase:tasks:completed'), []),
          safeRedis(() => redis.smembers('ase:tasks:failed'), []),
        ]);

        const activeIds = [...pendingIds, ...claimedIds, ...revisionIds, ...failedIds];
        if (include_completed) activeIds.push(...completedIds);

        for (const id of activeIds) {
          const data = await safeRedis(() => redis.get(`ase:task:${id}`), null);
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
      } else {
        // Redis unavailable — read entirely from SQLite
        const statuses = include_completed
          ? `('pending','claimed','needs_revision','failed','completed')`
          : `('pending','claimed','needs_revision','failed')`;
        const rows = db.prepare(`SELECT * FROM tasks WHERE status IN ${statuses}`).all();
        tasks = rows.map(t => ({
          ...t,
          depends_on: JSON.parse(t.depends_on || '[]'),
          blocks: JSON.parse(t.blocks || '[]'),
          skill_ids: JSON.parse(t.skill_ids || '[]')
        }));
      }

      // ── Agents ─────────────────────────────────────────────────────────────
      const agents = [];
      const now = Math.floor(Date.now() / 1000);

      if (redisUp) {
        const redis = orch.getRedisClient();
        const agentKeys = await safeRedis(() => redis.keys('ase:agent:*'), []);
        const activeAgentIds = new Set();
        for (const key of agentKeys) {
          const data = await safeRedis(() => redis.get(key), null);
          if (data) {
            const a = JSON.parse(data);
            activeAgentIds.add(a.agent_id);
            agents.push({
              agent_id: a.agent_id,
              status: a.status,
              current_task: a.current_task,
              seconds_since_ping: Math.max(0, now - a.last_heartbeat)
            });
          }
        }
        const dbAgents = db.prepare(`SELECT * FROM agents`).all();
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
      } else {
        const dbAgents = db.prepare(`SELECT * FROM agents`).all();
        for (const da of dbAgents) {
          agents.push({
            agent_id: da.agent_id,
            status: da.status,
            current_task: da.current_task,
            seconds_since_ping: Math.max(0, now - (da.last_heartbeat || 0))
          });
        }
      }

      // ── File Locks ─────────────────────────────────────────────────────────
      let locks = [];
      if (redisUp) {
        const redis = orch.getRedisClient();
        const lockKeys = await safeRedis(() => redis.keys('ase:lock:*'), []);
        for (const key of lockKeys) {
          const data = await safeRedis(() => redis.get(key), null);
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
      }

      // ── Shared Memory ──────────────────────────────────────────────────────
      let memoryKeys = [];
      if (redisUp) {
        const redis = orch.getRedisClient();
        const memKeys = await safeRedis(() => redis.keys('ase:memory:*'), []);
        for (const key of memKeys) {
          const data = await safeRedis(() => redis.get(key), null);
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
      }

      // ── Bottlenecks (SQLite only — always available) ───────────────────────
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
        redis_available: redisUp,
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
