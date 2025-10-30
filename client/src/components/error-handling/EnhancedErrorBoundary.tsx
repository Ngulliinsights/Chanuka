/**
 * Enhanced Error Boundary Component
 *
 * This is the client-side implementation of the EnhancedErrorBoundary,
 * adapted from the shared/core version for React client usage.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BaseError, ErrorDomain, ErrorSeverity } from '@shared/core';
import { logger } from '../../utils/browser-logger';

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
 */
export class EnhancedErrorBoundary extends Component<EnhancedErrorBoundaryProps, EnhancedErrorBoundaryState> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      canRecover: true
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    // Convert to BaseError if needed
    const baseError = error instanceof BaseError
      ? error
      : new BaseError(error.message, {
          code: 'REACT_ERROR_BOUNDARY',
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.HIGH,
          cause: error,
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const baseError = this.state.error!;

    // Add React-specific context
    const enhancedError = new BaseError(baseError.message, {
      ...baseError.metadata,
      context: {
        ...baseError.metadata.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        reactErrorInfo: {
          componentStack: errorInfo.componentStack
        }
      },
      recoveryStrategies: [...(baseError.metadata.recoveryStrategies || [])]
    });

    // Log the error
    logger.error('Enhanced error boundary caught error', {
      component: 'EnhancedErrorBoundary',
      errorId: enhancedError.errorId,
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }
  }

  private handleResetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: this.state.retryCount + 1,
      canRecover: this.state.retryCount + 1 < (this.props.maxRetries || 3)
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.handleResetError}
            context={this.props.context}
            retryCount={this.state.retryCount}
            canRecover={this.state.canRecover}
          />
        );
      }

      // Default fallback
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {this.state.error.getUserMessage()}
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

    return this.props.children;
  }
}

// Default export for convenience
export default EnhancedErrorBoundary;