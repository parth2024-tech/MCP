'use strict';

const crypto = require('crypto');

class ASEError extends Error {
  constructor(code, message, opts = {}) {
    super(message);
    this.name = `ASEError[${code}]`;
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.toolName = opts.toolName ?? 'unknown';
    this.reqId = opts.reqId ?? 'no-req-id';
    this.fixHint = opts.fixHint ?? '';
    this.context = opts.context ?? {};
    this.timestamp = new Date().toISOString();

    this.fingerprint = crypto
      .createHash('sha1')
      .update(`${code}:${this.toolName}:${message}`)
      .digest('hex')
      .slice(0, 12);

    if (opts.cause instanceof Error && this.stack) {
      this.stack += `\nCaused by: ${opts.cause.stack}`;
    }
  }

  toMCPResult(includeStack = false) {
    const payload = {
      error_code: this.code,
      message: this.message,
      retryable: this.retryable,
      fingerprint: this.fingerprint,
      req_id: this.reqId,
      tool: this.toolName,
      fix_hint: this.fixHint || undefined,
    };

    if (Object.keys(this.context).length > 0) {
      payload.context = this.context;
    }

    if (includeStack && this.stack) {
      payload.stack = this.stack;
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      isError: true,
    };
  }

  static from(err, opts = {}) {
    if (err instanceof ASEError) {
      if (opts.reqId && !err.reqId) return err;
      return err;
    }

    const isZod =
      err instanceof Error &&
      (err.name === 'ZodError' || err.issues !== undefined);

    const isTimeout =
      err instanceof Error &&
      (err.message.toLowerCase().includes('timed out') ||
        err.message.toLowerCase().includes('timeout'));

    const isCircuit =
      err instanceof Error && err.message.startsWith('CircuitBreaker OPEN');

    const isRedis =
      err instanceof Error &&
      (err.message.toLowerCase().includes('redis') ||
        err.message.toLowerCase().includes('econnrefused'));

    let code = opts.code ?? 'EXECUTION_ERROR';
    let retryable = opts.retryable ?? false;
    let fixHint = opts.fixHint ?? '';

    if (isZod) {
      code = 'VALIDATION_ERROR';
      retryable = false;
      fixHint = "Check the tool's input schema and fix the argument types.";
    } else if (isTimeout) {
      code = 'TIMEOUT_ERROR';
      retryable = true;
      fixHint = 'The operation took too long. If this is a Redis-dependent tool, check that Redis is running.';
    } else if (isCircuit) {
      code = 'CIRCUIT_OPEN';
      retryable = true;
      fixHint = 'An upstream service is temporarily unavailable. The circuit will close automatically.';
    } else if (isRedis) {
      code = 'REDIS_UNAVAILABLE';
      retryable = true;
      fixHint = 'Redis is not reachable. Tools will degrade to SQLite-only mode automatically.';
    }

    let message;
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      message = err.message || err.error || JSON.stringify(err);
    } else {
      message = String(err);
    }

    const context = {};
    if (isZod && err.issues) {
      context.issues = err.issues;
    }

    const aseErr = new ASEError(code, message, {
      ...opts,
      retryable,
      fixHint,
      context,
      cause: err instanceof Error ? err : undefined,
    });

    if (err instanceof Error && err.stack) {
      aseErr.stack = err.stack;
    }

    return aseErr;
  }
}

class ValidationError extends ASEError {
  constructor(message, opts = {}) {
    super('VALIDATION_ERROR', message, {
      retryable: false,
      fixHint: "Check the tool's required arguments and their types.",
      ...opts,
    });
    this.name = 'ValidationError';
  }
}

class TimeoutError extends ASEError {
  constructor(toolName, timeoutMs, opts = {}) {
    super(
      'TIMEOUT_ERROR',
      `Tool '${toolName}' timed out after ${timeoutMs / 1000}s`,
      {
        retryable: true,
        fixHint:
          'The tool exceeded its time limit. If Redis is unavailable, ensure it is running or that the tool degrades gracefully.',
        toolName,
        ...opts,
      }
    );
    this.name = 'TimeoutError';
  }
}

class AuthError extends ASEError {
  constructor(message, opts = {}) {
    super('AUTH_ERROR', message, {
      retryable: false,
      fixHint: "Obtain a valid agent_token via register_agent before calling this tool.",
      ...opts,
    });
    this.name = 'AuthError';
  }
}

class NotFoundError extends ASEError {
  constructor(toolName, opts = {}) {
    super('NOT_FOUND', `Tool not found: ${toolName}`, {
      retryable: false,
      fixHint: "Call search_tools() to discover available tool names.",
      toolName,
      ...opts,
    });
    this.name = 'NotFoundError';
  }
}

class CircuitOpenError extends ASEError {
  constructor(serviceName, retryAfterSec, opts = {}) {
    super(
      'CIRCUIT_OPEN',
      `Service '${serviceName}' is temporarily unavailable (circuit OPEN, retry after ${retryAfterSec}s)`,
      {
        retryable: true,
        fixHint: `Wait ${retryAfterSec}s before retrying. The circuit will close automatically.`,
        context: { service: serviceName, retry_after_seconds: retryAfterSec },
        ...opts,
      }
    );
    this.name = 'CircuitOpenError';
  }
}

class InternalError extends ASEError {
  constructor(message, opts = {}) {
    super('INTERNAL_ERROR', message, {
      retryable: false,
      fixHint: 'This is an unexpected server error. Please check the server logs.',
      ...opts,
    });
    this.name = 'InternalError';
  }
}

function toolError(err) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error_code: err.error_code,
        message: err.message,
        retryable: err.retryable,
        fix_hint: err.fix_hint || '',
        details: err.details || null
      }, null, 2)
    }],
    isError: true
  };
}

module.exports = {
  ASEError,
  ValidationError,
  TimeoutError,
  AuthError,
  NotFoundError,
  CircuitOpenError,
  InternalError,
  toolError,
};
