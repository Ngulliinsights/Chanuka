/**
 * Error Fallback UI Components
 *
 * Provides different variants of error display UI supporting inline, overlay,
 * page, and toast display modes with accessibility compliance.
 */

import { AlertTriangle, ChevronDown, ChevronUp, X, Zap, Info } from 'lucide-react';
import React, { useState } from 'react';

import { AppError } from '../types';
import { ErrorFallbackProps, ErrorFallbackVariant } from './types';

/**
 * Main Error Fallback Component
 *
 * Renders error UI based on display mode and variant with proper accessibility
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  displayMode,
  variant,
  onRetry,
  onReport,
  onDismiss,
  showDetails = false,
  isDevelopment = false,
  context,
  className = '',
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(showDetails);

  const baseClassName = `error-fallback error-fallback--${displayMode} error-fallback--${variant} ${className}`.trim();

  const ariaProps = {
    role: displayMode === 'page' ? 'alertdialog' : 'alert',
    'aria-live': 'assertive' as const,
    'aria-label': 'Application Error',
    'aria-describedby': 'error-message',
  };

  switch (displayMode) {
    case 'page':
      return (
        <ErrorPageFallback
          {...{ error, errorInfo, variant, onRetry, onReport, onDismiss, showErrorDetails, setShowErrorDetails, isDevelopment, context }}
          className={baseClassName}
          ariaProps={ariaProps}
        />
      );

    case 'overlay':
      return (
        <ErrorOverlayFallback
          {...{ error, errorInfo, variant, onRetry, onReport, onDismiss, showErrorDetails, setShowErrorDetails, isDevelopment, context }}
          className={baseClassName}
          ariaProps={ariaProps}
        />
      );

    case 'toast':
      return (
        <ErrorToastFallback
          {...{ error, errorInfo, variant, onRetry, onReport, onDismiss, showErrorDetails, setShowErrorDetails, isDevelopment, context }}
          className={baseClassName}
          ariaProps={ariaProps}
        />
      );

    case 'inline':
    default:
      return (
        <ErrorInlineFallback
          {...{ error, errorInfo, variant, onRetry, onReport, onDismiss, showErrorDetails, setShowErrorDetails, isDevelopment, context }}
          className={baseClassName}
          ariaProps={ariaProps}
        />
      );
  }
};

/**
 * Inline Error Fallback - displays error within the component flow
 */
const ErrorInlineFallback: React.FC<{
  error: AppError;
  errorInfo?: React.ErrorInfo;
  variant: ErrorFallbackVariant;
  onRetry?: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  showErrorDetails: boolean;
  setShowErrorDetails: (show: boolean) => void;
  isDevelopment: boolean;
  context?: string;
  className: string;
  ariaProps: Record<string, any>;
}> = ({
  error,
  errorInfo,
  variant,
  onRetry,
  onReport: _onReport,
  onDismiss,
  showErrorDetails,
  setShowErrorDetails,
  isDevelopment,
  context,
  className,
  ariaProps,
}) => {
  const getIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <AlertTriangle className="error-fallback__icon error-fallback__icon--critical" />;
      case 'high':
        return <Zap className="error-fallback__icon error-fallback__icon--high" />;
      default:
        return <Info className="error-fallback__icon error-fallback__icon--medium" />;
    }
  };

  const getTitle = () => {
    switch (variant) {
      case 'minimal':
        return 'Something went wrong';
      case 'user-friendly':
        return 'Oops! Something unexpected happened';
      case 'technical':
        return `Error: ${error.id}`;
      case 'detailed':
        return `${error.type.toUpperCase()} Error`;
      default:
        return 'An error occurred';
    }
  };

  const getMessage = () => {
    switch (variant) {
      case 'minimal':
        return 'Please try again or contact support if the problem persists.';
      case 'user-friendly':
        return 'We encountered an unexpected issue. Our team has been notified and is working to fix it.';
      case 'technical':
        return error.message;
      case 'detailed':
        return error.message;
      default:
        return error.message;
    }
  };

  return (
    <div className={className} {...ariaProps}>
      <div className="error-fallback__content">
        <div className="error-fallback__header">
          {getIcon()}
          <h3 className="error-fallback__title" id="error-message">
            {getTitle()}
          </h3>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="error-fallback__dismiss"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <p className="error-fallback__message">
          {getMessage()}
        </p>

        {(isDevelopment || variant === 'technical' || variant === 'detailed') && (
          <ErrorDetails
            error={error}
            errorInfo={errorInfo}
            showDetails={showErrorDetails}
            onToggleDetails={() => setShowErrorDetails(!showErrorDetails)}
            context={context}
          />
        )}

        <div className="error-fallback__actions">
          {onRetry && (
            <button
              onClick={onRetry}
              className="error-fallback__button error-fallback__button--primary"
              aria-label="Try again"
            >
              Try Again
            </button>
          )}
          {_onReport && (
            <button
              onClick={_onReport}
              className="error-fallback__button error-fallback__button--secondary"
              aria-label="Report this error"
            >
              Report Issue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Page-level Error Fallback - displays error as full page
 */
const ErrorPageFallback: React.FC<{
  error: AppError;
  errorInfo?: React.ErrorInfo;
  variant: ErrorFallbackVariant;
  onRetry?: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  showErrorDetails: boolean;
  setShowErrorDetails: (show: boolean) => void;
  isDevelopment: boolean;
  context?: string;
  className: string;
  ariaProps: Record<string, any>;
}> = ({
  error,
  errorInfo,
  variant,
  onRetry,
  onReport: _onReport,
  onDismiss: _onDismiss,
  showErrorDetails,
  setShowErrorDetails,
  isDevelopment,
  context,
  className,
  ariaProps,
}) => {
  return (
    <div className={`${className} error-fallback--page`} {...ariaProps}>
      <div className="error-fallback__page-container">
        <div className="error-fallback__page-content">
          <AlertTriangle size={64} className="error-fallback__page-icon" />
          <h1 className="error-fallback__page-title">Something went wrong</h1>
          <p className="error-fallback__page-message">
            We encountered an unexpected error. Please try refreshing the page or contact support.
          </p>

          {(isDevelopment || variant === 'technical') && (
            <ErrorDetails
              error={error}
              errorInfo={errorInfo}
              showDetails={showErrorDetails}
              onToggleDetails={() => setShowErrorDetails(!showErrorDetails)}
              context={context}
            />
          )}

          <div className="error-fallback__page-actions">
            {onRetry && (
              <button
                onClick={onRetry}
                className="error-fallback__button error-fallback__button--primary error-fallback__button--large"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="error-fallback__button error-fallback__button--secondary error-fallback__button--large"
            >
              Refresh Page
            </button>
            {_onReport && (
              <button
                onClick={_onReport}
                className="error-fallback__button error-fallback__button--outline error-fallback__button--large"
              >
                Report Issue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Overlay Error Fallback - displays error as modal overlay
 */
const ErrorOverlayFallback: React.FC<{
  error: AppError;
  errorInfo?: React.ErrorInfo;
  variant: ErrorFallbackVariant;
  onRetry?: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  showErrorDetails: boolean;
  setShowErrorDetails: (show: boolean) => void;
  isDevelopment: boolean;
  context?: string;
  className: string;
  ariaProps: Record<string, any>;
}> = ({
  error,
  errorInfo,
  variant,
  onRetry,
  onReport: _onReport,
  onDismiss,
  showErrorDetails,
  setShowErrorDetails,
  isDevelopment,
  context,
  className,
  ariaProps,
}) => {
  return (
    <>
      <div className="error-fallback__overlay-backdrop" onClick={onDismiss} />
      <div className={`${className} error-fallback--overlay`} {...ariaProps}>
        <div className="error-fallback__overlay-content">
          <div className="error-fallback__overlay-header">
            <AlertTriangle size={24} />
            <h3>Error Occurred</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="error-fallback__overlay-close"
                aria-label="Close error dialog"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="error-fallback__overlay-body">
            <p className="error-fallback__message">
              {error.message}
            </p>

            {(isDevelopment || variant === 'technical') && (
              <ErrorDetails
                error={error}
                errorInfo={errorInfo}
                showDetails={showErrorDetails}
                onToggleDetails={() => setShowErrorDetails(!showErrorDetails)}
                context={context}
              />
            )}
          </div>

          <div className="error-fallback__overlay-actions">
            {onRetry && (
              <button onClick={onRetry} className="error-fallback__button error-fallback__button--primary">
                Try Again
              </button>
            )}
            {_onReport && (
              <button onClick={_onReport} className="error-fallback__button error-fallback__button--secondary">
                Report Issue
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Toast Error Fallback - displays error as toast notification
 */
const ErrorToastFallback: React.FC<{
  error: AppError;
  errorInfo?: React.ErrorInfo;
  variant: ErrorFallbackVariant;
  onRetry?: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  showErrorDetails: boolean;
  setShowErrorDetails: (show: boolean) => void;
  isDevelopment: boolean;
  context?: string;
  className: string;
  ariaProps: Record<string, any>;
}> = ({
  error,
  variant,
  onRetry,
  onReport: _onReport,
  onDismiss,
  className,
  ariaProps,
}) => {
  return (
    <div className={`${className} error-fallback--toast`} {...ariaProps}>
      <div className="error-fallback__toast-content">
        <AlertTriangle size={16} />
        <span className="error-fallback__toast-message">
          {variant === 'minimal' ? 'Something went wrong' : error.message}
        </span>
        <div className="error-fallback__toast-actions">
          {onRetry && (
            <button
              onClick={onRetry}
              className="error-fallback__toast-action"
              aria-label="Retry"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="error-fallback__toast-close"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Error Details Component - shows technical error information
 */
const ErrorDetails: React.FC<{
  error: AppError;
  errorInfo?: React.ErrorInfo;
  showDetails: boolean;
  onToggleDetails: () => void;
  context?: string;
}> = ({ error, errorInfo, showDetails, onToggleDetails, context }) => {
  return (
    <div className="error-fallback__details">
      <button
        onClick={onToggleDetails}
        className="error-fallback__details-toggle"
        aria-expanded={showDetails}
        aria-controls="error-details"
      >
        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {showDetails ? 'Hide' : 'Show'} Technical Details
      </button>

      {showDetails && (
        <div id="error-details" className="error-fallback__details-content">
          <div className="error-fallback__details-section">
            <h4>Error Information</h4>
            <dl>
              <dt>ID:</dt>
              <dd>{error.id}</dd>
              <dt>Type:</dt>
              <dd>{error.type}</dd>
              <dt>Severity:</dt>
              <dd>{error.severity}</dd>
              <dt>Recoverable:</dt>
              <dd>{error.recoverable ? 'Yes' : 'No'}</dd>
              <dt>Retryable:</dt>
              <dd>{error.retryable ? 'Yes' : 'No'}</dd>
              <dt>Timestamp:</dt>
              <dd>{new Date(error.timestamp).toISOString()}</dd>
              {context && (
                <>
                  <dt>Context:</dt>
                  <dd>{context}</dd>
                </>
              )}
            </dl>
          </div>

          {errorInfo && (
            <div className="error-fallback__details-section">
              <h4>Component Stack</h4>
              <pre className="error-fallback__stack-trace">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}

          {error.stack && (
            <div className="error-fallback__details-section">
              <h4>Stack Trace</h4>
              <pre className="error-fallback__stack-trace">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorFallback;