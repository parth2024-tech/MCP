import type { Middleware, MiddlewareContext } from './Pipeline';
import type { BaseTool } from '../core/BaseTool';
import { ZodError } from 'zod';
import { ASEError, TimeoutError, NotFoundError, ValidationError } from '../utils/errors';
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

// Hard ceiling: any tool that doesn't complete within this time is killed.
// This permanently prevents "Working..." freezes caused by hanging Redis/network calls.
const TOOL_EXECUTION_TIMEOUT_MS = 30_000; // 30 seconds

// Transient error detection: these patterns indicate infrastructure hiccups
// that are worth retrying with backoff — not permanent failures.
const TRANSIENT_PATTERNS = [
  'fetch failed',
  'econnreset',
  'econnrefused',
  'etimedout',
  'network error',
  'socket hang up',
  'epipe',
];

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const code = (err as any).code?.toLowerCase() ?? '';
  return TRANSIENT_PATTERNS.some(p => msg.includes(p) || code.includes(p));
}

/**
 * Race a promise against a hard timeout.
 * Throws a typed TimeoutError (not a plain Error) so ErrorMiddleware and
 * the retry logic can correctly classify it.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolName: string, reqId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(toolName, timeoutMs, { reqId }));
    }, timeoutMs);

    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export class ToolExecutionMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
    const registry = context.container.resolve<any>('ToolRegistry');
    let loggerInstance = logger;
    try {
      loggerInstance = context.container.resolve('logger');
    } catch (e) {
      // Fallback
    }

    // ── search_tools: JIT dynamic tool (no auth, no registry lookup) ─────────
    if (context.name === 'search_tools') {
      const toolSearch = context.container.resolve<any>('ToolSearch');
      try {
        const results = toolSearch.findRelevantTools(
          context.args?.query,
          context.args?.top_k || 4,
          registry
        );
        context.result = { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (rawErr: unknown) {
        const err = ASEError.from(rawErr, { toolName: 'search_tools', reqId: context.reqId });
        loggerInstance.error('ToolExecution', `search_tools failed [${err.code}]`, {
          fingerprint: err.fingerprint,
          error: err.message,
          stack: err.stack,
          req_id: context.reqId,
        });
        const includeStack = err.code !== 'VALIDATION_ERROR';
        context.result = err.toMCPResult(includeStack);
        context.isError = true;
      }
      context.handled = true;
      return;
    }

    // ── Tool lookup ───────────────────────────────────────────────────────────
    const tool = registry.get(context.name);
    if (!tool) {
      const err = new NotFoundError(context.name, { reqId: context.reqId });
      context.result = err.toMCPResult();
      context.isError = true;
      context.handled = true;
      // Propagate to next() but do NOT throw — result is already set
      await next();
      return;
    }

    // ── Execution with retry + timeout ────────────────────────────────────────
    // Activepieces pattern: retry_on_failure=false disables the retry loop
    // for this specific call (equivalent to Activepieces retryOnFailure).
    const retryOnFailure = context.args?.retry_on_failure !== false; // default true
    const MAX_RETRIES = retryOnFailure ? 3 : 1;
    let lastErr: ASEError | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const executionPromise = tool.validateAndExecute
          ? (tool as BaseTool<any>).validateAndExecute(context.args, {
              container: context.container,
              reqId: context.reqId,
            })
          : tool.handler(context.args || {}, { reqId: context.reqId });

        const rawResult = await withTimeout(
          executionPromise,
          TOOL_EXECUTION_TIMEOUT_MS,
          context.name,
          context.reqId
        );

        context.result = { content: [{ type: 'text', text: JSON.stringify(rawResult, null, 2) }] };
        context.handled = true;

        // Emit per-tool success metric
        metrics.increment(`tool.success.${context.name}`);
        lastErr = null;
        break; // ← success

      } catch (rawErr: unknown) {
        const err = ASEError.from(rawErr, { toolName: context.name, reqId: context.reqId });
        lastErr = err;

        const isValidation = err.code === 'VALIDATION_ERROR';
        const isTimeout    = err.code === 'TIMEOUT_ERROR';
        const transient    = isTransientError(rawErr) || isTimeout;

        // Non-retryable: validation errors, non-transient failures, final attempt
        if (isValidation || !transient || attempt >= MAX_RETRIES) {
          break;
        }

        // Exponential backoff with full jitter (avoids thundering herd on recovery)
        const baseDelay = Math.pow(2, attempt) * 400;
        const jitter    = Math.random() * 400;
        const delay     = Math.round(baseDelay + jitter);

        loggerInstance.warn('ToolExecution', `Retrying ${context.name} (attempt ${attempt}/${MAX_RETRIES}) in ${delay}ms`, {
          fingerprint: err.fingerprint,
          error: err.message,
          req_id: context.reqId,
          attempt,
        });

        metrics.increment(`tool.retry.${context.name}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // ── Handle permanent failure ───────────────────────────────────────────────
    if (lastErr) {
      loggerInstance.error('ToolExecution', `Tool ${context.name} failed permanently [${lastErr.code}]`, {
        fingerprint: lastErr.fingerprint,
        req_id: context.reqId,
        error: lastErr.message,
        stack: lastErr.stack,
        retryable: lastErr.retryable,
      });

      metrics.increment(`tool.error.${context.name}`);
      metrics.increment(`tool.error_code.${lastErr.code.toLowerCase()}`);

      const includeStack = lastErr.code !== 'VALIDATION_ERROR';
      context.result = lastErr.toMCPResult(includeStack);
      context.isError = true;
      context.handled = true;
    }

    await next();
  }
}
