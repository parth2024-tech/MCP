/**
 * fs-utils.js — Filesystem utilities for the ASE MCP Server.
 *
 * Includes a fail-closed path guard controlled by the ASE_ALLOWED_DIRS
 * environment variable. When set, any path outside the allowed list is blocked.
 *
 * ASE_ALLOWED_DIRS format: colon-separated absolute paths.
 * Example: ASE_ALLOWED_DIRS=/home/user/skiils:/home/user/projects
 *
 * If ASE_ALLOWED_DIRS is not set, path guarding is DISABLED (open by default)
 * to preserve backwards compatibility during migration. Set it in .env to harden.
 */

const fs = require('fs').promises;
const path = require('path');
const { warn } = require('./logger');

// ─────────────────────────────────────────────────────────────
// Allowed Directories — Fail-Closed Path Guard
// ─────────────────────────────────────────────────────────────

/**
 * Returns the list of allowed directories from ASE_ALLOWED_DIRS env var.
 * @returns {string[]|null} Array of absolute paths, or null if not configured
 */
function getAllowedDirs() {
  const raw = process.env.ASE_ALLOWED_DIRS;
  if (!raw || !raw.trim()) return null; // Guard disabled

  return raw
    .split(':')
    .map(p => path.resolve(p.trim()))
    .filter(p => p.length > 0);
}

/**
 * Asserts that a given file path is within an allowed directory.
 * Throws an Error if ASE_ALLOWED_DIRS is set and the path is outside all allowed dirs.
 *
 * @param {string} filePath - The absolute path to check
 * @throws {Error} If the path is outside all allowed directories
 */
function assertPathAllowed(filePath) {
  const allowedDirs = getAllowedDirs();
  if (!allowedDirs) return; // Guard disabled

  const resolved = path.resolve(filePath);

  for (const allowed of allowedDirs) {
    // Must be exactly the dir or a subdirectory (prevent path traversal)
    if (resolved === allowed || resolved.startsWith(allowed + path.sep)) {
      return; // ✅ Allowed
    }
  }

  // Fail-closed: block access and log the attempt
  const err = new Error(
    `Security: Path "${resolved}" is outside all ASE_ALLOWED_DIRS. ` +
    `Allowed: [${allowedDirs.join(', ')}]. ` +
    `Add the directory to ASE_ALLOWED_DIRS in your .env to permit access.`
  );

  require('./logger').logger.error('FsUtils', err.message);
  throw err;
}

// ─────────────────────────────────────────────────────────────
// Markdown Discovery Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Async: Find the main markdown file for a skill directory.
 * Checks ASE_ALLOWED_DIRS if configured before accessing the path.
 *
 * @param {string} skillPath - Absolute path to the skill directory
 * @returns {Promise<string|null>} Absolute path to main markdown file, or null
 */
async function findMainMd(skillPath) {
  assertPathAllowed(skillPath);

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
 * Sync: Find the main markdown file for a skill directory.
 * Checks ASE_ALLOWED_DIRS if configured before accessing the path.
 *
 * @param {string} skillPath - Absolute path to the skill directory
 * @returns {string|null} Absolute path to main markdown file, or null
 */
function findMainMdSync(skillPath) {
  assertPathAllowed(skillPath);

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
  findMainMdSync,
  assertPathAllowed,
  getAllowedDirs
};
