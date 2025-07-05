import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import { pool } from '../../shared/database/pool.js';
import { logger } from '../../shared/utils/logger.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface StorageConnections {
  redis: Redis;
  pool: typeof pool;
  sessionStore: RedisStore;
}

export const createRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  showFriendlyErrorStack: !IS_PRODUCTION,
  commandTimeout: 5000,
});

export function initializeConnections(): StorageConnections {
  const redis = new Redis(createRedisConfig());

  redis.on('error', err => {
    logger.error('Redis connection error:', err);
  });

  const sessionStore = new RedisStore({
    client: redis,
    prefix: 'sess:',
  });

  return { redis, pool, sessionStore };
}
