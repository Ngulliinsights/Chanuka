// Migration wrapper for server cache service
// Provides gradual migration from legacy cache to modern cache

import { cacheService } from './cache-service';
import { createCacheService } from '../../../shared/core/src/caching';
import { logger } from '../../../shared/core/src/observability/logging';

// Create modern cache service
const modernCacheService = createCacheService({
  provider: 'memory',
  maxMemoryMB: 100,
  enableMetrics: true,
  defaultTtlSec: 300
});

// For now, just use the legacy cache service
// Migration will be enabled via feature flags in future updates
export const migratedCacheService = cacheService;

// Validation function for testing migration (placeholder)
export async function validateCacheMigration(): Promise<boolean> {
  try {
    logger.info('Cache migration validation placeholder - migration not yet active', {
      component: 'cache-migration'
    });
    return true; // Placeholder - return true until migration is active
  } catch (error) {
    logger.error('Cache migration validation error', {
      component: 'cache-migration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

// Legacy export for backward compatibility
export { cacheService };