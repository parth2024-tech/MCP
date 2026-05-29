module.exports = (deps) => ({
  name: 'log_skill_step',
  description: 'Records the AI\'s progression through a skill by logging the status of a specific step.',
  inputSchema: {
    type: 'object',
    properties: {
      skill_name: {
        type: 'string',
        description: 'The exact folder/slug name of the skill being executed (e.g. "test-driven-development").'
      },
      step_id: {
        type: 'string',
        description: 'The unique step identifier extracted from the skill markdown (e.g. "tdd/write-failing-test").'
      },
      status: {
        type: 'string',
        enum: ['started', 'completed', 'skipped', 'blocked', 'failed'],
        description: 'The current state of the step.'
      },
      context: {
        type: 'string',
        description: 'Optional. A short string to record why a step was skipped, what it found, or error context.'
      }
    },
    required: ['skill_name', 'step_id', 'status']
  },
  handler: async (args, extra) => {
    const { skill_name, step_id, status, context } = args;

    if (!deps.sessionState) {
      return { error: 'Session state manager is not initialized.' };
    }

    try {
      deps.sessionState.logStep(skill_name, step_id, status, context);
      return { success: true, message: `Successfully logged step ${step_id} as ${status}.` };
    } catch (err) {
      return { error: `Failed to log step: ${err.message}` };
    }
  }
});
