/**
 * Chanuka Shared Module - Main Entry Point
 * 
 * Provides a unified interface to all shared functionality
 * across the Chanuka platform.
 */

// ============================================================================
// TYPE SYSTEM - SINGLE SOURCE OF TRUTH
// ============================================================================

// Export all types from the consolidated type system
export * from './types/index';

// ============================================================================
// CORE INFRASTRUCTURE
// ============================================================================

// Core utilities and services
export * from './core/index';

// Database infrastructure
export * from './database/index';

// Schema definitions and types
export * from './schema/index';

// Platform-specific implementations
export * from './platform/index';

// ============================================================================
// VALIDATION
// ============================================================================

export * from './validation/index';

// ============================================================================
// INTERNATIONALIZATION
// ============================================================================

export * from './i18n/index';

// ============================================================================
// VERSION AND METADATA
// ============================================================================

export const SHARED_MODULE_VERSION = '2.0.0';
export const SUPPORTED_PLATFORMS = ['kenya'] as const;
export const SUPPORTED_LANGUAGES = ['en', 'sw'] as const;

// ============================================================================
// TYPE EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export commonly used types from the type system
export type {
  // Core branded types
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  
  // Domain types
  User,
  UserProfile,
  Bill,
  Committee,
  Comment,
  
  // API contract types
  CreateUserRequest,
  CreateUserResponse,
  CreateBillRequest,
  CreateBillResponse,
  
  // Enums
  UserRole,
  UserStatus,
  BillStatus,
  Chamber,
  ErrorClassification,
} from './types/index';

export type {
  // Core types
  Result,
  Maybe,
  BaseError,
  ApiResponse
} from './core/index';

// ============================================================================
// UTILITY COLLECTIONS
// ============================================================================

// Export utility collections for easy access
import { utils } from './core/utils/common-utils';
export { utils };
export { validation, formatting, strings, arrays, functions, objects, civic } from './core/utils/common-utils';

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

export const healthCheck = async (): Promise<void> => {
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
        platform: 'healthy',
        types: 'healthy'
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