'use strict';

const crypto = require('crypto');

module.exports = function createCreateTask(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'create_task',
    description: 'Create a new task in the orchestration task graph. Specify dependencies to build a DAG of work items that agents can claim and complete autonomously.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the task' },
        description: { type: 'string', description: 'Detailed description of the work to be done' },
        depends_on: { type: 'array', items: { type: 'string' }, description: 'Array of upstream task IDs that must complete before this task can be claimed' },
        blocks: { type: 'array', items: { type: 'string' }, description: 'Array of downstream task IDs that this task blocks' },
        skill_ids: { type: 'array', items: { type: 'string' }, description: 'Array of skill IDs relevant to this task' }
      },
      required: ['title']
    },
    handler: async (args, extra) => {
      const { title, description = '', depends_on = [], blocks = [], skill_ids = [] } = args;
      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();
      const taskId = crypto.randomUUID();

      const result = db.transaction(() => {
        // Validate that all dependency task IDs exist
        if (depends_on.length > 0) {
          const placeholders = depends_on.map(() => '?').join(',');
          const existing = db.prepare(
            `SELECT id FROM tasks WHERE id IN (${placeholders})`
          ).all(...depends_on);
          const existingIds = new Set(existing.map(r => r.id));
          const missing = depends_on.filter(id => !existingIds.has(id));
          if (missing.length > 0) {
            throw new Error(`Dependency tasks not found: ${missing.join(', ')}`);
          }
        }

        // Insert the task
        db.prepare(`
          INSERT INTO tasks (id, title, description, depends_on, blocks, skill_ids)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          taskId,
          title,
          description,
          JSON.stringify(depends_on),
          JSON.stringify(blocks),
          JSON.stringify(skill_ids)
        );

        // Insert dependency relationships
        const insertDep = db.prepare(
          `INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`
        );
        for (const upstreamId of depends_on) {
          insertDep.run(upstreamId, taskId);
        }
        for (const downstreamId of blocks) {
          insertDep.run(taskId, downstreamId);
        }

        return { id: taskId, title, status: 'pending', depends_on, blocks, skill_ids };
      })();

      orch.emitEvent('task_created', { task_id: taskId, title }, null, taskId);
      return result;
    }
  };
};
