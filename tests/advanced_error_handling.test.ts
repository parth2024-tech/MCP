import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolExecutionMiddleware } from '../src/middleware/ToolExecutionMiddleware';
import { BaseTool, ToolContext } from '../src/core/BaseTool';
import { ASEError, TimeoutError, ValidationError } from '../src/utils/errors';
import type { MiddlewareContext } from '../src/middleware/Pipeline';

class MockValidationTool extends BaseTool<{ name: string; count: number }> {
  name = 'mock_validation_tool';
  description = 'A mock tool that validates input schema';
  schema = z.object({
    name: z.string(),
    count: z.number().int().positive(),
  });

  protected async execute(args: { name: string; count: number }, _context: ToolContext) {
    return { success: true, greeting: `Hello ${args.name}, count: ${args.count}` };
  }
}

class MockFlakyTool extends BaseTool<{ attemptsBeforeSuccess: number }> {
  name = 'mock_flaky_tool';
  description = 'A tool that fails with transient network errors before succeeding';
  schema = z.object({
    attemptsBeforeSuccess: z.number().default(2),
  });

  callCount = 0;

  protected async execute(args: { attemptsBeforeSuccess: number }, _context: ToolContext) {
    this.callCount++;
    if (this.callCount < args.attemptsBeforeSuccess) {
      const err = new Error('fetch failed: ECONNRESET connection reset by peer');
      (err as any).code = 'ECONNRESET';
      throw err;
    }
    return { success: true, attempts: this.callCount };
  }
}

class MockPermanentFailTool extends BaseTool<{}> {
  name = 'mock_permanent_fail';
  description = 'A tool that fails with a standard execution error';
  schema = z.object({});

  protected async execute(_args: {}, _context: ToolContext) {
    throw new Error('Database disk image is malformed');
  }
}

describe('Advanced Error Handling in ToolExecutionMiddleware & BaseTool', () => {
  function createMockContext(name: string, args: any = {}) {
    const registry = new Map<string, any>();
    const loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const container = {
      resolve: (key: string) => {
        if (key === 'ToolRegistry') return registry;
        if (key === 'logger') return loggerMock;
        return null;
      },
    };

    const context: MiddlewareContext = {
      name,
      args,
      reqId: 'test-req-1234',
      container: container as any,
      handled: false,
      isError: false,
    };

    return { context, registry, loggerMock };
  }

  it('1. Differentiates ZodError validation failures: captures issues, excludes stack from response, fails fast without retry', async () => {
    const { context, registry, loggerMock } = createMockContext('mock_validation_tool', { name: 'Alice', count: -5 });
    const tool = new MockValidationTool();
    registry.set(tool.name, tool);

    const middleware = new ToolExecutionMiddleware();
    await middleware.handle(context, async () => {});

    expect(context.isError).toBe(true);
    expect(context.handled).toBe(true);
    expect(context.result).toBeDefined();

    const resultPayload = JSON.parse(context.result.content[0].text);
    expect(resultPayload.error_code).toBe('VALIDATION_ERROR');
    expect(resultPayload.retryable).toBe(false);
    expect(resultPayload.severity).toBe('low');
    expect(resultPayload.stack).toBeUndefined(); // Stack excluded on validation errors for clean LLM context
    expect(resultPayload.context?.issues).toBeDefined();

    // Verify structured logger captured it without using console.log
    expect(loggerMock.error).toHaveBeenCalledWith(
      'ToolExecution',
      expect.stringContaining('mock_validation_tool failed permanently [VALIDATION_ERROR]'),
      expect.objectContaining({
        req_id: 'test-req-1234',
        error: expect.any(String),
      })
    );
  });

  it('2. Captures full stack trace and severity on standard execution errors', async () => {
    const { context, registry, loggerMock } = createMockContext('mock_permanent_fail', {});
    const tool = new MockPermanentFailTool();
    registry.set(tool.name, tool);

    const middleware = new ToolExecutionMiddleware();
    await middleware.handle(context, async () => {});

    expect(context.isError).toBe(true);
    const resultPayload = JSON.parse(context.result.content[0].text);
    expect(resultPayload.error_code).toBe('EXECUTION_ERROR');
    expect(resultPayload.severity).toBe('high');
    expect(resultPayload.stack).toBeDefined();
    expect(resultPayload.stack).toContain('Database disk image is malformed');
    expect(resultPayload.fingerprint).toHaveLength(12);

    expect(loggerMock.error).toHaveBeenCalledWith(
      'ToolExecution',
      expect.stringContaining('mock_permanent_fail failed permanently [EXECUTION_ERROR]'),
      expect.objectContaining({
        req_id: 'test-req-1234',
        stack: expect.stringContaining('Database disk image is malformed'),
      })
    );
  });

  it('3. Retries transient network failures with backoff & jitter and recovers on success', async () => {
    const { context, registry, loggerMock } = createMockContext('mock_flaky_tool', { attemptsBeforeSuccess: 2 });
    const tool = new MockFlakyTool();
    registry.set(tool.name, tool);

    const middleware = new ToolExecutionMiddleware();
    await middleware.handle(context, async () => {});

    expect(context.isError).toBe(false);
    expect(context.handled).toBe(true);
    const resultPayload = JSON.parse(context.result.content[0].text);
    expect(resultPayload.success).toBe(true);
    expect(resultPayload.attempts).toBe(2);

    // Verify retry warning was logged
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'ToolExecution',
      expect.stringContaining('Retrying mock_flaky_tool (attempt 1/3)'),
      expect.objectContaining({
        req_id: 'test-req-1234',
        attempt: 1,
      })
    );
  });

  it('4. Respects retry_on_failure: false to disable retries when requested by caller', async () => {
    const { context, registry, loggerMock } = createMockContext('mock_flaky_tool', {
      attemptsBeforeSuccess: 3,
      retry_on_failure: false,
    });
    const tool = new MockFlakyTool();
    registry.set(tool.name, tool);

    const middleware = new ToolExecutionMiddleware();
    await middleware.handle(context, async () => {});

    expect(context.isError).toBe(true);
    expect(tool.callCount).toBe(1); // Only 1 attempt, zero retries
    const resultPayload = JSON.parse(context.result.content[0].text);
    expect(resultPayload.error_code).toBe('EXECUTION_ERROR');
  });
});
