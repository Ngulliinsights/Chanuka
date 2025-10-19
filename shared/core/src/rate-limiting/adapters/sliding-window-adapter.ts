/**
 * Sliding Window Rate Limiting Adapter
 * Adapts the existing SlidingWindowStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../core/interfaces';
import { SlidingWindowStore } from '../algorithms/sliding-window';

export class SlidingWindowAdapter implements RateLimitStore {
  constructor(private store: SlidingWindowStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  async reset(key: string): Promise<void> {
    // Sliding window doesn't have a direct reset, but we can cleanup
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
 * Factory function to create a sliding window adapter
 */
export function createSlidingWindowAdapter(redis: any): SlidingWindowAdapter {
  const store = new SlidingWindowStore(redis);
  return new SlidingWindowAdapter(store);
}




































