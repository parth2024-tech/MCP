import type { Middleware, MiddlewareContext } from './Pipeline';
import type { BaseTool } from '../core/BaseTool';

export class ToolExecutionMiddleware implements Middleware {
  async handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
    const registry = context.container.resolve<any>('ToolRegistry');
    
    // Support for JIT dynamic tools (e.g., search_tools)
    if (context.name === 'search_tools') {
      const toolSearch = context.container.resolve<any>('ToolSearch');
      try {
        const results = toolSearch.findRelevantTools(context.args?.query, context.args?.top_k || 4, registry);
        context.result = { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (err: any) {
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
        rawResult = await (tool as BaseTool<any>).validateAndExecute(context.args, {
          container: context.container,
          reqId: context.reqId
        });
      } else {
        // Legacy support
        rawResult = await tool.handler(context.args || {}, { reqId: context.reqId });
      }

      context.result = { content: [{ type: 'text', text: JSON.stringify(rawResult, null, 2) }] };
      context.handled = true;
    } catch (err: any) {
      context.result = { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
      context.isError = true;
      context.handled = true;
    }

    await next();
  }
}
