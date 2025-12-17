/**
 * Shared Core - Main Export File
 */

// Error management
export * from './observability/error-management/errors/base-error';
export * from './observability/error-management/errors/specialized-errors';
export * from './observability/error-management/types';

// Logging
export * from './observability/logging';

// Types and enums
export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  DATA = 'data',
  INTEGRATION = 'integration'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Primitives
export * from './primitives';

// Validation - selective exports to avoid conflicts
export {
  validateRequest,
  ValidationError as CoreValidationError
} from './validation';

// Utilities
export * from './utils/api-utils';
export * from './utils/cache-utils';
export * from './utils/correlation-id';
export * from './utils/anonymity-service';
export * from './utils/common-utils';

// Services
export * from './services';

// Rate limiting
export * from './rate-limiting';

// Performance monitoring
export * from './performance';

// Types - selective to avoid conflicts
export type { Result, Maybe } from './primitives/types';
export { Ok, Err, ok, err, some, none } from './primitives/types';

// Re-export commonly used types
export type { BaseError } from './observability/error-management/errors/base-error';
export type { ValidationError, NetworkError } from './observability/error-management/errors/specialized-errors';
export type { ApiResponse, ApiError, ErrorResponse } from './utils/api-utils';

// ============================================================================
// Additional Exports - Added by Phase 1 fix
// ============================================================================

// Cache Utilities
export { getDefaultCache, createCache } from './caching/cache-manager';

// Observability Stack
export { createObservabilityStack } from './observability/observability-stack';
