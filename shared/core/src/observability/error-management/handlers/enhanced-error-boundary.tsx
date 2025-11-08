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
    <div style={{
      padding: '24px',
      margin: '20px',
      border: '1px solid #e74c3c',
      borderRadius: '8px',
      backgroundColor: '#fdf2f2',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '600px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{
          color: '#c0392b',
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Something went wrong
        </h2>
        <p style={{
          color: '#7f8c8d',
          margin: '0',
          fontSize: '14px'
        }}>
          {error.getUserMessage()}
        </p>
      </div>

      {/* Recovery Status */}
      {recoveryAttempted && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '4px',
          backgroundColor: recoverySuccessful ? '#d4edda' : '#f8d7da',
          border: `1px solid ${recoverySuccessful ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <p style={{
            margin: '0',
            color: recoverySuccessful ? '#155724' : '#721c24',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {recoverySuccessful
              ? '✓ Automatic recovery was successful!'
              : '✗ Automatic recovery failed. Please try the options below.'}
          </p>
        </div>
      )}

      {/* Recovery Options */}
      {recoveryOptions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            color: '#2c3e50',
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            Try these solutions:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recoveryOptions.slice(0, 3).map((option) => (
              <button
                key={option.id}
                onClick={option.action}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#2c3e50',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  {option.label}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '12px' }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onRetry}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#3498db',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Try Again
        </button>

        <button
          onClick={onReload}
          style={{
            padding: '10px 20px',
            border: '1px solid #bdc3c7',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: '#2c3e50',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Reload Page
        </button>

        <button
          onClick={onContactSupport}
          style={{
            padding: '10px 20px',
            border: '1px solid #bdc3c7',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: '#2c3e50',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Contact Support
        </button>
      </div>

      {/* User Feedback */}
      {props.showTechnicalDetails !== false && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            color: '#2c3e50',
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Help us improve
          </h4>

          {!userFeedbackSubmitted ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '14px',
                  color: '#2c3e50'
                }}>
                  How would you rate this error experience?
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => onFeedback({ rating })}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: '#2c3e50',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '14px',
                  color: '#2c3e50'
                }}>
                  Additional comments (optional):
                </label>
                <textarea
                  placeholder="Tell us what happened..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                  onChange={(e) => {
                    // Store temporarily - would be submitted with rating
                    (e.target as any)._comment = e.target.value;
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                  const comment = (textarea as any)._comment || '';
                  onFeedback({ comment: comment || undefined });
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#2c3e50',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Submit Feedback
              </button>
            </div>
          ) : (
            <p style={{
              margin: '0',
              color: '#27ae60',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              ✓ Thank you for your feedback!
            </p>
          )}
        </div>
      )}

      {/* Technical Details */}
      {showTechnicalDetails && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{
            cursor: 'pointer',
            color: '#7f8c8d',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            Technical Details (for developers)
          </summary>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflow: 'auto'
          }}>
            <div>Error ID: {errorId}</div>
            <div>Code: {error.code}</div>
            <div>Domain: {error.metadata.domain}</div>
            <div>Severity: {error.metadata.severity}</div>
            <div>Timestamp: {error.metadata.timestamp.toISOString()}</div>
            {error.stack && (
              <div style={{ marginTop: '8px' }}>
                <div>Stack Trace:</div>
                <pre style={{
                  margin: '4px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
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
