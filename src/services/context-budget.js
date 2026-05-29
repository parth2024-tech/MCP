/**
 * ASE Context Budget Manager v2
 *
 * Three distinct stages:
 *   1. EXTRACT  — Pull intent signals from the user's prompt
 *   2. SCORE    — Rank every skill by relevance using TF-IDF-inspired weighting
 *   3. ENFORCE  — Return only the top N skills within the token budget
 *
 * Design constraints:
 *   - 1,449 skills in the registry — must be fast (< 200ms)
 *   - Skills have YAML frontmatter with `name`, `description`, optional `category`
 *   - The frontmatter description is the primary matching surface
 *   - Skill file content is secondary (heavier but more precise)
 *   - Hard cap of 3 skills per session, configurable via model-params.json
 */

const fs = require('fs');
const path = require('path');
const { logAccess, warn } = require('../utils/logger');
const { findMainMdSync } = require('../utils/fs-utils');

const SKILLS_DIR = path.join(__dirname, '../../');
const CONFIG_PATH = path.join(__dirname, '../../../config/model-params.json');

// ─────────────────────────────────────────────────────────────
// Load global constraints from config
// ─────────────────────────────────────────────────────────────
let MAX_SKILLS = 3;
let TOKEN_WARN = 6000;
let TOKEN_HARD_LIMIT = 12000;

try {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const gc = cfg.global_constraints || {};
  MAX_SKILLS = gc.context_budget_max_skills || 3;
  TOKEN_WARN = gc.context_budget_warn_tokens || 6000;
  TOKEN_HARD_LIMIT = gc.context_budget_hard_limit_tokens || 12000;
} catch (err) {
  warn('ContextBudget', `Failed to load model-params.json, using defaults: ${err.message}`);
}

// ─────────────────────────────────────────────────────────────
// STOPWORDS — high-frequency words that carry zero intent signal.
// Filtering these dramatically improves scoring precision.
// ─────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'not',
  'no', 'nor', 'so', 'yet', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about',
  'also', 'how', 'what', 'when', 'where', 'which', 'who', 'why',
  'this', 'that', 'these', 'those', 'then', 'there', 'here',
  'all', 'any', 'every', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'up', 'down', 'again', 'further', 'once', 'only', 'own', 'same',
  'it', 'its', 'my', 'your', 'our', 'his', 'her', 'their', 'we',
  'they', 'me', 'him', 'us', 'them', 'i', 'you', 'he', 'she',
  'want', 'need', 'help', 'please', 'using', 'use', 'make', 'like',
  'get', 'set', 'put', 'let', 'new', 'old'
]);

// ─────────────────────────────────────────────────────────────
// STAGE 1: EXTRACT — Keyword extraction from user prompt
// ─────────────────────────────────────────────────────────────

/**
 * Extracts meaningful intent tokens from the user's prompt.
 * Filters stopwords, deduplicates, and returns a weighted token map.
 *
 * @param {string} prompt - Raw user request
 * @returns {Map<string, number>} token → frequency count
 */
function extractIntentTokens(prompt) {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, ' ')   // keep hyphens, dots, underscores (common in tech terms)
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));

  // Count frequency — repeated tokens signal stronger intent
  const freq = new Map();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return freq;
}

/**
 * Extracts bigrams (2-word phrases) from the prompt.
 * Bigrams like "firebase auth" or "react native" carry much stronger signal
 * than individual words.
 *
 * @param {string} prompt
 * @returns {Set<string>} set of bigram strings
 */
function extractBigrams(prompt) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  const bigrams = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOPWORDS.has(words[i]) || !STOPWORDS.has(words[i + 1])) {
      bigrams.add(`${words[i]} ${words[i + 1]}`);
    }
  }
  return bigrams;
}

// ─────────────────────────────────────────────────────────────
// STAGE 2: SCORE — Relevance scoring per skill
// ─────────────────────────────────────────────────────────────

/**
 * Parses YAML frontmatter from a skill markdown file.
 * Returns { name, description, category, risk } or null.
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return null;

  const fm = content.substring(3, endIdx);
  const result = {};

  const nameMatch = fm.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  if (nameMatch) result.name = nameMatch[1].trim();

  const descMatch = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m);
  if (!descMatch) {
    // Multi-line description
    const multiMatch = fm.match(/^description:\s*["']?([\s\S]*?)["']?\s*(?:^[a-z]|\n---)/m);
    if (multiMatch) result.description = multiMatch[1].trim().replace(/\n\s*/g, ' ');
  } else {
    result.description = descMatch[1].trim();
  }

  const catMatch = fm.match(/^category:\s*["']?(.+?)["']?\s*$/m);
  if (catMatch) result.category = catMatch[1].trim();

  const riskMatch = fm.match(/^risk:\s*["']?(.+?)["']?\s*$/m);
  if (riskMatch) result.risk = riskMatch[1].trim();

  return result;
}

/**
 * Scores a single skill against the extracted intent signals.
 *
 * Scoring layers (additive):
 *   Layer 1: Folder name match       — 10 pts per token hit (strongest signal)
 *   Layer 2: Frontmatter name match  — 8 pts per token hit
 *   Layer 3: Description match       — 5 pts per token hit (medium signal)
 *   Layer 4: Bigram match in desc    — 12 pts per bigram (multi-word = high precision)
 *   Layer 5: Content body match      — 1 pt per token, capped at 3 per token (weakest, noisiest)
 *   Layer 6: Risk bonus              — safe/none skills get +2 tiebreaker
 *
 * @param {string} folderName - The skill folder name (e.g. "react-ui-patterns")
 * @param {object} frontmatter - Parsed YAML frontmatter { name, description }
 * @param {string} content - Full file content (for body matching)
 * @param {Map<string, number>} intentTokens - Extracted intent token frequency map
 * @param {Set<string>} bigrams - Extracted bigrams from the prompt
 * @returns {number} relevance score
 */
function scoreSkill(folderName, frontmatter, content, intentTokens, bigrams) {
  let score = 0;

  // Normalize the folder name: "react-ui-patterns" → "react ui patterns"
  const normalizedFolder = folderName.toLowerCase().replace(/[-_]/g, ' ');

  // Layer 1: Folder name token match (10 pts each)
  for (const [token] of intentTokens) {
    if (normalizedFolder.includes(token)) {
      score += 10;
    }
  }

  // Layer 2: Frontmatter name match (8 pts each)
  if (frontmatter && frontmatter.name) {
    const fmName = frontmatter.name.toLowerCase();
    for (const [token] of intentTokens) {
      if (fmName.includes(token)) score += 8;
    }
  }

  // Layer 3: Description keyword match (5 pts each)
  const desc = (frontmatter && frontmatter.description) ? frontmatter.description.toLowerCase() : '';
  if (desc) {
    for (const [token] of intentTokens) {
      if (desc.includes(token)) score += 5;
    }
  }

  // Layer 4: Bigram match in description + folder name (12 pts — highest precision)
  const descAndName = `${normalizedFolder} ${desc}`;
  for (const bigram of bigrams) {
    if (descAndName.includes(bigram)) {
      score += 12;
    }
  }

  // Layer 5: Content body match (1 pt per token, capped at 3 per token)
  // Only check the first 2000 chars of content body (after frontmatter) to stay fast
  if (content) {
    const bodyStart = content.indexOf('---', 3);
    const body = bodyStart !== -1
      ? content.substring(bodyStart + 3, bodyStart + 2003).toLowerCase()
      : content.substring(0, 2000).toLowerCase();

    for (const [token] of intentTokens) {
      const re = new RegExp(`\\b${escapeRegex(token)}\\b`, 'g');
      const matches = (body.match(re) || []).length;
      score += Math.min(matches, 3);
    }
  }

  // Layer 6: Risk tiebreaker — safe skills get slight preference
  if (frontmatter && frontmatter.risk) {
    if (frontmatter.risk === 'none') score += 2;
    else if (frontmatter.risk === 'safe') score += 1;
  }

  return score;
}

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────
// STAGE 3: ENFORCE — Budget cap and token accounting
// ─────────────────────────────────────────────────────────────

/**
 * selectTopSkills — The main entry point.
 *
 * Orchestrates the three stages: EXTRACT → SCORE → ENFORCE.
 *
 * @param {string[]} candidates - Array of skill folder names to evaluate
 * @param {string} request - The user's prompt text
 * @param {number} maxSkills - Hard cap (defaults to global config value)
 * @returns {{
 *   selected: Array<{name, score, tokenEstimate, description}>,
 *   totalBudgetTokens: number,
 *   budget_status: 'ok' | 'warning' | 'over_limit',
 *   dropped_count: number,
 *   hard_cap: number,
 *   extraction: { token_count, bigram_count }
 * }}
 */
function selectTopSkills(candidates, request, maxSkills) {
  const cap = maxSkills || MAX_SKILLS;

  // Stage 1: Extract intent signals
  const intentTokens = extractIntentTokens(request);
  const bigrams = extractBigrams(request);

  // Stage 2: Score every candidate
  const scored = [];

  for (const name of candidates) {
    const skillPath = path.join(SKILLS_DIR, name);

    // Quick existence check
    let stat;
    try { stat = fs.statSync(skillPath); } catch (err) { warn('ContextBudget', `stat failed for "${name}": ${err.message}`); continue; }
    if (!stat.isDirectory()) continue;

    const mdFile = findMainMdSync(skillPath);
    if (!mdFile) continue;

    let content = '';
    try { content = fs.readFileSync(mdFile, 'utf8'); } catch (err) { warn('ContextBudget', `readFile failed for "${mdFile}": ${err.message}`); continue; }

    const frontmatter = parseFrontmatter(content);
    const score = scoreSkill(name, frontmatter, content, intentTokens, bigrams);

    // Only include skills with score > 0 (at least one signal hit)
    if (score > 0) {
      const tokenEstimate = Math.ceil(content.length / 4);
      scored.push({
        name,
        score,
        tokenEstimate,
        description: (frontmatter && frontmatter.description) || ''
      });
    }
  }

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);

  // Stage 3: Enforce budget cap
  const selected = scored.slice(0, cap);
  const totalBudgetTokens = selected.reduce((sum, s) => sum + s.tokenEstimate, 0);

  // Determine budget health
  let budgetStatus = 'ok';
  if (totalBudgetTokens > TOKEN_HARD_LIMIT) budgetStatus = 'over_limit';
  else if (totalBudgetTokens > TOKEN_WARN) budgetStatus = 'warning';

  return {
    selected: selected.map(s => ({
      name: s.name,
      score: s.score,
      tokenEstimate: s.tokenEstimate,
      description: s.description.slice(0, 120)
    })),
    totalBudgetTokens,
    budget_status: budgetStatus,
    dropped_count: Math.max(0, scored.length - cap),
    hard_cap: cap,
    extraction: {
      token_count: intentTokens.size,
      bigram_count: bigrams.size,
      top_tokens: [...intentTokens.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t, c]) => `${t}(${c})`)
    }
  };
}

module.exports = {
  selectTopSkills,
  extractIntentTokens,
  extractBigrams,
  scoreSkill,
  parseFrontmatter
};
