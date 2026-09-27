"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const { logger } = require('../utils/logger');
const CircuitBreaker = require('./circuit-breaker');
const metrics = require('../utils/metrics');
class RedisService {
    client;
    _state = 'connecting';
    _lastError = null;
    breaker;
    constructor() {
        const url = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
        this.client = new ioredis_1.default(url, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            connectTimeout: 3000,
            lazyConnect: true,
            retryStrategy: () => null // Fail immediately instead of retrying
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
        this.client.on('error', (err) => {
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
    getClient() {
        return this.client;
    }
    /**
     * Check if Redis is available and the circuit breaker is closed.
     */
    isAvailable() {
        const cbStatus = this.breaker.status;
        if (cbStatus.state === 'OPEN') {
            return false;
        }
        return this._state === 'connected';
    }
    /**
     * Get connection state.
     */
    getState() {
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
    async exec(fn) {
        try {
            return await this.breaker.call(fn);
        }
        catch (err) {
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
exports.RedisService = RedisService;
