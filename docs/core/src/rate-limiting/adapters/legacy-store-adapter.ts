import { RateLimitStore, RateLimitConfig, RateLimitResult, RateLimitMetricsInterface } from '../types';
import { logger } from '../utils/logger';

/**
 * Legacy RateLimitStore interface from original implementation 
 */
export interface LegacyRateLimitStore {
  hit(
    key: string,
    max: number, 
    windowMs: number,
    algorithm?: string
  ): Promise<RateLimitResult>;
  getMetrics?(): RateLimitMetricsInterface; 
}

/**
 * Adapter to convert legacy RateLimitStore implementations to new interface
 */
export class LegacyStoreAdapter implements RateLimitStore {
  constructor(private legacyStore: LegacyRateLimitStore) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Convert config to legacy parameters
    const result = await this.legacyStore.hit(
      key,
      config.limit,
      config.windowMs,
      config.algorithm
    );

    return {
      ...result,
      // Ensure all required fields are present
      algorithm: result.algorithm || config.algorithm,
      windowStart: result.windowStart || Date.now()
    };
  }

  async cleanup?(): Promise<void> {
    // Legacy stores don't have cleanup, no-op
  }

  async healthCheck?(): Promise<boolean> {
    // Legacy stores don't have health check, assume healthy
    return true;
  }
}







