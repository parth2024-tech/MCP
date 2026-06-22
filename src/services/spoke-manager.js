'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { logger } = require('../utils/logger');

class SpokeManager {
  constructor(configPath, mockConfig = null) {
    this.spokes = new Map();
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
      const client = this._createClient();

      await client.connect(transport);
      
      this.spokes.set(name, {
        client,
        transport,
        config,
        status: 'connected'
      });

      logger.info('SpokeManager', `Spoke '${name}' connected successfully.`);

      // Handle process exit to auto-restart
      transport.onClose = () => {
        logger.warn('SpokeManager', `Spoke '${name}' disconnected. Restarting...`);
        this.spokes.delete(name);
        setTimeout(() => this._startSpoke(name, config), 5000);
      };

    } catch (err) {
      logger.error('SpokeManager', `Failed to start spoke '${name}': ${err.message}`);
    }
  }

  async listAggregatedTools() {
    const allTools = [];
    for (const [name, spoke] of this.spokes.entries()) {
      if (spoke.status === 'connected') {
        try {
          const response = await spoke.client.listTools();
          const tools = response.tools.map(tool => ({
            ...tool,
            name: `${name}__${tool.name}`, // Prefix to avoid collision
            _originalName: tool.name,
            _spoke: name
          }));
          allTools.push(...tools);
        } catch (err) {
          logger.error('SpokeManager', `Failed to list tools for spoke '${name}': ${err.message}`);
        }
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

    // Proxy the request
    try {
      const result = await spoke.client.callTool({
        name: originalName,
        arguments: args
      });
      return result;
    } catch (err) {
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
