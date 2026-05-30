/**
 * remember_action — Factory-pattern tool (injects deps).
 * Logs a persistent episodic memory for future recall.
 * Content is validated to a 2048-character maximum.
 */

const MAX_CONTENT_LENGTH = 2048;

module.exports = (deps) => ({
  name: 'remember_action',
  description: 'Log a persistent episodic memory (an action, terminal command, or architectural decision) so you can recall it in future sessions.',
  inputSchema: {
    type: 'object',
    properties: {
      event_type: {
        type: 'string',
        enum: ['terminal_command', 'architecture_decision', 'user_preference', 'general_action'],
        description: 'The category of the memory.'
      },
      content: {
        type: 'string',
        description: `Detailed description of what happened, what was decided, or what the user prefers. Maximum ${MAX_CONTENT_LENGTH} characters.`
      }
    },
    required: ['event_type', 'content']
  },
  handler: async (args, extra) => {
    // Content length validation (fail-fast before any async work)
    if (!args.content || typeof args.content !== 'string') {
      return { status: 'error', error: 'content must be a non-empty string.' };
    }
    if (args.content.length > MAX_CONTENT_LENGTH) {
      return {
        status: 'error',
        error: `content exceeds the ${MAX_CONTENT_LENGTH}-character limit (got ${args.content.length} chars). Please summarize before storing.`
      };
    }

    const memService = deps.memoryService;
    if (!memService) throw new Error('MemoryService not initialized.');

    const id = await memService.remember(args.event_type, args.content);
    return {
      status: 'success',
      memory_id: id,
      message: `Memory successfully recorded. I will remember this for future tasks.`
    };
  }
});
