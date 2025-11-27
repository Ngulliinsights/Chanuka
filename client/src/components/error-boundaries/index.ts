/**
 * Error Boundaries - Main Exports
 * 
 * Provides comprehensive error handling components for React applications
 * without Node.js dependencies.
 */

export { ErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';
export { ErrorBoundaryProvider } from './ErrorBoundaryProvider';
export type {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  BrowserError,
  RecoveryStrategy,
  ErrorSeverity,
  ErrorDomain
} from './ErrorBoundary';

// Re-export for convenience
export { ErrorSeverity, ErrorDomain } from './ErrorBoundary';