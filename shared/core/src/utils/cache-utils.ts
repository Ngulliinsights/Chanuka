/**
 * Unified Cache Utilities
 * 
 * Consolidates all caching functionality from '@shared/core/caching'.ts
 * into the shared core system.
 */

import { logger } from '../observability/logging';
import { CacheAdapter } from '../caching/core/interfaces';
import { MemoryAdapter } from '../caching/adapters/memory-adapter';

// Cache metrics for monitoring
export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  sets: number;
}

export type CacheOptions = {
  ttl: number;
};

export type CacheDecorator = (
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

// Default cache adapter
const defaultAdapter = new MemoryAdapter({
  maxSize: 1000,
  defaultTtlSec: 3600
});

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  sets: 0
};

/**
 * Enhanced cache utility with error handling and metrics tracking.
 * Provides a standardized interface for caching expensive operations.
 */
export const cache = Object.assign(
  (options: Partial<CacheOptions> = {}) => {
    return (
      target: any,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const key = `${String(propertyKey)}:${JSON.stringify(args)}`;
        
        try {
          const cached = await defaultAdapter.get(key);
          if (cached !== null) {
            cacheMetrics.hits++;
            return cached;
          }
        } catch (error) {
          cacheMetrics.errors++;
          logger.warn('Cache get failed, proceeding with computation', {
            component: 'cache',
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        cacheMetrics.misses++;
        const result = await originalMethod.apply(this, args);
        
        try {
          await defaultAdapter.set(key, result, options.ttl || 3600);
          cacheMetrics.sets++;
        } catch (error) {
          cacheMetrics.errors++;
          logger.warn('Cache set failed, returning computed value', {
            component: 'cache',
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        return result;
      };

      return descriptor;
    };
  },
  {
    /**
     * Get or set cache with enhanced error handling and metrics.
     */
    getOrSetCache: async <T>(
      key: string,
      ttlSeconds: number,
      fn: () => Promise<T>
    ): Promise<T> => {
      try {
        const cached = await defaultAdapter.get<T>(key);
        if (cached !== null) {
          cacheMetrics.hits++;
          logger.debug('Cache hit', { component: 'cache', key });
          return cached;
        }
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn('Cache get failed, proceeding with computation', {
          component: 'cache',
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      cacheMetrics.misses++;
      logger.debug('Cache miss', { component: 'cache', key });

      const result = await fn();

      try {
        await defaultAdapter.set(key, result, ttlSeconds);
        cacheMetrics.sets++;
        logger.debug('Cache set successful', { component: 'cache', key, ttlSeconds });
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn('Cache set failed, returning computed value', {
          component: 'cache',
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      return result;
    },

    /**
     * Get cache metrics for monitoring
     */
    getMetrics: (): CacheMetrics => ({ ...cacheMetrics }),

    /**
     * Reset cache metrics (useful for testing)
     */
    resetMetrics: (): void => {
      cacheMetrics.hits = 0;
      cacheMetrics.misses = 0;
      cacheMetrics.errors = 0;
      cacheMetrics.sets = 0;
    },

    /**
     * Invalidate cache entry
     */
    invalidate: async (key: string) => {
      try {
        await defaultAdapter.delete(key);
        logger.info('Cache invalidated', { component: 'cache', key });
        return true;
      } catch (error) {
        logger.warn('Cache invalidation failed', { component: 'cache', key, error });
        return false;
      }
    },

    /**
     * Clear all cache entries
     */
    clear: async () => {
      try {
        await defaultAdapter.clear();
        logger.info('Cache cleared', { component: 'cache' });
        return true;
      } catch (error) {
        logger.warn('Cache clear failed', { component: 'cache', error });
        return false;
      }
    },

    /**
     * Get a value from cache
     */
    get: async (key: string) => {
      try {
        const result = await defaultAdapter.get(key);
        if (result !== null) {
          cacheMetrics.hits++;
        } else {
          cacheMetrics.misses++;
        }
        return result;
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn('Cache get failed', { key, error });
        return null;
      }
    },

    /**
     * Set a value in cache
     */
    set: async (key: string, value: any, ttlSeconds: number = 3600) => {
      try {
        await defaultAdapter.set(key, value, ttlSeconds);
        cacheMetrics.sets++;
        logger.debug('Cache set', { key, ttlSeconds });
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn('Cache set failed', { key, error });
      }
    }
  },
);




