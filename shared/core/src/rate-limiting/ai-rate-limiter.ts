import { RateLimitStore, AIRateLimitOptions, RateLimitResult } from './types';

export class AIRateLimiter {
  private store: RateLimitStore;
  private modelCosts: Record<string, number>;
  private baseCost: number;
  private maxCostPerWindow: number;

  constructor(
    store: RateLimitStore,
    options: AIRateLimitOptions
  ) {
    this.store = store;
    this.modelCosts = options.modelCosts;
    this.baseCost = options.baseCost;
    this.maxCostPerWindow = options.maxCostPerWindow;
  }

  async check(
    key: string,
    model: string,
    tokens: number = 1
  ): Promise<RateLimitResult> {
    const cost = this.calculateCost(model, tokens);

    // Create a cost-based rate limit option
    const costOptions = {
      windowMs: (this as any).options?.windowMs || 60000, // 1 minute default
      max: Math.floor(this.maxCostPerWindow / this.baseCost),
      message: 'AI API cost limit exceeded'
    };

    // Check if the cost would exceed the limit
    const result = await this.store.check(`${key}:cost`, costOptions);

    if (!result.allowed) {
      return {
        allowed: false,
        remaining: result.remaining,
        resetAt: result.resetAt,
        retryAfter: result.retryAfter
      };
    }

    // If allowed, we need to deduct the cost from remaining
    // This is a simplified approach - in production you might want more sophisticated cost tracking
    const adjustedRemaining = Math.max(0, result.remaining - Math.ceil(cost / this.baseCost));

    return {
      allowed: true,
      remaining: adjustedRemaining,
      resetAt: result.resetAt
    };
  }

  private calculateCost(model: string, tokens: number): number {
    const modelMultiplier = this.modelCosts[model] || 1;
    return this.baseCost * modelMultiplier * tokens;
  }

  async getCostStatus(key: string): Promise<{
    currentCost: number;
    maxCost: number;
    remainingCost: number;
    resetAt: Date;
  }> {
    const costOptions = {
      windowMs: (this as any).options?.windowMs || 60000,
      max: Math.floor(this.maxCostPerWindow / this.baseCost)
    };

    const result = await this.store.check(`${key}:cost`, costOptions);

    return {
      currentCost: this.maxCostPerWindow - (result.remaining * this.baseCost),
      maxCost: this.maxCostPerWindow,
      remainingCost: result.remaining * this.baseCost,
      resetAt: result.resetAt
    };
  }

  // Static method to create common AI rate limiters
  static createOpenAIRateLimiter(store: RateLimitStore, maxCostPerWindow: number = 100) {
    return new AIRateLimiter(store, {
      windowMs: 60000, // 1 minute
      max: 1000, // Fallback
      modelCosts: {
        'gpt-3.5-turbo': 0.002,
        'gpt-4': 0.03,
        'gpt-4-turbo': 0.01,
        'gpt-4o': 0.005,
        'gpt-4o-mini': 0.00015,
        'text-embedding-ada-002': 0.0001,
        'text-embedding-3-small': 0.00002,
        'text-embedding-3-large': 0.00013,
        'dall-e-2': 0.02,
        'dall-e-3': 0.04,
        'whisper-1': 0.006,
        'tts-1': 0.015
      },
      baseCost: 0.001, // Base cost per token
      maxCostPerWindow
    });
  }

  static createAnthropicRateLimiter(store: RateLimitStore, maxCostPerWindow: number = 100) {
    return new AIRateLimiter(store, {
      windowMs: 60000,
      max: 1000,
      modelCosts: {
        'claude-3-haiku': 0.00025,
        'claude-3-sonnet': 0.003,
        'claude-3-opus': 0.015,
        'claude-3-5-sonnet': 0.003,
        'claude-instant': 0.0008,
        'claude-2': 0.008
      },
      baseCost: 0.001,
      maxCostPerWindow
    });
  }
}
