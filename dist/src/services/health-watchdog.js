"use strict";
/**
 * Health Watchdog — Periodic health monitoring and self-healing.
 *
 * Monitors:
 *   - Event loop lag (via perf_hooks monitorEventLoopDelay)
 *   - V8 heap pressure (via memory-guard)
 *   - Redis circuit breaker state
 *   - Spoke health status
 *
 * Emits structured health_check metrics and logs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatchdog = startWatchdog;
exports.getHealthSnapshot = getHealthSnapshot;
exports.stopWatchdog = stopWatchdog;
const perf_hooks_1 = require("perf_hooks");
const memory_guard_1 = require("../utils/memory-guard");
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');
let watchdogInterval = null;
let eventLoopMonitor = null;
let lastSnapshot = null;
/**
 * Start health watchdog monitoring.
 */
function startWatchdog(container, intervalMs = 30000) {
    if (watchdogInterval)
        return;
    logger.info('HealthWatchdog', 'Health watchdog started');
    eventLoopMonitor = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 20 });
    eventLoopMonitor.enable();
    watchdogInterval = setInterval(() => {
        try {
            if (!eventLoopMonitor)
                return;
            // 1. Event loop lag calculation (convert nanoseconds to milliseconds)
            const lagNs = eventLoopMonitor.percentile(99);
            const lagMs = Math.round(lagNs / 1e6);
            eventLoopMonitor.reset();
            // 2. Heap status
            const heap = (0, memory_guard_1.getHeapStatus)();
            // 3. Redis availability and state
            let redisAvailable = false;
            let redisState = 'unknown';
            try {
                const redisService = container.resolve('Redis');
                if (redisService) {
                    redisState = typeof redisService.getState === 'function' ? redisService.getState() : 'unknown';
                    redisAvailable = typeof redisService.isAvailable === 'function' ? redisService.isAvailable() : false;
                }
                else {
                    // Fallback to OrchestrationDB if Redis service isn't direct
                    const orch = container.resolve('OrchestrationDB');
                    redisAvailable = orch?.isRedisAvailable?.() ?? false;
                    redisState = redisAvailable ? 'connected' : 'disconnected';
                }
            }
            catch (_) {
                // Ignored
            }
            // 4. Spoke health
            let connectedSpokes = 0;
            let degradedSpokes = 0;
            let failedSpokes = 0;
            let totalSpokes = 0;
            try {
                const spokeManager = container.resolve('SpokeManager');
                if (spokeManager && spokeManager.spokes) {
                    totalSpokes = spokeManager.spokes.size;
                    for (const spoke of spokeManager.spokes.values()) {
                        if (spoke.status === 'connected') {
                            connectedSpokes++;
                        }
                        else if (spoke.status === 'degraded') {
                            degradedSpokes++;
                        }
                        else {
                            failedSpokes++;
                        }
                    }
                }
            }
            catch (_) {
                // Ignored
            }
            // 5. Determine overall system status
            let systemStatus = 'healthy';
            if (heap.status === 'critical' || lagMs > 5000 || failedSpokes > 0) {
                systemStatus = 'unavailable';
            }
            else if (heap.status === 'warning' || degradedSpokes > 0 || !redisAvailable) {
                systemStatus = 'degraded';
            }
            lastSnapshot = {
                timestamp: new Date().toISOString(),
                eventLoopLagMs: lagMs,
                heap,
                redis: {
                    available: redisAvailable,
                    state: redisState,
                },
                spokes: {
                    connected: connectedSpokes,
                    degraded: degradedSpokes,
                    failed: failedSpokes,
                    total: totalSpokes,
                },
                status: systemStatus,
            };
            // 6. Emit metrics
            metrics.gauge('health.event_loop_lag_ms', lagMs);
            metrics.gauge('health.spokes_connected', connectedSpokes);
            metrics.gauge('health.spokes_degraded', degradedSpokes);
            metrics.gauge('health.spokes_failed', failedSpokes);
            metrics.gauge('health.redis_available', redisAvailable ? 1 : 0);
            metrics.gauge('health.status', systemStatus === 'healthy' ? 1 : (systemStatus === 'degraded' ? 0.5 : 0));
            // 7. Critical block alert
            if (lagMs > 5000) {
                logger.error('HealthWatchdog', `CRITICAL: Event loop lag is extremely high: ${lagMs}ms`, {
                    lag_ms: lagMs,
                });
                metrics.increment('health.event_loop_block');
            }
            // Log summaries
            if (systemStatus !== 'healthy') {
                logger.warn('HealthWatchdog', `System is ${systemStatus}`, {
                    status: systemStatus,
                    lag_ms: lagMs,
                    heap: heap.usagePercent,
                    redis: redisState,
                    spokes: `${connectedSpokes}/${totalSpokes} connected`,
                });
            }
            else {
                logger.debug('HealthWatchdog', 'System health check completed. All systems healthy.', {
                    lag_ms: lagMs,
                    heap: heap.usagePercent,
                });
            }
        }
        catch (err) {
            logger.error('HealthWatchdog', `Error in watchdog tick: ${err.message}`);
        }
    }, intervalMs);
}
/**
 * Get latest health snapshot.
 */
function getHealthSnapshot() {
    if (!lastSnapshot) {
        const heap = (0, memory_guard_1.getHeapStatus)();
        return {
            timestamp: new Date().toISOString(),
            eventLoopLagMs: 0,
            heap,
            redis: { available: false, state: 'unknown' },
            spokes: { connected: 0, degraded: 0, failed: 0, total: 0 },
            status: 'healthy',
        };
    }
    return lastSnapshot;
}
/**
 * Stop watchdog monitoring.
 */
function stopWatchdog() {
    if (watchdogInterval) {
        clearInterval(watchdogInterval);
        watchdogInterval = null;
        logger.info('HealthWatchdog', 'Health watchdog stopped');
    }
    if (eventLoopMonitor) {
        eventLoopMonitor.disable();
        eventLoopMonitor = null;
    }
}
