/**
 * MCTSEngine — Monte Carlo Tree Search for knowledge graph exploration.
 *
 * Uses UCB1 selection to explore the Neo4j knowledge graph guided by
 * semantic similarity to the query. A wall-clock time budget cap (default 500ms)
 * prevents runaway iteration in production.
 */

const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');
const { ContextOptimizer } = require('../utils/context-optimizer');

class MCTSNode {
  constructor(graphNode, parent = null) {
    this.graphNode = graphNode;
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.value = 0; // Cumulative embedding similarity score
    this.isExpanded = false;
  }

  get ucb1() {
    if (this.visits === 0) return Infinity;
    const c = Math.SQRT2;
    return (this.value / this.visits) + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
  }
}

class MCTSEngine {
  constructor(kgService, embeddingService) {
    this.kg = kgService;
    this.embeddingService = embeddingService;
    this.optimizer = new ContextOptimizer();
  }

  /**
   * Run MCTS from a starting graph node toward the query.
   *
   * @param {string} query           — Natural language search query
   * @param {string} startNodeId     — Starting node identifier (file path or Symbol ID).
   *                                   To find a valid startNodeId, first run a Cypher query:
   *                                   MATCH (n:File) WHERE n.path CONTAINS 'filename' RETURN n.path LIMIT 5
   *                                   Then pass the returned path as startNodeId.
   *                                   Example: startNodeId = "src/services/embedding-service.js"
   * @param {number} [iterations=50] — Max MCTS iterations (may stop earlier if timeBudgetMs elapses)
   * @param {number} [timeBudgetMs=500] — Maximum wall-clock time in ms regardless of iteration count
   * @returns {Promise<object[]>}    — Optimized array of relevant graph node properties
   */
  async search(query, startNodeId, iterations = 50, timeBudgetMs = 500) {
    logger.info('MCTSEngine', `Starting MCTS search for: "${query}" from node: ${startNodeId} (max ${iterations} iters, ${timeBudgetMs}ms budget)`);
    metrics.increment('mcts_searches');

    const wallClockStart = Date.now();

    // Get starting node from Neo4j
    const startRecords = await this.kg.executeCypher(
      `MATCH (n) WHERE n.id = $id OR n.path = $id RETURN n`,
      { id: startNodeId }
    );

    if (startRecords.length === 0) {
      throw new Error(`Start node not found: ${startNodeId}. Use Cypher mode first to discover valid node IDs: MATCH (n:File) RETURN n.path LIMIT 10`);
    }

    const root = new MCTSNode(startRecords[0].n);
    const queryEmbedding = await this._getEmbedding(query);

    let actualIterations = 0;
    for (let i = 0; i < iterations; i++) {
      // ── Time-budget cap: break if we've exceeded wall-clock budget ──
      if (Date.now() - wallClockStart >= timeBudgetMs) {
        logger.info('MCTSEngine', `Time budget (${timeBudgetMs}ms) reached after ${i} iterations — stopping early.`);
        metrics.increment('mcts.time_budget_exceeded');
        break;
      }

      let node = this._select(root);
      if (!node.isExpanded) {
        node = await this._expand(node);
      }
      const reward = await this._simulate(node, queryEmbedding);
      this._backpropagate(node, reward);
      actualIterations++;
    }

    // Aggregate all visited nodes
    const visitedNodes = [];
    const queue = [root];
    while (queue.length > 0) {
      const n = queue.shift();
      if (n.visits > 0) visitedNodes.push(n);
      queue.push(...n.children);
    }

    // Map to optimizer format
    const candidates = visitedNodes.map(n => ({
      ...n.graphNode.properties,
      score: n.value / (n.visits || 1), // Average similarity reward
      tokenEstimate: 50 // Roughly 50 tokens per graph node metadata
    }));

    // Deduplicate by ID
    const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.id || c.path, c])).values());

    const { optimized, totalTokens, savedTokens } = this.optimizer.optimize(uniqueCandidates);

    const elapsedMs = Date.now() - wallClockStart;
    metrics.histogram('context.tokens_saved', savedTokens, { source: 'mcts' });
    metrics.histogram('context.total_tokens', totalTokens, { source: 'mcts' });
    metrics.histogram('mcts.elapsed_ms', elapsedMs);
    metrics.histogram('mcts.actual_iterations', actualIterations);

    logger.info('MCTSEngine',
      `MCTS complete. ${actualIterations} iters in ${elapsedMs}ms. ` +
      `Optimized ${uniqueCandidates.length} → ${optimized.length} nodes (saved ${savedTokens} tokens).`
    );

    return optimized;
  }

  _select(node) {
    while (node.isExpanded && node.children.length > 0) {
      node = node.children.reduce((a, b) => a.ucb1 > b.ucb1 ? a : b);
    }
    return node;
  }

  async _expand(node) {
    const id = node.graphNode.properties.id || node.graphNode.properties.path;
    const records = await this.kg.executeCypher(
      `MATCH (n)-[r]-(m) WHERE n.id = $id OR n.path = $id RETURN m LIMIT 10`,
      { id }
    );

    for (const record of records) {
      const child = new MCTSNode(record.m, node);
      node.children.push(child);
    }
    node.isExpanded = true;

    if (node.children.length > 0) {
      return node.children[Math.floor(Math.random() * node.children.length)];
    }
    return node;
  }

  async _simulate(node, queryEmbedding) {
    const text = (node.graphNode.properties.name || '') + ' ' + (node.graphNode.properties.path || '');
    if (!text.trim()) return 0.1;

    const nodeEmbedding = await this._getEmbedding(text);
    return this._cosineSimilarity(queryEmbedding, nodeEmbedding);
  }

  _backpropagate(node, reward) {
    while (node) {
      node.visits++;
      node.value += reward;
      node = node.parent;
    }
  }

  async _getEmbedding(text) {
    const result = await this.embeddingService.workerPool.generateEmbeddingForeground(text);
    const floats = new Float32Array(result.buffer || result);
    return Array.from(floats);
  }

  _cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

module.exports = MCTSEngine;
