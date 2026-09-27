"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolCallHandler = createToolCallHandler;
const crypto_1 = __importDefault(require("crypto"));
const Pipeline_1 = require("../middleware/Pipeline");
const ErrorMiddleware_1 = require("../middleware/ErrorMiddleware");
const ConcurrencyMiddleware_1 = require("../middleware/ConcurrencyMiddleware");
const AuthMiddleware_1 = require("../middleware/AuthMiddleware");
const SpokeProxyMiddleware_1 = require("../middleware/SpokeProxyMiddleware");
const CacheMiddleware_1 = require("../middleware/CacheMiddleware");
const ToolExecutionMiddleware_1 = require("../middleware/ToolExecutionMiddleware");
const MetricsMiddleware_1 = require("../middleware/MetricsMiddleware");
const errors_1 = require("../utils/errors");
function createToolCallHandler(container) {
    // Pipeline order (outermost → innermost):
    //
    //   0. ErrorMiddleware        ← catches ANYTHING that escapes from below
    //   1. ConcurrencyMiddleware  ← semaphore gate — must be before any async work
    //   2. MetricsMiddleware      ← time everything (including queued wait time)
    //   3. AuthMiddleware         ← validate agent_token before any tool logic
    //   4. SpokeProxyMiddleware   ← forward spoke-namespaced tools (tool__spoke)
    //   5. CacheMiddleware        ← serve from cache or populate after execution
    //   6. ToolExecutionMiddleware← actually run the tool with timeout + retry
    //
    const concurrencyMiddleware = new ConcurrencyMiddleware_1.ConcurrencyMiddleware();
    container.register('ConcurrencyMiddleware', concurrencyMiddleware);
    const pipeline = new Pipeline_1.Pipeline()
        .use(new ErrorMiddleware_1.ErrorMiddleware()) // Layer 0: catch-all error boundary
        .use(concurrencyMiddleware) // Layer 1: backpressure semaphore
        .use(new MetricsMiddleware_1.MetricsMiddleware()) // Layer 2: timing + observability
        .use(new AuthMiddleware_1.AuthMiddleware()) // Layer 3: token authentication
        .use(new SpokeProxyMiddleware_1.SpokeProxyMiddleware()) // Layer 4: spoke federation proxy
        .use(new CacheMiddleware_1.CacheMiddleware()) // Layer 5: response caching
        .use(new ToolExecutionMiddleware_1.ToolExecutionMiddleware()); // Layer 6: tool execution core
    return async (request, extra) => {
        let { name, arguments: toolArgs } = request.params;
        const reqId = crypto_1.default.randomUUID();
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
        }
        catch (rawErr) {
            // This catch block is the absolute last resort — ErrorMiddleware should
            // have caught everything inside the pipeline. If we reach here, something
            // failed in the pipeline machinery itself (e.g. middleware constructor crash).
            const err = errors_1.ASEError.from(rawErr, {
                toolName: name,
                reqId,
                code: 'INTERNAL_ERROR',
            });
            return err.toMCPResult(process.env.NODE_ENV !== 'production');
        }
    };
}
