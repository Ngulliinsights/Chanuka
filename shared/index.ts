/**
 * Chanuka Shared Module - Main Entry Point
 * 
 * Provides a unified interface to all shared functionality
 * across the Chanuka platform.
 */

// ============================================================================
// CORE INFRASTRUCTURE
// ============================================================================

// Core utilities and services
export * from './core/src/index';

// Database infrastructure
export * from './database/index';

// Schema definitions and types
export * from './schema/index';

// Platform-specific implementations
export * from './platform/index';

// ============================================================================
// INTERNATIONALIZATION
// ============================================================================

export * from './i18n/index';

// ============================================================================
// VERSION AND METADATA
// ============================================================================

export const SHARED_MODULE_VERSION = '1.0.0';
export const SUPPORTED_PLATFORMS = ['kenya'] as const;
export const SUPPORTED_LANGUAGES = ['en', 'sw'] as const;

// ============================================================================
// TYPE EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export commonly used types
export type {
  // Database types
  User,
  Bill,
  Committee,
  UserProfile,
  
  // Anonymity types
  AnonymityLevel,
  DisplayIdentity,
  
  // Core types
  Result,
  Maybe,
  BaseError,
  ApiResponse
} from './schema/index';

// ============================================================================
// UTILITY COLLECTIONS
// ============================================================================

// Export utility collections for easy access
export { utils } from './core/src/utils/common-utils';
export { validation, formatting, strings, arrays, functions, objects, civic } from './core/src/utils/common-utils';

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

export const createSharedConfig = (environment: 'development' | 'test' | 'staging' | 'production') => {
  return {
    environment,
    database: {
      enableHealthMonitoring: environment !== 'test',
      enableMigrations: true,
      enableCircuitBreaker: environment === 'production',
    },
    security: {
      enableRateLimiting: environment === 'production',
      enableAuditLogging: environment !== 'development',
      enableEncryption: environment === 'production',
    },
    features: {
      enableAnonymity: true,
      enableMultiLanguage: environment !== 'test',
      enableAdvancedAnalytics: environment === 'production',
    }
  };
};

// ============================================================================
// HEALTH CHECK UTILITIES
// ============================================================================

export const healthCheck = async () => {
  try {
    // Import database health check
    const { getDatabaseHealth } = await import('./database/index');
    const dbHealth = await getDatabaseHealth();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: SHARED_MODULE_VERSION,
      components: {
        database: dbHealth.healthy ? 'healthy' : 'unhealthy',
        core: 'healthy',
        schema: 'healthy',
        platform: 'healthy'
      },
      details: {
        database: dbHealth
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: SHARED_MODULE_VERSION,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  version: SHARED_MODULE_VERSION,
  platforms: SUPPORTED_PLATFORMS,
  languages: SUPPORTED_LANGUAGES,
  createConfig: createSharedConfig,
  healthCheck,
  utils
};