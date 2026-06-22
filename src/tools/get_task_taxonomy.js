const { logAccess } = require('../utils/logger');
const { getTaskTaxonomy } = require('../services/model-router');

module.exports = (deps) => ({
  name: 'get_task_taxonomy',
  description: 'Returns the complete task type taxonomy with model assignments, temperatures, and descriptions. Use for introspection and debugging.',
  inputSchema: {
    type: 'object',
    properties: {
      verbose: {
        type: 'boolean',
        description: 'Optional. If true, returns more verbose metadata.'
      }
    }
  },
  handler: async (args, extra) => {
    const taxonomy = await getTaskTaxonomy();
    (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'get_task_taxonomy', 'authorized', 0, { type_count: taxonomy.length });
    return taxonomy;
  }
});
