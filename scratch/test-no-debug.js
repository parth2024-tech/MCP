const { spawn } = require('child_process');

const server = spawn('node', ['ase-mcp-server.js'], { cwd: '/home/thor/skiils/tools/server' });

let buffer = '';
const start = Date.now();
const log = (msg) => console.log(`[T+${Date.now()-start}ms] ${msg}`);

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        log('initialize OK → sending search_tools immediately');
        const callMsg = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_tools', arguments: { query: 'openhands' } } };
        server.stdin.write(JSON.stringify(callMsg) + '\n');
      } else if (msg.id === 2) {
        log('✅ search_tools responded! Result snippet: ' + JSON.stringify(msg.result).substring(0, 150));
        server.kill();
        process.exit(0);
      }
    } catch(_) {}
  }
});

server.stderr.on('data', (d) => {
  const t = d.toString().trim();
  if (t) log('STDERR: ' + t.substring(0, 200));
});

const initMsg = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } };
server.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  log('❌ TIMEOUT - server did not respond in 10s');
  server.kill();
  process.exit(1);
}, 10000);
