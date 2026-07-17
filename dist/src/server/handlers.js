"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolCallHandler = createToolCallHandler;
const crypto_1 = __importDefault(require("crypto"));
const Pipeline_1 = require("../middleware/Pipeline");
const ConcurrencyMiddleware_1 = require("../middleware/ConcurrencyMiddleware");
const AuthMiddleware_1 = require("../middleware/AuthMiddleware");
const SpokeProxyMiddleware_1 = require("../middleware/SpokeProxyMiddleware");
const CacheMiddleware_1 = require("../middleware/CacheMiddleware");
const ToolExecutionMiddleware_1 = require("../middleware/ToolExecutionMiddleware");
const MetricsMiddleware_1 = require("../middleware/MetricsMiddleware");
function createToolCallHandler(container) {
    // Fix 11: ConcurrencyMiddleware is FIRST — it gates all tool calls.
    // One shared instance per server process so the semaphore state is
    // consistent across all requests.
    const concurrencyMiddleware = new ConcurrencyMiddleware_1.ConcurrencyMiddleware();
    const pipeline = new Pipeline_1.Pipeline()
        .use(concurrencyMiddleware) // Fix 11: semaphore — must be first
        .use(new MetricsMiddleware_1.MetricsMiddleware())
        .use(new AuthMiddleware_1.AuthMiddleware())
        .use(new SpokeProxyMiddleware_1.SpokeProxyMiddleware())
        .use(new CacheMiddleware_1.CacheMiddleware())
        .use(new ToolExecutionMiddleware_1.ToolExecutionMiddleware());
    return async (request, extra) => {
        let { name, arguments: toolArgs } = request.params;
        const reqId = crypto_1.default.randomUUID();
        if (name === 'invoke_tool') {
            name = toolArgs?.tool_name;
            toolArgs = toolArgs?.tool_input;
        }
        const context = {
            container,
            reqId,
            name,
            args: toolArgs,
            extra
        };
        try {
            const result = await pipeline.execute(context);
            return result;
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
                isError: true
            };
        }
    };
}
