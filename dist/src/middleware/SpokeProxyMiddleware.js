"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpokeProxyMiddleware = void 0;
class SpokeProxyMiddleware {
    async handle(context, next) {
        if (context.name.includes('__')) {
            const spokeManager = context.container.resolve('SpokeManager');
            try {
                const result = await spokeManager.callTool(context.name, context.args || {});
                context.result = result;
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
