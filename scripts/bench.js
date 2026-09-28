const { spawn } = require('child_process');

async function runBench() {
  const server = spawn('node', ['tools/server/ase-mcp-server.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let messageQueue = [];
  
  server.stdout.on('data', (data) => {
    const messages = data.toString().split('\n').filter(Boolean);
    for (const msg of messages) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.id && messageQueue[parsed.id]) {
          messageQueue[parsed.id](parsed);
          delete messageQueue[parsed.id];
        }
      } catch (e) {
        // ignore non-json
      }
    }
  });

  let messageId = 1;
  const sendRequest = (method, params) => {
    return new Promise((resolve) => {
      const id = messageId++;
      messageQueue[id] = resolve;
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }) + '\n');
    });
  };

  // Wait for server to initialize
  await new Promise(r => setTimeout(r, 2000));
  
  // Initialize
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'bench', version: '1.0.0' }
  });
  
  await sendRequest('notifications/initialized', {});

  // Warmup query_skills
  console.log("Warming up query_skills...");
  for (let i = 0; i < 5; i++) {
    await sendRequest('tools/call', {
      name: 'query_skills',
      arguments: { request: 'test testing', max_skills: 3 }
    });
  }

  console.log("Measuring query_skills latency (50 calls)...");
  const latencies = [];
  for (let i = 0; i < 50; i++) {
    const start = Date.now();
    await sendRequest('tools/call', {
      name: 'query_skills',
      arguments: { request: 'test testing ' + i, max_skills: 3 }
    });
    latencies.push(Date.now() - start);
  }
  
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  console.log(`query_skills: Avg = ${avg.toFixed(2)}ms, p99 = ${p99}ms`);

  console.log("Measuring validate_output latency...");
  const valStart = Date.now();
  await sendRequest('tools/call', {
    name: 'validate_output',
    arguments: { 
      changed_files: ['src/app/page.tsx']
    }
  });
  console.log(`validate_output latency: ${Date.now() - valStart}ms`);

  // Wait before exit to ensure profile data is written
  await new Promise(r => setTimeout(r, 1000));
  server.kill();
}

runBench().catch(console.error);
