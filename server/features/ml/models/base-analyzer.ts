/**
 * Base Analyzer Class
 * Provides common functionality for all MWANGA Stack analyzers
 */

import type { AnalysisTier, TierResult, MLModelError } from './types';
import { createHash } from 'crypto';

export interface AnalyzerConfig {
  enableCaching: boolean;
  cacheExpiryMs: number;
  enableFallback: boolean;
  maxRetries: number;
  timeoutMs: number;
}

export abstract class BaseAnalyzer<TInput, TOutput> {
  protected config: AnalyzerConfig;
  protected cache: Map<string, { value: TOutput; timestamp: number }>;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheExpiryMs: config.cacheExpiryMs ?? 3600000, // 1 hour
      enableFallback: config.enableFallback ?? true,
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 30000, // 30 seconds
    };
    this.cache = new Map();
  }

  /**
   * Main analysis method with tier fallback logic
   */
  async analyze(input: TInput): Promise<TierResult<TOutput>> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          result: cached,
          tier: 'tier1', // Cached results are fastest
          confidence: 1.0,
          latencyMs: Date.now() - startTime,
          cached: true,
        };
      }
    }

    // Try each tier in sequence
    const tiers: AnalysisTier[] = ['tier1', 'tier2', 'tier3'];
    let lastError: Error | null = null;

    for (const tier of tiers) {
      try {
        const result = await this.analyzeWithTier(input, tier);
        const latencyMs = Date.now() - startTime;

        // Cache successful result
        if (this.config.enableCaching) {
          this.setCache(cacheKey, result);
        }

        return {
          result,
          tier,
          confidence: this.getConfidence(result, tier),
          latencyMs,
          cached: false,
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Tier ${tier} failed for ${this.constructor.name}:`, error);

        // If fallback is disabled or this is the last tier, throw
        if (!this.config.enableFallback || tier === 'tier3') {
          throw this.createMLError(
            `All tiers failed. Last error: ${lastError.message}`,
            tier,
            lastError
          );
        }

        // Continue to next tier
        continue;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw this.createMLError(
      'Analysis failed on all tiers',
      'tier3',
      lastError || undefined
    );
  }

  /**
   * Abstract method: Implement tier-specific analysis logic
   */
  protected abstract analyzeWithTier(
    input: TInput,
    tier: AnalysisTier
  ): Promise<TOutput>;

  /**
   * Abstract method: Calculate confidence score for result
   */
  protected abstract getConfidence(result: TOutput, tier: AnalysisTier): number;

  /**
   * Generate cache key from input
   */
  protected getCacheKey(input: TInput): string {
    const inputStr = JSON.stringify(input);
    return createHash('sha256').update(inputStr).digest('hex');
  }

  /**
   * Get result from cache if valid
   */
  protected getFromCache(key: string): TOutput | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Store result in cache
   */
  protected setCache(key: string, value: TOutput): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    // Simple cache size management
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Create standardized ML error
   */
  protected createMLError(
    message: string,
    tier: AnalysisTier,
    originalError?: Error
  ): MLModelError {
    const error = new Error(message) as MLModelError;
    error.name = 'MLModelError';
    (error as any).modelName = this.constructor.name;
    (error as any).tier = tier;
    (error as any).originalError = originalError;
    return error;
  }

  /**
   * Execute with timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = this.config.timeoutMs
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: 100ms, 200ms, 400ms, ...
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}
