/**
 * Error Middleware Barrel Exports
 *
 * Centralized exports for all error handling middleware components
 * that handle system-specific error patterns and recovery strategies.
 */

// ============================================================================
// Security System Middleware
// ============================================================================

export {
  SecurityErrorMiddleware,
  securityErrorMiddleware,
  SecurityErrorCode,
  type SecurityErrorContext,
  type SecurityMiddlewareConfig,
} from './security-middleware';

// ============================================================================
// Hooks System Middleware
// ============================================================================

export {
  HooksErrorMiddleware,
  hooksErrorMiddleware,
  HookErrorBoundary,
  HookErrorCode,
  type HookErrorContext,
  type HooksMiddlewareConfig,
  type HookErrorBoundaryProps,
  type HookErrorFallbackProps,
} from './hooks-middleware';

// ============================================================================
// Library Services Middleware
// ============================================================================

export {
  LibraryErrorMiddleware,
  libraryErrorMiddleware,
  CircuitBreaker,
  ServiceRetryHandler,
  LibraryErrorCode,
  type ServiceErrorContext,
  type LibraryMiddlewareConfig,
  type CircuitBreakerConfig,
} from './library-middleware';

// ============================================================================
// Service Architecture Middleware
// ============================================================================

export {
  ServiceErrorMiddleware,
  serviceErrorMiddleware,
  ResponseTransformer,
  ErrorNormalizer,
  ServiceErrorCode,
  type ServiceErrorContext as ServiceArchErrorContext,
  type ServiceMiddlewareConfig,
} from './service-middleware';

// ============================================================================
// Middleware Registry and Utilities
// ============================================================================

import { securityErrorMiddleware } from './security-middleware';
import { hooksErrorMiddleware } from './hooks-middleware';
import { libraryErrorMiddleware } from './library-middleware';
import { serviceErrorMiddleware } from './service-middleware';

/**
 * Registry of all available error middleware
 */
export const errorMiddlewareRegistry = {
  security: securityErrorMiddleware,
  hooks: hooksErrorMiddleware,
  library: libraryErrorMiddleware,
  service: serviceErrorMiddleware,
} as const;

/**
 * Initialize all error middleware with default configurations
 */
export function initializeErrorMiddleware(): void {
  // Middleware are initialized as singletons when imported
  // Additional configuration can be applied here if needed
}

/**
 * Get middleware by system name
 */
export function getErrorMiddleware(system: keyof typeof errorMiddlewareRegistry) {
  return errorMiddlewareRegistry[system];
}

/**
 * Get all error middleware instances
 */
export function getAllErrorMiddleware() {
  return Object.values(errorMiddlewareRegistry);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  initialize: initializeErrorMiddleware,
  registry: errorMiddlewareRegistry,
  get: getErrorMiddleware,
  getAll: getAllErrorMiddleware,
  // Individual middleware exports for convenience
  security: securityErrorMiddleware,
  hooks: hooksErrorMiddleware,
  library: libraryErrorMiddleware,
  service: serviceErrorMiddleware,
};
