import { ErrorBoundary } from '@client/components/error-handling/ErrorBoundary';
import { ErrorFallback } from '@client/components/error-handling/ErrorFallback';

import { coreErrorHandler, ErrorDomain, ErrorSeverity } from '../core/error';
// Note: ErrorModal and ErrorToast may need to be implemented in error-handling directory
// import { ErrorModal, useErrorModal } from '@client/components/error-handling/ErrorModal';
// import { ErrorToast, useErrorToast } from '@client/components/error-handling/ErrorToast';

/**
 * Error Integration Module
 * Provides a centralized way to initialize and configure all error handling components
 */

export interface ErrorIntegrationConfig {
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  reportingEndpoint?: string;
  maxErrors?: number;
  notificationDebounceMs?: number;
  logErrors?: boolean;
}

/**
 * Initialize the complete error handling system
 * 
 * This function sets up the entire error handling infrastructure for your application.
 * It configures the unified error handler with your preferences, initializes error
 * reporting if enabled, and logs the configuration for debugging purposes.
 */
export function initializeErrorHandling(config: ErrorIntegrationConfig = {}): void {
  const defaultConfig = {
    enableGlobalHandlers: true,
    enableRecovery: true,
    enableReporting: true,
    maxErrors: 100,
    notificationDebounceMs: 100,
    logErrors: true,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Configure the unified error handler with merged settings
  errorHandler.configure(finalConfig);

  console.log('Error handling system initialized', {
    config: finalConfig,
    timestamp: new Date().toISOString(),
  });
}

/**
 * React hook that provides access to all error handling functionality
 * 
 * This hook is your one-stop-shop for error handling in React components.
 * It gives you access to the error handler methods, UI components, and
 * convenient functions for showing error modals and toasts.
 */
export function useErrorHandling() {
  // const errorModal = useErrorModal();
  // const errorToast = useErrorToast();

  return {
    // Error handler methods - these allow you to manually handle errors
    handleError: errorHandler.handleError.bind(errorHandler),
    getRecentErrors: errorHandler.getRecentErrors.bind(errorHandler),
    getErrorsByType: errorHandler.getErrorsByType.bind(errorHandler),
    getErrorsBySeverity: errorHandler.getErrorsBySeverity.bind(errorHandler),
    getErrorStats: errorHandler.getErrorStats.bind(errorHandler),
    clearErrors: errorHandler.clearErrors.bind(errorHandler),
    addErrorListener: errorHandler.addErrorListener.bind(errorHandler),
    removeErrorListener: errorHandler.removeErrorListener.bind(errorHandler),

    // UI components - React components you can use in your JSX
    ErrorBoundary,
    ErrorFallback,
    // ErrorModal,
    // ErrorToast,

    // Modal controls - for programmatic control of error modals
    // errorModal,

    // Toast controls - for programmatic control of error toasts
    // errorToast,

    // Convenience methods - shortcuts for common operations
    // showErrorModal: errorModal.showError,
    // hideErrorModal: errorModal.hideError,
    // showErrorToast: errorToast.showError,
    // showSuccessToast: errorToast.showSuccess,
  };
}

/**
 * Utility function to create standardized error objects
 *
 * This function provides a consistent way to create and handle errors throughout
 * your application. It ensures that all errors have the same structure and are
 * properly processed by the error handler.
 */
export function createStandardError(
  type: ErrorDomain,
  message: string,
  details?: Record<string, unknown>,
  context?: Record<string, unknown>
) {
  return errorHandler.handleError({
    type,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    context,
    recoverable: true,
    retryable: false,
  });
}

// Re-export commonly used types and utilities for convenience
export type { AppError, ErrorSeverity } from '../core/error';
export { coreErrorHandler as errorHandler } from '../core/error';

// Export available error UI components
export {
  ErrorBoundary,
  ErrorFallback,
  // ErrorModal,
  // useErrorModal,
  // ErrorToast,
  // useErrorToast,
};