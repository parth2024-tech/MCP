'use strict';

module.exports = function createClaimTask(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'claim_task',
    description: 'Claim the next available task from the orchestration task graph. Returns the task details if one is available, or indicates no work is available. Tasks are only claimable when all upstream dependencies are completed.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Unique identifier for the claiming agent' },
        skill_affinity: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional skill IDs to prefer tasks matching these skills'
        }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, skill_affinity = [] } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      const task = db.transaction(() => {
        // Find a pending task whose upstream deps are all completed
        const affinityPattern = skill_affinity.length > 0 ? `%${skill_affinity[0]}%` : '%';
        const available = db.prepare(`
          SELECT t.* FROM tasks t
          WHERE t.status = 'pending'
            AND NOT EXISTS (
              SELECT 1 FROM task_dependencies d
              JOIN tasks dep ON dep.id = d.upstream_task_id
              WHERE d.downstream_task_id = t.id
                AND dep.status != 'completed'
            )
          ORDER BY
            CASE WHEN t.skill_ids LIKE ? THEN 0 ELSE 1 END,
            t.created_at ASC
          LIMIT 1
        `).get(affinityPattern);

        if (!available) return null;

        const timeoutAt = Math.floor(Date.now() / 1000) + 300; // 5 min timeout
        db.prepare(`
          UPDATE tasks SET
            status = 'claimed',
            assigned_to = ?,
            claimed_at = unixepoch(),
            timeout_at = ?
          WHERE id = ?
        `).run(agent_id, timeoutAt, available.id);

        return { ...available, status: 'claimed', assigned_to: agent_id };
      })();

      if (!task) {
        return { status: 'no_work_available' };
      }

      orch.emitEvent('task_claimed', { task_id: task.id, agent_id }, agent_id, task.id);
      return task;
    }
  };
};
