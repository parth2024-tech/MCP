/**
 * recall_memory — Factory-pattern tool (injects deps).
 * Searches past episodic memories using semantic HNSW similarity.
 * Supports an optional similarity_threshold parameter.
 */

module.exports = (deps) => ({
  name: 'recall_memory',
  description: 'Search past episodic memories (actions, decisions, preferences) using semantic similarity.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The concept, preference, or past action you want to recall (e.g. "How do we usually style buttons?", "What was the command to deploy to staging?").'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return (default: 5).'
      },
      similarity_threshold: {
        type: 'number',
        description: 'Minimum similarity score (0.0–1.0) required to include a memory. Lower values return more results but with lower confidence. Default: 0.4.'
      }
    },
    required: ['query']
  },
  handler: async (args, extra) => {
    const memService = deps.memoryService;
    if (!memService) throw new Error('MemoryService not initialized.');

    const limit = args.limit || 5;
    // similarity_threshold maps to distance threshold: threshold = 1 - similarity
    const similarityThreshold = (args.similarity_threshold !== undefined)
      ? Math.max(0, Math.min(1, args.similarity_threshold))
      : 0.4; // default: 40% similarity minimum

    const memories = await memService.recall(args.query, limit, similarityThreshold);

    if (memories.length === 0) {
      return {
        status: 'success',
        memories: [],
        message: `No relevant past memories found above similarity threshold ${similarityThreshold}.`
      };
    }

    return { status: 'success', memories, similarity_threshold_used: similarityThreshold };
  }
});
