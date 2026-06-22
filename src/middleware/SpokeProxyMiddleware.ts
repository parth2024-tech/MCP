import type { Middleware, MiddlewareContext } from './Pipeline';

export class SpokeProxyMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
    if (context.name.includes('__')) {
      const spokeManager = context.container.resolve<any>('SpokeManager');
      try {
        const result = await spokeManager.callTool(context.name, context.args || {});
        context.result = result;
        context.handled = true;
      } catch (err: any) {
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
