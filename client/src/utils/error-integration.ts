import { errorHandler } from './unified-error-handler';
import { initializeErrorReporting } from './error-reporting';
import { ErrorBoundary } from '../components/error/ErrorBoundary';
import { ErrorFallback } from '../components/error/ErrorFallback';
import { ErrorModal, useErrorModal } from '../components/error/ErrorModal';
import { ErrorToast, useErrorToast } from '../components/error/ErrorToast';

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

  // Configure the unified error handler
  errorHandler.configure(finalConfig);

  // Initialize error reporting if enabled
  if (finalConfig.enableReporting) {
    initializeErrorReporting();
  }

  console.log('Error handling system initialized', {
    config: finalConfig,
    timestamp: new Date().toISOString(),
  });
}

/**
 * React hook that provides access to all error handling functionality
 */
export function useErrorHandling() {
  const errorModal = useErrorModal();
  const errorToast = useErrorToast();

  return {
    // Error handler methods
    handleError: errorHandler.handleError.bind(errorHandler),
    getRecentErrors: errorHandler.getRecentErrors.bind(errorHandler),
    getErrorsByType: errorHandler.getErrorsByType.bind(errorHandler),
    getErrorsBySeverity: errorHandler.getErrorsBySeverity.bind(errorHandler),
    getErrorStats: errorHandler.getErrorStats.bind(errorHandler),
    clearErrors: errorHandler.clearErrors.bind(errorHandler),
    addErrorListener: errorHandler.addErrorListener.bind(errorHandler),
    removeErrorListener: errorHandler.removeErrorListener.bind(errorHandler),

    // UI components
    ErrorBoundary,
    ErrorFallback,
    ErrorModal,
    ErrorToast,

    // Modal controls
    errorModal,

    // Toast controls
    errorToast,

    // Convenience methods
    showErrorModal: errorModal.showError,
    hideErrorModal: errorModal.hideError,
    showErrorToast: errorToast.showError,
    showSuccessToast: errorToast.showSuccess,
  };
}

/**
 * Higher-order component that wraps a component with error handling
 */
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: React.ComponentProps<typeof ErrorBoundary>
) {
  return function ErrorHandledComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Utility function to create standardized error objects
 */
export function createStandardError(
  type: string,
  message: string,
  details?: any,
  context?: Record<string, any>
) {
  return errorHandler.handleError({
    type: type as any,
    severity: 'medium' as any,
    message,
    details,
    context,
    recoverable: true,
    retryable: false,
  });
}


// Re-export commonly used types and utilities
export type { AppError, ErrorType, ErrorSeverity } from './unified-error-handler';
export { errorHandler } from './unified-error-handler';
export { errorReporting, reportCustomError } from './error-reporting';

// Export all error UI components
export {
  ErrorBoundary,
  ErrorFallback,
  ErrorModal,
  ErrorToast,
  useErrorModal,
  useErrorToast,
} from '../components/error';