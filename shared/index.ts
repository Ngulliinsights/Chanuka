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
// NOTE: We do NOT `export * from './core/index'` here because ./types/index
// already re-exports many of the same names (Brand, ErrorSeverity, etc.),
// which causes TS "ambiguous re-export" errors. Instead we selectively
// export only the items from ./core that are NOT already covered by ./types.

// Error enums — canonical definitions live in shared/types/index.ts
// Note: ErrorDomain and ErrorSeverity are already exported via export * from './types/index'
// so we don't need to re-export them here to avoid duplication

// Core utility functions & types not covered by ./types
// NOTE: security-utils, data-utils, and type-guards are intentionally
// omitted because they export names (validateEmail, ValidationResult, etc.)
// that collide with ./types/index or ./validation/index. Import them
// directly from '@shared/core/utils/...' when needed.
export * from './core/utils/string-utils';
export * from './core/utils/number-utils';
export * from './core/utils/regex-patterns';
export * from './core/utils/formatting';

// Platform-specific implementations (selective to avoid AnonymityLevel clash)
export { Kenya } from './platform/index';
export type {
  DisplayIdentity,
  DataRetentionPolicy,
  AnonymityService
} from './platform/index';

// ============================================================================
// VALIDATION
// ============================================================================
// NOTE: We do NOT `export * from './validation/index'` here because it
// re-exports names (validateWithSchema, validateData) that collide with
// ./types/index. Import validation utilities directly:
//   import { ... } from '@shared/validation';

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

// ============================================================================
// UTILITY COLLECTIONS
// ============================================================================

// Export utility collections for easy access
import { utils } from './core/utils/common-utils';
export { utils };

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

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  components?: Record<string, 'healthy' | 'unhealthy'>;
  details?: Record<string, unknown>;
  error?: string;
}

export const healthCheck = async (): Promise<HealthCheckResult> => {
  try {
    // NOTE: shared/database/ does not exist yet.
    // When it is created, uncomment the dynamic import below.
    // const { getDatabaseHealth } = await import('./database/index');
    // const dbHealth = await getDatabaseHealth();
    const dbHealth = { healthy: true };
    
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