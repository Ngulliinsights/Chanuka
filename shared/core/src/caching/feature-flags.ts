// Feature flags for cache migration
// Controls rollout of new cache implementations

export interface CacheFeatureFlags {
  useModernMemoryCache: boolean;
  useModernRedisCache: boolean;
  useModernMultiTierCache: boolean;
  useModernCacheFactory: boolean;
  cacheMigrationPercentage: number; // 0-100, percentage of traffic using new cache
  enableCacheMonitoring: boolean;
  enableCacheFallback: boolean; // Enable fallback to legacy cache on errors
}

// Default feature flags - conservative rollout
export const DEFAULT_CACHE_FEATURE_FLAGS: CacheFeatureFlags = {
  useModernMemoryCache: false,
  useModernRedisCache: false,
  useModernMultiTierCache: false,
  useModernCacheFactory: false,
  cacheMigrationPercentage: 0,
  enableCacheMonitoring: true,
  enableCacheFallback: true,
};

// Environment-based feature flags
export function getCacheFeatureFlags(): CacheFeatureFlags {
  const env = process.env;

  return {
    useModernMemoryCache: env.USE_MODERN_MEMORY_CACHE === 'true',
    useModernRedisCache: env.USE_MODERN_REDIS_CACHE === 'true',
    useModernMultiTierCache: env.USE_MODERN_MULTI_TIER_CACHE === 'true',
    useModernCacheFactory: env.USE_MODERN_CACHE_FACTORY === 'true',
    cacheMigrationPercentage: parseInt(env.CACHE_MIGRATION_PERCENTAGE || '0', 10),
    enableCacheMonitoring: env.ENABLE_CACHE_MONITORING !== 'false',
    enableCacheFallback: env.ENABLE_CACHE_FALLBACK !== 'false',
  };
}

// Feature flag utilities
export function shouldUseModernCache(flags: CacheFeatureFlags): boolean {
  return flags.useModernMemoryCache || flags.useModernRedisCache || flags.useModernMultiTierCache;
}

export function shouldUseCacheFactory(flags: CacheFeatureFlags): boolean {
  return flags.useModernCacheFactory;
}

export function shouldEnableCacheMonitoring(flags: CacheFeatureFlags): boolean {
  return flags.enableCacheMonitoring;
}

export function shouldEnableCacheFallback(flags: CacheFeatureFlags): boolean {
  return flags.enableCacheFallback;
}

export function getCacheMigrationPercentage(flags: CacheFeatureFlags): number {
  return Math.max(0, Math.min(100, flags.cacheMigrationPercentage));
}

// Traffic routing based on migration percentage
export function shouldRouteToModernCache(flags: CacheFeatureFlags, requestId?: string): boolean {
  const percentage = getCacheMigrationPercentage(flags);
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  // Use request ID or random number for consistent routing
  const seed = requestId ? parseInt(requestId.slice(-4), 16) : Math.random() * 100;
  return seed < percentage;
}


