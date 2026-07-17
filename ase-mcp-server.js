#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const child = spawn('node', [
    '--max-old-space-size=2048',
    '-r',
    'tsx',
    path.join(__dirname, 'ase-mcp-server.ts')
], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'] // Pipe stdin, stdout, and stderr explicitly
});

let lastStderr = '';

// Capture child stderr for diagnostics
child.stderr.on('data', (chunk) => {
    lastStderr = (lastStderr + chunk.toString()).slice(-2000);
});

// Explicitly pipe streams to ensure no buffering or timeout blocks
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on('error', (err) => {
    const errorPayload = {
        event: 'ase_mcp_server_start_failed',
        message: 'Failed to start MCP server process',
        error: err.message,
        timestamp: new Date().toISOString()
    };
    process.stderr.write(JSON.stringify(errorPayload) + '\n');
    process.exit(1);
});

// Startup health check: alert if no stdout data is seen within 30 seconds
let startupReady = false;
child.stdout.once('data', () => {
    startupReady = true;
});

setTimeout(() => {
    if (!startupReady) {
        const timeoutPayload = {
            event: 'ase_mcp_server_startup_timeout',
            message: 'Server did not produce stdout within 30s — possible freeze or hang',
            last_stderr: lastStderr,
            timestamp: new Date().toISOString()
        };
        process.stderr.write(JSON.stringify(timeoutPayload) + '\n');
    }
}, 30000).unref();

child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
        const errorPayload = {
            event: 'ase_mcp_server_crash',
            exit_code: code,
            signal: signal,
            last_stderr: lastStderr,
            timestamp: new Date().toISOString(),
            message: `ASE MCP Server exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`
        };
        process.stderr.write(JSON.stringify(errorPayload) + '\n');
    }
    process.exit(code || 0);
});

// If the parent process is killed by the IDE, kill the child to prevent zombies
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
    process.on(signal, () => {
        if (!child.killed) child.kill(signal);
        process.exit(0);
    });
});
