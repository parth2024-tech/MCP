#!/usr/bin/env node
/**
 * Skill Issue MCP Stdio Bridge
 * Bridges standard MCP stdio transport to https://skill-issue.in/api/mcp
 */

const https = require('https');
const readline = require('readline');

const ENDPOINT = {
  hostname: 'skill-issue.in',
  path: '/api/mcp',
  method: 'POST'
};

function postRpc(requestObj) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestObj);
    const req = https.request({
      ...ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);
    
    // Notifications (like notifications/initialized) don't expect a response
    if (msg.method === 'notifications/initialized' || (!msg.id && msg.method)) {
      postRpc(msg).catch(() => {});
      return;
    }

    const response = await postRpc(msg);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (err) {
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.id !== undefined) {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id,
            error: { code: -32603, message: err.message }
          }) + '\n');
        }
      } catch {}
    }
  }
});
