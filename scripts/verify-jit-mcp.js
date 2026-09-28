const assert = require('assert');
const path = require('path');
const { findRelevantTools } = require('./src/services/tool-search');
const ToolRegistry = require('./src/services/registry');

// Mock dependencies to satisfy the registry's initializations
const mockDeps = {
  workerPool: {},
  skillCache: {},
  embeddingService: {},
  sessionState: {}
};

console.log("\n=======================================================");
console.log("JIT MCP SERVER ARCHITECTURE VERIFICATION");
console.log("=======================================================");

// Load actual tools from tools directory to verify with real schemas
const registry = new ToolRegistry();
const toolsDir = path.join(__dirname, 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, mockDeps);

const testCases = [
  {
    query: "check server health and DB integrity or uptime status",
    expected: "get_health"
  },
  {
    query: "get temperature and model configuration for a task router",
    expected: "get_model_config"
  },
  {
    query: "get skill session report and token summary details",
    expected: "get_skill_session_report"
  },
  {
    query: "view taxonomy of available task types like debugging or implementation",
    expected: "get_task_taxonomy"
  },
  {
    query: "load a skill instruction file or markdown content",
    expected: "load_skill"
  },
  {
    query: "log a skill execution step or record action status",
    expected: "log_skill_step"
  },
  {
    query: "query skills using semantic cosine search or tf-idf ranking",
    expected: "query_skills"
  },
  {
    query: "update project conventions or customize coding rules in json",
    expected: "update_project_rules"
  },
  {
    query: "validate output compile TypeScript typecheck linter verify tests",
    expected: "validate_output"
  },
  { query: "how many tokens did we use in this session", expected: "get_skill_session_report" },
  { query: "how much did this cost so far", expected: "get_skill_session_report" },
  { query: "record that the file was written successfully", expected: "log_skill_step" },
  { query: "mark this step as complete", expected: "log_skill_step" }
];

let passedCount = 0;

for (const { query, expected } of testCases) {
  console.log(`\nTesting Query: "${query}"`);
  const matches = findRelevantTools(query, 3, registry);
  
  if (matches.length === 0) {
    console.log(`❌ FAILED: No matches returned.`);
    continue;
  }
  
  const topMatch = matches[0];
  console.log(`  Top 3 matches:`);
  matches.forEach((m, i) => {
    console.log(`    ${i + 1}. ${m.name} (Score: ${m.relevance_score})`);
  });
  
  if (topMatch.name === expected) {
    console.log(`✅ PASSED: Successfully matched to '${expected}' (relevance score: ${topMatch.relevance_score})`);
    passedCount++;
  } else {
    console.log(`❌ FAILED: Expected '${expected}' but got '${topMatch.name}'`);
  }
}

console.log("\n=======================================================");
console.log(`SUMMARY: ${passedCount}/${testCases.length} Test Cases Passed`);
console.log("=======================================================\n");

assert.strictEqual(passedCount, testCases.length, "All JIT tool search test cases must pass successfully!");
console.log("🌟 JIT ARCHITECTURE VERIFICATION 100% SUCCESSFUL 🌟\n");
