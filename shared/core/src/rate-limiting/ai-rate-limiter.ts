/**
 * AI Rate Limiter - Specialized rate limiting for AI services
 * 
 * Provides intelligent rate limiting specifically designed for AI operations:
 * - Service-specific limits (different limits for different AI services)
 * - Operation-specific limits (different limits for different operations)
 * - User-based and IP-based limiting
 * - Burst allowance for AI operations
 * - Cost-aware rate limiting
 */

import { RateLimitStore, RateLimitConfig, RateLimitResult } from './types';
import { RedisStore } from './stores/redis-store';
import { MemoryStore } from './stores/memory-store';
import { logger } from '../utils/logger';

export interface AIRateLimitConfig extends RateLimitConfig {
  service: string;
  operation?: string;
  costMultiplier?: number; // For cost-aware rate limiting
  burstAllowance?: number;
  userTierMultipliers?: {
    [tier: string]: number;
  };
}

export interface AIRateLimitOptions {
  store?: RateLimitStore;
  defaultConfig?: Partial<AIRateLimitConfig>;
  serviceConfigs?: {
    [service: string]: Partial<AIRateLimitConfig>;
  };
  operationConfigs?: {
    [service: string]: {
      [operation: string]: Partial<AIRateLimitConfig>;
    };
  };
}

export class AIRateLimiter {
  private store: RateLimitStore;
  private defaultConfig: AIRateLimitConfig;
  private serviceConfigs: Map<string, Partial<AIRateLimitConfig>>;
  private operationConfigs: Map<string, Map<string, Partial<AIRateLimitConfig>>>;

  constructor(options: AIRateLimitOptions = {}) {
    // Initialize store
    this.store = options.store || new MemoryStore();

    // Default configuration for AI services
    this.defaultConfig = {
      service: 'default',
      limit: 100,
      windowMs: 60000, // 1 minute
      algorithm: 'sliding-window',
      burstAllowance: 20, // 20% burst allowance
      costMultiplier: 1,
      keyPrefix: 'ai:rate_limit:',
      userTierMultipliers: {
        free: 0.5,
        basic: 1,
        premium: 2,
        enterprise: 5
      },
      ...options.defaultConfig
    };

    // Service-specific configurations
    this.serviceConfigs = new Map();
    if (options.serviceConfigs) {
      Object.entries(options.serviceConfigs).forEach(([service, config]) => {
        this.serviceConfigs.set(service, config);
      });
    }

    // Operation-specific configurations
    this.operationConfigs = new Map();
    if (options.operationConfigs) {
      Object.entries(options.operationConfigs).forEach(([service, operations]) => {
        const operationMap = new Map();
        Object.entries(operations).forEach(([operation, config]) => {
          operationMap.set(operation, config);
        });
        this.operationConfigs.set(service, operationMap);
      });
    }

    this.initializeDefaultConfigs();
  }

  /**
   * Check rate limit for AI operation
   */
  async checkLimit(
    key: string,
    service: string,
    operation?: string,
    userTier?: string,
    cost?: number
  ): Promise<RateLimitResult> {
    const config = this.getEffectiveConfig(service, operation, userTier, cost);
    const effectiveKey = `${config.keyPrefix}${service}:${operation || 'default'}:${key}`;

    try {
      return await this.store.check(effectiveKey, config);
    } catch (error) {
      logger.error('AI rate limit check failed:', { component: 'SimpleTool' }, error);
      // Fail open - allow the request
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
        windowStart: Date.now(),
        algorithm: config.algorithm
      };
    }
  }

  /**
   * Check multiple rate limits (e.g., per-user and per-IP)
   */
  async checkMultipleLimit(checks: Array<{
    key: string;
    service: string;
    operation?: string;
    userTier?: string;
    cost?: number;
  }>): Promise<{
    allowed: boolean;
    results: RateLimitResult[];
    limitingResult?: RateLimitResult;
  }> {
    const results = await Promise.all(
      checks.map(check => 
        this.checkLimit(check.key, check.service, check.operation, check.userTier, check.cost)
      )
    );

    const limitingResult = results.find(result => !result.allowed);
    
    return {
      allowed: !limitingResult,
      results,
      ...(limitingResult && { limitingResult })
    };
  }

  /**
   * Get effective configuration for a specific service/operation
   */
  private getEffectiveConfig(
    service: string,
    operation?: string,
    userTier?: string,
    cost?: number
  ): AIRateLimitConfig {
    let config = { ...this.defaultConfig };

    // Apply service-specific config
    const serviceConfig = this.serviceConfigs.get(service);
    if (serviceConfig) {
      config = { ...config, ...serviceConfig };
    }

    // Apply operation-specific config
    if (operation) {
      const operationMap = this.operationConfigs.get(service);
      const operationConfig = operationMap?.get(operation);
      if (operationConfig) {
        config = { ...config, ...operationConfig };
      }
    }

    // Apply user tier multiplier
    if (userTier && config.userTierMultipliers?.[userTier]) {
      const multiplier = config.userTierMultipliers[userTier];
      if (multiplier !== undefined) {
        config.limit = Math.floor(config.limit * multiplier);
        if (config.burstAllowance) {
          config.burstAllowance = Math.floor(config.burstAllowance * multiplier);
        }
      }
    }

    // Apply cost multiplier
    if (cost && config.costMultiplier) {
      const adjustedLimit = Math.floor(config.limit / (cost * config.costMultiplier));
      config.limit = Math.max(1, adjustedLimit); // Ensure at least 1 request
    }

    config.service = service;
    if (operation !== undefined) {
      config.operation = operation;
    }

    return config;
  }

  /**
   * Initialize default configurations for common AI services
   */
  private initializeDefaultConfigs(): void {
    // HuggingFace API configurations
    this.serviceConfigs.set('huggingface', {
      limit: 60, // 60 requests per minute
      windowMs: 60000,
      algorithm: 'sliding-window',
      burstAllowance: 10,
      costMultiplier: 1.5 // HuggingFace can be expensive
    });

    // Property Analysis AI
    this.serviceConfigs.set('property-analysis', {
      limit: 30, // 30 analyses per minute
      windowMs: 60000,
      algorithm: 'token-bucket',
      burstAllowance: 5,
      costMultiplier: 2 // Complex analysis is expensive
    });

    // Document Processing AI
    this.serviceConfigs.set('document-processing', {
      limit: 20, // 20 documents per minute
      windowMs: 60000,
      algorithm: 'sliding-window',
      burstAllowance: 3,
      costMultiplier: 3 // OCR and processing is expensive
    });

    // Fraud Detection AI
    this.serviceConfigs.set('fraud-detection', {
      limit: 100, // 100 checks per minute
      windowMs: 60000,
      algorithm: 'fixed-window',
      burstAllowance: 20,
      costMultiplier: 1 // Fraud detection should be fast and frequent
    });

    // Recommendation AI
    this.serviceConfigs.set('recommendation', {
      limit: 50, // 50 recommendations per minute
      windowMs: 60000,
      algorithm: 'sliding-window',
      burstAllowance: 10,
      costMultiplier: 1.2
    });

    // Operation-specific configs for property analysis
    const propertyAnalysisOps = new Map();
    propertyAnalysisOps.set('valuation', {
      limit: 10, // 10 valuations per minute
      costMultiplier: 5 // Valuations are very expensive
    });
    propertyAnalysisOps.set('market-analysis', {
      limit: 20, // 20 market analyses per minute
      costMultiplier: 3
    });
    propertyAnalysisOps.set('price-prediction', {
      limit: 15, // 15 predictions per minute
      costMultiplier: 4
    });
    this.operationConfigs.set('property-analysis', propertyAnalysisOps);

    // Operation-specific configs for document processing
    const documentProcessingOps = new Map();
    documentProcessingOps.set('ocr', {
      limit: 30, // 30 OCR operations per minute
      costMultiplier: 2
    });
    documentProcessingOps.set('validation', {
      limit: 50, // 50 validations per minute
      costMultiplier: 1
    });
    documentProcessingOps.set('extraction', {
      limit: 25, // 25 extractions per minute
      costMultiplier: 2.5
    });
    this.operationConfigs.set('document-processing', documentProcessingOps);
  }

  /**
   * Get current rate limit status for debugging
   */
  async getStatus(
    key: string,
    service: string,
    operation?: string
  ): Promise<{
    config: AIRateLimitConfig;
    current?: RateLimitResult;
  }> {
    const config = this.getEffectiveConfig(service, operation);
    const effectiveKey = `${config.keyPrefix}${service}:${operation || 'default'}:${key}`;

    try {
      const current = await this.store.check(effectiveKey, config);
      return { config, current };
    } catch (error) {
      return { config };
    }
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetLimit(
    key: string,
    service: string,
    operation?: string
  ): Promise<void> {
    const config = this.getEffectiveConfig(service, operation);
    const effectiveKey = `${config.keyPrefix}${service}:${operation || 'default'}:${key}`;

    // This would depend on the store implementation
    // For now, we'll just log the reset request
    logger.info('Rate limit reset requested', { component: 'SimpleTool' }, {
      key: effectiveKey,
      service,
      operation
    });
  }

  /**
   * Get metrics for all AI rate limits
   */
  async getMetrics(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    serviceBreakdown: {
      [service: string]: {
        requests: number;
        blocked: number;
        blockRate: number;
      };
    };
  }> {
    // This would integrate with your metrics system
    // For now, return mock data
    return {
      totalRequests: 0,
      blockedRequests: 0,
      serviceBreakdown: {}
    };
  }

  /**
   * Health check for the AI rate limiter
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    store: boolean;
    latency: number;
  }> {
    const startTime = performance.now();
    
    try {
      const storeHealthy = this.store.healthCheck ? await this.store.healthCheck() : true;
      const latency = performance.now() - startTime;
      
      return {
        healthy: storeHealthy,
        store: storeHealthy,
        latency: Math.round(latency)
      };
    } catch (error) {
      return {
        healthy: false,
        store: false,
        latency: performance.now() - startTime
      };
    }
  }
}

/**
 * Create AI rate limiter with Redis store
 */
export function createAIRateLimiter(options: {
  redis?: any; // Redis instance
  serviceConfigs?: AIRateLimitOptions['serviceConfigs'];
  operationConfigs?: AIRateLimitOptions['operationConfigs'];
} = {}): AIRateLimiter {
  const store = options.redis 
    ? new RedisStore(options.redis)
    : new MemoryStore();

  const aiRateLimiterOptions: AIRateLimitOptions = {
    store,
    ...(options.serviceConfigs && { serviceConfigs: options.serviceConfigs }),
    ...(options.operationConfigs && { operationConfigs: options.operationConfigs })
  };

  return new AIRateLimiter(aiRateLimiterOptions);
}

/**
 * Default AI rate limiter instance
 */
let defaultAIRateLimiter: AIRateLimiter | null = null;

export function getDefaultAIRateLimiter(): AIRateLimiter {
  if (!defaultAIRateLimiter) {
    defaultAIRateLimiter = createAIRateLimiter();
  }
  return defaultAIRateLimiter;
}

export function setDefaultAIRateLimiter(limiter: AIRateLimiter): void {
  defaultAIRateLimiter = limiter;
}






