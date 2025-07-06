import { Redis } from 'ioredis';

// Re-export the pool from shared module
export { createPoolConfig, pool } from '@shared/database/pool.js';

// Centralize Redis configuration
export const createRedis = (config = {}) =>
  new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    ...config,
  });

export const redis = createRedis();
