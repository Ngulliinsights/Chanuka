/**
 * React Error Boundary Component
 * 
 * Consolidated error boundary that integrates with the unified error management system.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BaseError, ErrorDomain, ErrorSeverity } from '../errors/base-error.js';
import { ErrorHandlerChain } from './error-handler-chain.js';
import { logger } from '../../logging/index.js';

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  errorId?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: BaseError, errorId: string, retry: () => void) => ReactNode;
  onError?: (error: BaseError, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  handleChain?: ErrorHandlerChain;
}

/**
 * Enhanced Error Boundary with retry capability and error management integration
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private readonly handleChain: ErrorHandlerChain;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.handleChain = props.handleChain || new ErrorHandlerChain();
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
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
      errorId: baseError.errorId
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
        errorBoundary: true
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

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }

    // Log the error
    logger.error('React error boundary caught error', {
      component: 'ErrorBoundary',
      errorId: enhancedError.errorId,
      componentStack: errorInfo.componentStack,
      retryCount: this.retryCount
    });
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.retryCount < maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorId: undefined });
      
      logger.info('Error boundary retry attempted', {
        component: 'ErrorBoundary',
        retryCount: this.retryCount,
        maxRetries
      });
    } else {
      logger.warn('Error boundary max retries exceeded', {
        component: 'ErrorBoundary',
        retryCount: this.retryCount,
        maxRetries
      });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId!, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ff6b6b', 
          borderRadius: '4px', 
          backgroundColor: '#ffe0e0',
          margin: '10px 0'
        }}>
          <h2 style={{ color: '#d63031', margin: '0 0 10px 0' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 10px 0' }}>
            {this.state.error.getUserMessage()}
          </p>
          <details style={{ marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', color: '#636e72' }}>
              Error Details
            </summary>
            <pre style={{ 
              fontSize: '12px', 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '5px'
            }}>
              Error ID: {this.state.errorId}
              {'\n'}Code: {this.state.error.code}
              {'\n'}Domain: {this.state.error.metadata.domain}
              {'\n'}Severity: {this.state.error.metadata.severity}
              {this.state.error.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
            </pre>
          </details>
          {this.props.enableRetry && this.retryCount < (this.props.maxRetries || 3) && (
            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: '#0984e3',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Try Again ({this.retryCount}/{this.props.maxRetries || 3})
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#636e72',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
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
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, any>) => {
    const baseError = error instanceof BaseError 
      ? error 
      : new BaseError(error.message, {
          code: 'REACT_HOOK_ERROR',
          domain: ErrorDomain.SYSTEM,
          severity: ErrorSeverity.MEDIUM,
          cause: error,
          context
        });

    // Throw the error to be caught by the nearest error boundary
    throw baseError;
  }, []);

  return handleError;
}
