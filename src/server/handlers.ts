import crypto from 'crypto';
import { Pipeline } from '../middleware/Pipeline';
import { ConcurrencyMiddleware } from '../middleware/ConcurrencyMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { SpokeProxyMiddleware } from '../middleware/SpokeProxyMiddleware';
import { CacheMiddleware } from '../middleware/CacheMiddleware';
import { ToolExecutionMiddleware } from '../middleware/ToolExecutionMiddleware';
import { MetricsMiddleware } from '../middleware/MetricsMiddleware';
import type { Container } from '../core/Container';

export function createToolCallHandler(container: Container) {
  // Fix 11: ConcurrencyMiddleware is FIRST — it gates all tool calls.
  // One shared instance per server process so the semaphore state is
  // consistent across all requests.
  const concurrencyMiddleware = new ConcurrencyMiddleware();

  const pipeline = new Pipeline()
    .use(concurrencyMiddleware)   // Fix 11: semaphore — must be first
    .use(new MetricsMiddleware())
    .use(new AuthMiddleware())
    .use(new SpokeProxyMiddleware())
    .use(new CacheMiddleware())
    .use(new ToolExecutionMiddleware());

  return async (request: any, extra: any) => {
    let { name, arguments: toolArgs } = request.params;
    const reqId = crypto.randomUUID();

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
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
        isError: true
      };
    }
  };
}
