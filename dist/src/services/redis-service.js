"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const { logger } = require('../utils/logger');
class RedisService {
    client;
    constructor() {
        const url = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
        this.client = new ioredis_1.default(url, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true
        });
        this.client.on('connect', () => {
            logger.info('Redis', `Connected to Redis at ${url}`);
        });
        this.client.on('error', (err) => {
            logger.error('Redis', `Redis connection error: ${err.message}`);
        });
    }
    getClient() {
        return this.client;
    }
    async close() {
        await this.client.quit();
    }
}
exports.RedisService = RedisService;
