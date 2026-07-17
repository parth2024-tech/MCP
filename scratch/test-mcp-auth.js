const { spawn } = require('child_process');

const server = spawn('npx', ['tsx', 'ase-mcp-server.ts'], { cwd: '/home/thor/skiils/tools/server' });

server.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data.toString()}`);
});

server.stderr.on('data', (data) => {
  console.log(`STDERR: ${data.toString()}`);
});

// Send JSON-RPC init
const initMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
};
server.stdin.write(JSON.stringify(initMsg) + '\n');

// Send tool call without agent_token
setTimeout(() => {
  const callMsg = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_model_config', arguments: {} }
  };
  console.log('Sending unauthorized call...');
  server.stdin.write(JSON.stringify(callMsg) + '\n');
}, 2000);

setTimeout(() => server.kill(), 4000);
