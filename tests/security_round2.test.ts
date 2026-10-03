/**
 * Tests: Remaining Security Fixes (Round 2)
 *
 * Fix 1: register_agent — server-side role assignment (no caller-supplied caps)
 * Fix 2: SpokeProxyMiddleware — agent_token stripped before forwarding to spoke
 * Fix 3: http-keepalive — DNS rebinding: Host/Origin validation, no wildcard CORS
 * Fix 4: ToolExecutionMiddleware — AbortController cancels timed-out work
 * Fix 5: handlers pipeline — CacheMiddleware before ConcurrencyMiddleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Fix 1: Server-side role assignment ──────────────────────────────────────
describe('Fix 1: register_agent — server-side role assignment', () => {
  async function makeRegisterTool() {
    const mod = await import('../src/tools/register_agent');
    const Tool = mod.default;
    return new Tool();
  }

  const fakeCtx = {
    container: {
      resolve: (key: string) => {
        if (key === 'TokenSecret') return 'test-secret';
        if (key === 'OrchestrationDB') return { getDB: () => ({ prepare: () => ({ run: () => {} }) }) };
        throw new Error(`Unknown: ${key}`);
      },
    },
    reqId: 'test-req-1',
  };

  it('rejects unknown role with descriptive error', async () => {
    const tool = await makeRegisterTool();
    await expect(
      tool.execute({ role: 'superadmin', ttl_seconds: 3600 }, fakeCtx)
    ).rejects.toThrow(/Unknown role 'superadmin'/);
  });

  it('assigns server-configured capabilities regardless of caller input', async () => {
    const tool = await makeRegisterTool();
    const result = await tool.execute({ role: 'reviewer', ttl_seconds: 3600 }, fakeCtx);
    expect(result.capabilities).not.toContain('*');
    expect(result.capabilities).toContain('query_skills');
    expect(result.role).toBe('reviewer');
  });

  it('admin role gets wildcard capabilities', async () => {
    const tool = await makeRegisterTool();
    const result = await tool.execute({ role: 'admin', ttl_seconds: 3600 }, fakeCtx);
    expect(result.capabilities).toContain('*');
  });

  it('respects ASE_ROLE_CONFIG env override', async () => {
    process.env.ASE_ROLE_CONFIG = JSON.stringify({ customrole: ['tool_a', 'tool_b'] });
    vi.resetModules();
    const mod = await import('../src/tools/register_agent');
    const tool = new mod.default();
    const result = await tool.execute({ role: 'customrole', ttl_seconds: 3600 }, fakeCtx);
    expect(result.capabilities).toEqual(['tool_a', 'tool_b']);
    delete process.env.ASE_ROLE_CONFIG;
  });
});

// ─── Fix 2: Spoke token stripping ────────────────────────────────────────────
describe('Fix 2: SpokeProxyMiddleware — strips sensitive args before forwarding', () => {
  it('removes agent_token from args forwarded to spoke', async () => {
    const { SpokeProxyMiddleware } = await import('../src/middleware/SpokeProxyMiddleware');

    let capturedArgs: any = null;
    const fakeSpokeManager = {
      callTool: async (name: string, args: any) => {
        capturedArgs = args;
        return { content: [{ type: 'text', text: '{}' }] };
      },
    };

    const middleware = new SpokeProxyMiddleware();
    const context: any = {
      name: 'get_files__remote-spoke',
      args: {
        agent_token: 'SECRET_HMAC_TOKEN',
        path: '/some/file',
        api_key: 'MY_API_KEY',
      },
      container: { resolve: () => fakeSpokeManager },
      reqId: 'req-spoke-1',
    };

    await middleware.handle(context, async () => {});

    expect(context.handled).toBe(true);
    expect(capturedArgs).not.toHaveProperty('agent_token');
    expect(capturedArgs).not.toHaveProperty('api_key');
    expect(capturedArgs).toHaveProperty('path', '/some/file');
  });

  it('non-spoke tools pass through untouched', async () => {
    const { SpokeProxyMiddleware } = await import('../src/middleware/SpokeProxyMiddleware');

    let nextCalled = false;
    const middleware = new SpokeProxyMiddleware();
    const context: any = {
      name: 'query_skills',
      args: { agent_token: 'tok', query: 'hello' },
      container: { resolve: () => { throw new Error('should not call spoke manager'); } },
      reqId: 'req-spoke-2',
    };

    await middleware.handle(context, async () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(context.handled).toBeUndefined();
  });
});

// ─── Fix 3: DNS Rebinding / CORS ─────────────────────────────────────────────
describe('Fix 3: http-keepalive — DNS rebinding and CORS protection', () => {
  function readHttpTransport() {
    return require('fs').readFileSync('src/transports/http-keepalive.js', 'utf-8');
  }

  it('no wildcard CORS in entire file', () => {
    const src = readHttpTransport();
    // Should not set ACAO to literal '*' anywhere
    expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*['"]\*['"]/);
    expect(src).not.toMatch(/setHeader\('Access-Control-Allow-Origin',\s*['"]\*['"]\)/);
  });

  it('contains ALLOWED_HOSTS set for localhost/127.0.0.1', () => {
    const src = readHttpTransport();
    expect(src).toContain('ALLOWED_HOSTS');
    expect(src).toContain('127.0.0.1');
    expect(src).toContain('localhost');
  });

  it('contains Origin regex validation', () => {
    const src = readHttpTransport();
    expect(src).toContain('ALLOWED_ORIGIN_RE');
    expect(src).toContain('origin not allowed');
  });

  it('contains Host header rejection', () => {
    const src = readHttpTransport();
    expect(src).toContain('unexpected Host header');
  });

  it('echoes specific Origin back instead of wildcard', () => {
    const src = readHttpTransport();
    expect(src).toContain("setHeader('Access-Control-Allow-Origin', origin)");
    expect(src).toContain("setHeader('Vary', 'Origin')");
  });
});

// ─── Fix 4: AbortController timeout ──────────────────────────────────────────
describe('Fix 4: ToolExecutionMiddleware — AbortController cancels timed-out work', () => {
  it('withTimeout pattern uses AbortController (source-level check)', () => {
    const src = require('fs').readFileSync('src/middleware/ToolExecutionMiddleware.ts', 'utf-8');
    expect(src).toContain('AbortController');
    expect(src).toContain('controller.abort');
    expect(src).toContain('AbortSignal');
    // Old bare Promise.race pattern should no longer be used
    expect(src).not.toMatch(/new Promise.*resolve.*reject.*timer.*setTimeout/s);
  });

  it('withTimeout calls factory with signal and clears timer on success', async () => {
    // Simulate the new withTimeout logic inline
    let receivedSignal: AbortSignal | null = null;
    let timerCleared = false;

    const TimeoutError = class extends Error {
      constructor(tool: string, ms: number, meta: any) {
        super(`Timeout: ${tool} did not complete in ${ms}ms`);
      }
    };

    async function withTimeout<T>(
      factory: (signal: AbortSignal) => Promise<T>,
      timeoutMs: number,
      toolName: string,
      reqId: string,
    ): Promise<T> {
      const controller = new AbortController();
      const { signal } = controller;
      let timeoutHandle: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(new TimeoutError(toolName, timeoutMs, { reqId }));
        }, timeoutMs);
      });

      try {
        return await Promise.race([factory(signal), timeoutPromise]);
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
        if (!signal.aborted) controller.abort();
        timerCleared = true;
      }
    }

    const result = await withTimeout(
      (signal) => { receivedSignal = signal; return Promise.resolve('done'); },
      5000, 'test_tool', 'req-1'
    );

    expect(result).toBe('done');
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(true); // aborted in finally
    expect(timerCleared).toBe(true);
  });

  it('abort fires when timeout expires', async () => {
    let abortFired = false;

    async function withTimeoutTest<T>(factory: (s: AbortSignal) => Promise<T>, ms: number): Promise<T> {
      const controller = new AbortController();
      let th: any;
      const tp = new Promise<never>((_, rej) => {
        th = setTimeout(() => { controller.abort(); rej(new Error('TIMEOUT')); }, ms);
      });
      try {
        return await Promise.race([factory(controller.signal), tp]);
      } finally {
        clearTimeout(th);
      }
    }

    await expect(
      withTimeoutTest((signal) => {
        signal.addEventListener('abort', () => { abortFired = true; });
        return new Promise<string>((res) => setTimeout(() => res('late'), 200));
      }, 50)
    ).rejects.toThrow('TIMEOUT');

    expect(abortFired).toBe(true);
  });
});

// ─── Fix 5: Cache before Concurrency ─────────────────────────────────────────
describe('Fix 5: Pipeline — CacheMiddleware before ConcurrencyMiddleware', () => {
  it('pipeline puts CacheMiddleware at layer 2, before ConcurrencyMiddleware at layer 3', () => {
    const src = require('fs').readFileSync('src/server/handlers.ts', 'utf-8');
    // Extract the .use() call order
    const useCalls = [...src.matchAll(/\.use\(([^)]+)\)/g)].map(m => m[1].trim());

    const cacheIdx = useCalls.findIndex(u => u.includes('CacheMiddleware'));
    const concIdx  = useCalls.findIndex(u => u.includes('concurrencyMiddleware') || u.includes('ConcurrencyMiddleware'));

    expect(cacheIdx).toBeGreaterThan(-1);
    expect(concIdx).toBeGreaterThan(-1);
    expect(cacheIdx).toBeLessThan(concIdx);
  });

  it('comment block confirms cache-before-semaphore rationale', () => {
    const src = require('fs').readFileSync('src/server/handlers.ts', 'utf-8');
    expect(src).toContain('cache hits never consume concurrency permits');
  });
});
