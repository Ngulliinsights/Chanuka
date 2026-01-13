/**
 * LEGACY TYPES - Deprecated Type Definitions
 *
 * Contains definitions of legacy types that have been deprecated
 * These are maintained for backward compatibility during migration periods
 */

import { DeprecationRegistry, DeprecationWarning } from './deprecation-warnings';

// ============================================================================
// LEGACY LOADING TYPES (Deprecated)
// ============================================================================

/**
 * @deprecated Use LoadingOperation from shared/types/loading instead
 */
export interface LegacyLoadingOperation {
  operationId: string;
  operationType: 'page' | 'api' | 'asset';
  startedAt: Date | number;
  endedAt?: Date | number;
  status: 'loading' | 'complete' | 'error';
  retryCount: number;
  maxRetries: number;
  error?: string;
  progress?: number;
}

/**
 * @deprecated Use LoadingStateData from shared/types/loading instead
 */
export interface LegacyLoadingState {
  isLoading: boolean;
  operations: Record<string, LegacyLoadingOperation>;
  error?: string;
  globalLoading: boolean;
}

// ============================================================================
// LEGACY ENTITY TYPES (Deprecated)
// ============================================================================

/**
 * @deprecated Use BaseEntity from shared/schema/base-types instead
 */
export interface LegacyEntity {
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated Use FullAuditEntity from shared/schema/base-types instead
 */
export interface LegacyAuditEntity extends LegacyEntity {
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// LEGACY API TYPES (Deprecated)
// ============================================================================

/**
 * @deprecated Use standardized API types from shared/types/api instead
 */
export interface LegacyApiResponse<T = any> {
  result: T;
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
  timestamp: string;
}

/**
 * @deprecated Use standardized request types from shared/types/api instead
 */
export interface LegacyApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

// ============================================================================
// DEPRECATION REGISTRATION
// ============================================================================

// Register deprecation warnings for legacy types
const deprecationRegistry = DeprecationRegistry.getInstance();

// Legacy Loading Types
deprecationRegistry.registerDeprecation({
  typeName: 'LegacyLoadingOperation',
  versionDeprecated: '2.0.0',
  versionRemoved: '3.0.0',
  replacementType: 'LoadingOperation',
  replacementImport: 'shared/types/loading',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'high',
  message: 'LegacyLoadingOperation has been replaced with the standardized LoadingOperation type',
});

deprecationRegistry.registerDeprecation({
  typeName: 'LegacyLoadingState',
  versionDeprecated: '2.0.0',
  versionRemoved: '3.0.0',
  replacementType: 'LoadingStateData',
  replacementImport: 'shared/types/loading',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'medium',
  message: 'LegacyLoadingState has been replaced with the more comprehensive LoadingStateData',
});

// Legacy Entity Types
deprecationRegistry.registerDeprecation({
  typeName: 'LegacyEntity',
  versionDeprecated: '1.5.0',
  versionRemoved: '2.5.0',
  replacementType: 'BaseEntity',
  replacementImport: 'shared/schema/base-types',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'critical',
  message: 'LegacyEntity uses non-standard field names and has been replaced with BaseEntity',
});

deprecationRegistry.registerDeprecation({
  typeName: 'LegacyAuditEntity',
  versionDeprecated: '1.5.0',
  versionRemoved: '2.5.0',
  replacementType: 'FullAuditEntity',
  replacementImport: 'shared/schema/base-types',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'critical',
  message: 'LegacyAuditEntity has inconsistent field naming and has been replaced with FullAuditEntity',
});

// Legacy API Types
deprecationRegistry.registerDeprecation({
  typeName: 'LegacyApiResponse',
  versionDeprecated: '1.8.0',
  versionRemoved: '2.8.0',
  replacementType: 'ApiResponse',
  replacementImport: 'shared/types/api/response-types',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'medium',
  message: 'LegacyApiResponse has been replaced with standardized ApiResponse type',
});

deprecationRegistry.registerDeprecation({
  typeName: 'LegacyApiRequest',
  versionDeprecated: '1.8.0',
  versionRemoved: '2.8.0',
  replacementType: 'ApiRequest',
  replacementImport: 'shared/types/api/request-types',
  migrationGuide: 'BASE_TYPES_MIGRATION_GUIDE.md',
  severity: 'medium',
  message: 'LegacyApiRequest has been replaced with standardized ApiRequest type',
});

// ============================================================================
// LEGACY TYPE FACTORY (for backward compatibility)
// ============================================================================

export class LegacyTypeFactory {
  static createLegacyLoadingOperation(data: Partial<LegacyLoadingOperation>): LegacyLoadingOperation {
    deprecationRegistry.emitWarning('LegacyLoadingOperation');

    return {
      operationId: data.operationId || 'op_' + Math.random().toString(36).substring(2),
      operationType: data.operationType || 'api',
      startedAt: data.startedAt || new Date(),
      endedAt: data.endedAt ?? new Date(),
      status: data.status || 'loading',
      retryCount: data.retryCount || 0,
      maxRetries: data.maxRetries || 3,
      error: data.error ?? '',
      progress: data.progress ?? 0,
    };
  }

  static createLegacyEntity(data: Partial<LegacyEntity>): LegacyEntity {
    deprecationRegistry.emitWarning('LegacyEntity');

    return {
      uuid: data.uuid || Math.random().toString(36).substring(2) + Date.now().toString(36),
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    };
  }

  static createLegacyApiResponse<T>(data: Partial<LegacyApiResponse<T>>): LegacyApiResponse<T> {
    deprecationRegistry.emitWarning('LegacyApiResponse');

    return {
      result: data.result as T,
      success: data.success || true,
      errorCode: data.errorCode ?? 0,
      errorMessage: data.errorMessage ?? '',
      timestamp: data.timestamp || new Date().toISOString(),
    };
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const LegacyTypes = {
  // Loading types
  LegacyLoadingOperation,
  LegacyLoadingState,

  // Entity types
  LegacyEntity,
  LegacyAuditEntity,

  // API types
  LegacyApiResponse,
  LegacyApiRequest,

  // Factory
  LegacyTypeFactory,
};