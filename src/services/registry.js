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
      if (file.endsWith('.js')) {
        const toolModule = require(path.join(dirPath, file));
        
        let tool;
        if (typeof toolModule === 'function') {
          tool = toolModule(deps);
        } else {
          tool = toolModule;
        }

        if (tool && tool.name && tool.handler) {
          this.register(tool);
        } else {
          logger.warn('Registry', `Skipping invalid tool file: ${file}`);
        }
      }
    }
  }

  register(tool) {
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
