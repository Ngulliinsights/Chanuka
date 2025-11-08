import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler, ErrorType, ErrorSeverity, AppError } from '../../utils/unified-error-handler';
import { ErrorDomain } from '../../shared/errors';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  showRetry?: boolean;
  className?: string;
  // Enhanced props for unified error handling
  enableRecovery?: boolean;
  enableFeedback?: boolean;
  maxRecoveryAttempts?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  appError?: AppError;
}

/**
 * @deprecated This component is deprecated. Use ErrorBoundary from '../error-handling/ErrorBoundary' instead.
 * 
 * Legacy Error Boundary Component - Maintained for backward compatibility only.
 * 
 * This component provides basic unified error handler integration but lacks
 * the full feature set of the enhanced ErrorBoundary.
 * 
 * For new implementations, use:
 * import { ErrorBoundary } from '../error-handling/ErrorBoundary';
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use unified error handler for comprehensive error processing
    const appError = errorHandler.handleError({
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        reactErrorInfo: errorInfo,
      },
      context: {
        component: this.props.componentName || 'ErrorBoundary',
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
      recoverable: this.props.enableRecovery !== false,
      retryable: false,
    });

    this.setState({ 
      errorId: appError.id,
      appError: appError 
    });

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && appError.recoverable) {
      errorHandler.attemptRecovery(appError).then(recovered => {
        if (recovered) {
          // Reset error state if recovery was successful
          this.setState({ 
            hasError: false, 
            error: undefined, 
            errorId: undefined,
            appError: undefined 
          });
        }
      }).catch(recoveryError => {
        console.warn('Recovery attempt failed:', recoveryError);
      });
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorId: undefined,
      appError: undefined 
    });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          appError={this.state.appError}
          onRetry={this.props.showRetry !== false ? this.handleRetry : undefined}
          className={this.props.className}
          enableFeedback={this.props.enableFeedback}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for using error boundary functionality in functional components
 */
export function useErrorBoundary() {
  return errorHandler.handleError;
}