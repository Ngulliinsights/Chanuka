import { Result, ok, err } from '../../primitives/types/result';

import { RateLimitAlgorithm } from './interfaces';

/**
 * Configuration for TokenBucket algorithm
 */
export interface TokenBucketConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Rate at which tokens are added per millisecond */
  refillRate: number;
  /** Initial number of tokens (default: capacity) */
  initialTokens?: number;
}

/**
 * Token Bucket Rate Limiting Algorithm
 *
 * Implements the token bucket algorithm where tokens are added to a bucket
 * at a fixed rate and consumed when requests are made. Requests are allowed
 * only if there are sufficient tokens available.
 */
export class TokenBucket implements RateLimitAlgorithm {
  // private _tokens: number;
  // private _lastRefill: number;

  constructor(
    private readonly config: TokenBucketConfig,
    private readonly store: Map<string, { tokens: number; lastRefill: number }> = new Map()
  ) {
    // this._tokens = config.initialTokens ?? config.capacity;
    // this._lastRefill = Date.now();
  }

  /**
   * Check if a request with the given cost is allowed
   * @param key - The rate limit key
   * @param cost - The cost of the request (default: 1)
   * @returns Promise<Result<boolean>> - true if allowed, false if rate limited
   */
  async checkLimit(key: string, cost: number = 1): Promise<Result<boolean>> {
    try {
      const now = Date.now();
      const state = this.store.get(key) ?? { tokens: this.config.capacity, lastRefill: now };

      // Refill tokens based on elapsed time
      const elapsed = now - state.lastRefill;
      const tokensToAdd = Math.floor(elapsed * this.config.refillRate);
      state.tokens = Math.min(this.config.capacity, state.tokens + tokensToAdd);
      state.lastRefill = now;

      // Check if request can be fulfilled
      if (state.tokens >= cost) {
        state.tokens -= cost;
        this.store.set(key, state);
        return ok(true);
      }

      this.store.set(key, state);
      return ok(false);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Token bucket check failed'));
    }
  }

  /**
   * Reset the rate limit for a key
   * @param key - The rate limit key
   * @returns Promise<Result<void>>
   */
  async reset(key: string): Promise<Result<void>> {
    try {
      this.store.set(key, {
        tokens: this.config.capacity,
        lastRefill: Date.now()
      });
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Token bucket reset failed'));
    }
  }

  /**
   * Get the remaining tokens for a key
   * @param key - The rate limit key
   * @returns Promise<Result<number>> - remaining token count
   */
  async getRemaining(key: string): Promise<Result<number>> {
    try {
      const now = Date.now();
      const state = this.store.get(key) ?? { tokens: this.config.capacity, lastRefill: now };

      // Refill tokens based on elapsed time
      const elapsed = now - state.lastRefill;
      const tokensToAdd = Math.floor(elapsed * this.config.refillRate);
      const currentTokens = Math.min(this.config.capacity, state.tokens + tokensToAdd);

      return ok(currentTokens);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Token bucket get remaining failed'));
    }
  }
}
// Export alias for backward compatibility
export { TokenBucket as TokenBucketStore };



