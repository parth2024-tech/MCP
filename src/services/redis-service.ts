import Redis from 'ioredis';
const { logger } = require('../utils/logger');

export class RedisService {
  private client: Redis;

  constructor() {
    const url = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    });

    this.client.on('connect', () => {
      logger.info('Redis', `Connected to Redis at ${url}`);
    });

    this.client.on('error', (err: any) => {
      logger.error('Redis', `Redis connection error: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async close() {
    await this.client.quit();
  }
}
