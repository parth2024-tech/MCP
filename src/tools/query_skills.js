const fs = require('fs');
const path = require('path');
const { logAccess, warn } = require('../utils/logger');
const { selectTopSkills } = require('../services/context-budget');
const { parseFrontmatter } = require('../utils/context-optimizer');

const SKILLS_DIR = path.resolve(__dirname, '../../../../');

/**
 * Returns true if a skill is deprecated per its SKILL.md frontmatter.
 * Activepieces pattern: Piece.deprecated = true (piece.ts).
 */
function isSkillDeprecated(skillName) {
  try {
    const mdPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
    if (!fs.existsSync(mdPath)) return false;
    const content = fs.readFileSync(mdPath, 'utf8');
    const fm = parseFrontmatter(content);
    return fm && fm.deprecated === true;
  } catch (_) {
    return false;
  }
}

module.exports = (deps) => ({
  name: 'query_skills',
  description: 'Scores ALL skills by relevance to the user request and returns the top-3 most relevant using semantic ranking. Deprecated skills are automatically excluded. Use this to auto-select optimal skills.',
  inputSchema: {
    type: 'object',
    properties: {
      request: {
        type: 'string',
        description: 'The full user request text used to score skill relevance.'
      },
      max_skills: {
        type: 'number',
        description: 'Optional. Hard cap on number of skills returned. Defaults to 3.'
      },
      min_relevance: {
        type: 'number',
        description: 'Optional. Minimum relevance score (0.0–1.0) to include a skill. Skills below this threshold are excluded. Default: 0 (no filter).'
      },
      include_deprecated: {
        type: 'boolean',
        description: 'Optional. When true, deprecated skills are included in results. Default: false (deprecated skills are excluded).'
      }
    },
    required: ['request']
  },
  handler: async (args, extra) => {
    const maxSkills = args.max_skills || 3;
    const minRelevance = (args.min_relevance !== undefined)
      ? Math.max(0, Math.min(1, args.min_relevance))
      : 0; // default: no filter
    const includeDeprecated = args.include_deprecated === true;

    // --- Primary path: semantic cosine search ---
    try {
      let results = await deps.embeddingService.search(args.request, maxSkills * 2); // fetch extra to account for filtering

      // Apply min_relevance filter if specified
      if (minRelevance > 0) {
        const before = results.length;
        results = results.filter(r => (r.score || 0) >= minRelevance);
        if (results.length < before) {
          (extra?.reqLogger || require('../utils/logger')).info(
            'query_skills',
            `min_relevance filter (${minRelevance}) dropped ${before - results.length} result(s).`
          );
        }
      }

      // ── Activepieces Piece.deprecated filtering ───────────────────────────
      // Exclude deprecated skills from results unless explicitly requested.
      // Mirrors how Activepieces hides deprecated pieces from the builder UI.
      let deprecatedDropped = 0;
      if (!includeDeprecated) {
        const before = results.length;
        results = results.filter(r => !isSkillDeprecated(r.name));
        deprecatedDropped = before - results.length;
        if (deprecatedDropped > 0) {
          (extra?.reqLogger || require('../utils/logger')).info(
            'query_skills',
            `Excluded ${deprecatedDropped} deprecated skill(s) from results.`
          );
        }
      }

      // Cap to maxSkills after filtering
      results = results.slice(0, maxSkills);

      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'query_skills', 'authorized', 0, { selected: results.map(s => s.name), method: 'semantic' });
      return {
        selected: results,
        totalBudgetTokens: results.reduce((sum, r) => sum + r.tokenEstimate, 0),
        budget_status: 'ok',
        dropped_count: deprecatedDropped,
        deprecated_dropped: deprecatedDropped,
        hard_cap: maxSkills,
        extraction: { method: 'cosine-similarity' }
      };
    } catch (embErr) {
      (extra?.reqLogger || require('../utils/logger')).warn('query_skills', `Semantic search unavailable, falling back to TF-IDF: ${embErr.message}`);
    }

    // --- Fallback path: TF-IDF context budget scorer ---
    try {
      let candidates = [];
      try {
        candidates = fs.readdirSync(SKILLS_DIR).filter(e =>
          !e.startsWith('.') && e !== 'tools' && e !== 'docs'
        );
      } catch (readErr) {
        (extra?.reqLogger || require('../utils/logger')).warn('query_skills', `Cannot read SKILLS_DIR for fallback: ${readErr.message}`);
        return { error: 'Skill search unavailable — both semantic and text-based search failed.' };
      }

      // Apply deprecated filter to fallback candidates too
      if (!includeDeprecated) {
        candidates = candidates.filter(name => !isSkillDeprecated(name));
      }

      const budget = selectTopSkills(candidates, args.request, maxSkills);
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'query_skills', 'authorized', 0, { selected: budget.selected.map(s => s.name), method: 'tfidf-fallback' });
      return { ...budget, service_degraded: true, degraded_reason: 'Embedding circuit open — used TF-IDF fallback' };
    } catch (fallbackErr) {
      return { error: `All skill search methods failed: ${fallbackErr.message}` };
    }
  }
});

