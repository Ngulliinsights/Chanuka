// Enhanced Error Boundary - Main error boundary component
export { default as ErrorBoundary } from './ErrorBoundary';
export type {
  ErrorFallbackProps,
  ErrorBoundaryProps,
  ErrorBoundaryState
} from './ErrorBoundary';

// Error Fallback Components - Specialized fallback UIs
export { 
  ErrorFallback, 
  ApiErrorFallback, 
  ComponentErrorFallback,
  ChunkErrorFallback,
  NetworkErrorFallback,
  CriticalErrorFallback
} from './ErrorFallback';

// Error Recovery Manager - Recovery strategies and management
export { ErrorRecoveryManager } from './ErrorRecoveryManager';

// Re-export error types from core error (excluding BaseError which comes from logger)
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
  RecoveryResult
} from '../../core/error/types';

export { 
  ErrorDomain, 
  ErrorSeverity, 
  RecoveryAction 
} from '../../core/error/constants';

// Re-export all error classes from logger where they are defined
export { 
  BaseError, 
  ValidationError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '../../utils/logger';

// Export utility functions
export { createErrorReporter } from './utils/error-reporter';
export { normalizeError } from './utils/error-normalizer';
export { getContextualMessage } from './utils/contextual-messages';
export { getErrorIcon } from './utils/error-icons';












































