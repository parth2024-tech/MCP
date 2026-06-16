const ToolRegistry = require('../src/services/registry');
const path = require('path');
const registry = new ToolRegistry();
const toolsDir = path.join(__dirname, '..', 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, {});

const getLoopState = registry.get('get_loop_state');
console.log('get_loop_state Schema:', JSON.stringify(getLoopState.inputSchema, null, 2));

const claimTask = registry.get('claim_task');
console.log('claim_task Schema:', JSON.stringify(claimTask.inputSchema, null, 2));
