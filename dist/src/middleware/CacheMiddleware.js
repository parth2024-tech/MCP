"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheMiddleware = void 0;
class CacheMiddleware {
    async handle(context, next) {
        const cache = context.container.resolve('SessionToolCache');
        const cachedResult = cache.get(context.name, context.args);
        if (cachedResult) {
            context.result = {
                content: [{ type: 'text', text: `[CACHED]\n${JSON.stringify(cachedResult, null, 2)}` }]
            };
            context.handled = true;
            return; // Stop chain
        }
        await next();
        // Cache the result after execution if successful
        if (context.handled && !context.isError && context.result) {
            cache.set(context.name, context.args, context.result);
        }
    }
}
exports.CacheMiddleware = CacheMiddleware;
