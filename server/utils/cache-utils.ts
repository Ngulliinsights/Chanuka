/**
 * Unified Cache Utilities
 *
 * Consolidates all caching functionality into the shared core system.
 */

import { MemoryAdapter } from '../infrastructure/cache/adapters/memory-adapter';
import { logger } from '../infrastructure/observability';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const defaultAdapter = new MemoryAdapter({
  maxSize: 1000,
  defaultTtlSec: 3600,
});

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  sets: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * Decorator-compatible cache utility with error handling and metrics tracking.
 * Usage:
 *   @cache({ ttl: 60 })
 *   async expensiveMethod(arg: string) { ... }
 */
export const cache = Object.assign(
  (options: Partial<CacheOptions> = {}) =>
    (
      _target: any,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ): TypedPropertyDescriptor<any> => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: unknown[]) {
        const key = `${String(propertyKey)}:${JSON.stringify(args)}`;

        try {
          const cached = await defaultAdapter.get(key);
          if (cached !== null) {
            cacheMetrics.hits++;
            return cached;
          }
        } catch (error) {
          cacheMetrics.errors++;
          logger.warn(
            { component: 'cache', key, error: toErrorMessage(error) },
            'Cache get failed, proceeding with computation',
          );
        }

        cacheMetrics.misses++;
        const result = await originalMethod.apply(this, args);

        try {
          await defaultAdapter.set(key, result, options.ttl ?? 3600);
          cacheMetrics.sets++;
        } catch (error) {
          cacheMetrics.errors++;
          logger.warn(
            { component: 'cache', key, error: toErrorMessage(error) },
            'Cache set failed, returning computed value',
          );
        }

        return result;
      };

      return descriptor;
    },

  {
    /**
     * Get or compute-and-set a cached value.
     */
    getOrSetCache: async <T>(
      key: string,
      ttlSeconds: number,
      fn: () => Promise<T>,
    ): Promise<T> => {
      try {
        const cached = await defaultAdapter.get<T>(key);
        if (cached !== null) {
          cacheMetrics.hits++;
          logger.debug({ component: 'cache', key }, 'Cache hit');
          return cached;
        }
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn(
          { component: 'cache', key, error: toErrorMessage(error) },
          'Cache get failed, proceeding with computation',
        );
      }

      cacheMetrics.misses++;
      logger.debug({ component: 'cache', key }, 'Cache miss');

      const result = await fn();

      try {
        await defaultAdapter.set(key, result, ttlSeconds);
        cacheMetrics.sets++;
        logger.debug({ component: 'cache', key, ttlSeconds }, 'Cache set successful');
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn(
          { component: 'cache', key, error: toErrorMessage(error) },
          'Cache set failed, returning computed value',
        );
      }

      return result;
    },

    /** Returns a snapshot of current cache metrics. */
    getMetrics: (): CacheMetrics => ({ ...cacheMetrics }),

    /** Resets cache metrics — useful for testing. */
    resetMetrics: (): void => {
      cacheMetrics.hits = 0;
      cacheMetrics.misses = 0;
      cacheMetrics.errors = 0;
      cacheMetrics.sets = 0;
    },

    /** Removes a single entry from the cache. */
    invalidate: async (key: string): Promise<boolean> => {
      try {
        await defaultAdapter.delete(key);
        logger.info({ component: 'cache', key }, 'Cache invalidated');
        return true;
      } catch (error) {
        logger.warn({ component: 'cache', key, error }, 'Cache invalidation failed');
        return false;
      }
    },

    /** Removes all entries from the cache. */
    clear: async (): Promise<boolean> => {
      try {
        await defaultAdapter.clear();
        logger.info({ component: 'cache' }, 'Cache cleared');
        return true;
      } catch (error) {
        logger.warn({ component: 'cache', error }, 'Cache clear failed');
        return false;
      }
    },

    /** Reads a single value from the cache. Returns null on miss or error. */
    get: async (key: string): Promise<unknown> => {
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
        logger.warn({ key, error }, 'Cache get failed');
        return null;
      }
    },

    /** Writes a single value to the cache. */
    set: async (key: string, value: unknown, ttlSeconds = 3600): Promise<void> => {
      try {
        await defaultAdapter.set(key, value, ttlSeconds);
        cacheMetrics.sets++;
        logger.debug({ key, ttlSeconds }, 'Cache set');
      } catch (error) {
        cacheMetrics.errors++;
        logger.warn({ key, error }, 'Cache set failed');
      }
    },
  },
);