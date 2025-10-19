import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types';
import { logger } from '../../observability/logging';

export class SlidingWindowStore implements RateLimitStore {
  private readonly luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local windowMs = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local burstAllowance = tonumber(ARGV[4])
    
    -- Clean old scores
    redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
    
    -- Count requests in current window
    local windowHits = redis.call('ZCARD', key)
    
    -- Calculate current rate
    local effectiveLimit = limit + (burstAllowance or 0)
    local allowed = windowHits < effectiveLimit
    
    if allowed then
      -- Record new request
      redis.call('ZADD', key, now, now .. '-' .. math.random())
      -- Extend key expiration
      redis.call('PEXPIRE', key, windowMs)
    end
    
    return {
      tostring(allowed and 1 or 0),
      tostring(math.max(0, effectiveLimit - windowHits - (allowed and 1 or 0))),
      tostring(now + windowMs),
      tostring(windowHits + (allowed and 1 or 0))
    }
  `;

  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix: string = 'ratelimit'
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const prefixedKey = `${this.keyPrefix}:${key}`;
    const burstAllowance = Math.floor(config.limit * (config.burstAllowance || 0.2));

    const [allowed, remaining, resetTime, totalHits] = await this.redis.eval(
      this.luaScript,
      1,
      prefixedKey,
      now,
      config.windowMs,
      config.limit,
      burstAllowance
    ) as [string, string, string, string];

    return {
      allowed: allowed === '1',
      remaining: parseInt(remaining, 10),
      resetTime: parseInt(resetTime, 10),
      retryAfter: allowed === '1' ? undefined : Math.ceil((parseInt(resetTime, 10) - now) / 1000),
      totalHits: parseInt(totalHits, 10),
      windowStart: now - config.windowMs,
      algorithm: 'sliding-window'
    };
  }

  async cleanup(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}












































