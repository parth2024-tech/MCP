const { findRelevantTools } = require('./src/services/tool-search');

class MockRegistry {
  getSchemas() {
    return [
      { name: "get_skill_session_report", description: "Get the skill session report and token usage.", inputSchema: {} },
      { name: "log_skill_step", description: "Log a step in the execution history.", inputSchema: {} },
      { name: "get_health", description: "Check server health.", inputSchema: {} }
    ];
  }
}

const registry = new MockRegistry();

console.log("=== Testing Gap 3: Disambiguation ===");

function testQuery(query, expectedTopTool) {
  const tools = findRelevantTools(query, 3, registry);
  const topTool = tools[0].name;
  console.log(`Query: "${query}" -> Top Tool: ${topTool}`);
  if (topTool !== expectedTopTool) {
    console.error(`  FAIL: expected ${expectedTopTool}, got ${topTool}`);
    process.exit(1);
  } else {
    console.log(`  PASS`);
  }
}

testQuery("show me the session history", "get_skill_session_report");
testQuery("log this execution step", "log_skill_step");
testQuery("what is the session cost and analytics", "get_skill_session_report");
testQuery("record progress for this action", "log_skill_step");

console.log("All tests passed!");
