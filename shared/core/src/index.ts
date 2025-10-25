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

// OBSERVABILITY - Single Source of Truth
// All logging, health, and error management consolidated here
export * from './observability';

// MIDDLEWARE - Cross-cutting middleware orchestration
export * from './middleware';

// PRIMITIVES - Core types and building blocks
export * from './primitives';

// Validation Service (consolidates server/utils/validation.ts)
export * from './validation';

// Rate Limiting (consolidates server/middleware/rate-limiter.ts)
export * from './rate-limiting';

// UTILITIES - Consolidated utility functions
export * from './utils';

// Performance Utilities (consolidates server/utils/performance-monitoring-utils.ts)
export * from './performance';

// API Response Utilities (consolidates server/utils/api-response.ts)
// Note: API utilities are available through ./utils/api-utils

// Legacy adapters for backward compatibility
// Note: Legacy adapters are available through specific modules in observability and validation

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
  OBSERVABILITY: true, // CONSOLIDATED: logging, health, middleware, error management
  VALIDATION_SERVICE: true, // Enabled in task 4
  RATE_LIMITING: true, // Enabled in task 6
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











































