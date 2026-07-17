// Bypass ase-mcp-server.js entirely - test the pipeline directly
const path = require('path');
process.chdir('/home/thor/skiils/tools/server');

// Stub the heavy services
const mockContainer = {
  resolve: (name) => {
    if (name === 'ToolRegistry') return { get: () => null, getSchemas: () => [] };
    if (name === 'ToolSearch') return { findRelevantTools: (q) => [{ name: 'test_tool', description: 'test', relevance_score: 1.0 }] };
    if (name === 'VirtualKeyManager') return { isAuthorized: () => true };
    if (name === 'SpokeManager') return { callTool: () => { throw new Error('no spoke'); } };
    if (name === 'SessionToolCache') return { get: () => null, set: () => {} };
    return null;
  }
};

async function test() {
  const { createToolCallHandler } = require('./src/server/handlers');
  const handler = createToolCallHandler(mockContainer);
  
  console.log('[test] Calling search_tools via pipeline...');
  const start = Date.now();
  
  try {
    const result = await Promise.race([
      handler({ params: { name: 'search_tools', arguments: { query: 'openhands' } } }, {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000))
    ]);
    console.log(`[test] ✅ Responded in ${Date.now() - start}ms:`, JSON.stringify(result).substring(0, 200));
  } catch (err) {
    console.log(`[test] ❌ Error after ${Date.now() - start}ms: ${err.message}`);
  }
  process.exit(0);
}
test().catch(err => { console.error(err); process.exit(1); });
