const { spawn } = require('child_process');

const start = Date.now();
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
        console.log(`✅ initialize responded in ${Date.now() - start}ms`);
        // Immediately send search_tools
        const callMsg = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_tools', arguments: { query: 'openhands' } } };
        server.stdin.write(JSON.stringify(callMsg) + '\n');
        console.log('📤 search_tools sent immediately...');
      } else if (msg.id === 2) {
        console.log(`✅ search_tools responded in ${Date.now() - start}ms total`);
        console.log('Result snippet:', JSON.stringify(msg.result).substring(0, 200));
        server.kill();
        process.exit(0);
      }
    } catch(_) {}
  }
});

const initMsg = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } };
server.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  console.log('❌ TIMEOUT - server did not respond in 8s');
  server.kill();
  process.exit(1);
}, 8000);
