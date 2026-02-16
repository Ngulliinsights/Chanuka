/**
 * ErrorBoundary Component
 * 
 * React error boundary that catches rendering errors and displays a fallback UI.
 * Provides a "Try Again" button for recovery and logs errors to error tracking service.
 * 
 * Feature: comprehensive-bug-fixes
 * Requirements: 7.5, 13.5
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  FallbackComponent?: React.ComponentType<FallbackProps>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

/**
 * Default fallback UI component
 */
function DefaultFallback({ error, errorInfo, resetError }: FallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="text-gray-600">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>
        </div>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.toString()}
            </p>
            {errorInfo && errorInfo.componentStack && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  Component Stack
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        <button
          onClick={resetError}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * ErrorBoundary class component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to error tracking service
    this.logErrorToService(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      !this.areKeysEqual(prevProps.resetKeys, resetKeys)
    ) {
      this.resetError();
    }
  }

  areKeysEqual(
    prevKeys: Array<string | number>,
    nextKeys: Array<string | number>
  ): boolean {
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    return prevKeys.every((key, index) => key === nextKeys[index]);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log to error tracking service (e.g., Sentry, LogRocket, etc.)
    try {
      const errorContext = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { contexts: { react: errorContext } });
      
      console.log('[ErrorBoundary] Error logged:', errorContext);
    } catch (loggingError) {
      // Fail silently if error logging fails
      console.error('Failed to log error:', loggingError);
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, FallbackComponent } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use custom FallbackComponent if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
          />
        );
      }

      // Use default fallback
      return (
        <DefaultFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Utility function to create a custom error boundary with specific configuration
 */
export function createErrorBoundary(
  config: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<{ children: ReactNode }> {
  return function ConfiguredErrorBoundary({ children }: { children: ReactNode }) {
    return <ErrorBoundary {...config}>{children}</ErrorBoundary>;
  };
}
