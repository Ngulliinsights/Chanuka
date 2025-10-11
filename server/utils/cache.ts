import { logger } from './logger';

// Cache metrics for monitoring
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  sets: number;
}

type CacheOptions = {
  ttl: number;
};

type CacheDecorator = (
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

const cacheStore = new Map<string, { value: any; timestamp: number }>();
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
        const cached = cacheStore.get(key);
        const now = Date.now();

        if (cached && (!options.ttl || now - cached.timestamp < options.ttl * 1000)) {
          return cached.value;
        }

        const result = await originalMethod.apply(this, args);
        cacheStore.set(key, { value: result, timestamp: now });
        return result;
      };

      return descriptor;
    };
  },
  {
    /**
     * Get or set cache with enhanced error handling and metrics.
     * If cache hit fails, continues to computation.
     * If cache set fails, logs error but returns computed value.
     */
    getOrSetCache: async <T>(
      key: string,
      ttlSeconds: number,
      fn: () => Promise<T>
    ): Promise<T> => {
      const now = Date.now();

      try {
        // Attempt cache retrieval
        const cached = cacheStore.get(key);
        if (cached && (now - cached.timestamp) < (ttlSeconds * 1000)) {
          cacheMetrics.hits++;
          logger.debug('Cache hit', { component: 'cache', key, age: now - cached.timestamp });
          return cached.value;
        }
      } catch (error) {
        // Log cache get failure but continue to computation
        cacheMetrics.errors++;
        logger.warn('Cache get failed, proceeding with computation', {
          component: 'cache',
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Cache miss or get failure - compute value
      cacheMetrics.misses++;
      logger.debug('Cache miss', { component: 'cache', key });

      const result = await fn();

      try {
        // Attempt to cache the result
        cacheStore.set(key, { value: result, timestamp: now });
        cacheMetrics.sets++;
        logger.debug('Cache set successful', { component: 'cache', key, ttlSeconds });
      } catch (error) {
        // Log cache set failure but return computed value
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
    invalidate: (key: string) => {
      const deleted = cacheStore.delete(key);
      if (deleted) {
        logger.info('Cache invalidated', { component: 'cache', key });
      }
      return deleted;
    },

    /**
     * Clear all cache entries
     */
    clear: () => {
      const size = cacheStore.size;
      cacheStore.clear();
      logger.info('Cache cleared', { component: 'cache', entriesCleared: size });
      return size;
    },

    /**
     * Get cache size
     */
    size: () => cacheStore.size,

    /**
     * Check if key exists in cache
     */
    has: (key: string) => cacheStore.has(key)
  },
);







