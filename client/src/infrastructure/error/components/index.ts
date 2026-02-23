// Enhanced Error Boundary - Main error boundary component
export { default as ErrorBoundary } from './ErrorBoundary';
export { SimpleErrorBoundary } from './SimpleErrorBoundary';
export type { ErrorFallbackProps, ErrorBoundaryProps, ErrorBoundaryState } from './ErrorBoundary';

// Community Error Boundary - Specialized for community features
export { default as CommunityErrorBoundary } from './CommunityErrorBoundary';
export { useIncrementalErrorBoundary, withCommunityErrorBoundary } from './CommunityErrorBoundary';
export type {
  CommunityErrorBoundaryProps,
  CommunityErrorBoundaryState,
} from './CommunityErrorBoundary';

// Error Fallback Components - Specialized fallback UIs
export {
  ErrorFallback,
  ApiErrorFallback,
  ComponentErrorFallback,
  ChunkErrorFallback,
  NetworkErrorFallback,
  CriticalErrorFallback,
} from './ErrorFallback';

// Service Unavailable Component - Specialized service outage display
export { ServiceUnavailable } from './ServiceUnavailable';

// Recovery UI Component
export { default as RecoveryUI } from './RecoveryUI';

// Error Recovery Manager - Recovery strategies and management
export { ErrorRecoveryManager } from './ErrorRecoveryManager';

// Re-export error types from core error module
export type {
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener,
  ErrorStats,
  ReactErrorInfo,
  ErrorBoundaryProps as CoreErrorBoundaryProps,
  ErrorFallbackProps as CoreErrorFallbackProps,
  RecoveryResult,
} from '../types';

export { ErrorDomain, ErrorSeverity, RecoveryAction } from '../constants';

// Re-export all error classes from core/error where they are actually defined
export {
  BaseError,
  ValidationError,
  NetworkError,
  UnauthorizedError,
  NotFoundError,
  CacheError,
} from '../classes';

// Export utility functions
export { createErrorReporter } from './utils/error-reporter';
export { normalizeError } from './utils/error-normalizer';
export { getContextualMessage } from './utils/contextual-messages';
export { getErrorIcon } from './utils/error-icons';
