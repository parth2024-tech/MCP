"use strict";
/**
 * ASE Enhanced Retry Utility
 *
 * Wraps an async function with exponential/linear/constant backoff retry logic,
 * with jitter, cancellation (AbortSignal), and conditional retries.
 * Inspired by OpenHands tenacity retry patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const { logger } = require('./logger');
const metrics = require('./metrics');
/**
 * Retries an async function with exponential/linear/constant backoff and jitter.
 */
async function withRetry(fn, opts = {}) {
    const attempts = opts.attempts ?? 3;
    const baseMs = opts.baseMs ?? 200;
    const maxMs = opts.maxMs ?? 5000;
    const tag = opts.tag ?? 'retry';
    const jitterFactor = opts.jitterFactor ?? 0.25;
    const backoffType = opts.backoffType ?? 'exponential';
    const abortSignal = opts.abortSignal;
    let lastErr;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        // Check abort signal
        if (abortSignal?.aborted) {
            throw new Error(`[${tag}] Operation aborted on attempt ${attempt}`);
        }
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            // Check abort signal again
            if (abortSignal?.aborted) {
                throw new Error(`[${tag}] Operation aborted on attempt ${attempt}`);
            }
            // Check if we should retry this error type
            if (opts.retryIf && !opts.retryIf(err)) {
                throw err; // Fail-fast
            }
            // Stop if maximum attempts reached
            if (attempt === attempts)
                break;
            // Calculate delay based on strategy
            let delay = baseMs;
            if (backoffType === 'exponential') {
                delay = baseMs * Math.pow(2, attempt - 1);
            }
            else if (backoffType === 'linear') {
                delay = baseMs * attempt;
            }
            // Cap delay
            delay = Math.min(delay, maxMs);
            // Add full jitter (OpenHands pattern)
            const jitter = delay * jitterFactor * (Math.random() * 2 - 1); // ±jitterFactor
            delay = Math.max(0, Math.round(delay + jitter));
            logger.warn('Retry', `[${tag}] Attempt ${attempt}/${attempts} failed: ${err.message}. Retrying in ${delay}ms...`);
            // Trigger hook
            if (opts.onRetry) {
                try {
                    opts.onRetry(err, attempt);
                }
                catch (_) { }
            }
            // Track metric
            metrics.increment('retry.attempt', { tag });
            // Wait for delay or abort
            if (abortSignal) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        abortSignal.removeEventListener('abort', onAbort);
                        resolve();
                    }, delay);
                    const onAbort = () => {
                        clearTimeout(timeout);
                        reject(new Error(`[${tag}] Operation aborted during delay`));
                    };
                    abortSignal.addEventListener('abort', onAbort);
                });
            }
            else {
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw lastErr;
}
module.exports = { withRetry };
