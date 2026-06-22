/**
 * ASE Retry Utility
 *
 * Wraps an async function with exponential backoff retry logic.
 * Used to harden embedding generation and file I/O operations.
 */
const { logger } = require('./logger');

/**
 * Retries an async function with exponential backoff.
 *
 * @param {Function} fn           - Async function to retry
 * @param {object}   opts
 * @param {number}   opts.attempts  - Max number of attempts (default 3)
 * @param {number}   opts.baseMs    - Base delay in ms (default 200)
 * @param {number}   opts.maxMs     - Max delay cap in ms (default 5000)
 * @param {string}   opts.tag       - Log tag for diagnostics
 * @returns {Promise<*>}           - Result of fn on success
 * @throws  {Error}               - Last error if all attempts fail
 */
async function withRetry(fn, { attempts = 3, baseMs = 200, maxMs = 5000, tag = 'retry' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) break;

      const delay = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
      logger.warn('Retry', `[${tag}] Attempt ${attempt}/${attempts} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
