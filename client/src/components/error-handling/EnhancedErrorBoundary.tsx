/**
 * Enhanced Error Boundary Component
 *
 * This is the client-side implementation of the EnhancedErrorBoundary,
 * adapted from the shared/core version for React client usage.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '../../utils/browser-logger';

// Import shared error types
import { BaseError, ErrorDomain, ErrorSeverity } from '../../shared/errors';

export interface ErrorFallbackProps {
  error: BaseError;
  resetError: () => void;
  context?: string;
  retryCount?: number;
  errorType?: string;
  errorSeverity?: ErrorSeverity;
  canRecover?: boolean;
  onReportError?: () => void;
}

export interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: BaseError, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  context?: string;
}

export interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  retryCount: number;
  canRecover: boolean;
}

/**
 * Enhanced Error Boundary with recovery capabilities
 * 
 * This component catches errors in its child component tree and displays
 * a fallback UI instead of crashing the entire application. It includes
 * retry logic and supports custom error handlers.
 */
export class EnhancedErrorBoundary extends Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      canRecover: true
    };
  }

  /**
   * Updates state when an error is caught
   * This is called during the render phase, so side effects are not allowed here
   */
  static getDerivedStateFromError(_error: Error): Partial<EnhancedErrorBoundaryState> {
    // Convert to BaseError if needed for consistent error handling
    const baseError = _error instanceof BaseError
      ? _error
      : new BaseError(_error.message, 'REACT_ERROR_BOUNDARY', {
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.HIGH,
          cause: _error,
          context: {
            component: 'EnhancedErrorBoundary',
            timestamp: new Date().toISOString()
          }
        });

    return {
      hasError: true,
      error: baseError,
      retryCount: 0,
      canRecover: true
    };
  }

  /**
   * Logs error details and calls custom error handler
   * This is called during the commit phase, so side effects are allowed
   */
  override componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    const baseError = this.state.error!;

    // Enhance error with React-specific context information
    const enhancedError = new BaseError(baseError.message, baseError.code, {
      ...baseError.metadata,
      context: {
        ...(baseError.metadata?.context || {}),
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        reactErrorInfo: {
          componentStack: errorInfo.componentStack
        }
      },
      recoveryStrategies: [...(baseError.metadata?.recoveryStrategies || [])]
    });

    // Log comprehensive error information for debugging
    logger.error('Enhanced error boundary caught error', {
      component: 'EnhancedErrorBoundary',
      errorId: enhancedError.code || 'unknown',
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    // Allow parent components to handle the error if needed
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }
  }

  /**
   * Resets the error boundary state and attempts recovery
   * Increments retry count and checks if recovery is still possible
   */
  private handleResetError = () => {
    const newRetryCount = this.state.retryCount + 1;
    const maxRetries = this.props.maxRetries || 3;

    // Use Pick to create a state object without the optional 'error' property
    // This avoids the exactOptionalPropertyTypes issue with explicit undefined
    this.setState({
      hasError: false,
      retryCount: newRetryCount,
      canRecover: newRetryCount < maxRetries
    });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;

      // Render custom fallback component if provided
      if (FallbackComponent) {
        // Build props object conditionally to avoid passing undefined as a value
        const fallbackProps: ErrorFallbackProps = {
          error: this.state.error,
          resetError: this.handleResetError,
          retryCount: this.state.retryCount,
          canRecover: this.state.canRecover
        };

        // Only add context if it's defined to match the optional property semantics
        if (this.props.context !== undefined) {
          fallbackProps.context = this.props.context;
        }

        return <FallbackComponent {...fallbackProps} />;
      }

      // Default fallback UI with retry and reload options
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {this.state.error.message}
            </p>
            {this.state.canRecover && (
              <button
                onClick={this.handleResetError}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 mr-4"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

// Default export for convenience
export default EnhancedErrorBoundary;