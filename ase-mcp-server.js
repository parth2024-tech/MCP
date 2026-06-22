#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const child = spawn('node', [
    '-r',
    'tsx',
    path.join(__dirname, 'ase-mcp-server.ts')
], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'] // Pipe stdin, stdout, and stderr explicitly
});

// Explicitly pipe streams to ensure no buffering or timeout blocks
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on('error', (err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code || 0);
});
