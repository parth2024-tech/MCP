"use strict";
/**
 * ErrorMiddleware — Top-of-pipeline unified error boundary.
 *
 * PLACEMENT: Must be registered FIRST in the pipeline (index 0), before
 * ConcurrencyMiddleware, MetricsMiddleware, AuthMiddleware, etc.
 *
 * RESPONSIBILITIES:
 *   1. Catches ANY unhandled error that propagates out of the remaining pipeline.
 *   2. Converts raw Error / unknown throws into typed ASEError instances.
 *   3. Attaches reqId + toolName context to every error for traceability.
 *   4. Calls logErrorOnce() so identical errors don't spam the log file.
 *   5. Emits error metrics (fingerprint counter, error code counter).
 *   6. Serializes the error into a consistent MCP result payload.
 *
 * WHAT IT DOES NOT DO:
 *   - It does not suppress errors from intentional isError payloads set by
 *     inner middlewares (e.g. AuthMiddleware returning auth errors). Those are
 *     already in context.result and context.handled = true, so they never reach
 *     this catch block.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMiddleware = void 0;
const errors_1 = require("../utils/errors");
const { logErrorOnce } = require('../utils/logger');
const metrics = require('../utils/metrics');
const INCLUDE_STACK_IN_RESPONSE = process.env.NODE_ENV !== 'production';
class ErrorMiddleware {
    async handle(context, next) {
        try {
            await next();
        }
        catch (rawErr) {
            // Convert to ASEError — preserves typed subclasses, wraps plain errors.
            const err = errors_1.ASEError.from(rawErr, {
                toolName: context.name,
                reqId: context.reqId,
            });
            // ── Deduplication logging ─────────────────────────────────────────────
            // logErrorOnce() suppresses repeated identical fingerprints in the log,
            // preventing thousands of "Redis unavailable" lines from the same error.
            logErrorOnce(err.fingerprint, 'ErrorMiddleware', `[${err.code}] ${err.message}`, {
                tool: err.toolName,
                req_id: err.reqId,
                retryable: err.retryable,
                stack: err.stack,
            });
            // ── Metrics ───────────────────────────────────────────────────────────
            metrics.increment(`error.code.${err.code.toLowerCase()}`);
            metrics.increment(`error.fingerprint.${err.fingerprint}`);
            metrics.increment('errors_total');
            // ── MCP Response ──────────────────────────────────────────────────────
            context.result = err.toMCPResult(INCLUDE_STACK_IN_RESPONSE);
            context.isError = true;
            context.handled = true;
            // ── Dead-Letter Queue (DLQ) ───────────────────────────────────────────
            if (err.code !== 'VALIDATION_ERROR' && err.code !== 'AUTH_ERROR' && context.container) {
                try {
                    const dlq = context.container.resolve('DeadLetterQueue');
                    if (dlq) {
                        dlq.enqueue({
                            reqId: context.reqId,
                            toolName: context.name,
                            args: context.args,
                            error: err
                        }).catch((dlqErr) => {
                            logErrorOnce('dlq-enqueue-fail', 'ErrorMiddleware', `DLQ enqueue failed: ${dlqErr.message}`);
                        });
                    }
                }
                catch (_) {
                    // Ignored if DLQ is not registered or resolved (e.g. bootstrap/tests)
                }
            }
        }
    }
}
exports.ErrorMiddleware = ErrorMiddleware;
