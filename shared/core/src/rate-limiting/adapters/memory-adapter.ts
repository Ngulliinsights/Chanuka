/**
 * Memory Rate Limiting Adapter
 * Adapts the existing MemoryRateLimitStore to the unified RateLimitStore interface
 */

import { MemoryRateLimitStore } from '../stores/memory-store';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types';

export class MemoryAdapter implements RateLimitStore {
  constructor(private store: MemoryRateLimitStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const result = await this.store.check(key, {
      windowMs: config.windowMs,
      max: config.max,
      ...(config.message && { message: config.message })
      // testMax and devMax not in RateLimitOptions interface
    });

    // Add missing properties to match RateLimitResult interface
    return {
      ...result,
      // totalHits: 0, // Not tracked in memory store - totalHits not in RateLimitResult interface
      windowStart: Date.now() - config.windowMs,
      algorithm: 'fixed-window'
    };
  }

  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }

  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }

  async healthCheck(): Promise<boolean> {
    return this.store.healthCheck();
  }
}

/**
 * Factory function to create a memory adapter
 */
export function createMemoryAdapter(): MemoryAdapter {
  const store = new MemoryRateLimitStore();
  return new MemoryAdapter(store);
}








































