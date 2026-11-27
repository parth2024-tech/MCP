"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpokeProxyMiddleware = void 0;
// Fields that must never be forwarded to spoke servers.
// agent_token is an HMAC-signed credential; leaking it to a spoke grants it
// the ability to impersonate the caller against the hub.
const SENSITIVE_ARG_KEYS = new Set([
    'agent_token',
    'auth_token',
    'token',
    'secret',
    'password',
    'api_key',
    'apiKey',
]);
/**
 * Strip sensitive fields from args before forwarding to a spoke.
 * Returns a shallow clone with all keys in SENSITIVE_ARG_KEYS removed.
 */
function sanitizeArgsForSpoke(args) {
    if (!args)
        return {};
    const safe = {};
    for (const [key, value] of Object.entries(args)) {
        if (!SENSITIVE_ARG_KEYS.has(key)) {
            safe[key] = value;
        }
    }
    return safe;
}
class SpokeProxyMiddleware {
    async handle(context, next) {
        if (context.name.includes('__')) {
            const spokeManager = context.container.resolve('SpokeManager');
            try {
                // Security fix: strip agent_token and other credentials before forwarding.
                // The spoke should only receive the args it needs to execute the tool —
                // never hub-level auth credentials.
                const safeArgs = sanitizeArgsForSpoke(context.args);
                const result = await spokeManager.callTool(context.name, safeArgs);
                // Validate result shape before assigning — don't blindly trust spoke output.
                if (result && typeof result === 'object') {
                    context.result = result;
                }
                else {
                    context.result = {
                        content: [{ type: 'text', text: JSON.stringify(result) }]
                    };
                }
                context.handled = true;
            }
            catch (err) {
                context.result = {
                    content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: context.reqId }) }],
                    isError: true
                };
                context.handled = true;
            }
            return; // Handled by proxy, do not proceed to native execution
        }
        await next();
    }
}
exports.SpokeProxyMiddleware = SpokeProxyMiddleware;
