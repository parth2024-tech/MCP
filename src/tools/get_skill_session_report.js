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
      
      // Feed into skill_performance_index in vector DB
      if (report && report.active_skills && report.active_skills.length > 0 && deps.memoryService) {
        let totalCompleted = 0;
        let totalSteps = 0;
        for (const skillName of report.active_skills) {
          const sk = report.skills[skillName];
          if (sk && sk.summary) {
            totalCompleted += sk.summary.completed || 0;
            totalSteps += sk.summary.total_steps || 0;
          }
        }
        const successRate = totalSteps > 0 ? (totalCompleted / totalSteps) : 0.0;
        const skillsList = [...report.active_skills].sort().join(', ');
        const content = `Skills combination: ${skillsList}. Success rate: ${successRate.toFixed(4)}. Completed: ${totalCompleted}. Total steps: ${totalSteps}.`;
        
        await deps.memoryService.remember('skill_performance', content);
      }

      return report;
    } catch (err) {
      return { error: `Failed to generate skill session report: ${err.message}` };
    }
  }
});
