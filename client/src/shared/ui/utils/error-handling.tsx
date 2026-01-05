/**
 * React Components and Hooks for Error Handling
 *
 * This module contains React-specific error handling components and hooks
 * that integrate with the core error handling system. Utility functions
 * are separated into error-handling-utils.ts to support Fast Refresh.
 */

import React, { useCallback, useState, useMemo } from 'react';

import { handleError as coreHandleError } from '@/core/error';

import {
  UIErrorHandler,
  UseUIErrorHandlerResult,
  createUIErrorHandler,
  classifyUIError,
} from './error-handling-utils';

// ============================================================================
// React Hook for UI Error Handling (extending core)
// ============================================================================

export const useUIErrorHandler = (componentName?: string): UseUIErrorHandlerResult => {
  const [error, setError] = useState<Error | null>(null);

  // Memoize error handler to prevent recreation on every render
  const errorHandler = useMemo(() => createUIErrorHandler(componentName), [componentName]);

  const handleError = useCallback(
    (error: Error, context?: string) => {
      errorHandler.handleError(error, context);
      setError(error);
    },
    [errorHandler]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(
    async (fn: () => Promise<void>) => {
      if (!error || !errorHandler.isRetryable(error)) {
        return;
      }

      try {
        clearError();
        await fn();
      } catch (newError) {
        handleError(newError as Error, 'retry');
      }
    },
    [error, errorHandler, handleError, clearError]
  );

  // Memoize computed values
  const errorMessage = useMemo(
    () => (error ? errorHandler.displayError(error) : null),
    [error, errorHandler]
  );

  const isRetryable = useMemo(
    () => (error ? errorHandler.isRetryable(error) : false),
    [error, errorHandler]
  );

  return {
    error,
    errorMessage,
    isRetryable,
    handleError,
    clearError,
    retry,
  };
};

// ============================================================================
// UI Error Boundary Component (extending core)
// ============================================================================

interface UIErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

interface UIErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

/**
 * Default fallback component for error boundaries
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => {
  const errorHandler = useMemo(() => createUIErrorHandler('ErrorFallback'), []);
  const isRetryable = useMemo(() => errorHandler.isRetryable(error), [error, errorHandler]);
  const displayMessage = useMemo(() => errorHandler.displayError(error), [error, errorHandler]);

  return (
    <div className="te4 border border-red-200 rounded-md bg-red-50">
      <h3 className="text-red-800 font-medium">Something went wrong</h3>
      <p className="text-red-600 text-sm mt-1">{displayMessage}</p>
      {isRetryable && (
        <button
          type="button"
          onClick={retry}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export class UIErrorBoundary extends React.Component<UIErrorBoundaryProps, UIErrorBoundaryState> {
  private errorHandler: UIErrorHandler;

  constructor(props: UIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.errorHandler = createUIErrorHandler(props.componentName || 'UIErrorBoundary');
  }

  static getDerivedStateFromError(error: Error): UIErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.errorHandler.handleError(error, 'React Error Boundary');
    this.props.onError?.(error, errorInfo);

    // Also report to core error system
    const classification = classifyUIError(error);
    coreHandleError({
      type: classification.domain,
      severity: classification.severity,
      message: error.message,
      code: classification.type,
      context: {
        component: this.props.componentName,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  retry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided, otherwise use default
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}
