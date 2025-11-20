import { Result, ok, err } from '../../primitives/types/result';
import { RateLimitData, IRateLimitStore, RateLimitStore, RateLimitOptions } from '/types';
import { RateLimitResult } from '/core/interfaces';
import Redis from 'ioredis';

export class RedisRateLimitStore implements IRateLimitStore, RateLimitStore {
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

 // RateLimitStore interface methods
 async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
   const now = Date.now();
   const redisKey = `ratelimit:${key}`;

   try {
     const data = await this.get(key);

     if (data.isErr() || !data.value || now >= data.value.resetTime) {
       // Reset window
       const newData: RateLimitData = {
         tokens: Math.max(0, options.max - 1),
         lastRefill: now,
         resetTime: now + options.windowMs
       };

       await this.set(key, newData, options.windowMs);

       return {
         allowed: true,
         remaining: newData.tokens,
         resetAt: new Date(newData.resetTime),
         totalHits: 1,
         windowStart: now,
         algorithm: 'fixed-window'
       };
     }

     const currentData = data.value;
     const totalHits = options.max - currentData.tokens + 1;

     if (currentData.tokens > 0) {
       currentData.tokens--;
       await this.set(key, currentData);

       return {
         allowed: true,
         remaining: currentData.tokens,
         resetAt: new Date(currentData.resetTime),
         totalHits: totalHits,
         windowStart: currentData.lastRefill,
         algorithm: 'fixed-window'
       };
     }

     return {
       allowed: false,
       remaining: 0,
       resetAt: new Date(currentData.resetTime),
       retryAfter: Math.ceil((currentData.resetTime - now) / 1000),
       totalHits: totalHits,
       windowStart: currentData.lastRefill,
       algorithm: 'fixed-window'
     };
   } catch (error) {
     // Fallback to allow on Redis errors
     return {
       allowed: true,
       remaining: Math.max(0, options.max - 1),
       resetAt: new Date(now + options.windowMs),
       totalHits: 1,
       windowStart: now,
       algorithm: 'fixed-window'
     };
   }
 }

 async reset(key: string): Promise<void> {
   await this.delete(key);
 }

 async cleanup(): Promise<void> {
   try {
     // Find all rate limit keys and delete expired ones
     const keys = await this.redis.keys('ratelimit:*');
     if (keys.length === 0) return;

     const pipeline = this.redis.pipeline();
     const now = Date.now();

     for (const key of keys) {
       // Check if the key has expired by getting its TTL
       const ttl = await this.redis.pttl(key);
       if (ttl <= 0) {
         pipeline.del(key);
       }
     }

     await pipeline.exec();
   } catch (error) {
     console.warn('Redis cleanup failed:', error);
     // Don't throw - cleanup failures shouldn't break the application
   }
 }

 // Health check method
 async healthCheck(): Promise<boolean> {
   try {
     await this.redis.ping();
     return true;
   } catch (error) {
     console.warn('Redis health check failed:', error);
     return false;
   }
 }

 // Additional methods for comprehensive rate limiting
 async getMetrics(): Promise<any> {
   try {
     const keys = await this.redis.keys('ratelimit:*');
     const totalKeys = keys.length;

     // Get basic stats
     const info = await this.redis.info('stats');
     const connectedClients = parseInt(info.match(/connected_clients:(\d+)/)?.[1] || '0');

     return {
       totalKeys,
       connectedClients,
       timestamp: Date.now(),
       storeType: 'redis'
     };
   } catch (error) {
     console.warn('Failed to get Redis metrics:', error);
     return {
       totalKeys: 0,
       connectedClients: 0,
       timestamp: Date.now(),
       storeType: 'redis',
       error: error instanceof Error ? error.message : 'Unknown error'
     };
   }
 }

 async setRateLimit(key: string, limit: number, windowMs: number): Promise<Result<void>> {
   try {
     const redisKey = `ratelimit:${key}`;
     const data: RateLimitData = {
       tokens: limit,
       lastRefill: Date.now(),
       resetTime: Date.now() + windowMs
     };

     const serialized = JSON.stringify(data);
     await this.redis.setex(redisKey, Math.ceil(windowMs / 1000), serialized);

     return ok(undefined);
   } catch (error) {
     return err(error as Error);
   }
 }

 async getRateLimitStatus(key: string): Promise<Result<any>> {
   try {
     const data = await this.get(key);
     if (data.isErr()) {
       return err(data.error);
     }

     if (!data.value) {
       return ok({
         currentCount: 0,
         limit: 0,
         windowStart: 0,
         windowEnd: 0,
         remaining: 0
       });
     }

     const currentData = data.value;
     const now = Date.now();
     const remaining = Math.max(0, currentData.tokens);

     return ok({
       currentCount: currentData.tokens,
       limit: currentData.tokens + (now < currentData.resetTime ? 1 : 0), // Estimate limit
       windowStart: currentData.lastRefill,
       windowEnd: currentData.resetTime,
       remaining
     });
   } catch (error) {
     return err(error as Error);
   }
 }

 getConnectionInfo(): any {
   try {
     const options = (this.redis as any).options || {};
     return {
       host: options.host || 'unknown',
       port: options.port || 6379,
       status: this.redis.status || 'unknown',
       connected: this.redis.status === 'ready'
     };
   } catch (error) {
     return {
       host: 'unknown',
       port: 6379,
       status: 'error',
       connected: false,
       error: error instanceof Error ? error.message : 'Unknown error'
     };
   }
 }
}


