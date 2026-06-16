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
        limit: { type: 'number', default: 10, description: 'Maximum events to return' },
        long_poll: { type: 'boolean', default: false, description: 'Whether to use long-polling' },
        timeout_seconds: { type: 'number', default: 30, description: 'Long-polling timeout in seconds' }
      },
      required: ['agent_id']
    },
    handler: async (args, extra) => {
      const { agent_id, since_event_id = 0, limit = 10, long_poll = false, timeout_seconds = 30 } = args;
      if (!agent_id) throw new Error('agent_id is required');

      const orch = OrchestrationDB.getInstance();
      const db = orch.getDB();

      // Get this agent's subscriptions
      const getSubs = () => db.prepare(
        `SELECT event_type FROM event_subscriptions WHERE agent_id = ?`
      ).all(agent_id);

      const subs = getSubs();
      if (subs.length === 0) {
        return { events: [], message: 'No active subscriptions. Call subscribe_events first.' };
      }

      const getEvents = () => {
        const currentSubs = getSubs();
        if (currentSubs.length === 0) return [];
        const placeholders = currentSubs.map(() => '?').join(',');
        return db.prepare(`
          SELECT * FROM events
          WHERE id > ?
            AND type IN (${placeholders})
          ORDER BY id ASC
          LIMIT ?
        `).all(since_event_id, ...currentSubs.map(s => s.event_type), limit);
      };

      const initialEvents = getEvents();
      if (initialEvents.length > 0 || !long_poll) {
        const parsed = initialEvents.map(e => ({
          ...e,
          payload: JSON.parse(e.payload)
        }));
        return {
          events: parsed,
          latest_event_id: parsed.length > 0 ? parsed[parsed.length - 1].id : since_event_id
        };
      }

      // Long polling: wait for a new matching event or timeout
      return new Promise((resolve) => {
        let timer;
        let unsubscribe;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (unsubscribe) unsubscribe();
        };

        // Timeout handler
        timer = setTimeout(() => {
          cleanup();
          resolve({
            events: [],
            latest_event_id: since_event_id
          });
        }, timeout_seconds * 1000);

        // Event listener
        unsubscribe = orch.registerListener((event) => {
          try {
            if (event.id <= since_event_id) return;
            
            // Fetch subscriptions again to get current subscriptions
            const currentSubs = getSubs();
            const isSubscribed = currentSubs.some(s => s.event_type === event.type);
            
            if (isSubscribed) {
              cleanup();
              resolve({
                events: [{
                  ...event,
                  payload: JSON.parse(event.payload)
                }],
                latest_event_id: event.id
              });
            }
          } catch (err) {
            // Ignore listener errors
          }
        });
      });
    }
  };
};

