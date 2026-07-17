'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

// ─── Timeout configuration ─────────────────────────────────────────────────
//
// Why every spoke operation needs a timeout:
//
//   client.connect() — spawns the spoke process (e.g. `npx -y ...`) and waits
//   for the MCP handshake. If npm is slow or the network is unreachable, this
//   blocks indefinitely. The server startup call is fire-and-forget, so a hang
//   here doesn't block the server — but it does leave a Promise that never
//   settles, and the spoke slot is never populated, so all callTool() calls
//   throw "not connected" immediately (good). However the spoke restart loop
//   (onClose) keeps retrying indefinitely, each time spawning a new npx process.
//
//   client.listTools() / client.callTool() — the spoke process may have died
//   without triggering onClose (e.g. zombie process, OS pipe buffering). The
//   underlying stdio transport then blocks on read() indefinitely. Without a
//   timeout, every listAggregatedTools() call during the server's ListTools
//   handler hangs, which blocks Antigravity's own tool dispatch loop for as
//   long as the hang lasts — which is why `invoke_tool { list_pages }` shows
//   "Working." for 10+ minutes. The call isn't hanging in the tool handler
//   itself; it's hanging in the ListTools response that runs before dispatch.
//
// Timeouts used:
//   CONNECT_TIMEOUT_MS  — maximum time to wait for a spoke to handshake on startup
//   CALL_TIMEOUT_MS     — maximum time for any listTools() or callTool() call
//   RESTART_DELAY_MS    — delay before attempting a spoke restart after disconnect

const CONNECT_TIMEOUT_MS = parseInt(process.env.ASE_SPOKE_CONNECT_TIMEOUT_MS || '15000', 10);
const CALL_TIMEOUT_MS    = parseInt(process.env.ASE_SPOKE_CALL_TIMEOUT_MS    || '30000', 10);
const RESTART_DELAY_MS   = parseInt(process.env.ASE_SPOKE_RESTART_DELAY_MS   || '5000',  10);
const MAX_RESTART_ATTEMPTS = parseInt(process.env.ASE_SPOKE_MAX_RESTART_ATTEMPTS || '5', 10);

/**
 * Race a promise against a timeout.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label  — included in the error message for diagnostics
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms: ${label}`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

class SpokeManager {
  constructor(configPath, mockConfig = null) {
    this.spokes = new Map();
    this._restartCounts = new Map();
    this.configPath = configPath || path.join(process.cwd(), 'spokes.json');
    this.config = mockConfig || this._loadConfig();
  }

  _loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data).spokes || {};
      }
    } catch (err) {
      logger.error('SpokeManager', `Failed to load spokes config: ${err.message}`);
    }
    return {};
  }

  async initialize() {
    const promises = Object.entries(this.config).map(([name, config]) =>
      this._startSpoke(name, config)
    );
    await Promise.allSettled(promises);
    logger.info('SpokeManager', `Initialized ${this.spokes.size} spokes`);
  }

  async _startSpoke(name, config) {
    try {
      const transport = this._createTransport(config);
      const client    = this._createClient();

      // Fix: connect with a hard timeout.
      // Without this, `npx -y <package>` hangs if npm is slow or offline,
      // causing the spoke slot to remain empty forever and triggering
      // infinite restart loops that each spawn a new orphaned npx process.
      await withTimeout(
        client.connect(transport),
        CONNECT_TIMEOUT_MS,
        `spoke '${name}' connect (${config.command} ${(config.args || []).join(' ')})`
      );

      this.spokes.set(name, {
        client,
        transport,
        config,
        status: 'connected'
      });

      this._restartCounts.set(name, 0); // Reset restart counter on success
      logger.info('SpokeManager', `Spoke '${name}' connected successfully.`);

      // Auto-restart on disconnect
      transport.onClose = () => {
        const attempts = (this._restartCounts.get(name) || 0) + 1;
        this._restartCounts.set(name, attempts);

        this.spokes.delete(name);

        if (attempts > MAX_RESTART_ATTEMPTS) {
          logger.error('SpokeManager', `Spoke '${name}' disconnected. Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Marking as permanently failed.`);
          this.spokes.set(name, { status: 'failed', config });
          metrics.increment('spoke.restart_exhausted', { service: name });
          return;
        }

        const delay = Math.min(RESTART_DELAY_MS * Math.pow(2, attempts - 1), 120000);
        logger.warn('SpokeManager', `Spoke '${name}' disconnected. Restarting in ${delay}ms... (attempt ${attempts}/${MAX_RESTART_ATTEMPTS})`);
        metrics.increment('spoke.restart_attempt', { service: name });
        setTimeout(() => this._startSpoke(name, config), delay);
      };

    } catch (err) {
      logger.error('SpokeManager', `Failed to start spoke '${name}': ${err.message}`);
      // Spoke remains absent from this.spokes — callTool() will throw "not connected"
      // which is a clean, immediate error rather than a silent hang.
    }
  }

  async listAggregatedTools() {
    const allTools = [];
    for (const [name, spoke] of this.spokes.entries()) {
      if (spoke.status !== 'connected') continue;
      try {
        // Fix: list tools with a hard timeout.
        // A zombie spoke process (died but onClose not yet fired) leaves the
        // stdio transport blocked on read(). Without a timeout, this call hangs
        // indefinitely, which blocks the MCP ListTools handler, which blocks
        // every subsequent tool dispatch in the host agent.
        const response = await withTimeout(
          spoke.client.listTools(),
          CALL_TIMEOUT_MS,
          `spoke '${name}' listTools`
        );
        const tools = response.tools.map(tool => ({
          ...tool,
          name: `${name}__${tool.name}`,
          _originalName: tool.name,
          _spoke: name
        }));
        allTools.push(...tools);
      } catch (err) {
        logger.error('SpokeManager',
          `Failed to list tools for spoke '${name}': ${err.message}. ` +
          `Marking spoke as degraded.`
        );
        // Mark the spoke degraded so subsequent calls fail fast until it recovers.
        if (spoke) spoke.status = 'degraded';
      }
    }
    return allTools;
  }

  async callTool(prefixedName, args) {
    // Expected format: spokeName__toolName
    const match = prefixedName.match(/^([a-zA-Z0-9_-]+)__(.+)$/);
    if (!match) {
      throw new Error(`Invalid proxy tool name format: ${prefixedName}`);
    }

    const [, spokeName, originalName] = match;
    const spoke = this.spokes.get(spokeName);

    if (!spoke || spoke.status !== 'connected') {
      throw new Error(`Spoke '${spokeName}' is not connected or doesn't exist.`);
    }

    // Fix: call tool with a hard timeout.
    // Same zombie-spoke problem as listTools: without a timeout, a dead spoke
    // process causes callTool() to block indefinitely on the stdio read.
    try {
      const result = await withTimeout(
        spoke.client.callTool({ name: originalName, arguments: args }),
        CALL_TIMEOUT_MS,
        `spoke '${spokeName}' callTool '${originalName}'`
      );
      return result;
    } catch (err) {
      // If the call timed out, mark the spoke degraded.
      if (err.message.includes('Timed out')) {
        logger.warn('SpokeManager',
          `callTool timed out for spoke '${spokeName}' tool '${originalName}'. ` +
          `Marking spoke as degraded.`
        );
        if (spoke) spoke.status = 'degraded';
      }
      throw new Error(`Spoke '${spokeName}' tool execution failed: ${err.message}`);
    }
  }

  getSpokeClient(name) {
    return this.spokes.get(name)?.client;
  }

  _createTransport(config) {
    return new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: { ...process.env, ...(config.env || {}) }
    });
  }

  _createClient() {
    return new Client(
      { name: 'ase-hub-client', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  resetSpoke(name) {
    this._restartCounts.set(name, 0);
    const config = this.config[name];
    if (config) {
      logger.info('SpokeManager', `Manually resetting spoke '${name}'`);
      this._startSpoke(name, config);
    } else {
      logger.warn('SpokeManager', `Cannot reset spoke '${name}': no configuration found`);
    }
  }

  shutdown() {
    for (const [name, spoke] of this.spokes.entries()) {
      try {
        spoke.transport.close();
      } catch (err) {
        // ignore
      }
    }
    this.spokes.clear();
  }
}

module.exports = SpokeManager;
