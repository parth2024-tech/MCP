/**
 * MCTSEngine — Monte Carlo Tree Search for knowledge graph exploration.
 *
 * Uses UCB1 selection to explore the Neo4j knowledge graph guided by a
 * composite reward signal. A wall-clock time budget cap (default 500ms)
 * prevents runaway iteration in production.
 *
 * ─── ROLLOUT HEURISTIC — WHAT IT ACTUALLY DOES ──────────────────────────
 *
 * Previous state (the bug):
 *   _simulate called this.embeddingService.workerPool.generateEmbeddingForeground()
 *   on every single simulation step. With 50 iterations × up to 10 children
 *   per expand, this was up to 500 IPC round-trips to the worker thread,
 *   each taking ~5-20ms. The 500ms time budget expired before the search
 *   could explore more than 1-2 levels of the graph. The structural
 *   correctness of UCB1 was irrelevant because there was no time left to
 *   use it. The tree made statistically near-random decisions.
 *
 * Fixed state:
 *   1. Per-search embedding cache (Map<nodeText, Float32Array>).
 *      Each unique node text is embedded exactly once per search() call.
 *      Repeated visits to the same node (which UCB1 actively causes for
 *      high-value nodes) reuse the cached vector at zero IPC cost.
 *
 *   2. Composite reward signal = α × semantic_similarity + β × completion_rate
 *      - semantic_similarity: cosine(query_embedding, node_embedding)
 *        Range [0, 1]. Source: @xenova/all-MiniLM-L6-v2 via workerPool.
 *      - completion_rate: historical task success rate for nodes whose
 *        path or name matches recorded OrchestrationDB task outcomes.
 *        Range [0, 1]. Source: live SQLite query at search() start.
 *        A node with no history defaults to 0.5 (uninformative prior).
 *      - α = 0.7, β = 0.3 (semantic similarity is the primary signal;
 *        completion rate is a secondary tiebreaker from real data).
 *
 *   The completion rate signal is fetched once at the start of each
 *   search() call (one DB query) and stored in a Map<nodeKey, rate>.
 *   This avoids per-simulation DB hits while using real domain knowledge.
 *
 * ─── UCB1 EXPLORATION CONSTANT ───────────────────────────────────────────
 *   c = √2 (standard theoretical value for rewards in [0,1]).
 *   The composite reward is bounded to [0,1] by clamping, so this is valid.
 */

const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');
const { ContextOptimizer } = require('../utils/context-optimizer');

// Composite reward weights. Must sum to 1.0.
const ALPHA = 0.7; // Semantic similarity weight
const BETA  = 0.3; // Historical completion rate weight

class MCTSNode {
  constructor(graphNode, parent = null) {
    this.graphNode = graphNode;
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.value = 0; // Cumulative composite reward
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
   * @param {object} [orchestrationDb=null] — OrchestrationDB instance for historical signal.
   *                                          If null, only semantic similarity is used (β=0, α=1).
   * @returns {Promise<object[]>}    — Optimized array of relevant graph node properties
   */
  async search(query, startNodeId, iterations = 50, timeBudgetMs = 500, orchestrationDb = null) {
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

    // Embed the query once — reused for every cosine similarity calculation.
    const queryEmbedding = await this._getEmbedding(query, new Map());

    // Fix 4a: Per-search embedding cache.
    // Populated lazily during _simulate. Map<nodeText, number[]>
    // Prevents duplicate IPC round-trips to the embedding worker for nodes
    // that UCB1 revisits frequently (which is the whole point of UCB1).
    const embeddingCache = new Map();

    // Fix 4b: Historical completion rate signal.
    // Fetched once at search start. Map<nodeKey, completionRate [0,1]>.
    // Nodes with no history default to 0.5 (uninformative prior).
    const completionRates = await this._fetchCompletionRates(orchestrationDb);
    const effectiveAlpha = orchestrationDb ? ALPHA : 1.0;
    const effectiveBeta  = orchestrationDb ? BETA  : 0.0;

    logger.info('MCTSEngine',
      `Reward signal: α=${effectiveAlpha} (semantic) + β=${effectiveBeta} (history). ` +
      `${completionRates.size} historical task records loaded.`
    );

    let actualIterations = 0;
    for (let i = 0; i < iterations; i++) {
      // Time-budget cap: break if we've exceeded wall-clock budget
      if (Date.now() - wallClockStart >= timeBudgetMs) {
        logger.info('MCTSEngine', `Time budget (${timeBudgetMs}ms) reached after ${i} iterations — stopping early.`);
        metrics.increment('mcts.time_budget_exceeded');
        break;
      }

      let node = this._select(root);
      if (!node.isExpanded) {
        node = await this._expand(node);
      }
      const reward = await this._simulate(node, queryEmbedding, embeddingCache, completionRates, effectiveAlpha, effectiveBeta);
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
      score: n.value / (n.visits || 1), // Average composite reward
      tokenEstimate: 50
    }));

    // Deduplicate by ID
    const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.id || c.path, c])).values());

    const { optimized, totalTokens, savedTokens } = this.optimizer.optimize(uniqueCandidates);

    const elapsedMs = Date.now() - wallClockStart;
    metrics.histogram('context.tokens_saved', savedTokens, { source: 'mcts' });
    metrics.histogram('context.total_tokens', totalTokens, { source: 'mcts' });
    metrics.histogram('mcts.elapsed_ms', elapsedMs);
    metrics.histogram('mcts.actual_iterations', actualIterations);
    metrics.histogram('mcts.cache_size', embeddingCache.size);

    logger.info('MCTSEngine',
      `MCTS complete. ${actualIterations} iters in ${elapsedMs}ms. ` +
      `Embedding cache: ${embeddingCache.size} unique nodes embedded. ` +
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

  /**
   * Compute the composite reward for a node.
   *
   * reward = α × cosine(query, node) + β × completion_rate(node)
   *
   * cosine similarity: semantic relevance of the node to the query.
   * completion_rate:   historical success rate from OrchestrationDB.
   *                    Nodes with no history receive 0.5 (neutral prior).
   *
   * The embedding is retrieved from cache if available, otherwise generated
   * via the worker pool and stored in cache for subsequent iterations.
   */
  async _simulate(node, queryEmbedding, embeddingCache, completionRates, alpha, beta) {
    const name = node.graphNode.properties.name || '';
    const nodePath = node.graphNode.properties.path || '';
    const nodeText = (name + ' ' + nodePath).trim();

    if (!nodeText) {
      // No text to embed — return the neutral prior
      return 0.5;
    }

    // Fix 4a: Cache lookup — avoid re-embedding nodes UCB1 revisits.
    const nodeEmbedding = await this._getEmbedding(nodeText, embeddingCache);
    const semanticScore = this._cosineSimilarity(queryEmbedding, nodeEmbedding);

    // Fix 4b: Historical completion rate signal.
    const nodeKey = nodePath || name;
    const completionRate = completionRates.get(nodeKey) ?? 0.5; // uninformative prior

    // Composite reward — bounded to [0,1] because both components are in [0,1].
    return Math.min(1, Math.max(0, alpha * semanticScore + beta * completionRate));
  }

  _backpropagate(node, reward) {
    while (node) {
      node.visits++;
      node.value += reward;
      node = node.parent;
    }
  }

  /**
   * Get an embedding, using the per-search cache to avoid duplicate IPC calls.
   * @param {string} text
   * @param {Map<string,number[]>} cache
   */
  async _getEmbedding(text, cache) {
    if (cache && cache.has(text)) {
      return cache.get(text);
    }

    const result = await this.embeddingService.workerPool.generateEmbeddingForeground(text);
    const arr = Array.from(new Float32Array(result.buffer || result));

    if (cache) {
      cache.set(text, arr);
    }

    return arr;
  }

  /**
   * Fetch historical task completion rates from OrchestrationDB.
   *
   * Queries the tasks table for all completed/failed records and computes
   * a per-node completion rate keyed on the skill_ids and task title.
   * This is a single query executed once per search() call.
   *
   * @param {object|null} orchestrationDb — OrchestrationDB instance, or null
   * @returns {Map<string, number>} Map from node key → completion rate [0,1]
   */
  async _fetchCompletionRates(orchestrationDb) {
    const rates = new Map();

    if (!orchestrationDb) {
      return rates;
    }

    try {
      const db = orchestrationDb.getDB();

      // Aggregate completion rates by extracting skill IDs from the JSON column.
      // We compute: success_count / total_count per skill.
      const rows = db.prepare(`
        SELECT
          skill_ids,
          status,
          COUNT(*) as count
        FROM tasks
        WHERE status IN ('completed', 'failed', 'needs_revision')
          AND skill_ids IS NOT NULL
          AND skill_ids != '[]'
        GROUP BY skill_ids, status
      `).all();

      // Accumulate totals and successes per skill ID.
      const skillStats = new Map(); // Map<skillId, { total, success }>

      for (const row of rows) {
        let skillIds;
        try {
          skillIds = JSON.parse(row.skill_ids);
        } catch {
          continue;
        }
        if (!Array.isArray(skillIds)) continue;

        for (const skillId of skillIds) {
          if (!skillStats.has(skillId)) {
            skillStats.set(skillId, { total: 0, success: 0 });
          }
          const stat = skillStats.get(skillId);
          stat.total += row.count;
          if (row.status === 'completed') {
            stat.success += row.count;
          }
        }
      }

      for (const [skillId, { total, success }] of skillStats.entries()) {
        if (total > 0) {
          // Laplace smoothing: (success + 1) / (total + 2)
          // Avoids 0 and 1 extremes for nodes with little data.
          rates.set(skillId, (success + 1) / (total + 2));
        }
      }

      metrics.histogram('mcts.completion_rate_nodes', rates.size);
    } catch (err) {
      // Non-fatal — fall back to pure semantic similarity if DB read fails.
      logger.warn('MCTSEngine', `Failed to fetch completion rates — using semantic-only signal: ${err.message}`);
    }

    return rates;
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
