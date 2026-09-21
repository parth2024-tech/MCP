import type { Middleware, MiddlewareContext } from './Pipeline';
import type { SessionToolCache } from '../core/Cache';

const OrchestrationDB = require('../services/orchestration-db');
const metrics = require('../utils/metrics');

/**
 * CacheMiddleware — Response caching + Activepieces DEDUPE_KEY idempotency.
 *
 * TWO independent layers:
 *
 * 1. DEDUPE_KEY guard (Activepieces pattern):
 *    Inspired by DEDUPE_KEY_PROPERTY in:
 *    activepieces/packages/pieces/framework/src/lib/trigger/trigger.ts
 *
 *    If the caller includes `dedupe_key` in tool args, the middleware looks up
 *    a SHA-256 hash of (tool_name + ':' + dedupe_key) in the SQLite dedupe_log
 *    table.  On a hit, the previously stored result is returned immediately —
 *    the downstream pipeline (auth, execution, etc.) is never reached.
 *    On a miss, the call proceeds normally and the result is stored in
 *    dedupe_log with a 24-hour TTL so future identical calls are idempotent.
 *
 *    Use cases:
 *    - Prevents duplicate task creation when agents retry on network failure.
 *    - Prevents duplicate memory writes from parallel subagents.
 *    - Prevents double-acquiring file locks on agent restart.
 *
 * 2. In-session response cache (existing behaviour):
 *    Caches tool results in the in-memory SessionToolCache for read-heavy
 *    tools within the same agent session.
 */
export class CacheMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {

    // ── Layer 1: DEDUPE_KEY guard ─────────────────────────────────────────────
    const dedupeKey: string | undefined = context.args?.dedupe_key;
    if (dedupeKey) {
      try {
        const orch = OrchestrationDB.getInstance();
        const hit = orch.checkDedupe(context.name, dedupeKey);
        if (hit) {
          const cachedResult = JSON.parse(hit.result);
          context.result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ...cachedResult,
                _dedupe: true,
                _dedupe_key: dedupeKey,
              }, null, 2)
            }]
          };
          context.handled = true;
          metrics.increment('cache.dedupe_hit');
          metrics.increment(`cache.dedupe_hit.${context.name}`);
          return; // ← short-circuit entire downstream pipeline
        }
      } catch (dedupeErr: any) {
        // Non-fatal: if dedupe check fails, proceed normally
      }
    }

    // ── Layer 2: In-session response cache ────────────────────────────────────
    const cache = context.container.resolve<SessionToolCache>('SessionToolCache');
    const cachedResult = cache.get(context.name, context.args);
    if (cachedResult) {
      context.result = {
        content: [{ type: 'text', text: `[CACHED]\n${JSON.stringify(cachedResult, null, 2)}` }]
      };
      context.handled = true;
      return; // Stop chain
    }

    await next();

    // ── Post-execution: record in session cache and dedupe_log ────────────────
    if (context.handled && !context.isError && context.result) {
      // Session cache (in-memory, fast)
      cache.set(context.name, context.args, context.result);

      // Dedupe log (SQLite, cross-session idempotency)
      if (dedupeKey) {
        try {
          const orch = OrchestrationDB.getInstance();
          orch.recordDedupe(context.name, dedupeKey, context.result);
          metrics.increment('cache.dedupe_recorded');
        } catch (_) {
          // Non-fatal: continue even if dedupe recording fails
        }
      }
    }
  }
}
