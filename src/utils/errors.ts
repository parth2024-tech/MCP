/**
 * ASE Typed Error System
 *
 * Provides a structured, machine-readable error hierarchy for the ASE MCP Server.
 * All errors are fingerprinted (SHA1 of code+tool+message) for deduplication.
 *
 * Usage:
 *   throw new ValidationError({ toolName: 'load_skill', message: 'skill_id required', reqId });
 *   throw new TimeoutError({ toolName: 'get_orchestration_state', reqId });
 */

import crypto from 'crypto';

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'CIRCUIT_OPEN'
  | 'REDIS_UNAVAILABLE'
  | 'CONCURRENCY_LIMIT'
  | 'RESOURCE_EXHAUSTED'
  | 'DEGRADED_SERVICE'
  | 'SPOKE_ERROR'
  | 'INTERNAL_ERROR';

// ─── Severity Levels (OpenHands-inspired) ────────────────────────────────────

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ─── Recovery Actions (machine-readable) ─────────────────────────────────────

export type RecoveryAction =
  | 'retry'
  | 'retry_with_backoff'
  | 'degrade'
  | 'restart_spoke'
  | 'purge_cache'
  | 'force_gc'
  | 'none';

// ─── Base Error ───────────────────────────────────────────────────────────────

export interface ASEErrorOptions {
  /** The MCP tool name that produced this error */
  toolName?: string;
  /** The request ID for traceability */
  reqId?: string;
  /** Whether the client should retry this operation */
  retryable?: boolean;
  /** Human-readable hint on how to fix the problem */
  fixHint?: string;
  /** Extra structured details (ZodError issues, etc.) */
  context?: Record<string, unknown>;
  /** Original cause — used to preserve stack chain */
  cause?: unknown;
  /** Severity level for alert routing (OpenHands-inspired) */
  severity?: ErrorSeverity;
  /** Machine-readable suggested recovery action */
  recoveryAction?: RecoveryAction;
  /** Correlation ID for linking related errors across spoke boundaries */
  correlationId?: string;
}

export class ASEError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly fingerprint: string;
  readonly toolName: string;
  readonly reqId: string;
  readonly fixHint: string;
  readonly context: Record<string, unknown>;
  readonly timestamp: string;
  readonly severity: ErrorSeverity;
  readonly recoveryAction: RecoveryAction;
  readonly correlationId: string;

  constructor(code: ErrorCode, message: string, opts: ASEErrorOptions = {}) {
    super(message);
    this.name = `ASEError[${code}]`;
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.toolName = opts.toolName ?? 'unknown';
    this.reqId = opts.reqId ?? 'no-req-id';
    this.fixHint = opts.fixHint ?? '';
    this.context = opts.context ?? {};
    this.timestamp = new Date().toISOString();
    this.severity = opts.severity ?? ASEError._inferSeverity(code);
    this.recoveryAction = opts.recoveryAction ?? ASEError._inferRecovery(code);
    this.correlationId = opts.correlationId ?? '';

    // Fingerprint: deterministic SHA1 of (code + toolName + message).
    // Same error from the same tool always produces the same fingerprint.
    // Used by logErrorOnce() to suppress duplicate log entries.
    this.fingerprint = crypto
      .createHash('sha1')
      .update(`${code}:${this.toolName}:${message}`)
      .digest('hex')
      .slice(0, 12);

    // Preserve original cause in stack chain (Node ≥18)
    if (opts.cause instanceof Error && this.stack) {
      this.stack += `\nCaused by: ${opts.cause.stack}`;
    }
  }

  /** Infer severity from error code — overridable via opts.severity */
  private static _inferSeverity(code: ErrorCode): ErrorSeverity {
    switch (code) {
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND':
      case 'AUTH_ERROR':
        return 'low';
      case 'TIMEOUT_ERROR':
      case 'CIRCUIT_OPEN':
      case 'DEGRADED_SERVICE':
      case 'SPOKE_ERROR':
        return 'medium';
      case 'REDIS_UNAVAILABLE':
      case 'EXECUTION_ERROR':
      case 'CONCURRENCY_LIMIT':
        return 'high';
      case 'RESOURCE_EXHAUSTED':
      case 'INTERNAL_ERROR':
        return 'critical';
      default:
        return 'medium';
    }
  }

  /** Infer recovery action from error code — overridable via opts.recoveryAction */
  private static _inferRecovery(code: ErrorCode): RecoveryAction {
    switch (code) {
      case 'TIMEOUT_ERROR':
      case 'REDIS_UNAVAILABLE':
        return 'retry_with_backoff';
      case 'CIRCUIT_OPEN':
      case 'DEGRADED_SERVICE':
        return 'degrade';
      case 'RESOURCE_EXHAUSTED':
        return 'purge_cache';
      case 'SPOKE_ERROR':
        return 'restart_spoke';
      case 'VALIDATION_ERROR':
      case 'AUTH_ERROR':
      case 'NOT_FOUND':
      case 'INTERNAL_ERROR':
        return 'none';
      default:
        return 'retry';
    }
  }

  /** Serialize into the standard MCP tool error response payload */
  toMCPResult(includeStack = false): { content: { type: string; text: string }[]; isError: true } {
    const payload: Record<string, unknown> = {
      error_code: this.code,
      message: this.message,
      retryable: this.retryable,
      fingerprint: this.fingerprint,
      req_id: this.reqId,
      tool: this.toolName,
      severity: this.severity,
      recovery_action: this.recoveryAction,
      fix_hint: this.fixHint || undefined,
    };

    if (this.correlationId) {
      payload.correlation_id = this.correlationId;
    }

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

  /** Convert a plain Error or unknown throw into an ASEError */
  static from(err: unknown, opts: ASEErrorOptions & { code?: ErrorCode } = {}): ASEError {
    if (err instanceof ASEError) {
      // Enrich with additional opts if provided
      if (opts.reqId && !err.reqId) return err;
      return err;
    }

    const isZod =
      err instanceof Error &&
      (err.name === 'ZodError' || (err as any).issues !== undefined);

    const isTimeout =
      err instanceof Error &&
      (err.message.toLowerCase().includes('timed out') ||
        err.message.toLowerCase().includes('timeout'));

    const isCircuit =
      err instanceof Error && err.message.startsWith('CircuitBreaker OPEN');

    const isRedis =
      err instanceof Error &&
      ((err.message.toLowerCase().includes('redis') && !err.message.toLowerCase().includes('not found')) ||
        err.message.toLowerCase().includes('econnrefused'));

    let code: ErrorCode = opts.code ?? 'EXECUTION_ERROR';
    let retryable = opts.retryable ?? false;
    let fixHint = opts.fixHint ?? '';

    if (isZod) {
      code = 'VALIDATION_ERROR';
      retryable = false;
      fixHint = 'Check the tool\'s input schema and fix the argument types.';
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

    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      message = (err as any).message || (err as any).error || JSON.stringify(err);
    } else {
      message = String(err);
    }

    const context: Record<string, unknown> = {};
    if (isZod && (err as any).issues) {
      context.issues = (err as any).issues;
    }

    const aseErr = new ASEError(code, message, {
      ...opts,
      retryable,
      fixHint,
      context,
      cause: err instanceof Error ? err : undefined,
    });

    // Preserve original stack
    if (err instanceof Error && err.stack) {
      aseErr.stack = err.stack;
    }

    return aseErr;
  }
}

// ─── Subclasses for common cases ─────────────────────────────────────────────

export class ValidationError extends ASEError {
  constructor(message: string, opts: ASEErrorOptions = {}) {
    super('VALIDATION_ERROR', message, {
      retryable: false,
      fixHint: "Check the tool's required arguments and their types.",
      ...opts,
    });
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends ASEError {
  constructor(toolName: string, timeoutMs: number, opts: ASEErrorOptions = {}) {
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

export class AuthError extends ASEError {
  constructor(message: string, opts: ASEErrorOptions = {}) {
    super('AUTH_ERROR', message, {
      retryable: false,
      fixHint: "Obtain a valid agent_token via register_agent before calling this tool.",
      ...opts,
    });
    this.name = 'AuthError';
  }
}

export class NotFoundError extends ASEError {
  constructor(toolName: string, opts: ASEErrorOptions = {}) {
    super('NOT_FOUND', `Tool not found: ${toolName}`, {
      retryable: false,
      fixHint: "Call search_tools() to discover available tool names.",
      toolName,
      ...opts,
    });
    this.name = 'NotFoundError';
  }
}

export class CircuitOpenError extends ASEError {
  constructor(serviceName: string, retryAfterSec: number, opts: ASEErrorOptions = {}) {
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

export class InternalError extends ASEError {
  constructor(message: string, opts: ASEErrorOptions = {}) {
    super('INTERNAL_ERROR', message, {
      retryable: false,
      fixHint: 'This is an unexpected server error. Please check the server logs.',
      ...opts,
    });
    this.name = 'InternalError';
  }
}

// ─── New Subclasses (OpenHands-inspired) ─────────────────────────────────────

export class ResourceExhaustedError extends ASEError {
  constructor(resource: string, opts: ASEErrorOptions = {}) {
    super('RESOURCE_EXHAUSTED', `Resource exhausted: ${resource}`, {
      retryable: false,
      severity: 'critical',
      recoveryAction: 'purge_cache',
      fixHint: `The server is running low on ${resource}. Caches will be purged automatically.`,
      context: { resource },
      ...opts,
    });
    this.name = 'ResourceExhaustedError';
  }
}

export class DegradedServiceError extends ASEError {
  constructor(serviceName: string, reason: string, opts: ASEErrorOptions = {}) {
    super('DEGRADED_SERVICE', `Service '${serviceName}' is degraded: ${reason}`, {
      retryable: true,
      severity: 'medium',
      recoveryAction: 'degrade',
      fixHint: `The '${serviceName}' service is partially available. Operations may be slower or use fallback paths.`,
      context: { service: serviceName, reason },
      ...opts,
    });
    this.name = 'DegradedServiceError';
  }
}

export class SpokeError extends ASEError {
  constructor(spokeName: string, toolName: string, message: string, opts: ASEErrorOptions = {}) {
    super('SPOKE_ERROR', `Spoke '${spokeName}' error on tool '${toolName}': ${message}`, {
      retryable: true,
      severity: 'medium',
      recoveryAction: 'restart_spoke',
      fixHint: `The spoke '${spokeName}' encountered an error. It may need to be restarted.`,
      toolName,
      context: { spoke: spokeName },
      ...opts,
    });
    this.name = 'SpokeError';
  }
}

// ─── Error Classification (OpenHands-inspired) ──────────────────────────────

export type ErrorClassification =
  | 'validation'
  | 'timeout'
  | 'auth'
  | 'infrastructure'
  | 'resource_pressure'
  | 'spoke_failure'
  | 'unknown';

/** Classify an error into a high-level category for routing and alerting. */
export function classifyError(err: unknown): ErrorClassification {
  if (err instanceof ASEError) {
    switch (err.code) {
      case 'VALIDATION_ERROR': return 'validation';
      case 'TIMEOUT_ERROR': return 'timeout';
      case 'AUTH_ERROR': return 'auth';
      case 'REDIS_UNAVAILABLE':
      case 'CIRCUIT_OPEN':
      case 'DEGRADED_SERVICE': return 'infrastructure';
      case 'RESOURCE_EXHAUSTED':
      case 'CONCURRENCY_LIMIT': return 'resource_pressure';
      case 'SPOKE_ERROR': return 'spoke_failure';
      default: return 'unknown';
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('redis') || msg.includes('econnrefused')) return 'infrastructure';
    if (msg.includes('spoke')) return 'spoke_failure';
    if (msg.includes('heap') || msg.includes('memory')) return 'resource_pressure';
  }
  return 'unknown';
}

export function toolError(err: {
  error_code: string;
  message: string;
  retryable: boolean;
  fix_hint?: string;
  details?: unknown;
}) {
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
