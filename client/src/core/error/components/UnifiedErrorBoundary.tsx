/**
 * Unified Error Boundary Component
 *
 * This component integrates with the shared BaseError system from shared/core
 * and provides comprehensive error handling with recovery strategies, correlation IDs,
 * and circuit breaker integration.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import React from 'react';

import { getCircuitBreakerStats } from '@client/core/api/interceptors';
import { BaseError, ErrorDomain, ErrorSeverity } from '@client/core/error';
import { logger } from '@client/utils/logger';

export interface UnifiedErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<UnifiedErrorFallbackProps>;
  onError?: (error: BaseError, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  enableFeedback?: boolean;
  maxRecoveryAttempts?: number;
  context?: string;
  isolate?: boolean;
}

export interface UnifiedErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  errorId?: string;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  recoveryAttempts: number;
}

export interface UnifiedErrorFallbackProps {
  error: BaseError;
  errorId: string;
  onRetry: () => void;
  onReload: () => void;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  circuitBreakerStats: Record<string, unknown>;
}

/**
 * Unified Error Boundary using shared BaseError system
 *
 * Features:
 * - Integration with shared/core BaseError system
 * - Automatic correlation ID generation
 * - Circuit breaker integration
 * - Recovery strategy execution
 * - Error correlation across services
 */
export class UnifiedErrorBoundary extends Component<
  UnifiedErrorBoundaryProps,
  UnifiedErrorBoundaryState
> {
  constructor(props: UnifiedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      recoveryAttempted: false,
      recoverySuccessful: false,
      recoveryAttempts: 0,
    };
  }

  /**
   * Creates BaseError from caught error using shared error system
   */
  static getDerivedStateFromError(error: Error): Partial<UnifiedErrorBoundaryState> {
    // Use shared BaseError system with proper correlation ID
    const baseError =
      error instanceof BaseError
        ? error
        : new BaseError(error.message, {
            statusCode: 500,
            code: 'REACT_ERROR_BOUNDARY',
            domain: ErrorDomain.SYSTEM,
            severity: ErrorSeverity.HIGH,
            cause: error,
            context: {
              component: 'UnifiedErrorBoundary',
              timestamp: Date.now(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
          });

    return {
      hasError: true,
      error: baseError,
      errorId: baseError.errorId,
      recoveryAttempted: false,
      recoverySuccessful: false,
      recoveryAttempts: 0,
    };
  }

  /**
   * Enhanced error processing with shared error system
   */
  override componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    const baseError = this.state.error!;

    // Log using shared error system
    logger.error('Unified error boundary caught error', {
      component: 'UnifiedErrorBoundary',
      errorId: baseError.errorId,
      correlationId: baseError.metadata.correlationId,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      circuitBreakerStats: getCircuitBreakerStats(),
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(baseError, errorInfo);
    }

    // Update state with error
    this.setState({
      error: baseError,
      errorId: baseError.errorId,
      recoveryAttempted: true,
      recoverySuccessful: false,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      recoveryAttempted: false,
      recoverySuccessful: false,
    });

    logger.info('Manual retry attempted', {
      component: 'UnifiedErrorBoundary',
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const fallbackProps: UnifiedErrorFallbackProps = {
        error: this.state.error,
        errorId: this.state.errorId!,
        onRetry: this.handleRetry,
        onReload: this.handleReload,
        recoveryAttempted: this.state.recoveryAttempted,
        recoverySuccessful: this.state.recoverySuccessful,
        circuitBreakerStats: getCircuitBreakerStats(),
      };

      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent {...fallbackProps} />;
      }

      // Default unified fallback UI
      return <UnifiedErrorFallback {...fallbackProps} />;
    }

    return this.props.children;
  }
}

/**
 * Default unified error fallback component
 */
function UnifiedErrorFallback(props: UnifiedErrorFallbackProps) {
  const {
    error,
    errorId,
    onRetry,
    onReload,
    recoveryAttempted,
    recoverySuccessful,
    circuitBreakerStats,
  } = props;

  const hasCircuitBreakerIssues = Object.values(circuitBreakerStats).some((state: unknown) => {
    const s = state as { state?: string };
    return s.state === 'open' || s.state === 'half-open';
  });

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">Application Error</h1>
              <p className="text-gray-600 mt-1">{error.message}</p>
            </div>
          </div>
        </div>

        {/* Error Details */}
        <div className="mb-6 bg-gray-50 p-4 rounded-md">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-900">Error ID:</dt>
              <dd className="text-gray-700 font-mono">{errorId}</dd>
            </div>
            {error.metadata.correlationId && (
              <div>
                <dt className="font-medium text-gray-900">Correlation ID:</dt>
                <dd className="text-gray-700 font-mono">{error.metadata.correlationId}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-900">Domain:</dt>
              <dd className="text-gray-700">{error.metadata.domain}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">Severity:</dt>
              <dd className="text-gray-700">{error.metadata.severity}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">Retryable:</dt>
              <dd className="text-gray-700">{error.metadata.retryable ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>

        {/* Recovery Status */}
        {recoveryAttempted && (
          <div
            className={`mb-6 p-4 rounded-md ${
              recoverySuccessful
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {recoverySuccessful ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    recoverySuccessful ? 'text-green-800' : 'text-yellow-800'
                  }`}
                >
                  {recoverySuccessful
                    ? '✓ Automatic recovery was successful!'
                    : '✗ Automatic recovery failed. Please try the options below.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Circuit Breaker Status */}
        {hasCircuitBreakerIssues && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ Some services are experiencing issues and have been temporarily disabled.
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  This is a protective measure to prevent further problems. Services will be
                  restored automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {error.metadata.retryable && (
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          )}

          <button
            onClick={onReload}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnifiedErrorBoundary;
