/**
 * context-optimizer.js — Cobb-Douglas Context Budget Engine
 *
 * Consolidated module (previously split across utils/context-budget.js and
 * services/context-budget.js). Single source of truth for:
 *   - parseFrontmatter()   — YAML frontmatter parser (authoritative implementation)
 *   - ContextOptimizer     — Cobb-Douglas utility-maximizing budget engine
 *
 * The Cobb-Douglas model:
 *   Utility = A * (Relevance^α) * (Tokens^β) − C * (TotalTokens²)
 *
 * Because conversation costs grow quadratically (O(T²)) and reasoning degrades
 * past the noise threshold ("context rot"), this formula finds the exact cutoff
 * where adding more retrieved content becomes actively harmful.
 *
 * @see src/services/context-budget.js for the TF-IDF scoring layer (unchanged)
 */

/**
 * Parses YAML frontmatter from a markdown string.
 * Handles both single-line and multi-line description fields.
 * This is the authoritative implementation — do not duplicate.
 *
 * @param {string} content - Raw markdown content
 * @returns {object|null} Parsed frontmatter as a plain object, or null if absent/malformed
 */
function parseFrontmatter(content) {
  if (!content || !content.startsWith('---')) return null;

  // Find the closing --- delimiter, starting from index 3 to skip opening
  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return null;

  const fm = content.substring(3, endIdx);
  const result = {};

  // Single-line key: value (handles optional quotes)
  const nameMatch    = fm.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  if (nameMatch) result.name = nameMatch[1].trim();

  const descMatch    = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m);
  if (descMatch) {
    result.description = descMatch[1].trim();
  } else {
    // Multi-line description (indented continuation lines)
    const multiMatch = fm.match(/^description:\s*["']?([\s\S]*?)["']?\s*(?=^[a-z]|\n---)/m);
    if (multiMatch) result.description = multiMatch[1].trim().replace(/\n\s*/g, ' ');
  }

  const catMatch     = fm.match(/^category:\s*["']?(.+?)["']?\s*$/m);
  if (catMatch) result.category = catMatch[1].trim();

  const riskMatch    = fm.match(/^risk:\s*["']?(.+?)["']?\s*$/m);
  if (riskMatch) result.risk = riskMatch[1].trim();

  const versionMatch = fm.match(/^version:\s*["']?(.+?)["']?\s*$/m);
  if (versionMatch) result.version = versionMatch[1].trim();

  return result;
}

/**
 * ContextOptimizer — Cobb-Douglas production function for context budgeting.
 *
 * Determines the optimal subset of retrieved items to include in the prompt
 * by maximizing marginal utility while penalizing quadratic context growth.
 */
class ContextOptimizer {
  /**
   * @param {object} opts
   * @param {number} [opts.alpha=1.2]         — Relevance elasticity (>1 = superlinear reward for relevance)
   * @param {number} [opts.beta=0.8]          — Token elasticity (<1 = diminishing returns on token count)
   * @param {number} [opts.penaltyFactor=0.0001] — Quadratic context-rot penalty coefficient (C)
   * @param {number} [opts.scaling=100]       — Utility scale factor (A)
   */
  constructor({ alpha = 1.2, beta = 0.8, penaltyFactor = 0.0001, scaling = 100 } = {}) {
    this.A = scaling;
    this.alpha = alpha;
    this.beta = beta;
    this.C = penaltyFactor;
  }

  /**
   * Marginal utility of adding one more item at a given token accumulation point.
   *
   * Formula: A*(R^α)*(T^β) − [(C*(totalBefore+T)²) − (C*totalBefore²)]
   *
   * @param {number} relevance        — Item relevance score (0.0–1.0)
   * @param {number} tokens           — Token cost of this item
   * @param {number} totalTokensBefore — Tokens accumulated before this item
   * @returns {number} Marginal utility (negative = harmful to include)
   */
  calculateUtility(relevance, tokens, totalTokensBefore) {
    if (relevance <= 0 || tokens <= 0) return 0;

    const rawUtility = this.A * Math.pow(relevance, this.alpha) * Math.pow(tokens, this.beta);
    const penaltyBefore = this.C * Math.pow(totalTokensBefore, 2);
    const penaltyAfter  = this.C * Math.pow(totalTokensBefore + tokens, 2);
    const marginalPenalty = penaltyAfter - penaltyBefore;

    return rawUtility - marginalPenalty;
  }

  /**
   * Selects the optimal subset of items by cutting off where marginal utility < 0.
   *
   * @param {Array<{score: number, tokenEstimate: number}>} items
   * @returns {{ optimized: Array, totalTokens: number, savedTokens: number }}
   */
  optimize(items) {
    // Sort descending by relevance
    const sorted = [...items].sort((a, b) => (b.score || 0) - (a.score || 0));

    const optimized = [];
    let totalTokens = 0;
    let savedTokens = 0;
    let cutoffReached = false;

    for (const item of sorted) {
      const relevance = item.score || 0.1;
      const tokens = item.tokenEstimate || 500;

      if (cutoffReached) {
        savedTokens += tokens;
        continue;
      }

      const marginalUtility = this.calculateUtility(relevance, tokens, totalTokens);

      if (marginalUtility < 0) {
        cutoffReached = true;
        savedTokens += tokens;
        continue;
      }

      optimized.push(item);
      totalTokens += tokens;
    }

    return { optimized, totalTokens, savedTokens };
  }
}

module.exports = { parseFrontmatter, ContextOptimizer };
