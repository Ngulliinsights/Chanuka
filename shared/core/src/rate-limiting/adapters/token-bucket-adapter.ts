/**
 * Token Bucket Rate Limiting Adapter
 * Adapts the existing TokenBucketStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../core/interfaces';
import { TokenBucketStore } from '../algorithms/token-bucket';

export class TokenBucketAdapter implements RateLimitStore {
  constructor(private store: TokenBucketStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  async reset(key: string): Promise<void> {
    // Token bucket doesn't have a direct reset, but we can cleanup
    await this.store.cleanup();
  }

  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }

  async healthCheck(): Promise<boolean> {
    return this.store.healthCheck();
  }
}

/**
 * Factory function to create a token bucket adapter
 */
export function createTokenBucketAdapter(redis: any): TokenBucketAdapter {
  const store = new TokenBucketStore(redis);
  return new TokenBucketAdapter(store);
}




































