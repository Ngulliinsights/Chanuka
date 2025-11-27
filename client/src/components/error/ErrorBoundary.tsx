import React, { Component, ReactNode } from 'react';
import { BaseError, ErrorDomain, ErrorSeverity } from '@client/utils/logger';
import { logger } from '@client/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Use the shared error management system
    const appError = new BaseError(error.message, {
      statusCode: 500,
      code: 'REACT_ERROR_BOUNDARY',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      cause: error,
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      },
      isOperational: false,
      retryable: false
    });

    logger.error('React Error Boundary caught error', {
      component: 'ErrorBoundary',
      errorId: appError.errorId
    }, appError);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={this.resetError}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
