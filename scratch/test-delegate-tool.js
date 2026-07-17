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
        log('initialize OK → sending tools/call for delegate_to_openhands');
        server.stdin.write(JSON.stringify({ 
          jsonrpc: '2.0', id: 2, method: 'tools/call', 
          params: { 
            name: 'delegate_to_openhands', 
            arguments: { task_description: 'Write a python script that prints hello world in a file called hello.py' } 
          } 
        }) + '\n');
      } else if (msg.id === 2) {
        log('✅ delegate_to_openhands OK! Result: ' + JSON.stringify(msg.result, null, 2));
        server.kill(); process.exit(0);
      }
    } catch(e) {}
  }
});

server.stderr.on('data', (d) => {
  const text = d.toString().trim();
  if (text) log(`[STDERR] ${text}`);
});

server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } }) + '\n');
setTimeout(() => { log('❌ TIMEOUT'); server.kill(); process.exit(1); }, 15000);
