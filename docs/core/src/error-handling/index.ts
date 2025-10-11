/**
 * Error Handling Module
 * 
 * Comprehensive error handling system with circuit breaker integration,
 * context preservation, and graceful degradation
 */

// Core error classes and utilities
export * from '../errors';

// Circuit breaker implementation
export { CircuitBreaker, CircuitBreakerState, type CircuitBreakerOptions, type CircuitBreakerMetrics } from '../errors/circuit-breaker';

// Enhanced middleware with context preservation
export {
  errorHandlerMiddleware,
  requestContextMiddleware,
  errorContextMiddleware,
  asyncErrorBoundary,
  setupGlobalErrorHandlers,
  getCurrentContext,
  runWithContext,
  runWithContextAsync,
  requestContextStorage,
  type RequestContext,
  type ErrorHandlerConfig,
} from './middleware';

// Re-export error handler from errors module for backward compatibility
export { unifiedErrorHandler, setupGlobalErrorHandlers as setupLegacyGlobalErrorHandlers } from '../errors/error-handler';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';
export { ERROR_MESSAGES, AUTH_ERROR_MESSAGES, getErrorMessage } from './legacy-adapters/error-messages-adapter';






