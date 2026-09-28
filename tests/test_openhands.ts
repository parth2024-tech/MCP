import DelegateToOpenHandsTool from './src/tools/delegate_to_openhands';
import { Logger } from './src/utils/logger';

async function run() {
  const tool = new DelegateToOpenHandsTool();
  const args = {
    task_description: `Please overhaul the error handling in the ASE MCP Server located at /home/thor/skiils/tools/server. Focus specifically on src/middleware/ToolExecutionMiddleware.ts and src/core/BaseTool.ts.\n\n1. Robust Error Tracking: When a tool throws an error, capture the full stack trace and include it in the context.result payload. Differentiate between ZodError (validation failures) and standard Error (execution failures).\n2. Logging: Use the server's existing logger (context.container.resolve('logger')) to structurally log the reqId, tool name, and stack trace whenever a tool fails. Do NOT use console.log or console.error as they corrupt the MCP JSON-RPC stdio stream.\n3. Retry with Jitter: Implement an exponential backoff retry mechanism (with jitter) for tool executions. If a tool fails with a transient error (e.g., fetch timeout or connection reset), the middleware should automatically retry up to 3 times before finally failing and returning the error to the client.\n4. Validation: Run npx tsc --noEmit and the existing Jest test suite to verify your changes do not break the middleware pipeline.`,
    workspace_dir: '/home/thor/skiils/tools/server'
  };
  
  const context = {
    reqId: 'test-req',
    container: {
      resolve: (key: string) => {
        if (key === 'logger') return new Logger();
        return null;
      }
    }
  };
  
  try {
    const res = await tool.validateAndExecute(args, context as any);
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
