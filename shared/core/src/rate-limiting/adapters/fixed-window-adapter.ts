/**
 * Fixed Window Rate Limiting Adapter
 * Adapts the existing FixedWindowStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '/core/interfaces';
import { FixedWindow } from '../algorithms/fixed-window';

export class FixedWindowAdapter implements RateLimitStore {
  constructor(private store: FixedWindow) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Implement the check method using the FixedWindow algorithm
    const result = await this.store.checkLimit(key, 1);
    if (result.isErr()) {
      throw result.error;
    }

    const remainingResult = await this.store.getRemaining(key);
    if (remainingResult.isErr()) {
      throw remainingResult.error;
    }

    return {
      allowed: result.value,
      remaining: remainingResult.value,
      resetAt: new Date(Date.now() + config.windowMs),
      totalHits: config.limit - remainingResult.value,
      windowStart: Date.now(),
      algorithm: 'fixed-window'
    };
  }

  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }

  async cleanup(): Promise<void> {
    // FixedWindow doesn't have cleanup, but we can implement a no-op
  }

  async healthCheck(): Promise<boolean> {
    // Basic health check - FixedWindow is always healthy
    return true;
  }
}

/**
 * Factory function to create a fixed window adapter
 */
export function createFixedWindowAdapter(config: any): FixedWindowAdapter {
  const store = new FixedWindow(config);
  return new FixedWindowAdapter(store);
}







































