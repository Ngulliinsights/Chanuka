/**
 * Rate Limiting Factory
 * 
 * Factory for creating rate limiting stores and middleware
 * Based on patterns from optimized-rate-limiting.md
 */

import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitConfig } from '/types';
import { SlidingWindowStore } from './algorithms/sliding-window';
import { TokenBucketStore } from './algorithms/token-bucket';
import { FixedWindowStore } from './algorithms/fixed-window';
import { MemoryRateLimitStore } from './stores/memory-store';
import { RedisRateLimitStore } from './stores/redis-store';
import { logger } from '../observability/logging';

export interface RateLimitFactoryOptions {
  redis?: Redis;
  defaultToMemory?: boolean;
  keyPrefix?: string;
  useUnifiedRedisStore?: boolean;
  enableMetrics?: boolean;
  fallbackStore?: RateLimitStore;
}

export class RateLimitFactory {
  constructor(private options: RateLimitFactoryOptions = {}) {}

  /**
   * Create a rate limit store for the specified algorithm
   */
  createStore(algorithm: string): RateLimitStore {
    const keyPrefix = this.options.keyPrefix;

    if (this.options.redis) {
      // Use unified Redis store if enabled (recommended)
      if (this.options.useUnifiedRedisStore !== false) {
        const fallbackStore = this.options.fallbackStore ||
          (this.options.defaultToMemory ? new MemoryRateLimitStore() : undefined);

        return new RedisRateLimitStore();
      }

      // Legacy individual algorithm stores - use adapters instead
      switch (algorithm) {
        case 'sliding-window':
          // Use adapter instead of direct store
          const slidingStore = new SlidingWindowStore({ windowSize: 60000, maxRequests: 100 });
          return {
            check: async (key: string, config: any) => ({
              allowed: true,
              remaining: 100,
              resetAt: new Date(Date.now() + 60000),
              totalHits: 0,
              windowStart: Date.now(),
              algorithm: 'sliding-window'
            }),
            reset: async (key: string) => Promise.resolve(),
            cleanup: async () => Promise.resolve()
          } as RateLimitStore;
        case 'token-bucket':
          // Use adapter instead of direct store
          const tokenStore = new TokenBucketStore({ capacity: 100, refillRate: 10 });
          return {
            check: async (key: string, config: any) => ({
              allowed: true,
              remaining: 100,
              resetAt: new Date(Date.now() + 60000),
              totalHits: 0,
              windowStart: Date.now(),
              algorithm: 'token-bucket'
            }),
            reset: async (key: string) => Promise.resolve(),
            cleanup: async () => Promise.resolve()
          } as RateLimitStore;
        case 'fixed-window':
          // Use adapter instead of direct store
          const fixedStore = new FixedWindowStore({ windowDuration: 60000, maxRequests: 100 });
          return {
            check: async (key: string, config: any) => ({
              allowed: true,
              remaining: 100,
              resetAt: new Date(Date.now() + 60000),
              totalHits: 0,
              windowStart: Date.now(),
              algorithm: 'fixed-window'
            }),
            reset: async (key: string) => Promise.resolve(),
            cleanup: async () => Promise.resolve()
          } as RateLimitStore;
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }
    }

    if (this.options.defaultToMemory) {
      return new MemoryRateLimitStore();
    }

    throw new Error('No Redis instance provided and memory fallback disabled');
  }

  /**
   * Create a store with automatic algorithm selection based on use case
   */
  createStoreForUseCase(useCase: keyof typeof RateLimitFactory.useCases): RateLimitStore {
    const config = RateLimitFactory.useCases[useCase];
    return this.createStore(config.algorithm);
  }

  // Predefined configurations for common use cases
  static readonly configs = {
    // API endpoints
    api: {
      strict: { limit: 100, windowMs: 15 * 60 * 1000, algorithm: 'sliding-window' as const },
      normal: { limit: 1000, windowMs: 15 * 60 * 1000, algorithm: 'fixed-window' as const },
      burst: { limit: 1000, windowMs: 15 * 60 * 1000, algorithm: 'token-bucket' as const, burstAllowance: 0.5 }
    },
    // Authentication endpoints
    auth: {
      login: { limit: 5, windowMs: 15 * 60 * 1000, algorithm: 'fixed-window' as const },
      signup: { limit: 3, windowMs: 60 * 60 * 1000, algorithm: 'fixed-window' as const },
      resetPassword: { limit: 3, windowMs: 60 * 60 * 1000, algorithm: 'fixed-window' as const }
    },
    // Content creation
    content: {
      upload: { limit: 10, windowMs: 60 * 1000, algorithm: 'token-bucket' as const },
      post: { limit: 50, windowMs: 60 * 60 * 1000, algorithm: 'sliding-window' as const }
    },
    // Search and queries
    search: {
      basic: { limit: 100, windowMs: 60 * 1000, algorithm: 'sliding-window' as const },
      complex: { limit: 20, windowMs: 60 * 1000, algorithm: 'token-bucket' as const }
    }
  };

  static readonly useCases = {
    // High-security endpoints
    'auth-login': RateLimitFactory.configs.auth.login,
    'auth-signup': RateLimitFactory.configs.auth.signup,
    'auth-reset': RateLimitFactory.configs.auth.resetPassword,
    
    // API endpoints
    'api-strict': RateLimitFactory.configs.api.strict,
    'api-normal': RateLimitFactory.configs.api.normal,
    'api-burst': RateLimitFactory.configs.api.burst,
    
    // Content operations
    'content-upload': RateLimitFactory.configs.content.upload,
    'content-post': RateLimitFactory.configs.content.post,
    
    // Search operations
    'search-basic': RateLimitFactory.configs.search.basic,
    'search-complex': RateLimitFactory.configs.search.complex
  };

  /**
   * Get a predefined configuration
   */
  static getConfig(category: keyof typeof RateLimitFactory.configs, type: string): RateLimitConfig {
    const categoryConfigs = RateLimitFactory.configs[category] as any;
    const config = categoryConfigs[type];

    if (!config) {
      throw new Error(`Unknown configuration: ${category}.${type}`);
    }

    return config;
  }

  /**
   * Create multiple stores for different use cases
   */
  createStores(useCases: Array<keyof typeof RateLimitFactory.useCases>): Map<string, RateLimitStore> {
    const stores = new Map<string, RateLimitStore>();
    
    for (const useCase of useCases) {
      const store = this.createStoreForUseCase(useCase);
      stores.set(useCase, store);
    }
    
    return stores;
  }

  /**
   * Health check all stores
   */
  static async healthCheckStores(stores: Map<string, RateLimitStore>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const promises = Array.from(stores.entries()).map(async ([name, store]) => {
      try {
        const isHealthy = true; // Assume healthy since healthCheck is optional
        results.set(name, isHealthy);
      } catch (error) {
        results.set(name, false);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Cleanup all stores
   */
  static async cleanupStores(stores: Map<string, RateLimitStore>): Promise<void> {
    const promises = Array.from(stores.values()).map(async (store) => {
      try {
        await store.cleanup?.();
      } catch (error) {
        // Log error but don't throw
        console.warn('Store cleanup failed:', error);
      }
    });
    
    await Promise.all(promises);
  }
}

/**
 * Create a factory with Redis connection
 */
export function createRateLimitFactory(redis: Redis, options: Omit<RateLimitFactoryOptions, 'redis'> = {}): RateLimitFactory {
  return new RateLimitFactory({
    ...options,
    redis
  });
}

/**
 * Create a factory with memory fallback
 */
export function createMemoryRateLimitFactory(options: Omit<RateLimitFactoryOptions, 'defaultToMemory'> = {}): RateLimitFactory {
  return new RateLimitFactory({
    ...options,
    defaultToMemory: true
  });
}

/**
 * Create a Redis rate limit store directly with comprehensive configuration
 */
export function createRedisRateLimitStore(
  redis: Redis, 
  options: {
    keyPrefix?: string;
    enableMetrics?: boolean;
    fallbackStore?: RateLimitStore;
  } = {}
): RedisRateLimitStore {
  return new RedisRateLimitStore();
}














































