/**
 * React Error Boundary Component
 * 
 * Browser-compatible error boundary that doesn't rely on Node.js dependencies.
 * This provides comprehensive error handling for React components with recovery strategies.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

// Browser-compatible error types (no Node.js dependencies)
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorDomain {
  COMPONENT = 'component',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RENDERING = 'rendering',
  CHUNK_LOADING = 'chunk_loading'
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => void;
  automatic: boolean;
}

export interface BrowserError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  domain: ErrorDomain;
  timestamp: Date;
  component?: string;
  recoveryStrategies: RecoveryStrategy[];
  context?: Record<string, unknown>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: BrowserError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: BrowserError, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  isolate?: boolean;
}

export interface ErrorFallbackProps {
  error: BrowserError;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  retryCount: number;
  maxRetries: number;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  maxRetries
}) => {
  const canRetry = retryCount < maxRetries;

  return (
    <div className="error-boundary-fallback p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Something went wrong
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
            {error.severity === ErrorSeverity.CRITICAL && (
              <p className="mt-1 font-medium">This is a critical error that requires immediate attention.</p>
            )}
          </div>
          <div className="mt-4 flex space-x-3">
            {canRetry && (
              <button
                onClick={resetError}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Try Again ({maxRetries - retryCount} attempts left)
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reload Page
            </button>
          </div>
          {error.recoveryStrategies.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Recovery Options:</h4>
              <div className="space-y-2">
                {error.recoveryStrategies.map((strategy, index) => (
                  <button
                    key={index}
                    onClick={strategy.action}
                    className="block w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {strategy.description}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * React Error Boundary with recovery strategies
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Create browser-compatible error
    const browserError: BrowserError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      message: error.message || 'An unexpected error occurred',
      severity: ErrorBoundary.determineSeverity(error),
      domain: ErrorBoundary.determineDomain(error),
      timestamp: new Date(),
      recoveryStrategies: ErrorBoundary.generateRecoveryStrategies(error),
      context: {
        errorName: error.name,
        stack: error.stack
      }
    };

    return {
      hasError: true,
      error: browserError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call onError callback if provided
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private static determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return ErrorSeverity.HIGH;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorSeverity.MEDIUM;
    }
    
    if (message.includes('cannot read') || message.includes('undefined')) {
      return ErrorSeverity.HIGH;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  private static determineDomain(error: Error): ErrorDomain {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return ErrorDomain.CHUNK_LOADING;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorDomain.NETWORK;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorDomain.VALIDATION;
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorDomain.AUTHENTICATION;
    }
    
    return ErrorDomain.COMPONENT;
  }

  private static generateRecoveryStrategies(error: Error): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('chunk') || message.includes('loading')) {
      strategies.push({
        name: 'reload-page',
        description: 'Reload the page to fetch the latest code',
        action: () => window.location.reload(),
        automatic: false
      });
    }

    if (message.includes('network') || message.includes('fetch')) {
      strategies.push({
        name: 'retry-connection',
        description: 'Check your internet connection and try again',
        action: () => {
          // Simple connectivity check
          if (navigator.onLine) {
            window.location.reload();
          } else {
            alert('Please check your internet connection and try again.');
          }
        },
        automatic: false
      });
    }

    return strategies;
  }

  private resetError = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      const maxRetries = this.props.maxRetries || 3;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          maxRetries={maxRetries}
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
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
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
 * Hook for programmatically triggering error boundaries
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: Record<string, unknown>) => {
    // Create a synthetic error that will be caught by error boundaries
    const syntheticError = new Error(error.message);
    syntheticError.name = error.name;
    syntheticError.stack = error.stack;
    
    // Add context if provided
    if (errorInfo) {
      (syntheticError as any).context = errorInfo;
    }
    
    // Throw the error to be caught by the nearest error boundary
    throw syntheticError;
  };
}

export default ErrorBoundary;