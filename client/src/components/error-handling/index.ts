// Enhanced Error Boundary - Main error boundary component
export { default as EnhancedErrorBoundary } from './EnhancedErrorBoundary';
export type {
  ErrorFallbackProps,
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
} from './EnhancedErrorBoundary';

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

// Re-export error types from shared core for convenience
export {
  BaseError,
  ErrorDomain,
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  ConflictError,
  TooManyRequestsError
} from '@shared/core';












































