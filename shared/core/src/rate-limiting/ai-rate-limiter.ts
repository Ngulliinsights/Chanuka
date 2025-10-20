import { getMetricsCollector } from './metrics';
import { RateLimitStore, AIRateLimitOptions, RateLimitResult, RateLimitOptions, IRateLimitStore } from './types';

// TODO: Import proper logger and Result types when available
// import { Result, ok, err } from '../../primitives/types/result';
// import { logger } from '../../logging/logger';

// Temporary logger stub
const logger = {
  info: (message: string, meta?: any) => console.log(message, meta),
  error: (message: string, meta?: any) => console.error(message, meta),
  debug: (message: string, meta?: any) => console.debug(message, meta),
  warn: (message: string, meta?: any) => console.warn(message, meta)
};

// Temporary Result types
type Result<T> = { isOk(): boolean; isErr(): boolean; value?: T; error?: Error };
const ok = <T>(value: T): Result<T> => ({ isOk: () => true, isErr: () => false, value });
const err = <T>(error: Error): Result<T> => ({ isOk: () => false, isErr: () => true, error });

/**
 * AI Rate Limiter Adapter
 *
 * Implements the adapter pattern to wrap existing rate limiters with AI-specific functionality:
 * - Cost-based rate limiting where different AI operations have different costs
 * - Model-specific limits (e.g., GPT-4 vs GPT-3.5 vs Claude)
 * - Token usage tracking and remaining token information
 * - Integration with observability for AI-specific metrics
 */
export class AIRateLimiterAdapter implements RateLimitStore {
  private store: IRateLimitStore;
  private options: AIRateLimitOptions;
  private metrics = getMetricsCollector();

  constructor(store: IRateLimitStore, options: AIRateLimitOptions) {
    this.store = store;
    this.options = options;
  }

  /**
   * Check if a request should be allowed based on AI-specific cost and token limits
   */
  async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // For AI requests, we need model and token information from the options
      const aiOptions = options as AIRateLimitOptions & {
        model?: string;
        tokens?: number;
        operation?: string;
      };

      const model = aiOptions.model || 'default';
      const tokens = aiOptions.tokens || 1;
      const operation = aiOptions.operation || 'default';

      // Calculate cost for this request
      const cost = this.calculateCost(model, tokens, operation);

      // Check cost-based rate limiting
      const costResult = await this.checkCostLimit(key, cost);
      if (!costResult.allowed) {
        this.recordMetrics(key, false, cost, model, tokens, operation, Date.now() - startTime);
        return costResult;
      }

      // Check token-based rate limiting if configured
      if (this.options.max && this.options.windowMs) {
        const tokenResult = await this.checkTokenLimit(key, tokens);
        if (!tokenResult.allowed) {
          this.recordMetrics(key, false, cost, model, tokens, operation, Date.now() - startTime);
          return tokenResult;
        }
      }

      // Check model-specific limits
      const modelResult = await this.checkModelLimit(key, model, tokens);
      if (!modelResult.allowed) {
        this.recordMetrics(key, false, cost, model, tokens, operation, Date.now() - startTime);
        return modelResult;
      }

      // All checks passed
      this.recordMetrics(key, true, cost, model, tokens, operation, Date.now() - startTime);
      return {
        allowed: true,
        remaining: Math.max(0, costResult.remaining),
        resetAt: costResult.resetAt
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI rate limiting error';
      this.metrics.recordError(errorMessage);

      logger.error('AI rate limiter adapter error', {
        error: errorMessage,
        key,
        processingTime
      });

      // Fail open on errors
      return {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
      };
    }
  }

  /**
   * Reset rate limiting data for a key
   */
  async reset(key: string): Promise<void> {
    try {
      // Reset cost tracking
      await this.store.delete(`${key}:cost`);

      // Reset token tracking
      await this.store.delete(`${key}:tokens`);

      // Reset model-specific tracking
      const modelKeys = Object.keys(this.options.modelCosts || {});
      for (const model of modelKeys) {
        await this.store.delete(`${key}:model:${model}`);
      }

      logger.info('AI rate limiter reset', { key });
    } catch (error) {
      logger.error('Failed to reset AI rate limiter', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key
      });
    }
  }

  /**
   * Cleanup expired rate limiting data
   */
  async cleanup(): Promise<void> {
    try {
      // The underlying store handles its own cleanup
      // We don't need to do additional cleanup for AI-specific data
      // as it will be handled by TTL in the store
      logger.debug('AI rate limiter cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup AI rate limiter', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current token usage and limits for a key
   */
  async getTokenStatus(key: string): Promise<{
    usedTokens: number;
    remainingTokens: number;
    maxTokens: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.store.get(`${key}:tokens`);
      if (result.isErr()) {
        return {
          usedTokens: 0,
          remainingTokens: this.options.max || 1000,
          maxTokens: this.options.max || 1000,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const data = result.value;
      if (!data) {
        return {
          usedTokens: 0,
          remainingTokens: this.options.max || 1000,
          maxTokens: this.options.max || 1000,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const maxTokens = this.options.max || 1000;
      const usedTokens = data.tokens;
      const remainingTokens = Math.max(0, maxTokens - usedTokens);

      return {
        usedTokens,
        remainingTokens,
        maxTokens,
        resetAt: new Date(data.resetTime)
      };
    } catch (error) {
      logger.error('Failed to get token status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key
      });

      return {
        usedTokens: 0,
        remainingTokens: this.options.max || 1000,
        maxTokens: this.options.max || 1000,
        resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
      };
    }
  }

  /**
   * Get current cost usage and limits for a key
   */
  async getCostStatus(key: string): Promise<{
    usedCost: number;
    remainingCost: number;
    maxCost: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.store.get(`${key}:cost`);
      if (result.isErr()) {
        return {
          usedCost: 0,
          remainingCost: this.options.maxCostPerWindow,
          maxCost: this.options.maxCostPerWindow,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const data = result.value;
      if (!data) {
        return {
          usedCost: 0,
          remainingCost: this.options.maxCostPerWindow,
          maxCost: this.options.maxCostPerWindow,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const maxCost = this.options.maxCostPerWindow;
      const usedCost = data.tokens * this.options.baseCost;
      const remainingCost = Math.max(0, maxCost - usedCost);

      return {
        usedCost,
        remainingCost,
        maxCost,
        resetAt: new Date(data.resetTime)
      };
    } catch (error) {
      logger.error('Failed to get cost status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key
      });

      return {
        usedCost: 0,
        remainingCost: this.options.maxCostPerWindow,
        maxCost: this.options.maxCostPerWindow,
        resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
      };
    }
  }

  /**
   * Get model-specific usage for a key
   */
  async getModelStatus(key: string, model: string): Promise<{
    usedTokens: number;
    remainingTokens: number;
    maxTokens: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.store.get(`${key}:model:${model}`);
      if (result.isErr()) {
        // Use default model limits or fallback to global limits
        const modelMax = this.getModelMaxTokens(model);
        return {
          usedTokens: 0,
          remainingTokens: modelMax,
          maxTokens: modelMax,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const data = result.value;
      if (!data) {
        const modelMax = this.getModelMaxTokens(model);
        return {
          usedTokens: 0,
          remainingTokens: modelMax,
          maxTokens: modelMax,
          resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
        };
      }

      const maxTokens = this.getModelMaxTokens(model);
      const usedTokens = data.tokens;
      const remainingTokens = Math.max(0, maxTokens - usedTokens);

      return {
        usedTokens,
        remainingTokens,
        maxTokens,
        resetAt: new Date(data.resetTime)
      };
    } catch (error) {
      logger.error('Failed to get model status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        model
      });

      const modelMax = this.getModelMaxTokens(model);
      return {
        usedTokens: 0,
        remainingTokens: modelMax,
        maxTokens: modelMax,
        resetAt: new Date(Date.now() + (this.options.windowMs || 60000))
      };
    }
  }

  /**
   * Check cost-based rate limiting
   */
  private async checkCostLimit(key: string, cost: number): Promise<RateLimitResult> {
    const costKey = `${key}:cost`;
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;
    const windowStart = now - windowMs;

    // Get current cost data
    const getResult = await this.store.get(costKey);
    if (getResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    let data = getResult.value;
    let currentCost = 0;

    if (!data) {
      // First request in window
      data = {
        tokens: 0,
        lastRefill: now,
        resetTime: now + windowMs
      };
    } else {
      // Check if window has expired
      if (now >= data.resetTime) {
        // Reset window
        data = {
          tokens: 0,
          lastRefill: now,
          resetTime: now + windowMs
        };
      } else {
        currentCost = data.tokens * this.options.baseCost;
      }
    }

    // Check if adding this cost would exceed the limit
    if (currentCost + cost > this.options.maxCostPerWindow) {
      return {
        allowed: false,
        remaining: Math.max(0, Math.floor((this.options.maxCostPerWindow - currentCost) / this.options.baseCost)),
        resetAt: new Date(data.resetTime),
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    // Update cost tracking
    data.tokens += Math.ceil(cost / this.options.baseCost);
    const setResult = await this.store.set(costKey, data, windowMs);
    if (setResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    const remainingCost = this.options.maxCostPerWindow - (data.tokens * this.options.baseCost);
    const remainingTokens = Math.max(0, Math.floor(remainingCost / this.options.baseCost));

    return {
      allowed: true,
      remaining: remainingTokens,
      resetAt: new Date(data.resetTime)
    };
  }

  /**
   * Check token-based rate limiting
   */
  private async checkTokenLimit(key: string, tokens: number): Promise<RateLimitResult> {
    const tokenKey = `${key}:tokens`;
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;
    const maxTokens = this.options.max || 1000;

    // Get current token data
    const getResult = await this.store.get(tokenKey);
    if (getResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    let data = getResult.value;
    let usedTokens = 0;

    if (!data) {
      // First request in window
      data = {
        tokens: 0,
        lastRefill: now,
        resetTime: now + windowMs
      };
    } else {
      // Check if window has expired
      if (now >= data.resetTime) {
        // Reset window
        data = {
          tokens: 0,
          lastRefill: now,
          resetTime: now + windowMs
        };
      } else {
        usedTokens = data.tokens;
      }
    }

    // Check if adding these tokens would exceed the limit
    if (usedTokens + tokens > maxTokens) {
      return {
        allowed: false,
        remaining: Math.max(0, maxTokens - usedTokens),
        resetAt: new Date(data.resetTime),
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    // Update token tracking
    data.tokens += tokens;
    const setResult = await this.store.set(tokenKey, data, windowMs);
    if (setResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    return {
      allowed: true,
      remaining: maxTokens - data.tokens,
      resetAt: new Date(data.resetTime)
    };
  }

  /**
   * Check model-specific rate limiting
   */
  private async checkModelLimit(key: string, model: string, tokens: number): Promise<RateLimitResult> {
    const modelKey = `${key}:model:${model}`;
    const now = Date.now();
    const windowMs = this.options.windowMs || 60000;
    const maxTokens = this.getModelMaxTokens(model);

    // Get current model data
    const getResult = await this.store.get(modelKey);
    if (getResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    let data = getResult.value;
    let usedTokens = 0;

    if (!data) {
      // First request for this model in window
      data = {
        tokens: 0,
        lastRefill: now,
        resetTime: now + windowMs
      };
    } else {
      // Check if window has expired
      if (now >= data.resetTime) {
        // Reset window
        data = {
          tokens: 0,
          lastRefill: now,
          resetTime: now + windowMs
        };
      } else {
        usedTokens = data.tokens;
      }
    }

    // Check if adding these tokens would exceed the model limit
    if (usedTokens + tokens > maxTokens) {
      return {
        allowed: false,
        remaining: Math.max(0, maxTokens - usedTokens),
        resetAt: new Date(data.resetTime),
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      };
    }

    // Update model tracking
    data.tokens += tokens;
    const setResult = await this.store.set(modelKey, data, windowMs);
    if (setResult.isErr()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
        retryAfter: Math.ceil(windowMs / 1000)
      };
    }

    return {
      allowed: true,
      remaining: maxTokens - data.tokens,
      resetAt: new Date(data.resetTime)
    };
  }

  /**
   * Calculate cost for a request based on model and tokens
   */
  private calculateCost(model: string, tokens: number, operation: string = 'default'): number {
    const modelMultiplier = this.options.modelCosts[model] || 1;
    let cost = this.options.baseCost * modelMultiplier * tokens;

    // Apply operation-specific multipliers if needed
    // For now, we keep it simple, but this could be extended
    if (operation === 'embedding' && model.includes('embedding')) {
      // Embeddings might have different pricing
      cost *= 0.1; // Example adjustment
    }

    return cost;
  }

  /**
   * Get maximum tokens allowed for a specific model
   */
  private getModelMaxTokens(model: string): number {
    // This could be configurable, but for now use a fraction of global max
    // or specific model limits based on the model type
    const globalMax = this.options.max || 1000;

    // Different models might have different limits
    if (model.includes('gpt-4')) {
      return Math.floor(globalMax * 0.5); // GPT-4 is more expensive, so lower limit
    } else if (model.includes('gpt-3.5') || model.includes('claude')) {
      return Math.floor(globalMax * 0.8); // More permissive for cheaper models
    } else if (model.includes('embedding')) {
      return globalMax * 2; // Embeddings are typically cheaper
    }

    return globalMax;
  }

  /**
   * Record metrics for observability
   */
  private recordMetrics(
    key: string,
    allowed: boolean,
    cost: number,
    model: string,
    tokens: number,
    operation: string,
    processingTime: number
  ): void {
    this.metrics.recordEvent({
      allowed,
      key,
      algorithm: `ai-rate-limiter:${model}`,
      remaining: allowed ? 999 : 0, // Simplified for now
      processingTime,
      // Additional AI-specific metadata
      ip: undefined, // Would be set by middleware
      userAgent: `model:${model},operation:${operation}`,
      path: `cost:${cost.toFixed(4)},tokens:${tokens}`,
      method: 'AI'
    });
  }
}

// Factory functions for common AI rate limiter configurations
export function createOpenAIRateLimiterAdapter(store: IRateLimitStore, maxCostPerWindow: number = 10): AIRateLimiterAdapter {
  return new AIRateLimiterAdapter(store, {
    windowMs: 60000, // 1 minute
    max: 10000, // Token limit fallback
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
    baseCost: 0.001,
    maxCostPerWindow
  });
}

export function createAnthropicRateLimiterAdapter(store: IRateLimitStore, maxCostPerWindow: number = 10): AIRateLimiterAdapter {
  return new AIRateLimiterAdapter(store, {
    windowMs: 60000,
    max: 10000,
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

export function createGenericAIRateLimiterAdapter(store: IRateLimitStore, maxCostPerWindow: number = 10): AIRateLimiterAdapter {
  return new AIRateLimiterAdapter(store, {
    windowMs: 60000,
    max: 10000,
    modelCosts: {
      'default': 1.0
    },
    baseCost: 0.001,
    maxCostPerWindow
  });
}
