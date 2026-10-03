import crypto from 'crypto';
import { Pipeline } from '../middleware/Pipeline';
import { ErrorMiddleware } from '../middleware/ErrorMiddleware';
import { ConcurrencyMiddleware } from '../middleware/ConcurrencyMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { SpokeProxyMiddleware } from '../middleware/SpokeProxyMiddleware';
import { CacheMiddleware } from '../middleware/CacheMiddleware';
import { ToolExecutionMiddleware } from '../middleware/ToolExecutionMiddleware';
import { MetricsMiddleware } from '../middleware/MetricsMiddleware';
import { ASEError } from '../utils/errors';
import type { Container } from '../core/Container';

export function createToolCallHandler(container: Container) {
  // Pipeline order (outermost → innermost):
  //
  //   0. ErrorMiddleware        ← catches ANYTHING that escapes from below
  //   1. AuthMiddleware         ← validate agent_token before anything else
  //   2. CacheMiddleware        ← serve from cache BEFORE acquiring semaphore
  //                               (cache hits never consume concurrency permits)
  //   3. ConcurrencyMiddleware  ← semaphore gate — only non-cached calls acquire permits
  //   4. MetricsMiddleware      ← time everything (including queued wait time)
  //   5. SpokeProxyMiddleware   ← forward spoke-namespaced tools (tool__spoke)
  //   6. ToolExecutionMiddleware← actually run the tool with timeout + retry
  //
  const concurrencyMiddleware = new ConcurrencyMiddleware();
  container.register('ConcurrencyMiddleware', concurrencyMiddleware);

  const pipeline = new Pipeline()
    .use(new ErrorMiddleware())          // Layer 0: catch-all error boundary
    .use(new AuthMiddleware())           // Layer 1: token authentication
    .use(new CacheMiddleware())          // Layer 2: dedupe + session cache (before semaphore!)
    .use(concurrencyMiddleware)          // Layer 3: backpressure semaphore
    .use(new MetricsMiddleware())        // Layer 4: timing + observability
    .use(new SpokeProxyMiddleware())     // Layer 5: spoke federation proxy
    .use(new ToolExecutionMiddleware()); // Layer 6: tool execution core

  return async (request: any, extra: any) => {
    let { name, arguments: toolArgs } = request.params;
    const reqId = crypto.randomUUID();

    // Unwrap the outer invoke_tool envelope
    if (name === 'invoke_tool') {
      name = toolArgs?.tool_name;
      toolArgs = toolArgs?.tool_input;
    }

    const context = {
      container,
      reqId,
      name,
      args: toolArgs,
      extra,
    };

    try {
      return await pipeline.execute(context);
    } catch (rawErr: unknown) {
      // This catch block is the absolute last resort — ErrorMiddleware should
      // have caught everything inside the pipeline. If we reach here, something
      // failed in the pipeline machinery itself (e.g. middleware constructor crash).
      const err = ASEError.from(rawErr, {
        toolName: name,
        reqId,
        code: 'INTERNAL_ERROR',
      });

      return err.toMCPResult(process.env.NODE_ENV !== 'production');
    }
  };
}
