const { spawn } = require('child_process');
const start = Date.now();
const log = (msg) => console.log(`[T+${Date.now()-start}ms] ${msg}`);
const server = spawn('node', ['ase-mcp-server.js'], { cwd: '/home/thor/skiils/tools/server' });
let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        log('initialize OK → sending tools/list');
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
      } else if (msg.id === 2) {
        log('tools/list OK → sending search_tools');
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_tools', arguments: { query: 'openhands' } } }) + '\n');
      } else if (msg.id === 3) {
        log('✅ search_tools OK! snippet: ' + JSON.stringify(msg.result).substring(0, 150));
        server.kill(); process.exit(0);
      }
    } catch(_) {}
  }
});

server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } }) + '\n');
setTimeout(() => { log('❌ TIMEOUT'); server.kill(); process.exit(1); }, 20000);
