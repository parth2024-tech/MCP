"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyMiddleware = void 0;
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');
/**
 * ConcurrencyMiddleware — Semaphore-based backpressure for tool dispatch.
 *
 * Fix 11 — No backpressure on tool invocation.
 *
 * PROBLEM:
 *   The MCP server accepts tool calls with no concurrency limit. In a
 *   multi-agent scenario where a hub federates multiple spokes, 50+ tool
 *   calls can arrive concurrently. Each handler may allocate significant
 *   heap memory (embedding lookups, SQLite queries, Neo4j traversals, worker
 *   pool IPC). Node.js has no back-pressure mechanism at the tool layer: all
 *   50 handlers start simultaneously, the V8 heap grows unboundedly, GC
 *   pressure increases, and the process eventually OOM-crashes.
 *
 * FIX:
 *   A counting semaphore with a configurable max concurrency (default: 10,
 *   overridden by ASE_MAX_CONCURRENCY env var). Incoming tool calls that
 *   exceed the limit are QUEUED (not rejected) — they wait until a running
 *   handler releases a permit. This:
 *     - Caps heap growth to at most MAX_CONCURRENCY simultaneous handlers
 *     - Makes memory usage predictable and bounded under load
 *     - Preserves correct ordering (FIFO queue)
 *     - Does not drop requests — every tool call eventually completes
 *
 * PLACEMENT:
 *   First in the pipeline (before MetricsMiddleware, AuthMiddleware,
 *   CacheMiddleware, ToolExecutionMiddleware). This means the semaphore gates
 *   every tool call including cached ones. Cached responses are cheap enough
 *   that gating them adds no meaningful latency, but it prevents a wave of
 *   cache-miss calls from exhausting the heap before the cache can absorb them.
 *
 * OBSERVABILITY:
 *   - metrics.gauge('tool.concurrency.active', n)  — currently executing handlers
 *   - metrics.gauge('tool.concurrency.queued', n)  — waiting for a permit
 *   - metrics.increment('tool.concurrency.acquired') — per successful acquire
 *   - metrics.histogram('tool.concurrency.wait_ms', ms) — queue wait time
 *   These appear in the /metrics JSON endpoint.
 *
 * CONFIGURATION:
 *   ASE_MAX_CONCURRENCY=<n>   Set max concurrent tool handlers (default: 10).
 *   ASE_MAX_QUEUE_DEPTH=<n>   Set max queued requests before rejection (default: 200).
 *                             Requests beyond this limit return a 503-style error
 *                             rather than queueing indefinitely and causing memory
 *                             pressure from the queue itself.
 */
class ConcurrencyMiddleware {
    maxConcurrency;
    maxQueueDepth;
    active = 0;
    queued = 0;
    // FIFO queue of resolve functions. Each item is a function that, when
    // called, unblocks one waiting acquire() call.
    waitQueue = [];
    constructor() {
        this.maxConcurrency = parseInt(process.env.ASE_MAX_CONCURRENCY || '10', 10);
        this.maxQueueDepth = parseInt(process.env.ASE_MAX_QUEUE_DEPTH || '200', 10);
        logger.info('ConcurrencyMiddleware', `Semaphore initialised: maxConcurrency=${this.maxConcurrency} ` +
            `maxQueueDepth=${this.maxQueueDepth}`);
    }
    async handle(context, next) {
        const enqueuedAt = Date.now();
        // Reject immediately if the queue is full — prevents the queue itself
        // from consuming unbounded memory under extreme load.
        if (this.active >= this.maxConcurrency && this.queued >= this.maxQueueDepth) {
            metrics.increment('tool.concurrency.queue_full_reject');
            throw new Error(`Server overloaded: ${this.active} active + ${this.queued} queued tool calls. ` +
                `Maximum queue depth (${this.maxQueueDepth}) exceeded. Retry after a moment.`);
        }
        // Acquire a permit. Blocks (queues) if maxConcurrency is reached.
        await this._acquire();
        const waitMs = Date.now() - enqueuedAt;
        if (waitMs > 0) {
            metrics.histogram('tool.concurrency.wait_ms', waitMs);
        }
        metrics.increment('tool.concurrency.acquired');
        metrics.gauge('tool.concurrency.active', this.active);
        metrics.gauge('tool.concurrency.queued', this.queued);
        try {
            await next();
        }
        finally {
            this._release();
            metrics.gauge('tool.concurrency.active', this.active);
            metrics.gauge('tool.concurrency.queued', this.queued);
        }
    }
    /**
     * Acquire one permit from the semaphore.
     * Returns immediately if active < maxConcurrency.
     * Otherwise enqueues a resolver and awaits it (FIFO order).
     */
    _acquire() {
        if (this.active < this.maxConcurrency) {
            this.active++;
            return Promise.resolve();
        }
        // Slot is full — queue this caller.
        this.queued++;
        return new Promise((resolve) => {
            this.waitQueue.push(resolve);
        });
    }
    /**
     * Release one permit back to the semaphore.
     * If the wait queue is non-empty, immediately grants the permit to the
     * next waiter (FIFO) rather than decrementing active, keeping the count
     * correct without an extra acquire/release round-trip.
     */
    _release() {
        const next = this.waitQueue.shift();
        if (next) {
            // Hand the permit directly to the next waiter — active count stays the
            // same, queued count decrements.
            this.queued--;
            next();
        }
        else {
            this.active--;
        }
    }
    /** Snapshot for health reporting / tests. */
    get snapshot() {
        return {
            maxConcurrency: this.maxConcurrency,
            active: this.active,
            queued: this.queued,
            queueDepth: this.waitQueue.length
        };
    }
}
exports.ConcurrencyMiddleware = ConcurrencyMiddleware;
