import type { Middleware, MiddlewareContext } from './Pipeline';

export class MetricsMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
    const metrics = context.container.resolve<any>('Metrics');
    const sessionState = context.container.resolve<any>('SessionState');
    
    metrics.inc('tool_calls_total', context.name);
    metrics.inc('tool_calls_total'); // Global counter
    
    const startMs = Date.now();
    let isError = false;

    try {
      await next();
    } catch (err) {
      isError = true;
      metrics.inc('tool_errors_total', context.name);
      metrics.inc('tool_errors_total'); // Global counter
      throw err;
    } finally {
      const durationMs = Date.now() - startMs;
      metrics.record('tool_call_duration_ms', durationMs, context.name);
      metrics.record('tool_call_duration_ms', durationMs); // Global latency histogram
      
      if (sessionState && typeof sessionState.logToolCall === 'function') {
        sessionState.logToolCall(context.name, durationMs, isError);
      }

      // Evaluate alert thresholds
      try {
        const orch = context.container.resolve<any>('OrchestrationDB');
        if (orch) {
          const redis = orch.getRedisClient();
          const thresholdsRaw = await redis.get('ase:alert_thresholds');
          if (thresholdsRaw) {
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
            if (thresholds.p99_latency_ms !== undefined && p99 > thresholds.p99_latency_ms) breached = true;
            if (thresholds.max_error_rate !== undefined && errorRate > thresholds.max_error_rate) breached = true;
            if (thresholds.min_cache_hit_ratio !== undefined && cacheHitRatio < thresholds.min_cache_hit_ratio) breached = true;

            const prevDegraded = await redis.get('ase:system_degraded') === 'true';

            if (breached) {
              if (!prevDegraded) {
                await redis.set('ase:system_degraded', 'true');
                orch.emitEvent('system_degraded', { p99, errorRate, cacheHitRatio });
              }
            } else {
              if (prevDegraded) {
                await redis.set('ase:system_degraded', 'false');
                orch.emitEvent('system_recovered', { p99, errorRate, cacheHitRatio });
              }
            }
          }
        }
      } catch (e) {
        // Ignore threshold evaluation errors to prevent breaking tool execution flow
      }
    }
  }
}
