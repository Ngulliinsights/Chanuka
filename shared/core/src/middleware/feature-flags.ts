// Feature flags for middleware migration
// Controls rollout of new middleware implementations

export interface MiddlewareFeatureFlags {
  useModernMiddlewareFactory: boolean;
  useModernAuthMiddleware: boolean;
  useModernRateLimitMiddleware: boolean;
  useModernValidationMiddleware: boolean;
  useModernCacheMiddleware: boolean;
  middlewareMigrationPercentage: number; // 0-100, percentage of traffic using new middleware
  enableMiddlewareMonitoring: boolean;
  enableMiddlewareFallback: boolean; // Enable fallback to legacy middleware on errors
}

// Default feature flags - conservative rollout
export const DEFAULT_MIDDLEWARE_FEATURE_FLAGS: MiddlewareFeatureFlags = {
  useModernMiddlewareFactory: false,
  useModernAuthMiddleware: false,
  useModernRateLimitMiddleware: false,
  useModernValidationMiddleware: false,
  useModernCacheMiddleware: false,
  middlewareMigrationPercentage: 0,
  enableMiddlewareMonitoring: true,
  enableMiddlewareFallback: true,
};

// Environment-based feature flags
export function getMiddlewareFeatureFlags(): MiddlewareFeatureFlags {
  const env = process.env;

  return {
    useModernMiddlewareFactory: env.USE_MODERN_MIDDLEWARE_FACTORY === 'true',
    useModernAuthMiddleware: env.USE_MODERN_AUTH_MIDDLEWARE === 'true',
    useModernRateLimitMiddleware: env.USE_MODERN_RATE_LIMIT_MIDDLEWARE === 'true',
    useModernValidationMiddleware: env.USE_MODERN_VALIDATION_MIDDLEWARE === 'true',
    useModernCacheMiddleware: env.USE_MODERN_CACHE_MIDDLEWARE === 'true',
    middlewareMigrationPercentage: parseInt(env.MIDDLEWARE_MIGRATION_PERCENTAGE || '0', 10),
    enableMiddlewareMonitoring: env.ENABLE_MIDDLEWARE_MONITORING !== 'false',
    enableMiddlewareFallback: env.ENABLE_MIDDLEWARE_FALLBACK !== 'false',
  };
}

// Feature flag utilities
export function shouldUseModernMiddleware(flags: MiddlewareFeatureFlags): boolean {
  return flags.useModernAuthMiddleware ||
         flags.useModernRateLimitMiddleware ||
         flags.useModernValidationMiddleware ||
         flags.useModernCacheMiddleware;
}

export function shouldUseMiddlewareFactory(flags: MiddlewareFeatureFlags): boolean {
  return flags.useModernMiddlewareFactory;
}

export function shouldEnableMiddlewareMonitoring(flags: MiddlewareFeatureFlags): boolean {
  return flags.enableMiddlewareMonitoring;
}

export function shouldEnableMiddlewareFallback(flags: MiddlewareFeatureFlags): boolean {
  return flags.enableMiddlewareFallback;
}

export function getMiddlewareMigrationPercentage(flags: MiddlewareFeatureFlags): number {
  return Math.max(0, Math.min(100, flags.middlewareMigrationPercentage));
}

// Traffic routing based on migration percentage
export function shouldRouteToModernMiddleware(flags: MiddlewareFeatureFlags, requestId?: string): boolean {
  const percentage = getMiddlewareMigrationPercentage(flags);
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  // Use request ID or random number for consistent routing
  const seed = requestId ? parseInt(requestId.slice(-4), 16) : Math.random() * 100;
  return seed < percentage;
}
