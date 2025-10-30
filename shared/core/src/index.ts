/**
 * Core Utilities - Main Entry Point
 * 
 * Consolidated cross-cutting utilities for the Chanuka platform
 * Only exports modules that actually exist (no adapters/legacy code)
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

// Core modules that exist
export * from './caching';
export * from './observability';
export * from './middleware';
export * from './primitives';
export * from './validation';
export * from './rate-limiting';
export * from './utils';
export * from './performance';
export * from './modernization';

// Testing utilities (development only)
export * as Testing from './testing';

// Version information
export const VERSION = '1.0.0';
export const CORE_UTILITIES_VERSION = VERSION;

// Feature detection (only for modules that exist)
export const FEATURES = {
  CONFIG_MANAGEMENT: true,
  CACHE_SERVICE: true,
  OBSERVABILITY: true,
  VALIDATION_SERVICE: true,
  RATE_LIMITING: true,
  PERFORMANCE_TESTING: true,
  MODERNIZATION_INFRASTRUCTURE: true,
} as const;

// Default export for convenience
export default {
  configManager,
  getConfig,
  VERSION,
  FEATURES,
};












































