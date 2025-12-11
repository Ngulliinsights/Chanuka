/**
 * Lazy Loading Implementation
 *
 * Provides patterns for lazy loading related data to improve performance
 * by deferring expensive operations until actually needed.
 */

import type { Result, Maybe } from '@shared/core';
import { Ok, some, none } from '@shared/core';
import { performanceMonitor } from '../../../performance-monitor';

export interface LazyLoadOptions {
  /** Whether to load related data immediately */
  eager?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Maximum batch size for related data loading */
  batchSize?: number;
}

export interface LazyLoadedData<T> {
  /** The main data */
  data: T;
  /** Function to load related data */
  loadRelated: () => Promise<Result<any, Error>>;
  /** Whether related data has been loaded */
  isRelatedLoaded: boolean;
  /** Cache for related data */
  relatedData?: any;
  /** Timestamp when data was loaded */
  loadedAt: Date;
}

export class LazyLoader {
  private static cache = new Map<string, { data: any; expiresAt: number }>();

  /**
   * Create a lazy-loaded wrapper around data with related data loading capability
   */
  static createLazyWrapper<T, R>(
    data: T,
    relatedLoader: () => Promise<Result<R, Error>>,
    options: LazyLoadOptions = {}
  ): LazyLoadedData<T> & { relatedData?: R } {
    const loadedAt = new Date();
    let isRelatedLoaded = false;
    let relatedData: R | undefined;

    const loadRelated = async (): Promise<Result<R, Error>> => {
      if (isRelatedLoaded && relatedData !== undefined) {
        return Ok(relatedData);
      }

      return performanceMonitor.monitorOperation(
        'lazy_load_related',
        async () => {
          const result = await relatedLoader();
          if (result.isOk()) {
            relatedData = result.unwrap();
            isRelatedLoaded = true;

            // Cache if TTL is specified
            if (options.cacheTtl) {
              const cacheKey = `lazy_${JSON.stringify(data)}_${Date.now()}`;
              LazyLoader.cache.set(cacheKey, {
                data: relatedData,
                expiresAt: Date.now() + options.cacheTtl
              });
            }
          }
          return result;
        },
        { dataType: typeof data, options }
      );
    };

    // Eager load if requested
    if (options.eager) {
      loadRelated();
    }

    return {
      data,
      loadRelated,
      get isRelatedLoaded() { return isRelatedLoaded; },
      get relatedData() { return relatedData; },
      loadedAt
    };
  }

  /**
   * Batch load related data for multiple items
   */
  static async batchLoadRelated<T, R>(
    items: T[],
    relatedLoader: (items: T[]) => Promise<Result<R[], Error>>,
    options: LazyLoadOptions = {}
  ): Promise<Result<Array<LazyLoadedData<T> & { relatedData?: R }>, Error>> {
    return performanceMonitor.monitorOperation(
      'batch_lazy_load',
      async () => {
        try {
          const batchSize = options.batchSize || 50;
          const results: Array<LazyLoadedData<T> & { relatedData?: R }> = [];

          // Process in batches
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const relatedResult = await relatedLoader(batch);

            if (relatedResult.isErr()) {
              return relatedResult;
            }

            const relatedData = relatedResult.unwrap();

            // Create lazy wrappers for this batch
            for (let j = 0; j < batch.length; j++) {
              const item = batch[j];
              const itemRelatedData = relatedData[j];

              results.push(LazyLoader.createLazyWrapper(
                item,
                async () => Ok(itemRelatedData),
                { ...options, eager: true } // Mark as eager since we already loaded it
              ));
            }
          }

          return Ok(results);
        } catch (error) {
          return new Err(error instanceof Error ? error : new Error('Batch lazy loading failed'));
        }
      },
      { itemCount: items.length, batchSize: options.batchSize }
    );
  }

  /**
   * Get cached data if available and not expired
   */
  static getCachedData<T>(key: string): Maybe<T> {
    const cached = LazyLoader.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return some(cached.data as T);
    }

    // Clean up expired cache
    if (cached) {
      LazyLoader.cache.delete(key);
    }

    return none;
  }

  /**
   * Set cached data with TTL
   */
  static setCachedData<T>(key: string, data: T, ttlMs: number): void {
    LazyLoader.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Clear expired cache entries
   */
  static cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of LazyLoader.cache.entries()) {
      if (value.expiresAt <= now) {
        LazyLoader.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    LazyLoader.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let expiredEntries = 0;

    for (const value of LazyLoader.cache.values()) {
      if (value.expiresAt <= now) {
        expiredEntries++;
      }
    }

    return {
      size: LazyLoader.cache.size,
      expiredEntries
    };
  }
}

// Periodic cache cleanup (every 5 minutes)
setInterval(() => {
  LazyLoader.cleanupExpiredCache();
}, 5 * 60 * 1000);