'use strict';

module.exports = function createSubscribeEvents(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'subscribe_events',
    description: 'Subscribe this agent to event types from the orchestration bus. Supported types: task_completed, task_failed, task_created, task_claimed, file_written, memory_updated, conflict_detected, agent_timeout.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The subscribing agent ID' },
        event_types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Event types to subscribe to'
        }
      },
      required: ['agent_id', 'event_types']
    },
    handler: async (args, extra) => {
      const { agent_id, event_types } = args;
      if (!agent_id || !event_types || event_types.length === 0) {
        throw new Error('agent_id and at least one event_type are required');
      }

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      const insert = db.prepare(`
        INSERT OR IGNORE INTO event_subscriptions (agent_id, event_type) VALUES (?, ?)
      `);

      const insertMany = db.transaction((types) => {
        for (const t of types) {
          insert.run(agent_id, t);
        }
      });

      insertMany(event_types);

      return { subscribed: event_types, agent_id };
    }
  };
};
