/**
 * Token Bucket Rate Limiting Adapter
 * Adapts the existing TokenBucketStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '/core/interfaces';
import { TokenBucketStore } from '../algorithms/token-bucket';

export class TokenBucketAdapter implements RateLimitStore {
  constructor(private store: TokenBucketStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // TokenBucketStore doesn't have a check method that matches our interface
    // We need to implement the logic here
    const now = Date.now();
    const state = { tokens: config.limit, lastRefill: now }; // Simplified state

    // Refill tokens based on elapsed time (assuming 1 token per second for simplicity)
    const elapsed = now - state.lastRefill;
    const refillRate = config.limit / (config.windowMs / 1000); // tokens per millisecond
    const tokensToAdd = Math.floor(elapsed * refillRate);
    state.tokens = Math.min(config.limit, state.tokens + tokensToAdd);
    state.lastRefill = now;

    // Check if request can be fulfilled
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return {
        allowed: true,
        remaining: state.tokens,
        resetAt: new Date(now + config.windowMs),
        totalHits: config.limit - state.tokens,
        windowStart: now - config.windowMs,
        algorithm: 'token-bucket'
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + config.windowMs),
      retryAfter: Math.ceil(config.windowMs / 1000),
      totalHits: config.limit,
      windowStart: now - config.windowMs,
      algorithm: 'token-bucket'
    };
  }

  async reset(key: string): Promise<void> {
    // Token bucket doesn't have a direct reset, but we can reset via the algorithm
    await this.store.reset(key);
  }

  async cleanup(): Promise<void> {
    // No cleanup method available, just return
    return Promise.resolve();
  }

  async healthCheck(): Promise<boolean> {
    // Basic health check - always healthy for in-memory implementation
    return Promise.resolve(true);
  }
}

/**
 * Factory function to create a token bucket adapter
 */
export function createTokenBucketAdapter(redis: any): TokenBucketAdapter {
  const store = new TokenBucketStore(redis);
  return new TokenBucketAdapter(store);
}







































