const ToolRegistry = require('../src/services/registry');
const path = require('path');
const registry = new ToolRegistry();
const toolsDir = path.join(__dirname, '..', 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, {});
console.log('Total tools loaded:', registry.getAll().length);
for (const tool of registry.getAll()) {
  console.log(`Tool: ${tool.name}, inputSchema:`, !!tool.inputSchema || typeof tool.schema !== 'undefined');
  if (!tool.inputSchema && tool.schema) {
    console.log(`  -> Has zod schema but no inputSchema!`);
  }
}
