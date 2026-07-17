const { spawn } = require('child_process');

const server = spawn('npx', ['tsx', 'ase-mcp-server.ts'], { cwd: '/home/thor/skiils/tools/server' });

server.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data.toString()}`);
});

server.stderr.on('data', (data) => {
  console.log(`STDERR: ${data.toString()}`);
});

const initMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
};
server.stdin.write(JSON.stringify(initMsg) + '\n');

setTimeout(() => {
  const callMsg = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'invoke_tool', arguments: { tool_name: 'delegate_to_openhands', tool_input: { task_description: 'test' } } }
  };
  console.log('Requesting tools/call delegate_to_openhands...');
  server.stdin.write(JSON.stringify(callMsg) + '\n');
}, 1000);

setTimeout(() => {
  const callMsg = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'search_tools', arguments: { query: 'test' } }
  };
  console.log('Requesting tools/call search_tools...');
  server.stdin.write(JSON.stringify(callMsg) + '\n');
}, 2000);

setTimeout(() => server.kill(), 3000);
