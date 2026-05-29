/**
 * ASE Structured Logger
 *
 * Leveled, structured JSON logger using Pino.
 */

const pino = require('pino');
const path = require('path');
const fs = require('fs');

const LOG_DIR = '/home/thor/.agents/logs';
const LOG_FILE = path.join(LOG_DIR, 'skills_audit.log');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  process.stderr.write(`ASE Logger: Failed to create log directory: ${err.message}\n`);
}

const pinoLogger = pino({
  level: process.env.ASE_LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.destination(LOG_FILE));

function createLogger(reqId = null) {
  const child = reqId ? pinoLogger.child({ req_id: reqId }) : pinoLogger;
  
  return {
    debug: (tag, msg, details) => child.debug({ tag, ...details }, msg),
    info:  (tag, msg, details) => child.info({ tag, ...details }, msg),
    warn:  (tag, msg, details) => child.warn({ tag, ...details }, msg),
    error: (tag, msg, details) => child.error({ tag, ...details }, msg),

    toolResult: (toolName, durationMs, success, details) => {
      const level = success ? 'info' : 'error';
      child[level]({
        tag: 'ToolDispatch',
        duration_ms: durationMs,
        ...details
      }, `${toolName} ${success ? 'succeeded' : 'failed'} in ${durationMs}ms`);
    },

    logAccess: (agent, skill, status, durationMs, details = {}) => {
      child.info({
        tag: 'Access',
        agent,
        duration_ms: durationMs,
        ...details
      }, `${skill} [${status}]`);
    },

    child: (childReqId) => createLogger(childReqId),
    reqId
  };
}

const logger = createLogger(null);

function logAccess(agent, skill, status, durationMs, details = {}) {
  logger.info('Access', `${skill} [${status}]`, { agent, duration_ms: durationMs, ...details });
}

function warn(tag, message, details = {}) {
  logger.warn(tag, message, details);
}

module.exports = {
  logger,
  createLogger,
  logAccess,
  warn
};
