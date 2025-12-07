/**
 * @deprecated This error boundaries module has been consolidated into @client/components/error-handling.
 * All error handling functionality has been moved to the error-handling directory for better organization.
 * This module will be removed in a future version.
 *
 * Migration Guide:
 * - ErrorBoundary -> @client/components/error-handling/ErrorBoundary
 * - withErrorBoundary -> @client/components/error-handling/withCommunityErrorBoundary
 * - useErrorHandler -> Use error handling utilities from @client/components/error-handling
 * - ErrorBoundaryProvider -> @client/components/error-handling/ErrorRecoveryManager
 */

// Re-export everything from the consolidated error-handling module
export * from '../error-handling';

// Legacy exports with deprecation warnings
export {
  ErrorBoundary as default,
  SimpleErrorBoundary,
  CommunityErrorBoundary,
  ErrorFallback,
  ApiErrorFallback,
  ComponentErrorFallback,
  ChunkErrorFallback,
  NetworkErrorFallback,
  CriticalErrorFallback,
  ServiceUnavailable,
  ErrorRecoveryManager,
  withCommunityErrorBoundary as withErrorBoundary,
  useIncrementalErrorBoundary,
} from '../error-handling';

// Re-export types
export type {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  ErrorBoundaryState,
  CommunityErrorBoundaryProps,
  CommunityErrorBoundaryState,
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener,
  ErrorStats,
  ReactErrorInfo,
  RecoveryResult,
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
} from '../error-handling';

// Add deprecation warning when this module is imported
if (typeof console !== 'undefined' && console.warn) {
  console.warn(
    'DEPRECATED: @client/components/error-boundaries is deprecated. ' +
    'Please migrate to @client/components/error-handling. ' +
    'This module will be removed in a future version. ' +
    'See error-boundaries/README.md for migration instructions.'
  );
}