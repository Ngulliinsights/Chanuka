import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../rate-limiting/types';
import { logger } from '../../observability/logging';

/**
 * Modern rate limiting service implementation that uses the new RateLimitStore interface
 */
export class RateLimitingService {
  private static instance: RateLimitingService;
  
  constructor(private store: RateLimitStore) {}

  /**
   * Get singleton instance with default store
   */
  static getInstance(store: RateLimitStore): RateLimitingService {
    if (!RateLimitingService.instance) {
      RateLimitingService.instance = new RateLimitingService(store);
    }
    return RateLimitingService.instance;
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    return this.store.check(key, config);
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















































