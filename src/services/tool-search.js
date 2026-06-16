const { logger } = require('../utils/logger');

// High-weight keywords to guarantee precise matching for each tool
const TOOL_KEYWORDS = {
  get_health: ["health", "status", "alive", "uptime", "circuit", "breaker", "db", "integrity", "ok", "process", "memory", "ping"],
  get_model_config: ["model", "config", "temperature", "task", "type", "router", "prompt", "selection", "llm", "routing"],
  get_skill_session_report: [
    'report', 'session', 'summary', 'token count', 'telemetry', 'session summary',
    'token usage', 'how many tokens', 'session stats', 'what happened',
    'total tokens', 'session total', 'usage report', 'session metrics', 'cost so far'
  ],
  get_task_taxonomy: ["taxonomy", "task", "types", "category", "list", "architecture", "debugging", "implementation", "optimization", "security"],
  load_skill: ["load", "skill", "instructions", "markdown", "cache", "read", "file", "instruction", "set", "use"],
  log_skill_step: [
    'log', 'record', 'step', 'write step', 'written', 'action entry', 'execution step',
    'pipeline step', 'append log', 'mark step', 'track action',
    'current step', 'this step', 'just happened', 'now running', 'active step'
  ],
  query_skills: ["query", "skills", "semantic", "search", "cosine", "similarity", "tf-idf", "rank", "match", "find", "score"],
  update_project_rules: ["update", "rules", "project", "conventions", "custom", "preferences", "learn", "style", "ase-project", "json"],
  validate_output: ["validate", "output", "lint", "typecheck", "typescript", "tests", "verify", "build", "compile", "check", "errors"],
  claim_task: ["claim", "task", "next", "assign", "work", "queue", "graph"],
  complete_task: ["complete", "finish", "task", "done", "output", "unlock", "downstream"],
  create_task: ["create", "task", "seed", "graph", "dag", "dependency", "depends"],
  write_memory: ["write", "memory", "shared", "context", "state", "namespace", "save"],
  read_memory: ["read", "memory", "shared", "context", "state", "namespace", "load"],
  acquire_file_lock: ["acquire", "lock", "file", "conflict", "exclusive", "shared", "prevent", "overwrite"],
  release_file_lock: ["release", "lock", "file", "unlock", "free"],
  subscribe_events: ["subscribe", "events", "bus", "listen", "react", "notification"],
  poll_events: ["poll", "events", "bus", "read", "notification", "messages"],
  heartbeat: ["heartbeat", "ping", "alive", "liveness", "dead", "recovery", "timeout"],
  get_orchestration_state: ["orchestration", "state", "dashboard", "snapshot", "tasks", "agents", "locks", "bottleneck"]
};

// Common stopwords to filter out from query
const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "in", "to", "for", "is", "with", "by", "on", "at", "from", 
  "it", "this", "that", "how", "what", "where", "why", "who", "your", "my", "our", "me", "i", "want", "should"
]);

/**
 * Tokenizes and clean text into lowercase words.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

/**
 * Counts frequencies of words.
 */
function getFrequencies(words) {
  const freqs = {};
  for (const word of words) {
    freqs[word] = (freqs[word] || 0) + 1;
  }
  return freqs;
}

/**
 * Computes cosine similarity between query and tool text, plus keyword overlap boost.
 */
function scoreTool(queryTokens, queryFreq, tool) {
  const toolNameLower = tool.name.toLowerCase();
  const toolDescLower = tool.description.toLowerCase();
  const keywords = TOOL_KEYWORDS[tool.name] || [];
  
  // Combine all text representations of the tool
  const toolText = `${toolNameLower} ${toolDescLower} ${keywords.join(" ")}`;
  const toolTokens = tokenize(toolText);
  const toolFreq = getFrequencies(toolTokens);
  
  const uniqueWords = new Set([...Object.keys(queryFreq), ...Object.keys(toolFreq)]);
  
  let dotProduct = 0;
  let normQuery = 0;
  let normTool = 0;
  
  for (const word of uniqueWords) {
    const valQ = queryFreq[word] || 0;
    const valT = toolFreq[word] || 0;
    dotProduct += valQ * valT;
    normQuery += valQ * valQ;
    normTool += valT * valT;
  }
  
  let score = 0;
  if (normQuery > 0 && normTool > 0) {
    score = dotProduct / (Math.sqrt(normQuery) * Math.sqrt(normTool));
  }
  
  // Apply a significant boost for exact keyword overlap
  let keywordMatches = 0;
  for (const token of queryTokens) {
    // Direct match with tool name
    if (toolNameLower.includes(token)) {
      score += 0.4;
    }
    // Match with explicit keywords
    if (keywords.includes(token)) {
      keywordMatches++;
    }
  }
  
  if (keywordMatches > 0) {
    score += 0.3 * keywordMatches;
  }
  
  return score;
}

/**
 * Finds the top_k most relevant tools for a given query.
 */
function findRelevantTools(query, topK, registry, virtualKeyManager = null, virtualKey = null) {
  const queryTokens = tokenize(query);
  let tools = registry.getSchemas();
  
  if (virtualKeyManager) {
    tools = virtualKeyManager.filterAuthorizedTools(virtualKey, tools);
  }

  if (queryTokens.length === 0) {
    // If query has only stopwords or is empty, return topK tools sorted alphabetically
    return tools.slice(0, topK).map(t => ({ ...t, relevance_score: 0.1 }));
  }
  
  const queryFreq = getFrequencies(queryTokens);
  
  const scoredTools = tools.map(tool => {
    const score = scoreTool(queryTokens, queryFreq, tool);
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      relevance_score: Math.min(1.0, parseFloat(score.toFixed(4)))
    };
  });
  
  // Sort descending by score, fallback to alphabetical on tie
  scoredTools.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return a.name.localeCompare(b.name);
  });
  
  return scoredTools.slice(0, topK);
}

module.exports = {
  findRelevantTools,
  tokenize,
  scoreTool
};
