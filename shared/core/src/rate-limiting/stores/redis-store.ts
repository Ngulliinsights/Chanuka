import { Result, ok, err } from '../../primitives/types/result';
import { RateLimitData, IRateLimitStore } from '../types';
import Redis from 'ioredis';

export class RedisRateLimitStore implements IRateLimitStore {
  private redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.warn('Redis connection error in rate limiter:', err.message);
    });
  }

  async get(key: string): Promise<Result<RateLimitData | null>> {
    try {
      const data = await this.redis.get(`ratelimit:${key}`);
      if (!data) {
        return ok(null);
      }

      const parsed = JSON.parse(data) as RateLimitData;
      return ok(parsed);
    } catch (error) {
      return err(error as Error);
    }
  }

  async set(key: string, data: RateLimitData, ttl?: number): Promise<Result<void>> {
    try {
      const serialized = JSON.stringify(data);
      const redisKey = `ratelimit:${key}`;

      if (ttl) {
        await this.redis.setex(redisKey, Math.ceil(ttl / 1000), serialized);
      } else {
        await this.redis.set(redisKey, serialized);
      }

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(key: string): Promise<Result<void>> {
    try {
      await this.redis.del(`ratelimit:${key}`);
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async increment(key: string, field: string, amount: number = 1): Promise<Result<number>> {
    try {
      const redisKey = `ratelimit:${key}`;

      // Get current data
      const currentData = await this.get(key);
      if (currentData.isErr()) {
        return err(currentData.error);
      }

      let data = currentData.value;
      if (!data) {
        data = {
          tokens: 0,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000 // Default 1 minute window
        };
      }

      // Increment the field
      if (field === 'tokens') {
        data.tokens += amount;
      } else if (field === 'lastRefill') {
        data.lastRefill += amount;
      } else if (field === 'resetTime') {
        data.resetTime += amount;
      } else {
        return err(new Error(`Unknown field: ${field}`));
      }

      // Save back to Redis
      const setResult = await this.set(key, data);
      if (setResult.isErr()) {
        return err(setResult.error);
      }

      return ok(data[field as keyof RateLimitData] as number);
    } catch (error) {
      return err(error as Error);
    }
  }

  async expire(key: string, ttl: number): Promise<Result<void>> {
    try {
      await this.redis.pexpire(`ratelimit:${key}`, ttl);
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
