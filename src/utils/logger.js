/**
 * ASE Structured Logger
 *
 * Leveled, structured JSON logger using Pino.
 * Includes logErrorOnce() for deduplication — identical fingerprinted errors
 * are only logged once per server process to prevent log file bloat.
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

// ─── Error Deduplication ─────────────────────────────────────────────────────

// Map<fingerprint, { count, firstSeenAt }>
const _seenFingerprints = new Map();
const MAX_FINGERPRINTS = 10000;

/**
 * Log an error exactly ONCE per server process lifetime, identified by its
 * fingerprint. Subsequent calls with the same fingerprint are silently counted
 * but not logged, preventing log explosion from repeated identical errors
 * (e.g. Redis unavailable firing on every tool call).
 *
 * @param {string} fingerprint - Unique hash (from ASEError.fingerprint)
 * @param {string} tag         - Logger tag
 * @param {string} msg         - Error message
 * @param {object} [details]   - Structured details (stack, tool, reqId, etc.)
 */
function logErrorOnce(fingerprint, tag, msg, details = {}) {
  const existing = _seenFingerprints.get(fingerprint);
  if (existing) {
    existing.count++;
    // Every 100 occurrences, emit a suppression summary so operators know
    // the error is ongoing but not flooding logs.
    if (existing.count % 100 === 0) {
      logger.warn(tag, `[SUPPRESSED x${existing.count}] ${msg} (first seen: ${existing.firstSeenAt})`, {
        fingerprint,
        suppressed_count: existing.count
      });
    }
    return;
  }
  _seenFingerprints.set(fingerprint, { count: 1, firstSeenAt: new Date().toISOString() });

  // Prevent memory leak by evicting oldest 20% when limit is reached
  if (_seenFingerprints.size > MAX_FINGERPRINTS) {
    const evictCount = Math.floor(MAX_FINGERPRINTS * 0.2);
    const iter = _seenFingerprints.keys();
    for (let i = 0; i < evictCount; i++) {
      const key = iter.next().value;
      if (key !== undefined) _seenFingerprints.delete(key);
    }
    logger.info('Logger', `Evicted ${evictCount} fingerprints (dedup cache was at ${MAX_FINGERPRINTS + 1})`);
  }

  logger.error(tag, msg, { fingerprint, ...details });
}

/**
 * Get stats about deduplicated fingerprints.
 */
function getDeduplicationStats() {
  return {
    size: _seenFingerprints.size,
    maxSize: MAX_FINGERPRINTS
  };
}

/**
 * Convenience: log an ASEError with full structured context.
 * Falls back to logErrorOnce for deduplication.
 *
 * @param {import('../utils/errors').ASEError} err
 * @param {string} [tag]
 */
function logASEError(err, tag = 'ASEError') {
  logErrorOnce(err.fingerprint, tag, `[${err.code}] ${err.message}`, {
    tool: err.toolName,
    req_id: err.reqId,
    retryable: err.retryable,
    fix_hint: err.fixHint,
    stack: err.stack,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

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
  logErrorOnce,
  logASEError,
  warn,
  getDeduplicationStats
};
