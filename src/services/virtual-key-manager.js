const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

const KEYS_FILE = path.join(__dirname, '..', '..', 'virtual-keys.json');

class VirtualKeyManager {
  constructor() {
    this.keys = {};
    this._loadKeys();
  }

  _loadKeys() {
    try {
      if (fs.existsSync(KEYS_FILE)) {
        this.keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        logger.info('VirtualKeyManager', `Loaded ${Object.keys(this.keys).length} virtual keys.`);
      } else {
        logger.warn('VirtualKeyManager', `No virtual-keys.json found at ${KEYS_FILE}. All requests will default to master access if no key is provided.`);
      }
    } catch (err) {
      logger.error('VirtualKeyManager', `Failed to load virtual keys: ${err.message}`);
    }
  }

  isAuthorized(virtualKey, toolName) {
    if (!virtualKey) return true; 

    const scope = this.keys[virtualKey];
    if (!scope) return false; 

    if (scope.includes('*')) return true; 
    return scope.includes(toolName);
  }

  filterAuthorizedTools(virtualKey, toolsArray) {
    if (!virtualKey) return toolsArray;

    const scope = this.keys[virtualKey];
    if (!scope) return [];

    if (scope.includes('*')) return toolsArray;

    return toolsArray.filter(tool => scope.includes(tool.name || tool));
  }
}

module.exports = VirtualKeyManager;
