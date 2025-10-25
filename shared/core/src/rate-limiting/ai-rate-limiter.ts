/**
 * AI Rate Limiter - specialized rate limiter for AI/ML operations
 */
import { RateLimitStore, AIRateLimitOptions, RateLimitResult } from './types';

export class AIRateLimiter {
  constructor(
    private store: RateLimitStore,
    private options: AIRateLimitOptions
  ) {}

  async checkLimit(key: string, modelName?: string): Promise<RateLimitResult> {
    const cost = modelName ? (this.options.modelCosts[modelName] || this.options.baseCost) : this.options.baseCost;
    
    // For now, use the base rate limiting logic
    // In a full implementation, this would track costs per window
    return this.store.check(key, {
      windowMs: this.options.windowMs,
      max: Math.floor(this.options.maxCostPerWindow / cost),
      message: this.options.message
    });
  }

  async reset(key: string): Promise<void> {
    return this.store.reset(key);
  }
}