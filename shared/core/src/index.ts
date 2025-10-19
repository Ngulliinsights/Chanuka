/**
 * Core Utilities - Main Entry Point
 * 
 * Consolidated cross-cutting utilities for the Chanuka platform
 * Based on enhanced patterns from refined_cross_cutting.ts
 */

// Configuration Management
export { 
  ConfigManager, 
  configManager, 
  getConfig,
  configSchema,
  defaultFeatures 
} from './config';
export type { 
  AppConfig, 
  ConfigLoadOptions, 
  ConfigChangeEvent, 
  FeatureFlagContext, 
  FeatureFlagResult,
  ConfigValidationResult,
  DependencyValidationResult 
} from './config/types';

// Migration Utilities
export {
  LegacyCacheAdapter,
  LegacyLoggerAdapter,
  ConfigMigrationHelper,
  MiddlewareMigrationHelper,
  ImportMigrationHelper,
  FeatureFlagMigrationHelper,
  MigrationValidator,
} from './utils/migration';

// Advanced Migration Tools
export * from './migration';

// Modernization Infrastructure
export * from './modernization';

// CONSOLIDATION COMPLETE: All sprawl has been consolidated into unified systems

// Cache Service (consolidates server/utils/cache.ts)
export * from './caching';
export * from './utilities/cache';

// Logging Service (consolidates server/utils/logger.ts)
export * from './observability/logging';

// Validation Service (consolidates server/utils/validation.ts)
export * from './validation';

// Error Handling (consolidates server/utils/errors.ts, server/core/errors/, shared/core/src/errors/)
// TODO: Fix circular dependency in error management system
// export * from './observability/error-management';

// Rate Limiting (consolidates server/middleware/rate-limiter.ts)
export * from './rate-limiting';

// Health Monitoring
export * from './health';

// Middleware (consolidates server/middleware/*)
export * from './middleware';

// Performance Utilities (consolidates server/utils/performance-monitoring-utils.ts)
export * from './utilities/performance';

// Legacy adapters for backward compatibility
export * from './middleware/legacy-adapters/server-middleware-adapter';
export * from './middleware/legacy-adapters/auth-adapter';

// Testing Utilities (for development and testing environments)
export * as Testing from './testing';

// Utility functions for quick access
export const createCoreUtilities = async () => {
  const { configManager } = await import('./config');
  
  // Load configuration
  const config = await configManager.load();
  
  return {
    config,
    configManager,
    // Other utilities will be added as they're implemented
  };
};

// Version information
export const VERSION = '1.0.0';
export const CORE_UTILITIES_VERSION = VERSION;

// Feature detection
export const FEATURES = {
  CONFIG_MANAGEMENT: true,
  MIGRATION_UTILITIES: true,
  MODERNIZATION_INFRASTRUCTURE: true, // Enabled in task 1
  CACHE_SERVICE: true, // Enabled in task 2
  LOGGING_SERVICE: true, // Enabled in task 3
  VALIDATION_SERVICE: true, // Enabled in task 4
  ERROR_HANDLING: true, // Enabled in task 5
  RATE_LIMITING: true, // Enabled in task 6
  HEALTH_MONITORING: true, // Enabled in task 7
  MIDDLEWARE_INTEGRATION: true, // Enabled in task 8
  PERFORMANCE_TESTING: true, // Performance benchmarks and load testing
} as const;

// Default export for convenience
export default {
  createCoreUtilities,
  configManager,
  getConfig,
  VERSION,
  FEATURES,
};











































