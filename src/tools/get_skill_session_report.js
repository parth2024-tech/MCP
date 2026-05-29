module.exports = (deps) => ({
  name: 'get_skill_session_report',
  description: 'Returns the current session\'s skill progression state, showing which skills are active, step status, and time spent.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  handler: async (args, extra) => {
    if (!deps.sessionState) {
      return { error: 'Session state manager is not initialized.' };
    }

    try {
      const report = deps.sessionState.getReport();
      return report;
    } catch (err) {
      return { error: `Failed to generate skill session report: ${err.message}` };
    }
  }
});
