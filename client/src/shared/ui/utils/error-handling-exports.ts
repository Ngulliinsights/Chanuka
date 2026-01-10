/**
 * Error Handling Re-exports
 *
 * This module provides convenient re-exports from both the core error system
 * and the UI error handling utilities. Separated from React components
 * to support Fast Refresh.
 */

// Re-export types
export type { AppError, ErrorDomain, ErrorSeverity, ErrorContext } from '@client/core/error';
export type {
  UIErrorInfo,
  UIErrorHandler,
  UIErrorType,
  UseUIErrorHandlerResult,
} from './error-handling-utils';

// Re-export functions and components from core
export {
  coreErrorHandler,
  createError,
  useCoreErrorHandler,
  ErrorBoundary as CoreErrorBoundary,
} from '@client/core/error';

// Re-export utilities
export {
  UIErrorTypes,
  classifyUIError,
  isRetryableUIError,
  createUIErrorHandler,
  createDashboardError,
  reportStoreError,
  integrateWithMonitoring,
  handleError,
} from './error-handling-utils';

// Re-export React components and hooks
export { useUIErrorHandler, UIErrorBoundary } from './error-handling';

// Default export for convenience
export { default as ErrorHandlingUtils } from './error-handling-utils';
