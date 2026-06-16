#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const child = spawn('npx', ['tsx', 'ase-mcp-server.ts'], {
    cwd: __dirname,
    stdio: 'inherit' // Inherit stdin, stdout, stderr for MCP communication
});

child.on('error', (err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code || 0);
});
