"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecutionMiddleware = void 0;
class ToolExecutionMiddleware {
    async handle(context, next) {
        const registry = context.container.resolve('ToolRegistry');
        // Support for JIT dynamic tools (e.g., search_tools)
        if (context.name === 'search_tools') {
            const toolSearch = context.container.resolve('ToolSearch');
            try {
                const results = toolSearch.findRelevantTools(context.args?.query, context.args?.top_k || 4, registry);
                context.result = { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
            }
            catch (err) {
                context.result = { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
            }
            context.handled = true;
            return;
        }
        const tool = registry.get(context.name);
        if (!tool) {
            context.result = { content: [{ type: 'text', text: `Tool not found: ${context.name}` }], isError: true };
            context.handled = true;
            return;
        }
        try {
            let rawResult;
            // Handle modern BaseTool vs Legacy Tool
            if (tool.validateAndExecute) {
                rawResult = await tool.validateAndExecute(context.args, {
                    container: context.container,
                    reqId: context.reqId
                });
            }
            else {
                // Legacy support
                rawResult = await tool.handler(context.args || {}, { reqId: context.reqId });
            }
            context.result = { content: [{ type: 'text', text: JSON.stringify(rawResult, null, 2) }] };
            context.handled = true;
        }
        catch (err) {
            context.result = { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
            context.isError = true;
            context.handled = true;
        }
        await next();
    }
}
exports.ToolExecutionMiddleware = ToolExecutionMiddleware;
