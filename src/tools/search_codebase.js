/**
 * search_codebase — Factory-pattern tool (injects deps).
 * Search the repository knowledge graph using Cypher (exact match) or MCTS (NL exploration).
 */

const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

module.exports = (deps) => ({
  name: 'search_codebase',
  description: [
    'Search the repository knowledge graph using Cypher (exact match) or MCTS (natural language exploration).',
    '',
    'CYPHER MODE: Runs a direct Cypher query against Neo4j for precise entity lookups.',
    '  Example: MATCH (f:File) WHERE f.path CONTAINS "auth" RETURN f.path, f.symbols LIMIT 10',
    '',
    'MCTS MODE: Explores the graph from a starting node using semantic similarity.',
    '  The startNodeId must be a valid node ID or file path in the graph.',
    '  To discover valid startNodeId values, first run Cypher mode:',
    '    MATCH (n:File) WHERE n.path CONTAINS "your-file-name" RETURN n.path LIMIT 5',
    '  Then pass the returned path as startNodeId.',
    '  Example: startNodeId = "src/services/embedding-service.js"'
  ].join('\n'),
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['cypher', 'mcts'],
        description: 'Use "cypher" for exact graph lookups or "mcts" for natural language traversal.'
      },
      query: {
        type: 'string',
        description: 'The Cypher query (if mode=cypher) or the natural language query (if mode=mcts).'
      },
      startNodeId: {
        type: 'string',
        description: [
          'Required for mode=mcts. The starting node identifier (file path or Symbol ID).',
          'Discover valid IDs with: MATCH (n:File) RETURN n.path LIMIT 10'
        ].join(' ')
      },
      iterations: {
        type: 'number',
        description: 'MCTS only. Max iterations before returning results (default: 50). May stop earlier due to 500ms time budget.'
      },
      time_budget_ms: {
        type: 'number',
        description: 'MCTS only. Maximum wall-clock time in milliseconds (default: 500). MCTS stops early if this is exceeded.'
      }
    },
    required: ['mode', 'query']
  },
  handler: async (args, extra) => {
    const { mode, query, startNodeId } = args;
    const kg = deps.knowledgeGraphService;
    const mcts = deps.mctsEngine;

    if (!kg || !mcts) {
      throw new Error('Knowledge Graph services are not initialized.');
    }

    metrics.increment(`search_codebase.${mode}`);
    const startMs = Date.now();

    try {
      if (mode === 'cypher') {
        logger.info('search_codebase', `Executing Cypher: ${query}`);
        const result = await kg.executeCypher(query);
        const duration = Date.now() - startMs;
        return {
          status: 'success',
          durationMs: duration,
          results: result
        };
      } else if (mode === 'mcts') {
        if (!startNodeId) {
          return {
            status: 'error',
            error: 'startNodeId is required for MCTS mode. Run Cypher first to discover valid IDs: MATCH (n:File) RETURN n.path LIMIT 10'
          };
        }
        const iterations = args.iterations || 50;
        const timeBudgetMs = args.time_budget_ms || 500;

        logger.info('search_codebase', `Executing MCTS from ${startNodeId} for: "${query}" (${iterations} iters, ${timeBudgetMs}ms budget)`);
        const mctsPath = await mcts.search(query, startNodeId, iterations, timeBudgetMs);
        const duration = Date.now() - startMs;
        return {
          status: 'success',
          durationMs: duration,
          mcts_path: mctsPath
        };
      }

      return { status: 'error', error: `Unknown mode: "${mode}". Must be "cypher" or "mcts".` };
    } catch (err) {
      logger.error('search_codebase', err.message);
      return { status: 'error', error: err.message };
    }
  }
});
