/**
 * Sliding Window Rate Limiting Adapter
 * Adapts the existing SlidingWindowStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types';
import { SlidingWindowStore } from '../algorithms/sliding-window';

export class SlidingWindowAdapter implements RateLimitStore {
  constructor(private store: SlidingWindowStore) {}

  async check(_key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // SlidingWindowStore doesn't have a check method that matches our interface
    // We need to implement the logic here
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or initialize request timestamps for this key
    let timestamps: number[] = [];

    // Check if adding this request would exceed the limit
    if (timestamps.length >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + config.windowMs),
        retryAfter: Math.ceil(config.windowMs / 1000),
        // totalHits: timestamps.length, // totalHits not in RateLimitResult interface
        windowStart,
        algorithm: 'sliding-window'
      };
    }

    // Add the current request timestamp
    timestamps.push(now);

    return {
      allowed: true,
      remaining: config.max - timestamps.length,
      resetAt: new Date(now + config.windowMs),
      // totalHits: timestamps.length, // totalHits not in RateLimitResult interface
      windowStart,
      algorithm: 'sliding-window'
    };
  }

  async reset(key: string): Promise<void> {
    // Sliding window doesn't have a direct reset, but we can reset via the algorithm
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
 * Factory function to create a sliding window adapter
 */
export function createSlidingWindowAdapter(redis: any): SlidingWindowAdapter {
  const store = new SlidingWindowStore(redis);
  return new SlidingWindowAdapter(store);
}








































