/**
 * Core Utilities - Main Entry Point
 * 
 * Consolidated cross-cutting utilities for the TripleCheck platform
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

// Re-export core modules (will be implemented in subsequent tasks)
// These exports will be uncommented as modules are implemented

// Cache Service
export * from './cache';

// Logging Service  
export * from './logging';

// Validation Service
export * from './validation';

// Error Handling
export * from './error-handling';

// Rate Limiting
export * from './rate-limiting';

// Health Monitoring
export * from './health';

// Middleware
export * from './middleware';

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






