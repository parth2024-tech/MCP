const { logAccess } = require('../utils/logger');
const { routeModel } = require('../services/model-router');

module.exports = (deps) => ({
  name: 'get_model_config',
  description: 'Analyzes a user request and returns the optimal LLM model, temperature, and token limit for that task type.',
  inputSchema: {
    type: 'object',
    properties: {
      request: {
        type: 'string',
        description: 'The user request text to analyze for task type and model routing.'
      }
    },
    required: ['request']
  },
  handler: async (args, extra) => {
    const config = await routeModel(args.request); 

    // Retrieve the active skills for the current session
    const report = deps.sessionState ? deps.sessionState.getReport() : null;
    const currentSkills = report?.active_skills || [];

    let tunedTemperature = config.temperature;
    if (currentSkills.length > 0 && deps.memoryService) {
      const skillsQuery = [...currentSkills].sort().join(', ');
      try {
        const memories = await deps.memoryService.recall(skillsQuery, 5, 0.0);
        const perfMemories = memories.filter(m => m.event_type === 'skill_performance');
        
        if (perfMemories.length > 0) {
          let totalSuccess = 0;
          let count = 0;
          for (const m of perfMemories) {
            const match = m.content.match(/Success rate: ([\d.]+)/);
            if (match) {
              totalSuccess += parseFloat(match[1]);
              count++;
            }
          }
          if (count > 0) {
            const avgSuccess = totalSuccess / count;
            if (avgSuccess >= 0.8) {
              // High-success combo: lower temperature (exploit)
              tunedTemperature = Math.max(0.05, config.temperature - 0.05);
            } else if (avgSuccess < 0.5) {
              // Low-success combo: higher temperature (explore)
              tunedTemperature = Math.min(1.0, config.temperature + 0.1);
            }
          }
        } else {
          // Novel combination: higher temperature (explore)
          tunedTemperature = Math.min(1.0, config.temperature + 0.1);
        }
      } catch (err) {
        // Fallback to default config.temperature on HNSW recall failures
      }
    }
    config.temperature = parseFloat(tunedTemperature.toFixed(2));

    (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'get_model_config', 'authorized', 0, { task_type: config.task_type, model: config.model });
    return config;
  }
});
