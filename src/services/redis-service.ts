import Redis from 'ioredis';
const { logger } = require('../utils/logger');
const CircuitBreaker = require('./circuit-breaker');
const metrics = require('../utils/metrics');

export class RedisService {
  private client: Redis;
  private _state: 'connecting' | 'connected' | 'disconnected' | 'circuit_open' = 'connecting';
  private _lastError: string | null = null;
  private breaker: any;

  constructor() {
    const url = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy: () => null  // Fail immediately instead of retrying
    });

    this.breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryMs: 60000,
      serviceName: 'redis'
    });

    this.client.on('connect', () => {
      this._state = 'connected';
      this._lastError = null;
      logger.info('Redis', `Connected to Redis at ${url}`);
      metrics.gauge('redis.state', 1);
    });

    this.client.on('error', (err: any) => {
      this._lastError = err.message;
      this._state = 'disconnected';
      logger.error('Redis', `Redis connection error: ${err.message}`);
      metrics.gauge('redis.state', 0);
    });

    this.client.on('close', () => {
      this._state = 'disconnected';
      metrics.gauge('redis.state', 0);
    });

    this.client.on('end', () => {
      this._state = 'disconnected';
      metrics.gauge('redis.state', 0);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is available and the circuit breaker is closed.
   */
  isAvailable(): boolean {
    const cbStatus = this.breaker.status;
    if (cbStatus.state === 'OPEN') {
      return false;
    }
    return this._state === 'connected';
  }

  /**
   * Get connection state.
   */
  getState(): string {
    const cbStatus = this.breaker.status;
    if (cbStatus.state === 'OPEN') {
      return 'circuit_open';
    }
    return this._state;
  }

  /**
   * Get health status report.
   */
  getHealth() {
    return {
      state: this.getState(),
      circuitBreaker: this.breaker.status,
      lastError: this._lastError
    };
  }

  /**
   * Execute an operation wrapped in the Redis circuit breaker.
   */
  async exec<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.breaker.call(fn);
    } catch (err: any) {
      if (err.message.includes('CircuitBreaker OPEN')) {
        metrics.increment('redis.circuit_open');
      }
      throw err;
    }
  }

  async close() {
    await this.client.quit();
  }
}
