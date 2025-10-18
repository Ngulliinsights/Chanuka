/**
 * Token Bucket Rate Limiting Algorithm
 * 
 * Implements token bucket algorithm with Redis persistence and burst allowance
 * Based on patterns from optimized-rate-limiting.md
 */

import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types';
import { logger } from '../../observability/logging';

export class TokenBucketStore implements RateLimitStore {
  private readonly luaScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])
    
    -- Get current state
    local state = redis.call('HMGET', key, 'tokens', 'lastRefill')
    local tokens = tonumber(state[1]) or capacity
    local lastRefill = tonumber(state[2]) or now
    
    -- Calculate refill
    local elapsed = now - lastRefill
    tokens = math.min(capacity, tokens + elapsed * refillRate / 1000)
    
    -- Check if request allowed
    local allowed = tokens >= 1
    if allowed then
      tokens = tokens - 1
    end
    
    -- Update state
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
    redis.call('PEXPIRE', key, ttl)
    
    -- Calculate when bucket will have tokens
    local nextTokenTime = allowed and 0 or math.ceil((1 - tokens) / refillRate * 1000)
    
    return {allowed and 1 or 0, math.floor(tokens), nextTokenTime}
  `;

  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix: string = 'rl:tb'
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const storeKey = `${this.keyPrefix}:${key}`;
    
    // Calculate refill rate: tokens per millisecond
    const refillRate = config.limit / config.windowMs;
    const capacity = Math.ceil(config.limit * (1 + (config.burstAllowance || 0)));
    
    try {
      const [allowedRaw, remainingRaw, nextTokenTimeRaw] = await this.redis.eval(
        this.luaScript,
        1,
        storeKey,
        capacity,
        refillRate,
        now,
        config.windowMs * 2 // Keep state longer than window
      ) as number[];

      const allowed = !!allowedRaw;
      const nextTokenTime = nextTokenTimeRaw;

      return {
        allowed,
        remaining: remainingRaw,
        resetTime: now + nextTokenTime,
        retryAfter: allowed ? undefined : Math.ceil(nextTokenTime / 1000),
        totalHits: capacity - remainingRaw,
        windowStart: now - config.windowMs,
        algorithm: 'token-bucket'
      };
    } catch (error) {
      throw new Error(`Token bucket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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






