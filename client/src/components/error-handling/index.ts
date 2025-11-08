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

// Re-export error types from shared errors for convenience
export * from '../../shared/errors';

// Export utility functions
export { createErrorReporter } from './utils/error-reporter';
export { normalizeError } from './utils/error-normalizer';
export { getContextualMessage } from './utils/contextual-messages';
export { getErrorIcon } from './utils/error-icons';












































