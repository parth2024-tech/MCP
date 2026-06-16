'use strict';

module.exports = function createHeartbeat(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'heartbeat',
    description: 'Agent liveness ping. Call every 30 seconds to prevent timeout recovery. Also performs dead agent detection and recovery: releases file locks, requeues tasks, and emits agent_timeout events for crashed agents.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent ID' },
        current_task_id: { type: 'string', description: 'ID of the task you are currently working on' }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, current_task_id } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      // Upsert agent record
      db.prepare(`
        INSERT INTO agents (agent_id, last_heartbeat, current_task, status)
        VALUES (?, unixepoch(), ?, 'active')
        ON CONFLICT(agent_id) DO UPDATE SET
          last_heartbeat = unixepoch(),
          current_task = excluded.current_task,
          status = 'active'
      `).run(agent_id, current_task_id || null);

      // Recovery sweep: find agents that missed 3 heartbeats (90 seconds)
      const deadAgents = db.prepare(`
        SELECT agent_id FROM agents
        WHERE last_heartbeat < unixepoch() - 90
          AND status = 'active'
      `).all();

      const recoveredAgents = [];

      if (deadAgents.length > 0) {
        db.transaction(() => {
          for (const { agent_id: deadId } of deadAgents) {
            // Mark agent dead
            db.prepare(
              `UPDATE agents SET status = 'dead' WHERE agent_id = ?`
            ).run(deadId);

            // Release all file locks held by dead agent
            db.prepare(
              `DELETE FROM file_locks WHERE locked_by = ?`
            ).run(deadId);

            // Requeue all tasks claimed by dead agent
            db.prepare(`
              UPDATE tasks SET
                status = 'pending',
                assigned_to = NULL,
                claimed_at = NULL,
                timeout_at = NULL
              WHERE assigned_to = ? AND status IN ('claimed', 'running')
            `).run(deadId);

            // Emit recovery event
            orch.emitEvent(
              'agent_timeout',
              { dead_agent: deadId, tasks_requeued: true },
              'orchestrator'
            );

            recoveredAgents.push(deadId);
          }
        })();
      }

      return {
        status: 'alive',
        recovered_agents: recoveredAgents,
      };
    }
  };
};
