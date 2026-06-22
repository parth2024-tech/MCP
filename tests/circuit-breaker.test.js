/**
 * tests/circuit-breaker.test.js
 *
 * Unit tests for the shared CircuitBreaker service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger and metrics to avoid side effects in tests
vi.mock('../src/utils/logger', () => ({
  warn: vi.fn(),
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));
vi.mock('../src/utils/metrics', () => ({
  increment: vi.fn()
}));

import CircuitBreaker from '../src/services/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryMs: 5000,
      serviceName: 'test-service'
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.status.state).toBe('CLOSED');
    expect(breaker.status.failureCount).toBe(0);
  });

  it('calls the function and returns result in CLOSED state', async () => {
    const result = await breaker.call(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.status.state).toBe('CLOSED');
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const failFn = async () => { throw new Error('test failure'); };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(failFn)).rejects.toThrow('test failure');
    }

    expect(breaker.status.state).toBe('OPEN');
    expect(breaker.status.failureCount).toBe(3);
  });

  it('rejects immediately when OPEN without calling fn', async () => {
    // Force OPEN by simulating failures
    const failFn = async () => { throw new Error('fail'); };
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(failFn)).rejects.toThrow();
    }

    // Now it's open — next call should reject without calling fn
    const mockFn = vi.fn(async () => 'should not be called');
    await expect(breaker.call(mockFn)).rejects.toThrow(/OPEN/);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('transitions to HALF_OPEN after recovery period', async () => {
    // Open the breaker
    const failFn = async () => { throw new Error('fail'); };
    for (let i = 0; i < 3; i++) {
      await expect(breaker.call(failFn)).rejects.toThrow();
    }
    expect(breaker.status.state).toBe('OPEN');

    // Simulate time passing by backdating openedAt
    breaker.openedAt = Date.now() - 6000; // past the 5000ms recovery

    // Successful call should transition through HALF_OPEN to CLOSED
    const result = await breaker.call(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.status.state).toBe('CLOSED');
    expect(breaker.status.failureCount).toBe(0);
  });

  it('resets failure count on success', async () => {
    // One failure then success
    await expect(breaker.call(async () => { throw new Error('oops'); })).rejects.toThrow();
    expect(breaker.status.failureCount).toBe(1);

    await breaker.call(async () => 'ok');
    expect(breaker.status.failureCount).toBe(0);
  });

  it('status includes serviceName', () => {
    expect(breaker.status.serviceName).toBe('test-service');
  });
});
