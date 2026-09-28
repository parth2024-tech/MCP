const fs = require('fs').promises;
const path = require('path');
const { LRUCache } = require('lru-cache');
const { logAccess, warn } = require('../utils/logger');
const { findMainMd } = require('../utils/fs-utils');
const metrics = require('../utils/metrics');

const SKILLS_DIR = process.env.ASE_ROOT || path.resolve(__dirname, __dirname.includes('tools/server') ? '../../../../' : '../../');

class SkillCache {
  constructor() {
    this.cache = new LRUCache({
      max: 50,
      ttl: 1000 * 60 * 60 * 24 // 24 hours
    });
  }

  async getSkillContent(skillName) {
    if (this.cache.has(skillName)) {
      const cached = this.cache.get(skillName);
      if (Date.now() - cached.timestamp > 5000) {
        try {
          const stat = await fs.stat(cached.path);
          if (stat.mtimeMs === cached.mtimeMs) {
            cached.timestamp = Date.now();
            metrics.inc('cache_hits');
            return cached;
          }
          // mtime changed — fall through to re-read
          metrics.inc('cache_invalidations');
          this.cache.delete(skillName);
        } catch (err) {
          warn('SkillCache', `mtime check failed for "${skillName}", evicting: ${err.message}`);
          metrics.inc('cache_invalidations');
          this.cache.delete(skillName);
        }
      } else {
        metrics.inc('cache_hits');
        return cached;
      }
    } else {
      metrics.inc('cache_misses');
    }

    let skillPath = path.join(SKILLS_DIR, 'skills', skillName);
    try {
      const stat = await fs.stat(skillPath);
      if (!stat.isDirectory()) skillPath = path.join(SKILLS_DIR, skillName);
    } catch {
      skillPath = path.join(SKILLS_DIR, skillName);
    }
    
    // Quick existence check
    try {
      const stat = await fs.stat(skillPath);
      if (!stat.isDirectory()) return null;
    } catch (err) {
      warn('SkillCache', `Skill directory not accessible for "${skillName}": ${err.message}`);
      return null;
    }

    const mdFile = await findMainMd(skillPath);
    if (!mdFile) return null;

    try {
      const stat = await fs.stat(mdFile);
      const content = await fs.readFile(mdFile, 'utf8');
      const result = { path: mdFile, content, mtimeMs: stat.mtimeMs, timestamp: Date.now() };
      this.cache.set(skillName, result);
      return result;
    } catch (err) {
      // Silently swallow cache load failures instead of polluting stdout
      // logger.error('Cache', `Failed to read ${mdFile}: ${err.message}`);
      return null;
    }
  }

}

module.exports = SkillCache;
