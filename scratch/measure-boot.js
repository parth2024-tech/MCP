const { spawn } = require('child_process');

const start = Date.now();
const server = spawn('node', ['ase-mcp-server.js'], { cwd: '/home/thor/skiils/tools/server' });

let initTime = 0;

server.stdout.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('"result"') && !msg.includes('search_tools')) {
    initTime = Date.now();
    console.log(`Received initialize response in ${initTime - start}ms`);
    
    // Now request tools/list
    const callMsg = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    server.stdin.write(JSON.stringify(callMsg) + '\n');
  } else if (msg.includes('search_tools')) {
    console.log(`Received tools/list response in ${Date.now() - initTime}ms`);
  }
});

const initMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
};
server.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  server.kill();
  process.exit(0);
}, 6000);
