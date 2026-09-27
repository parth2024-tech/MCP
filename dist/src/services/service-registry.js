"use strict";
/**
 * Service Registry — Centralized service health tracking.
 *
 * Provides a unified view of all service health statuses:
 *   - Redis (via RedisService.getHealth())
 *   - Knowledge Graph (Neo4j)
 *   - Embedding Service
 *   - Spokes (via SpokeManager)
 *
 * Exposed via the /health HTTP endpoint.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = void 0;
const health_watchdog_1 = require("./health-watchdog");
class ServiceRegistry {
    container;
    constructor(container) {
        this.container = container;
    }
    /**
     * Get health status for all registered services.
     */
    getHealth() {
        const services = [];
        // 1. Redis health check
        try {
            const redis = this.container.resolve('Redis');
            if (redis && typeof redis.getHealth === 'function') {
                const details = redis.getHealth();
                let status = 'healthy';
                if (details.state === 'circuit_open') {
                    status = 'unavailable';
                }
                else if (details.state !== 'connected') {
                    status = 'degraded';
                }
                services.push({
                    name: 'redis',
                    status,
                    details,
                    lastChecked: new Date().toISOString()
                });
            }
        }
        catch (_) {
            services.push({
                name: 'redis',
                status: 'unavailable',
                details: { error: 'Redis service not registered in container' },
                lastChecked: new Date().toISOString()
            });
        }
        // 2. Spokes health check
        try {
            const spokeManager = this.container.resolve('SpokeManager');
            if (spokeManager && spokeManager.spokes) {
                const spokesDetails = {};
                let status = 'healthy';
                let degradedCount = 0;
                let failedCount = 0;
                for (const [name, spoke] of spokeManager.spokes.entries()) {
                    spokesDetails[name] = {
                        status: spoke.status,
                        config: {
                            command: spoke.config?.command,
                            args: spoke.config?.args,
                        }
                    };
                    if (spoke.status === 'degraded') {
                        degradedCount++;
                    }
                    else if (spoke.status !== 'connected') {
                        failedCount++;
                    }
                }
                if (failedCount > 0) {
                    status = 'unavailable';
                }
                else if (degradedCount > 0) {
                    status = 'degraded';
                }
                services.push({
                    name: 'spokes',
                    status,
                    details: {
                        total: spokeManager.spokes.size,
                        degraded: degradedCount,
                        failed: failedCount,
                        list: spokesDetails
                    },
                    lastChecked: new Date().toISOString()
                });
            }
        }
        catch (_) {
            // Spoke manager not initialized or not found
        }
        // 3. Worker Pool check
        try {
            const workerPool = this.container.resolve('WorkerPool');
            if (workerPool) {
                services.push({
                    name: 'worker-pool',
                    status: 'healthy',
                    details: {
                        queueLength: workerPool.queueLength || 0,
                        activeTasks: workerPool.activeTasks || 0
                    },
                    lastChecked: new Date().toISOString()
                });
            }
        }
        catch (_) {
            // Ignored
        }
        // 4. Memory/Performance (Watchdog snapshot)
        try {
            const watchdogHealth = (0, health_watchdog_1.getHealthSnapshot)();
            services.push({
                name: 'watchdog',
                status: watchdogHealth.status,
                details: {
                    eventLoopLagMs: watchdogHealth.eventLoopLagMs,
                    heap: watchdogHealth.heap
                },
                lastChecked: watchdogHealth.timestamp
            });
        }
        catch (_) {
            // Watchdog not started or failed
        }
        return services;
    }
    /**
     * Get overall system health status.
     */
    getOverallStatus() {
        const list = this.getHealth();
        let overall = 'healthy';
        for (const s of list) {
            if (s.status === 'unavailable') {
                return 'unavailable'; // Immediate worst-case
            }
            if (s.status === 'degraded') {
                overall = 'degraded';
            }
        }
        return overall;
    }
    /**
     * Convert service registry health status to JSON format.
     */
    toJSON() {
        const services = this.getHealth();
        const status = this.getOverallStatus();
        return {
            status,
            timestamp: new Date().toISOString(),
            services
        };
    }
}
exports.ServiceRegistry = ServiceRegistry;
