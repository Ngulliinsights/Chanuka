/**
 * Consolidated Enhanced Error Boundary Component
 *
 * Merges the best features from all error boundary implementations:
 * - Core's configurable architecture (8/10 quality)
 * - Components' superior user feedback system, advanced recovery options, and accessibility features (9/10 quality)
 *
 * Features:
 * - Configurable display modes and recovery strategies
 * - Advanced automatic recovery with timeout handling
 * - User feedback collection (rating + comments)
 * - Enhanced accessibility and better fallback UI
 * - Metrics collection and monitoring integration
 * - Browser/environment context collection
 */

import React, { Component, ErrorInfo } from 'react';

import { coreErrorHandler } from '../handler';

import { AppError, ErrorDomain, ErrorSeverity } from '../types';
import {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorDisplayMode,
  ErrorFallbackVariant,
  RecoveryUIVariant,
} from './types';

/**
 * Represents a recovery option for error handling
 */
export interface RecoveryOption {
  /** Unique identifier for the recovery option */
  id: string;
  /** Display label for the recovery option */
  label: string;
  /** Description of what the recovery option does */
  description: string;
  /** Function to execute the recovery action */
  action: () => void | Promise<void>;
  /** Whether this recovery should be attempted automatically */
  automatic: boolean;
  /** Priority order for recovery attempts (lower numbers = higher priority) */
  priority: number;
}

/**
 * User feedback data structure for error reporting
 */
export interface UserFeedback {
  /** User's rating of the error experience (1-5) */
  rating?: number;
  /** User's comment about the error */
  comment?: string;
  /** Timestamp when feedback was submitted */
  timestamp?: Date;
  /** User's browser user agent string */
  userAgent?: string;
  /** Session identifier for tracking */
  sessionId?: string;
}

/**
 * Error metrics for monitoring and analytics
 */
export interface ErrorMetrics {
  errorId: string;
  timestamp: Date;
  component: string;
  errorType: string;
  severity: string;
  recoveryAttempts: number;
  recoverySuccessful: boolean;
  userFeedbackProvided: boolean;
  browserInfo?: any;
  performanceMetrics?: any;
  context?: string;
}

const DEFAULT_CONFIG = {
  displayMode: 'inline' as ErrorDisplayMode,
  fallbackVariant: 'user-friendly' as ErrorFallbackVariant,
  recoveryVariant: 'buttons' as RecoveryUIVariant,
  enableRecovery: true,
  enableReporting: true,
  enableLogging: true,
  maxRetries: 3,
};

/**
 * Unified Error Boundary Component
 *
 * Consolidates all existing error boundary implementations into a single,
 * configurable component with support for different display modes and recovery strategies.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;
  private resetTimeoutId: number | null = null;
  private recoveryAttempts = 0;
  private errorMetrics: ErrorMetrics[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      displayMode: props.displayMode || DEFAULT_CONFIG.displayMode,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempts: [],
      recoveryAttempted: false,
      recoverySuccessful: false,
      userFeedbackSubmitted: false,
    };
  }

  /**
   * React Error Boundary lifecycle method
   * Converts thrown errors to AppError and updates state
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert to AppError using the unified error handler
    const appError = error instanceof AppError ? error : coreErrorHandler.handleError({
      message: error.message,
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      retryable: false,
      context: {
        component: 'ErrorBoundary',
        error: error,
        stack: error.stack,
      },
    });

    return {
      hasError: true,
      error: appError,
      retryCount: 0,
      isRecovering: false,
    };
  }

  /**
   * Enhanced error processing with automatic recovery and metrics collection
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = error instanceof AppError ? error : coreErrorHandler.handleError({
      message: error.message,
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      retryable: false,
      context: {
        component: this.props.context || 'ErrorBoundary',
        operation: 'error_boundary_catch',
        error: error,
        errorInfo: errorInfo,
      },
    });

    // Update state with enhanced error info
    this.setState({
      error: appError,
      errorId: appError.id,
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Collect comprehensive error metrics
    const metrics: ErrorMetrics = {
      errorId: appError.id,
      timestamp: new Date(),
      component: this.props.context || 'ErrorBoundary',
      errorType: appError.code || 'UNKNOWN_ERROR',
      severity: appError.severity,
      recoveryAttempts: this.recoveryAttempts,
      recoverySuccessful: false,
      userFeedbackProvided: false,
      browserInfo: typeof navigator !== 'undefined' ? {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
      } : undefined,
      performanceMetrics: typeof performance !== 'undefined' ? {
        timing: performance.timing,
        memory: (performance as any).memory,
      } : undefined,
      context: this.props.context,
    };

    this.errorMetrics.push(metrics);

    // Log comprehensive error
    if (this.props.enableLogging !== false) {
      console.error('Enhanced error boundary caught error', {
        component: 'ErrorBoundary',
        errorId: appError.id,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        browserInfo: metrics.browserInfo,
        performanceMetrics: metrics.performanceMetrics,
        recoveryAttempts: this.recoveryAttempts,
        hasRecoveryOptions: true,
      });
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery !== false) {
      this.attemptAutomaticRecovery(this.generateRecoveryOptions(appError));
    }

    // Call custom error handler
    this.props.onError?.(appError, errorInfo);

    // Report metrics
    if (this.props.onMetricsCollected) {
      this.props.onMetricsCollected(metrics);
    }
  }

  /**
   * Cleanup timeouts on unmount
   */
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * Reset error boundary state
   */
  private resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempts: [],
      recoveryAttempted: false,
      recoverySuccessful: false,
      userFeedbackSubmitted: false,
    });
  };

  /**
   * Handle user feedback submission
   */
  private handleFeedback = async (feedback: UserFeedback) => {
    if (!this.state.errorId || !this.props.enableFeedback) return;

    try {
      // Enhance feedback with additional context
      const enhancedFeedback: UserFeedback = {
        ...feedback,
        timestamp: new Date(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.generateSessionId(),
      };

      // Log feedback for now (could be sent to analytics service)
      console.info('User feedback submitted', {
        component: 'ErrorBoundary',
        errorId: this.state.errorId,
        feedback: enhancedFeedback,
      });

      this.setState({ userFeedbackSubmitted: true });

      // Update metrics
      const latestMetric = this.errorMetrics[this.errorMetrics.length - 1];
      if (latestMetric) {
        latestMetric.userFeedbackProvided = true;
      }

      // Call custom feedback handler
      this.props.onFeedback?.(enhancedFeedback);
    } catch (error) {
      console.error('Failed to submit user feedback', {
        component: 'ErrorBoundary',
        errorId: this.state.errorId,
        error,
      });
    }
  };

  /**
   * Handle page reload
   */
  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  /**
   * Handle contact support
   */
  private handleContactSupport = () => {
    console.info('User requested support contact', {
      component: 'ErrorBoundary',
      errorId: this.state.errorId,
    });

    // In a real implementation, this would open a support modal/chat
    // For now, show an alert
    if (typeof window !== 'undefined') {
      alert(
        'Support contact functionality would be implemented here. Please check the console for error details.'
      );
    }
  };

  /**
   * Generate a session ID for tracking
   */
  private generateSessionId(): string {
    // Generate a simple session ID based on timestamp and random string
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle manual retry
   */
  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = this.props.maxRetries || DEFAULT_CONFIG.maxRetries;

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      isRecovering: true,
    }));

    // Call custom retry handler
    this.props.onRetry?.(retryCount + 1);

    // Reset error after a brief delay to allow re-rendering
    this.retryTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, 100);
  };

  /**
   * Handle error reporting
   */
  private handleReport = () => {
    const { error } = this.state;
    if (!error) return;

    // Report error using unified error handler
    coreErrorHandler.handleError({
      ...error,
      context: {
        ...error.context,
        component: this.props.context || 'ErrorBoundary',
        operation: 'user_reported_error',
      },
    });

    // Call custom report handler
    this.props.onReport?.(error);
  };

  /**
   * Generate recovery options based on error type and context
   */
  private generateRecoveryOptions(error: AppError): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    // Always provide manual retry option
    options.push({
      id: 'manual_retry',
      label: 'Try Again',
      description: 'Retry the failed operation manually',
      action: this.handleRetry,
      automatic: false,
      priority: 1,
    });

    // Page reload option
    options.push({
      id: 'page_reload',
      label: 'Reload Page',
      description: 'Reload the entire page to reset the application state',
      action: this.handleReload,
      automatic: false,
      priority: 2,
    });

    // Automatic recovery options based on error type
    if (error.type === ErrorDomain.NETWORK) {
      options.push({
        id: 'retry_network',
        label: 'Retry Network Request',
        description: 'Automatically retry network operations',
        action: async () => {
          // Simulate network retry with delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.handleRetry();
        },
        automatic: true,
        priority: 3,
      });
    }

    if (error.type === ErrorDomain.SYSTEM) {
      options.push({
        id: 'clear_cache',
        label: 'Clear Cache',
        description: 'Clear local cache and retry',
        action: async () => {
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.clear();
            } catch (e) {
              console.warn('Failed to clear localStorage', { error: e });
            }
          }
          this.handleRetry();
        },
        automatic: true,
        priority: 4,
      });
    }

    // Sort by priority
    return options.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Attempt automatic recovery with timeout and error handling
   */
  private async attemptAutomaticRecovery(recoveryOptions: RecoveryOption[]) {
    const automaticOptions = recoveryOptions.filter(opt => opt.automatic);

    for (const option of automaticOptions) {
      if (this.recoveryAttempts >= (this.props.maxRecoveryAttempts || 3)) {
        break;
      }

      try {
        this.recoveryAttempts++;
        this.setState({ isRecovering: true });

        console.info('Attempting automatic recovery', {
          component: 'ErrorBoundary',
          errorId: this.state.errorId,
          recoveryOption: option.id,
          attemptNumber: this.recoveryAttempts,
        });

        // Apply timeout to recovery action
        const timeout = this.props.recoveryTimeout || 5000;
        await Promise.race([
          option.action(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Recovery timeout')), timeout)
          ),
        ]);

        // If we get here, recovery was successful
        this.setState({
          recoveryAttempted: true,
          recoverySuccessful: true,
          hasError: false,
          error: undefined,
          errorId: undefined,
          isRecovering: false,
        });

        // Update metrics
        const latestMetric = this.errorMetrics[this.errorMetrics.length - 1];
        if (latestMetric) {
          latestMetric.recoverySuccessful = true;
          latestMetric.recoveryAttempts = this.recoveryAttempts;
        }

        console.info('Automatic error recovery successful', {
          component: 'ErrorBoundary',
          errorId: this.state.errorId,
          recoveryOption: option.id,
          attemptNumber: this.recoveryAttempts,
        });

        return;
      } catch (recoveryError) {
        console.warn('Automatic recovery attempt failed', {
          component: 'ErrorBoundary',
          errorId: this.state.errorId,
          recoveryOption: option.id,
          attemptNumber: this.recoveryAttempts,
          error: recoveryError,
        });
      }
    }

    // All automatic recovery attempts failed
    this.setState({
      recoveryAttempted: true,
      recoverySuccessful: false,
      isRecovering: false,
    });

    // Update metrics
    const latestMetric = this.errorMetrics[this.errorMetrics.length - 1];
    if (latestMetric) {
      latestMetric.recoverySuccessful = false;
      latestMetric.recoveryAttempts = this.recoveryAttempts;
    }
  }

  /**
   * Check if props have changed for reset
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetOnPropsChange && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );

      if (hasChanged && this.state.hasError) {
        this.resetError();
      }
    }
  }

  /**
   * Render error UI or children
   */
  render() {
    if (this.state.hasError && this.state.error) {
      const displayMode = this.props.displayMode || DEFAULT_CONFIG.displayMode;
      const fallbackVariant = this.props.fallbackVariant || DEFAULT_CONFIG.fallbackVariant;

      // Use custom fallback if provided
      if (this.props.customFallback) {
        const CustomFallback = this.props.customFallback;
        return (
          <CustomFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            displayMode={displayMode}
            variant={fallbackVariant}
            onRetry={this.handleRetry}
            onReport={this.handleReport}
            onDismiss={this.resetError}
            showDetails={process.env.NODE_ENV === 'development'}
            isDevelopment={process.env.NODE_ENV === 'development'}
            context={this.props.context}
          />
        );
      }

      // Use enhanced default fallback with recovery options and user feedback
      const recoveryOptions = this.generateRecoveryOptions(this.state.error);

      return (
        <EnhancedErrorFallback
          error={this.state.error}
          errorId={this.state.errorId!}
          recoveryOptions={recoveryOptions}
          onRetry={this.handleRetry}
          onFeedback={this.handleFeedback}
          onReload={this.handleReload}
          onContactSupport={this.handleContactSupport}
          recoveryAttempted={this.state.recoveryAttempted}
          recoverySuccessful={this.state.recoverySuccessful}
          userFeedbackSubmitted={this.state.userFeedbackSubmitted}
          showTechnicalDetails={this.props.showTechnicalDetails}
          displayMode={displayMode}
          variant={fallbackVariant}
          onReport={this.handleReport}
          onDismiss={this.resetError}
          context={this.props.context}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName =
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook for using error boundary functionality in functional components
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<AppError | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRecovering, setIsRecovering] = React.useState(false);

  const resetError = React.useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRecovering(false);
  }, []);

  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
    setIsRecovering(true);
    // Reset after brief delay
    setTimeout(() => {
      resetError();
    }, 100);
  }, [resetError]);

  const reportError = React.useCallback(() => {
    if (error) {
      coreErrorHandler.handleError({
        ...error,
        context: {
          ...error.context,
          operation: 'user_reported_error',
        },
      });
    }
  }, [error]);

  // Throw error to trigger error boundary
  if (error) {
    throw error;
  }

  return {
    error,
    hasError: error !== null,
    retryCount,
    isRecovering,
    resetError,
    retry,
    reportError,
    setError,
  };
}

// Enhanced default fallback component with accessibility and user feedback
function EnhancedErrorFallback(props: {
  error: AppError;
  errorId: string;
  recoveryOptions: RecoveryOption[];
  onRetry: () => void;
  onFeedback: (feedback: UserFeedback) => void;
  onReload: () => void;
  onContactSupport: () => void;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  userFeedbackSubmitted: boolean;
  showTechnicalDetails?: boolean;
  displayMode?: string;
  variant?: string;
  onReport?: () => void;
  onDismiss?: () => void;
  context?: string;
}) {
  const {
    error,
    errorId,
    recoveryOptions,
    onRetry,
    onFeedback,
    onReload,
    onContactSupport,
    recoveryAttempted,
    recoverySuccessful,
    userFeedbackSubmitted,
    showTechnicalDetails,
  } = props;

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
              <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
              <p className="text-gray-600 mt-1">{error.message}</p>
            </div>
          </div>
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
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
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

        {/* Recovery Options */}
        {recoveryOptions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recovery Options</h2>
            <div className="space-y-3">
              {recoveryOptions.slice(0, 4).map(option => (
                <button
                  key={option.id}
                  onClick={() => option.action()}
                  className="w-full text-left p-4 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  aria-describedby={`${option.id}-description`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{option.label}</h3>
                      <p id={`${option.id}-description`} className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                    {option.automatic && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Automatic
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>

          <button
            onClick={onReload}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reload Page
          </button>

          <button
            onClick={onContactSupport}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Contact Support
          </button>
        </div>

        {/* User Feedback */}
        {showTechnicalDetails !== false && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Help us improve</h3>

            {!userFeedbackSubmitted ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you rate this error experience?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => onFeedback({ rating })}
                        className="w-10 h-10 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional comments (optional):
                  </label>
                  <textarea
                    placeholder="Tell us what happened..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                    rows={3}
                  />
                </div>

                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    const comment = textarea?.value || '';
                    onFeedback({ comment: comment || undefined });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Submit Feedback
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-600 font-medium">✓ Thank you for your feedback!</div>
                <p className="text-sm text-gray-600 mt-1">
                  Your input helps us improve the application.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Technical Details */}
        {showTechnicalDetails && (
          <details className="mt-6 border-t border-gray-200 pt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:text-gray-900">
              Technical Details (for developers)
            </summary>
            <div className="mt-4 bg-gray-50 p-4 rounded-md">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-900">Error ID:</dt>
                  <dd className="text-gray-700 font-mono">{errorId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Code:</dt>
                  <dd className="text-gray-700 font-mono">{error.code}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Domain:</dt>
                  <dd className="text-gray-700">{error.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Severity:</dt>
                  <dd className="text-gray-700">{error.severity}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900">Timestamp:</dt>
                  <dd className="text-gray-700 font-mono">
                    {error.timestamp ? new Date(error.timestamp).toISOString() : new Date().toISOString()}
                  </dd>
                </div>
                {error.stack && (
                  <div>
                    <dt className="font-medium text-gray-900">Stack Trace:</dt>
                    <dd className="text-gray-700 font-mono text-xs mt-1 whitespace-pre-wrap break-all">
                      {error.stack}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;