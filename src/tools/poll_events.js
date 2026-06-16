'use strict';

module.exports = function createPollEvents(deps) {
  const OrchestrationDB = require('../services/orchestration-db');

  return {
    name: 'poll_events',
    description: 'Poll for new events since a given event ID. Only returns events matching your subscriptions. Use since_event_id from your last poll to avoid duplicates.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent ID (must have active subscriptions)' },
        since_event_id: { type: 'number', default: 0, description: 'Return events with ID greater than this value' },
        limit: { type: 'number', default: 10, description: 'Maximum events to return' }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, since_event_id = 0, limit = 10 } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      // Get this agent's subscriptions
      const subs = db.prepare(
        `SELECT event_type FROM event_subscriptions WHERE agent_id = ?`
      ).all(agent_id);

      if (subs.length === 0) {
        return { events: [], message: 'No active subscriptions. Call subscribe_events first.' };
      }

      // Build dynamic query for subscribed event types
      const placeholders = subs.map(() => '?').join(',');
      const events = db.prepare(`
        SELECT * FROM events
        WHERE id > ?
          AND type IN (${placeholders})
        ORDER BY id ASC
        LIMIT ?
      `).all(since_event_id, ...subs.map(s => s.event_type), limit);

      // Parse JSON payloads
      const parsed = events.map(e => ({
        ...e,
        payload: JSON.parse(e.payload)
      }));

      return {
        events: parsed,
        latest_event_id: parsed.length > 0 ? parsed[parsed.length - 1].id : since_event_id
      };
    }
  };
};
