import type { Middleware, MiddlewareContext } from './Pipeline';
import type { SessionToolCache } from '../core/Cache';

export class CacheMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
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

    // Cache the result after execution if successful
    if (context.handled && !context.isError && context.result) {
      cache.set(context.name, context.args, context.result);
    }
  }
}
