import { RateLimitStore, RateLimitOptions, RateLimitResult } from '../types';
import Redis from 'ioredis';

export class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private scriptSha: string | null = null;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.warn('Redis connection error in rate limiter:', err.message);
    });

    this.loadScript();
  }

  async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = this.getMaxRequests(options);

    try {
      const result = await this.executeScript(key, maxRequests, windowMs, now);

      const allowed = result[0] === 1;
      const remaining = Math.max(0, (result[1] || 0) - 1);
      const resetTime = result[2] || now + windowMs;

      return {
        allowed,
        remaining,
        resetAt: new Date(resetTime),
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fallback to memory store behavior if Redis fails
      throw error;
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(`ratelimit:${key}`);
    } catch (error) {
      console.error('Redis rate limit reset failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no manual cleanup needed
    return Promise.resolve();
  }

  private async loadScript(): Promise<void> {
    const script = `
      local key = KEYS[1]
      local max_requests = tonumber(ARGV[1])
      local window_ms = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      local bucket_key = "ratelimit:" .. key
      local data = redis.call("HMGET", bucket_key, "tokens", "reset_time")

      local tokens = tonumber(data[1]) or max_requests
      local reset_time = tonumber(data[2]) or 0

      if now >= reset_time then
        tokens = max_requests
        reset_time = now + window_ms
      end

      local allowed = tokens > 0 and 1 or 0

      if allowed == 1 then
        tokens = tokens - 1
      end

      redis.call("HMSET", bucket_key, "tokens", tokens, "reset_time", reset_time)
      redis.call("PEXPIRE", bucket_key, window_ms + 1000)

      return {allowed, tokens, reset_time}
    `;

    try {
      this.scriptSha = await this.redis.script('LOAD', script) as string;
    } catch (error) {
      console.error('Failed to load Redis script:', error);
    }
  }

  private async executeScript(key: string, maxRequests: number, windowMs: number, now: number): Promise<number[]> {
    if (!this.scriptSha) {
      await this.loadScript();
    }

    if (!this.scriptSha) {
      throw new Error('Redis script not loaded');
    }

    try {
      const result = await this.redis.evalsha(this.scriptSha, 1, `ratelimit:${key}`, maxRequests, windowMs, now);
      return result as number[];
    } catch (error) {
      // Script might have been flushed, reload it
      this.scriptSha = null;
      await this.loadScript();

      if (this.scriptSha) {
        const result = await this.redis.evalsha(this.scriptSha, 1, `ratelimit:${key}`, maxRequests, windowMs, now);
        return result as number[];
      }

      throw error;
    }
  }

  private getMaxRequests(options: RateLimitOptions): number {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isTestEnvironment && options.testMax) {
      return options.testMax;
    } else if (isDevelopment && options.devMax) {
      return options.devMax;
    }

    return options.max;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
