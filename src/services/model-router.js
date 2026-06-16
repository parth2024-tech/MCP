const fs = require('fs').promises;
const path = require('path');
const { logAccess, logger } = require('../utils/logger');

const CONFIG_PATH = path.join(__dirname, '../../../config/model-params.json');

let config = null;
let compiledSignals = {};

async function loadConfig() {
  if (config) return config;
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    logger.error('ModelRouter', `Failed to load config ${CONFIG_PATH}: ${err.message}`);
    config = { task_types: {} }; // fallback
  }

  // Pre-compile signals
  for (const [taskType, profile] of Object.entries(config.task_types || {})) {
    const signals = profile.signals || {};
    const keywords = (signals.keywords || []).map(k => ({
      pattern: k.toLowerCase(),
      weight: 1
    }));
    const phrases = (signals.phrases || []).map(p => ({
      pattern: p.toLowerCase(),
      weight: 3
    }));

    compiledSignals[taskType] = [...phrases, ...keywords].sort((a, b) => b.pattern.length - a.pattern.length);
  }

  return config;
}

async function routeModel(request) {
  const cfg = await loadConfig();
  const taskTypes = cfg.task_types || {};
  const FALLBACK = cfg.fallback || 'coding';
  const MIN_CONFIDENCE = (cfg.global_constraints && cfg.global_constraints.min_confidence_score) || 2;

  if (!request || typeof request !== 'string') {
    return buildResult(taskTypes, FALLBACK, FALLBACK, 0, [], 'Empty or invalid request. Using fallback.');
  }

  const lower = request.toLowerCase();
  let bestType = null;
  let bestScore = 0;
  let bestMatches = [];

  for (const [taskType, signals] of Object.entries(compiledSignals)) {
    let score = 0;
    const matches = [];

    for (const signal of signals) {
      if (lower.includes(signal.pattern)) {
        score += signal.weight;
        matches.push(signal.pattern);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = taskType;
      bestMatches = matches;
    }
  }

  if (!bestType || bestScore < MIN_CONFIDENCE) {
    const result = buildResult(
      taskTypes,
      FALLBACK,
      FALLBACK,
      bestScore,
      bestMatches,
      bestScore === 0
        ? 'No signal matches detected. Routing to default coding profile.'
        : `Low confidence (${bestScore} < ${MIN_CONFIDENCE}). Nearest match was "${bestType}" but defaulting to "${FALLBACK}" for safety.`
    );
    result.suggested_action = 'Confidence below threshold. Recommend calling query_skills before proceeding.';
    return result;
  }

  return buildResult(
    taskTypes,
    bestType,
    FALLBACK,
    bestScore,
    bestMatches,
    `Matched ${bestMatches.length} signal(s) with total confidence ${bestScore} for task type "${bestType}".`
  );
}

function buildResult(taskTypes, taskType, fallback, confidence, matchedSignals, rationale) {
  const profile = taskTypes[taskType];
  if (!profile) {
    return {
      task_type: 'coding',
      model: 'claude-sonnet-4-5',
      loop_executor_model: 'claude-haiku-3-5',
      temperature: 0.15,
      top_p: 0.95,
      max_tokens: 8192,
      description: 'Config error — using hardcoded emergency fallback.',
      lifecycle_phase: 'build',
      recommended_skills: [],
      confidence: 0,
      matched_signals: [],
      rationale: `Task type "${taskType}" not found in model-params.json. Using emergency fallback.`
    };
  }

  return {
    task_type: taskType,
    model: profile.model,
    loop_executor_model: profile.loop_executor_model || 'claude-haiku-3-5',
    temperature: profile.temperature,
    top_p: profile.top_p,
    max_tokens: profile.max_tokens,
    description: profile.description,
    lifecycle_phase: profile.lifecycle_phase,
    recommended_skills: profile.recommended_skills || [],
    confidence,
    matched_signals: matchedSignals,
    rationale
  };
}

async function getTaskTaxonomy() {
  const cfg = await loadConfig();
  return Object.entries(cfg.task_types || {}).map(([key, profile]) => ({
    task_type: key,
    model: profile.model,
    temperature: profile.temperature,
    description: profile.description
  }));
}

async function reloadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const fresh = JSON.parse(raw);

    // Build new compiled signals into a local object first
    const newSignals = {};
    for (const [taskType, profile] of Object.entries(fresh.task_types || {})) {
      const signals = profile.signals || {};
      const keywords = (signals.keywords || []).map(k => ({ pattern: k.toLowerCase(), weight: 1 }));
      const phrases = (signals.phrases || []).map(p => ({ pattern: p.toLowerCase(), weight: 3 }));
      newSignals[taskType] = [...phrases, ...keywords].sort((a, b) => b.pattern.length - a.pattern.length);
    }

    // Atomic swap: both module-level references update in the same synchronous tick.
    // Any concurrent routeModel() call either sees the fully old state or the fully new state — never a mix.
    config = fresh;
    compiledSignals = newSignals;

    return { success: true, task_count: Object.keys(fresh.task_types || {}).length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { routeModel, getTaskTaxonomy, reloadConfig };
