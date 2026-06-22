/**
 * CircuitBreaker — Shared resilience primitive for ASE services.
 *
 * Implements the classic three-state finite state machine:
 *   CLOSED   → Normal operation. Failures are counted.
 *   OPEN     → Fast-fail. No calls forwarded until recoveryMs elapses.
 *   HALF_OPEN → Probe state. One call allowed; success closes, failure re-opens.
 *
 * Usage:
 *   const cb = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 60_000, serviceName: 'neo4j' });
 *   const result = await cb.call(() => doSomethingAsync());
 */

const { warn } = require('../utils/logger');
const metrics = require('../utils/metrics');

class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {number} [opts.failureThreshold=3]  — Consecutive failures before opening
   * @param {number} [opts.recoveryMs=60000]    — Milliseconds before attempting HALF_OPEN
   * @param {string} [opts.serviceName='unknown'] — Label used in logs and metrics
   */
  constructor({ failureThreshold = 3, recoveryMs = 60_000, serviceName = 'unknown' } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryMs = recoveryMs;
    this.serviceName = serviceName;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  /** Current breaker status (safe for health snapshots) */
  get status() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
      serviceName: this.serviceName
    };
  }

  /**
   * Call an async function through the breaker.
   * @param {() => Promise<any>} fn — The function to protect
   * @returns {Promise<any>}
   * @throws {Error} If the breaker is OPEN and recovery period hasn't elapsed
   */
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.recoveryMs) {
        this.state = 'HALF_OPEN';
        metrics.increment('circuit_breaker.to_half_open', { service: this.serviceName });
      } else {
        metrics.increment('circuit_breaker.rejected', { service: this.serviceName });
        throw new Error(`CircuitBreaker OPEN — ${this.serviceName} unavailable (retry after ${Math.ceil((this.recoveryMs - (Date.now() - this.openedAt)) / 1000)}s)`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    const wasNonClosed = this.state !== 'CLOSED';
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.openedAt = null;
    if (wasNonClosed) {
      metrics.increment('circuit_breaker.to_closed', { service: this.serviceName });
    }
  }

  _onFailure(err) {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold && this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      metrics.increment('circuit_breaker.to_open', { service: this.serviceName });
      warn('CircuitBreaker',
        `[${this.serviceName}] Circuit OPENED after ${this.failureCount} failures. Will retry in ${this.recoveryMs / 1000}s. Error: ${err.message}`
      );
    }
  }
}

module.exports = CircuitBreaker;
