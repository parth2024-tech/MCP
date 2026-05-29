const fs = require('fs').promises;
const path = require('path');
const { warn } = require('./logger');

/**
 * Shared utility to find the main markdown file for a skill directory.
 * @param {string} skillPath The absolute path to the skill directory.
 * @returns {Promise<string|null>} The absolute path to the main markdown file, or null.
 */
async function findMainMd(skillPath) {
  for (const name of ['SKILL.md', 'README.md']) {
    const p = path.join(skillPath, name);
    try {
      await fs.access(p);
      return p;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        require('./logger').logger.warn('FsUtils', `Access check failed for ${p}: ${err.message}`);
      }
    }
  }
  
  try {
    const files = await fs.readdir(skillPath);
    for (const f of files) {
      if (f.endsWith('.md')) return path.join(skillPath, f);
    }
  } catch (err) {
    warn('fs-utils', `readdir failed for "${skillPath}": ${err.message}`);
  }
  
  return null;
}

/**
 * Synchronous version to find the main markdown file.
 * @param {string} skillPath The absolute path to the skill directory.
 * @returns {string|null} The absolute path to the main markdown file, or null.
 */
function findMainMdSync(skillPath) {
  const fsSync = require('fs');
  for (const name of ['SKILL.md', 'README.md']) {
    const p = path.join(skillPath, name);
    if (fsSync.existsSync(p)) return p;
  }
  
  try {
    const files = fsSync.readdirSync(skillPath);
    for (const f of files) {
      if (f.endsWith('.md')) return path.join(skillPath, f);
    }
  } catch (err) {
    warn('fs-utils', `readdirSync failed for "${skillPath}": ${err.message}`);
  }
  
  return null;
}

module.exports = {
  findMainMd,
  findMainMdSync
};
