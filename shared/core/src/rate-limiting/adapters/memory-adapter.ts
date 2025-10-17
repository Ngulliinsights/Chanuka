/**
 * Memory Rate Limiting Adapter
 * Adapts the existing MemoryRateLimitStore to the unified RateLimitStore interface
 */

import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../core/interfaces';
import { MemoryRateLimitStore } from '../stores/memory-store';

export class MemoryAdapter implements RateLimitStore {
  constructor(private store: MemoryRateLimitStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
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