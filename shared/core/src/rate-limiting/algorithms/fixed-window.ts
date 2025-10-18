/**
 * Fixed Window Rate Limiting Algorithm
 * 
 * Implements fixed window algorithm with Redis persistence
 * Based on patterns from optimized-rate-limiting.md
 */

import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types';
import { logger } from '../../observability/logging';

export class FixedWindowStore implements RateLimitStore {
  private readonly luaScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local windowMs = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    -- Calculate window start
    local windowStart = math.floor(now / windowMs) * windowMs
    local windowKey = key .. ':' .. windowStart
    
    -- Get current count
    local current = tonumber(redis.call('GET', windowKey)) or 0
    
    -- Check if request allowed
    local allowed = current < limit
    local remaining = math.max(0, limit - current - (allowed and 1 or 0))
    
    if allowed then
      -- Increment counter
      redis.call('INCR', windowKey)
      -- Set expiration for cleanup
      redis.call('PEXPIRE', windowKey, windowMs + 1000)
    end
    
    -- Calculate reset time (next window start)
    local resetTime = windowStart + windowMs
    
    return {
      allowed and 1 or 0,
      remaining,
      resetTime,
      current + (allowed and 1 or 0),
      windowStart
    }
  `;

  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix: string = 'rl:fw'
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const storeKey = `${this.keyPrefix}:${key}`;
    
    try {
      const [allowedRaw, remainingRaw, resetTimeRaw, totalHitsRaw, windowStartRaw] = await this.redis.eval(
        this.luaScript,
        1,
        storeKey,
        config.limit,
        config.windowMs,
        now
      ) as number[];

      const allowed = !!allowedRaw;
      const resetTime = resetTimeRaw;
      const windowStart = windowStartRaw;

      return {
        allowed,
        remaining: remainingRaw,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
        totalHits: totalHitsRaw,
        windowStart,
        algorithm: 'fixed-window'
      };
    } catch (error) {
      throw new Error(`Fixed window check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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






