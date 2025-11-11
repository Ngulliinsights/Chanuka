/**
 * React Error Boundary Component
 *
 * A comprehensive error boundary component that integrates with the core error
 * handling system and provides user-friendly error recovery options.
 */

import React, { Component } from 'react';
import { ErrorSeverity, ErrorDomain } from '../../utils/logger';
import { coreErrorHandler } from './handler';
import {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  ReactErrorInfo,
} from './types';

// ============================================================================
// Default Error Fallback Component
// ============================================================================

interface DefaultErrorFallbackState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
}

class DefaultErrorFallback extends Component<ErrorFallbackProps, DefaultErrorFallbackState> {
  constructor(props: ErrorFallbackProps) {
    super(props);
    this.state = {
      hasError: true,
      error: props.error,
      errorInfo: props.errorInfo || null,
      recoveryAttempted: false,
      recoverySuccess: false,
    };
  }

  handleRetry = async () => {
    this.setState({ recoveryAttempted: true });

    try {
      // Attempt recovery through core error handler
      const recoveryResult = await coreErrorHandler['attemptRecovery']({
        id: `boundary_error_${Date.now()}`,
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: this.props.error.message,
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context: {
          component: this.props.context || 'ErrorBoundary',
        },
      });

      if (recoveryResult.success) {
        this.setState({ recoverySuccess: true });
        // Reset error after successful recovery
        setTimeout(() => {
          this.props.resetError();
        }, 1000);
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { error, context, showTechnicalDetails } = this.props;
    const { recoveryAttempted, recoverySuccess } = this.state;

    if (recoverySuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recovery Successful</h2>
            <p className="text-gray-600 mb-4">The error has been resolved. Reloading...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600">
              {context ? `An error occurred in ${context}` : 'An unexpected error occurred'}
            </p>
          </div>

          {showTechnicalDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Technical Details
                </summary>
                <div className="space-y-2 text-xs text-gray-600 font-mono">
                  <div><strong>Error:</strong> {error.message}</div>
                  {error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              disabled={recoveryAttempted}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {recoveryAttempted ? 'Retrying...' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Go Home
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

// ============================================================================
// Enhanced Error Boundary Component
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Report to core error handler
    const appError = coreErrorHandler.handleError({
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      context: {
        component: this.props.context || 'ErrorBoundary',
        boundaryId: this.state.errorId,
      },
      recoverable: true,
      retryable: false,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update error ID from handler
    this.setState({
      errorId: appError.id,
    });
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo || undefined}
          resetError={this.resetError}
          context={this.props.context}
          showTechnicalDetails={this.props.showTechnicalDetails}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Hook-based Error Boundary (React 18+)
// ============================================================================

interface ErrorBoundaryHookState {
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
}

export function useErrorBoundary() {
  const [errorState, setErrorState] = React.useState<ErrorBoundaryHookState>({
    error: null,
    errorInfo: null,
  });

  const resetError = React.useCallback(() => {
    setErrorState({ error: null, errorInfo: null });
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: ReactErrorInfo) => {
    setErrorState({ error, errorInfo: errorInfo || null });

    // Report to core error handler
    coreErrorHandler.handleError({
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
      },
      context: {
        component: 'useErrorBoundary',
      },
      recoverable: true,
      retryable: false,
    });
  }, []);

  return {
    error: errorState.error,
    errorInfo: errorState.errorInfo,
    resetError,
    captureError,
  };
}

// ============================================================================
// Higher-Order Component for Error Boundaries
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// ============================================================================
// Enhanced Error Boundary (alias for compatibility)
// ============================================================================

export const EnhancedErrorBoundary = ErrorBoundary;

// ============================================================================
// Export Default Error Boundary
// ============================================================================

export default ErrorBoundary;