/**
 * Shared ASE path & state-directory resolver.
 * Precedence: ASE_HOME -> $XDG_STATE_HOME/ase -> ~/.local/state/ase
 */
const os = require('os');
const path = require('path');

function getAseHome() {
  if (process.env.ASE_HOME && process.env.ASE_HOME.trim()) {
    return path.resolve(process.env.ASE_HOME.trim());
  }
  if (process.env.XDG_STATE_HOME && process.env.XDG_STATE_HOME.trim()) {
    return path.join(path.resolve(process.env.XDG_STATE_HOME.trim()), 'ase');
  }
  return path.join(os.homedir(), '.local', 'state', 'ase');
}

function getAseLogsDir() {
  return path.join(getAseHome(), 'logs');
}

function getRepoRoot(startDir = __dirname) {
  const normalized = startDir.split(path.sep).join('/');
  return path.resolve(startDir, normalized.includes('/tools/server') ? '../../../..' : '../..');
}

module.exports = { getAseHome, getAseLogsDir, getRepoRoot };
