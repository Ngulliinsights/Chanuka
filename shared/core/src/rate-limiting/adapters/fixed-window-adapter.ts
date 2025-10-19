/**
 * Fixed Window Rate Limiting Adapter
 * Adapts the existing FixedWindowStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../core/interfaces';
import { FixedWindowStore } from '../algorithms/fixed-window';

export class FixedWindowAdapter implements RateLimitStore {
  constructor(private store: FixedWindowStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  async reset(key: string): Promise<void> {
    // Fixed window doesn't have a direct reset, but we can cleanup
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
 * Factory function to create a fixed window adapter
 */
export function createFixedWindowAdapter(redis: any): FixedWindowAdapter {
  const store = new FixedWindowStore(redis);
  return new FixedWindowAdapter(store);
}




































