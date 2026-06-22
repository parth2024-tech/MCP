const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Dynamically loads all tools from the specified directory.
   */
  loadToolsFromDirectory(dirPath, deps = {}) {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Tool directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        let toolModule = require(path.join(dirPath, file));
        
        // Handle ES6 default exports
        if (toolModule && toolModule.default) {
          toolModule = toolModule.default;
        }

        let tool;
        // If it's a class constructor extending BaseTool (we can check if it's a function but not a legacy factory)
        if (typeof toolModule === 'function') {
          // If the function throws when called without new, it's likely a class
          try {
            tool = toolModule(deps);
          } catch (e) {
            tool = new toolModule();
          }
        } else {
          tool = toolModule;
        }

        // It either has a 'handler' (legacy) or 'validateAndExecute' (new BaseTool)
        if (tool && tool.name && (tool.handler || tool.validateAndExecute)) {
          this.register(tool);
        } else {
          logger.warn('Registry', `Skipping invalid tool file: ${file}`);
        }
      }
    }
  }

  register(tool) {
    const { z } = require('zod');

    // Inject agent_token to all tools except the bootstrap tool register_agent
    if (tool.name !== 'register_agent') {
      // 1. Extend Zod schema for TypeScript tools
      if (tool.schema && typeof tool.schema.extend === 'function') {
        tool.schema = tool.schema.extend({
          agent_token: z.string().describe('Signed agent session token required for all tool calls')
        });
      }

      // 2. Inject into inputSchema for legacy JavaScript tools
      if (tool.inputSchema) {
        if (!tool.inputSchema.properties) {
          tool.inputSchema.properties = {};
        }
        tool.inputSchema.properties.agent_token = {
          type: 'string',
          description: 'Signed agent session token required for all tool calls'
        };
        if (!tool.inputSchema.required) {
          tool.inputSchema.required = [];
        }
        if (!tool.inputSchema.required.includes('agent_token')) {
          tool.inputSchema.required.push('agent_token');
        }
      }
    }

    this.tools.set(tool.name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  getSchemas() {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }
}

module.exports = ToolRegistry;
