/**
 * Enhanced Error Boundary with Recovery Options
 *
 * React error boundary component with advanced recovery capabilities,
 * user feedback collection, and integration with the error management system.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BaseError, ErrorDomain, ErrorSeverity } from '../errors/base-error.js';
import { ErrorHandlerChain } from './error-handler-chain.js';
import { UserErrorReporter } from '../reporting/user-error-reporter.js';
import { logger } from '../../logging/index.js';

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  errorId?: string;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  userFeedbackSubmitted: boolean;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  onError?: (error: BaseError, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  enableFeedback?: boolean;
  maxRecoveryAttempts?: number;
  recoveryTimeout?: number;
  handleChain?: ErrorHandlerChain;
  userReporter?: UserErrorReporter;
  showTechnicalDetails?: boolean;
}

export interface ErrorFallbackProps {
  error: BaseError;
  errorId: string;
  recoveryOptions: Array<{
    id: string;
    label: string;
    description: string;
    action: () => void;
    automatic: boolean;
  }>;
  onRetry: () => void;
  onFeedback: (feedback: { rating?: number; comment?: string }) => void;
  onReload: () => void;
  onContactSupport: () => void;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  userFeedbackSubmitted: boolean;
}

/**
 * Enhanced Error Boundary with comprehensive recovery and user interaction
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private recoveryAttempts = 0;
  private readonly handleChain: ErrorHandlerChain;
  private readonly userReporter: UserErrorReporter;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      recoveryAttempted: false,
      recoverySuccessful: false,
      userFeedbackSubmitted: false
    };

    this.handleChain = props.handleChain || new ErrorHandlerChain();
    this.userReporter = props.userReporter || new UserErrorReporter();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert to BaseError
    const baseError = error instanceof BaseError
      ? error
      : new BaseError(error.message, {
          code: 'REACT_ERROR_BOUNDARY',
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.HIGH,
          cause: error,
          context: {
            component: 'ErrorBoundary',
            timestamp: new Date().toISOString()
          }
        });

    return {
      hasError: true,
      error: baseError,
      errorId: baseError.errorId,
      recoveryAttempted: false,
      recoverySuccessful: false
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const baseError = this.state.error!;

    // Add React-specific context
    const enhancedError = new BaseError(baseError.message, {
      ...baseError,
      context: {
        ...baseError.metadata.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        reactErrorInfo: {
          componentStack: errorInfo.componentStack
        }
      }
    });

    // Process through error handler chain
    try {
      await this.handleChain.process(enhancedError);
    } catch (chainError) {
      logger.error('Error boundary handler chain failed', {
        component: 'ErrorBoundary',
        originalError: enhancedError.errorId,
        chainError
      });
    }

    // Generate user report
    const recoveryOptions = this.userReporter.generateRecoveryOptions(enhancedError);
    const report = this.userReporter.generateReport(enhancedError, { user_id: 'unknown', // Would come from context/user auth
      metadata: { session_id: 'unknown'  } // Would come from session management
    }, recoveryOptions);

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && recoveryOptions.some(opt => opt.automatic)) {
      await this.attemptAutomaticRecovery(enhancedError, recoveryOptions);
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }

    // Log the error
    logger.error('Enhanced error boundary caught error', {
      component: 'ErrorBoundary',
      errorId: enhancedError.errorId,
      componentStack: errorInfo.componentStack,
      recoveryAttempts: this.recoveryAttempts,
      hasRecoveryOptions: recoveryOptions.length > 0
    });
  }

  private async attemptAutomaticRecovery(error: BaseError, recoveryOptions: any[]) {
    const automaticOptions = recoveryOptions.filter(opt => opt.automatic);

    for (const option of automaticOptions) {
      if (this.recoveryAttempts >= (this.props.maxRecoveryAttempts || 3)) {
        break;
      }

      try {
        this.recoveryAttempts++;
        await option.action();

        // If we get here, recovery was successful
        this.setState({
          recoveryAttempted: true,
          recoverySuccessful: true,
          hasError: false,
          error: undefined,
          errorId: undefined
        });

        logger.info('Automatic error recovery successful', {
          component: 'ErrorBoundary',
          errorId: error.errorId,
          recoveryOption: option.id,
          attemptNumber: this.recoveryAttempts
        });

        return;
      } catch (recoveryError) {
        logger.warn('Automatic recovery attempt failed', {
          component: 'ErrorBoundary',
          errorId: error.errorId,
          recoveryOption: option.id,
          attemptNumber: this.recoveryAttempts,
          error: recoveryError
        });
      }
    }

    // All automatic recovery attempts failed
    this.setState({ recoveryAttempted: true, recoverySuccessful: false });
  }

  private handleRetry = () => {
    this.recoveryAttempts++;
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      recoveryAttempted: false,
      recoverySuccessful: false
    });

    logger.info('Manual retry attempted', {
      component: 'ErrorBoundary',
      attemptNumber: this.recoveryAttempts
    });
  };

  private handleFeedback = async (feedback: { rating?: number; comment?: string }) => {
    if (!this.state.errorId || !this.props.enableFeedback) return;

    try {
      await this.userReporter.submitFeedback(this.state.errorId, feedback);
      this.setState({ userFeedbackSubmitted: true });

      logger.info('User feedback submitted', {
        component: 'ErrorBoundary',
        errorId: this.state.errorId,
        hasRating: !!feedback.rating,
        hasComment: !!feedback.comment
      });
    } catch (error) {
      logger.error('Failed to submit user feedback', {
        component: 'ErrorBoundary',
        errorId: this.state.errorId,
        error
      });
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleContactSupport = () => {
    // This would integrate with support ticketing system
    logger.info('User requested support contact', {
      component: 'ErrorBoundary',
      errorId: this.state.errorId
    });

    // For now, just show an alert - in real implementation, open support modal/chat
    if (typeof window !== 'undefined') {
      alert('Support contact functionality would be implemented here.');
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const recoveryOptions = this.userReporter.generateRecoveryOptions(this.state.error);

      const fallbackProps: ErrorFallbackProps = {
        error: this.state.error,
        errorId: this.state.errorId!,
        recoveryOptions: recoveryOptions.map(opt => ({
          id: opt.id,
          label: opt.label,
          description: opt.description,
          action: opt.action,
          automatic: opt.automatic
        })),
        onRetry: this.handleRetry,
        onFeedback: this.handleFeedback,
        onReload: this.handleReload,
        onContactSupport: this.handleContactSupport,
        recoveryAttempted: this.state.recoveryAttempted,
        recoverySuccessful: this.state.recoverySuccessful,
        userFeedbackSubmitted: this.state.userFeedbackSubmitted
      };

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(fallbackProps);
      }

      // Default enhanced fallback UI
      return <DefaultErrorFallback {...fallbackProps} showTechnicalDetails={this.props.showTechnicalDetails} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component with rich user interaction
 */
function DefaultErrorFallback(props: ErrorFallbackProps & { showTechnicalDetails?: boolean }) {
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
    showTechnicalDetails
  } = props;

  return (
    <div className="error-boundary-container">
      {/* Header */}
      <div className="error-boundary-header">
        <h2 className="error-boundary-title">
          Something went wrong
        </h2>
        <p className="error-boundary-message">
          {error.getUserMessage()}
        </p>
      </div>

      {/* Recovery Status */}
      {recoveryAttempted && (
        <div className={`error-boundary-status ${recoverySuccessful ? 'success' : 'failure'}`}>
          <p className="error-boundary-status-message">
            {recoverySuccessful
              ? '✓ Automatic recovery was successful!'
              : '✗ Automatic recovery failed. Please try the options below.'}
          </p>
        </div>
      )}

      {/* Recovery Options */}
      {recoveryOptions.length > 0 && (
        <div className="error-boundary-recovery">
          <h3 className="error-boundary-recovery-title">
            Try these solutions:
          </h3>
          <div className="error-boundary-recovery-options">
            {recoveryOptions.slice(0, 3).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={option.action}
                className="error-boundary-recovery-option"
              >
                <div className="error-boundary-recovery-option-label">
                  {option.label}
                </div>
                <div className="error-boundary-recovery-option-description">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="error-boundary-actions">
        <button
          type="button"
          onClick={onRetry}
          className="error-boundary-button primary"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={onReload}
          className="error-boundary-button secondary"
        >
          Reload Page
        </button>

        <button
          type="button"
          onClick={onContactSupport}
          className="error-boundary-button secondary"
        >
          Contact Support
        </button>
      </div>

      {/* User Feedback */}
      {props.showTechnicalDetails !== false && (
        <div className="error-boundary-feedback">
          <h4 className="error-boundary-feedback-title">
            Help us improve
          </h4>

          {!userFeedbackSubmitted ? (
            <div>
              <div className="error-boundary-rating">
                <label className="error-boundary-label">
                  How would you rate this error experience?
                </label>
                <div className="error-boundary-rating-buttons">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => onFeedback({ rating })}
                      className="error-boundary-rating-button"
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div className="error-boundary-comment">
                <label className="error-boundary-label">
                  Additional comments (optional):
                </label>
                <textarea
                  placeholder="Tell us what happened..."
                  className="error-boundary-textarea"
                  onChange={(e) => {
                    // Store temporarily - would be submitted with rating
                    (e.target as any)._comment = e.target.value;
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('.error-boundary-textarea') as HTMLTextAreaElement;
                  const comment = (textarea as any)._comment || '';
                  onFeedback({ comment: comment || undefined });
                }}
                className="error-boundary-button secondary"
              >
                Submit Feedback
              </button>
            </div>
          ) : (
            <p className="error-boundary-feedback-success">
              ✓ Thank you for your feedback!
            </p>
          )}
        </div>
      )}

      {/* Technical Details */}
      {showTechnicalDetails && (
        <details className="error-boundary-details">
          <summary className="error-boundary-details-summary">
            Technical Details (for developers)
          </summary>
          <div className="error-boundary-details-content">
            <div>Error ID: {errorId}</div>
            <div>Code: {error.code}</div>
            <div>Domain: {error.metadata.domain}</div>
            <div>Severity: {error.metadata.severity}</div>
            <div>Timestamp: {error.metadata.timestamp.toISOString()}</div>
            {error.stack && (
              <div className="error-boundary-stack">
                <div>Stack Trace:</div>
                <pre className="error-boundary-stack-trace">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Higher-order component for wrapping components with enhanced error boundary
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