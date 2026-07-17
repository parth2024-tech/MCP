const { spawn } = require('child_process');

const env = { ...process.env, NODE_DEBUG: 'net', ASE_MAX_CONCURRENCY: '10' };
const server = spawn('node', ['ase-mcp-server.js'], { cwd: '/home/thor/skiils/tools/server', env });

let buffer = '';
const start = Date.now();

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        console.log(`[${Date.now()-start}ms] initialize OK, sending search_tools`);
        const callMsg = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_tools', arguments: { query: 'openhands' } } };
        server.stdin.write(JSON.stringify(callMsg) + '\n');
      } else if (msg.id === 2) {
        console.log(`[${Date.now()-start}ms] search_tools OK!`, JSON.stringify(msg.result).substring(0, 100));
        server.kill();
        process.exit(0);
      } else {
        console.log(`[${Date.now()-start}ms] notification:`, JSON.stringify(msg).substring(0, 100));
      }
    } catch(_) {}
  }
});

server.stderr.on('data', (d) => {
  // Only print non-debug lines
  const t = d.toString();
  if (!t.includes('CLIENT 0')) process.stderr.write(`STDERR [${Date.now()-start}ms]: ${t}`);
});

const initMsg = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } };
server.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  console.log(`[${Date.now()-start}ms] TIMEOUT`);
  server.kill();
  process.exit(1);
}, 10000);
