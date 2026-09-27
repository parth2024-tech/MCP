"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsMiddleware = void 0;
class MetricsMiddleware {
    async handle(context, next) {
        const metrics = context.container.resolve('Metrics');
        const sessionState = context.container.resolve('SessionState');
        metrics.inc('tool_calls_total', context.name);
        metrics.inc('tool_calls_total'); // Global counter
        const startMs = Date.now();
        let isError = false;
        try {
            await next();
        }
        catch (err) {
            isError = true;
            metrics.inc('tool_errors_total', context.name);
            metrics.inc('tool_errors_total');
            throw err;
        }
        finally {
            // Mark error if the result payload itself is an error
            if (context.isError)
                isError = true;
            const durationMs = Date.now() - startMs;
            metrics.record('tool_call_duration_ms', durationMs, context.name);
            metrics.record('tool_call_duration_ms', durationMs);
            if (sessionState && typeof sessionState.logToolCall === 'function') {
                sessionState.logToolCall(context.name, durationMs, isError);
            }
            // ── Optional alert threshold evaluation (Redis-gated) ─────────────────
            // CRITICAL: Only runs if Redis is confirmed available via isRedisAvailable().
            // Without this guard, the redis.get() call hangs indefinitely when Redis
            // is down, causing every tool call to freeze at the metrics step.
            // The 500ms Promise.race is a secondary defence — the primary defence is
            // the isRedisAvailable() early-exit.
            const orch = context.container.has
                ? (context.container.has('OrchestrationDB') ? context.container.resolve('OrchestrationDB') : null)
                : context.container.resolve('OrchestrationDB');
            const redisUp = orch && typeof orch.isRedisAvailable === 'function' && orch.isRedisAvailable();
            if (redisUp) {
                try {
                    await Promise.race([
                        (async () => {
                            const redis = orch.getRedisClient();
                            if (!redis)
                                return;
                            const thresholdsRaw = await redis.get('ase:alert_thresholds');
                            if (!thresholdsRaw)
                                return;
                            const thresholds = JSON.parse(thresholdsRaw);
                            const summary = metrics.summarize('tool_call_duration_ms');
                            const p99 = (summary && typeof summary.p99 === 'number') ? summary.p99 : 0;
                            const totalCalls = metrics.getCount('tool_calls_total') || 0;
                            const totalErrors = metrics.getCount('tool_errors_total') || 0;
                            const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
                            const hits = (metrics.getCount('cache_hits') || 0) + (metrics.getCount('skill_cache_hits') || 0);
                            const misses = (metrics.getCount('cache_misses') || 0) + (metrics.getCount('skill_cache_misses') || 0);
                            const totalCache = hits + misses;
                            const cacheHitRatio = totalCache > 0 ? hits / totalCache : 1.0;
                            let breached = false;
                            if (thresholds.p99_latency_ms !== undefined && p99 > thresholds.p99_latency_ms)
                                breached = true;
                            if (thresholds.max_error_rate !== undefined && errorRate > thresholds.max_error_rate)
                                breached = true;
                            if (thresholds.min_cache_hit_ratio !== undefined && cacheHitRatio < thresholds.min_cache_hit_ratio)
                                breached = true;
                            const prevDegradedRaw = await redis.get('ase:system_degraded');
                            const prevDegraded = prevDegradedRaw === 'true';
                            if (breached && !prevDegraded) {
                                await redis.set('ase:system_degraded', 'true');
                                orch.emitEvent('system_degraded', { p99, errorRate, cacheHitRatio });
                            }
                            else if (!breached && prevDegraded) {
                                await redis.set('ase:system_degraded', 'false');
                                orch.emitEvent('system_recovered', { p99, errorRate, cacheHitRatio });
                            }
                        })(),
                        new Promise(resolve => setTimeout(resolve, 500)) // 500ms hard cap
                    ]);
                }
                catch (_e) {
                    // Ignore threshold evaluation errors — they are entirely optional observability.
                }
            }
        }
    }
}
exports.MetricsMiddleware = MetricsMiddleware;
