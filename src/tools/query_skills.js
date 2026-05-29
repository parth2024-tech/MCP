const fs = require('fs');
const path = require('path');
const { logAccess, warn } = require('../utils/logger');
const { selectTopSkills } = require('../services/context-budget');

const SKILLS_DIR = path.resolve(__dirname, '../../../../');

module.exports = (deps) => ({
  name: 'query_skills',
  description: 'Scores ALL skills by relevance to the user request and returns the top-3 most relevant using semantic ranking. Use this to auto-select optimal skills.',
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
      }
    },
    required: ['request']
  },
  handler: async (args, extra) => {
    const maxSkills = args.max_skills || 3;

    // --- Primary path: semantic cosine search ---
    try {
      const results = await deps.embeddingService.search(args.request, maxSkills);
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'query_skills', 'authorized', 0, { selected: results.map(s => s.name), method: 'semantic' });
      return {
        selected: results,
        totalBudgetTokens: results.reduce((sum, r) => sum + r.tokenEstimate, 0),
        budget_status: 'ok',
        dropped_count: 0,
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

      const budget = selectTopSkills(candidates, args.request, maxSkills);
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'query_skills', 'authorized', 0, { selected: budget.selected.map(s => s.name), method: 'tfidf-fallback' });
      return { ...budget, service_degraded: true, degraded_reason: 'Embedding circuit open — used TF-IDF fallback' };
    } catch (fallbackErr) {
      return { error: `All skill search methods failed: ${fallbackErr.message}` };
    }
  }
});
