// Migration adapter for cache services
// Provides backward compatibility during cache migration

import { CacheService } from './types';
import { createCacheService } from './index';
import { getCacheFeatureFlags, shouldRouteToModernCache, shouldEnableCacheFallback } from './feature-flags';
import { logger } from '../observability/logging';

export interface LegacyCacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats?(): any;
}

/**
 * Migration adapter that routes between legacy and modern cache implementations
 * based on feature flags and migration percentage.
 */
export class CacheMigrationAdapter implements CacheService {
  private modernCache: CacheService;
  private legacyCache: LegacyCacheService;
  private flags = getCacheFeatureFlags();

  constructor(legacyCache: LegacyCacheService, config: any = {}) {
    this.legacyCache = legacyCache;
    this.modernCache = createCacheService({
      provider: 'memory', // Default to memory for migration
      ...config
    });

    // Refresh flags periodically
    setInterval(() => {
      this.flags = getCacheFeatureFlags();
    }, 30000); // Refresh every 30 seconds
  }

  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const useModern = shouldRouteToModernCache(this.flags, key);

    try {
      if (useModern) {
        const result = await this.modernCache.get<T>(key);
        if (result !== null) {
          logger.debug('Cache hit (modern)', { key, component: 'cache-migration' });
          return result;
        }
      }

      // Try legacy cache
      const legacyResult = await this.legacyCache.get<T>(key);
      if (legacyResult !== null) {
        logger.debug('Cache hit (legacy)', { key, component: 'cache-migration' });

        // Promote to modern cache if using modern routing
        if (useModern && shouldEnableCacheFallback(this.flags)) {
          try {
            await this.modernCache.set(key, legacyResult, 300); // 5 minutes TTL
          } catch (error) {
            logger.warn('Failed to promote legacy cache entry', {
              key,
              error: error instanceof Error ? error.message : 'Unknown error',
              component: 'cache-migration'
            });
          }
        }

        return legacyResult;
      }

      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        useModern,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });

      // Fallback to legacy if modern fails and fallback is enabled
      if (useModern && shouldEnableCacheFallback(this.flags)) {
        try {
          return await this.legacyCache.get<T>(key);
        } catch (fallbackError) {
          logger.error('Cache fallback also failed', {
            key,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            component: 'cache-migration'
          });
        }
      }

      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const useModern = shouldRouteToModernCache(this.flags, key);

    try {
      if (useModern) {
        await this.modernCache.set(key, value, ttl);
      }

      // Always write to legacy for backward compatibility during migration
      await this.legacyCache.set(key, value, ttl);

      logger.debug('Cache set completed', {
        key,
        useModern,
        ttl,
        component: 'cache-migration'
      });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        useModern,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });

      // If modern fails but fallback is enabled, still try legacy
      if (useModern && shouldEnableCacheFallback(this.flags)) {
        try {
          await this.legacyCache.set(key, value, ttl);
          logger.warn('Cache set succeeded with legacy fallback', {
            key,
            component: 'cache-migration'
          });
          return;
        } catch (fallbackError) {
          logger.error('Cache set fallback also failed', {
            key,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            component: 'cache-migration'
          });
        }
      }

      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const useModern = shouldRouteToModernCache(this.flags, key);

    try {
      if (useModern) {
        await this.modernCache.del(key);
      }

      // Always delete from legacy for consistency
      await this.legacyCache.delete(key);

      logger.debug('Cache delete completed', {
        key,
        useModern,
        component: 'cache-migration'
      });
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        useModern,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });

      // Don't throw on delete errors to avoid breaking applications
      // Log the error but continue
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.modernCache.clear) {
        await this.modernCache.clear();
      }
      await this.legacyCache.clear();

      logger.info('Cache clear completed', { component: 'cache-migration' });
    } catch (error) {
      logger.error('Cache clear error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });
      throw error;
    }
  }

  async exists?(key: string): Promise<boolean> {
    const useModern = shouldRouteToModernCache(this.flags, key);

    try {
      if (useModern && this.modernCache.exists) {
        const modernHas = await this.modernCache.exists(key);
        if (modernHas) return true;
      }

      // Check legacy cache
      return await this.legacyCache.has(key);
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        useModern,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });

      // Fallback to legacy check
      if (useModern && shouldEnableCacheFallback(this.flags)) {
        try {
          return await this.legacyCache.has(key);
        } catch (fallbackError) {
          logger.error('Cache exists fallback also failed', {
            key,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            component: 'cache-migration'
          });
        }
      }

      return false; // Conservative default
    }
  }

  getMetrics?(): any {
    // Return combined stats from both caches
    try {
      const modernStats = this.modernCache.getMetrics?.();
      const legacyStats = this.legacyCache.getStats?.();

      return {
        modern: modernStats,
        legacy: legacyStats,
        migrationFlags: this.flags,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get cache metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'cache-migration'
      });
      return null;
    }
  }
}

/**
 * Create a migration adapter for existing cache services
 */
export function createCacheMigrationAdapter(
  legacyCache: LegacyCacheService,
  config: any = {}
): CacheService {
  return new CacheMigrationAdapter(legacyCache, config);
}

/**
 * Check if a cache service is a migration adapter
 */
export function isMigrationAdapter(cache: any): cache is CacheMigrationAdapter {
  return cache instanceof CacheMigrationAdapter;
}