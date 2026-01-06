/**
 * Cache Warmer
 * Preloads cache with frequently accessed data
 */

import { EventEmitter } from 'events';

import type { CacheAdapter } from '../core/interfaces';

export interface WarmingStrategy {
  keys?: string[];
  patterns?: string[];
  preloadData?: Array<{ key: string; value: any; ttl?: number }>;
}

export class CacheWarmer extends EventEmitter {
  private strategy: WarmingStrategy;

  constructor(strategy: WarmingStrategy = {}) {
    super();
    this.strategy = strategy;
  }

  /**
   * Warm up a cache adapter
   */
  async warmUp(adapter: CacheAdapter): Promise<void> {
    try {
      const startTime = Date.now();
      let warmedCount = 0;

      // Preload specific data
      if (this.strategy.preloadData) {
        for (const { key, value, ttl } of this.strategy.preloadData) {
          await adapter.set(key, value, ttl);
          warmedCount++;
        }
      }

      // Warm up specific keys (would need external data source)
      if (this.strategy.keys) {
        // In a real implementation, you'd fetch data for these keys
        // from a database or other source
        for (const key of this.strategy.keys) {
          // Skip if already exists
          if (await adapter.exists(key)) continue;
          
          // Would fetch from primary data source here
          // For now, just mark as warmed
          warmedCount++;
        }
      }

      const duration = Date.now() - startTime;
      
      this.emit('warming:complete', {
        adapter: adapter.name,
        warmedCount,
        duration,
      });

    } catch (error) {
      this.emit('warming:error', {
        adapter: adapter.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update warming strategy
   */
  updateStrategy(strategy: WarmingStrategy): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * Get current warming strategy
   */
  getStrategy(): WarmingStrategy {
    return { ...this.strategy };
  }
}


