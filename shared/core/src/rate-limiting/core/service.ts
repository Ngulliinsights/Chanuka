/**
 * Unified Rate Limiting Service
 * Provides a high-level interface for rate limiting operations
 */

import { RateLimitService, RateLimitStore, RateLimitConfig, RateLimitResult } from './interfaces';

export class UnifiedRateLimitService implements RateLimitService {
  private static instance: UnifiedRateLimitService;

  constructor(private store: RateLimitStore) {}

  /**
   * Get singleton instance with default store
   */
  static getInstance(store: RateLimitStore): UnifiedRateLimitService {
    if (!UnifiedRateLimitService.instance) {
      UnifiedRateLimitService.instance = new UnifiedRateLimitService(store);
    }
    return UnifiedRateLimitService.instance;
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string): Promise<void> {
    return this.store.reset(key);
  }

  /**
   * Cleanup any expired entries in the store
   */
  async cleanup(): Promise<void> {
    await this.store.cleanup?.();
  }

  /**
   * Check if the rate limit store is healthy
   */
  async healthCheck(): Promise<boolean> {
    return await this.store.healthCheck?.() ?? true;
  }
}

/**
 * Factory function to create a unified rate limit service
 */
export function createRateLimitService(store: RateLimitStore): RateLimitService {
  return new UnifiedRateLimitService(store);
}








































