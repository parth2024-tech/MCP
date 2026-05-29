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
    const config = await routeModel(args.request); // awaiting in case it's refactored to async
    (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'get_model_config', 'authorized', 0, { task_type: config.task_type, model: config.model });
    return config;
  }
});
