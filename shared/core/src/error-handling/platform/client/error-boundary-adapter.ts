import React, { ComponentType } from 'react';
import { ErrorBoundaryHandler } from '../../handlers/error-boundary.js';
import { ErrorFallbackProps } from '../../handlers/error-boundary.js';
import { ErrorContextType } from '../../core/types.js';

export interface ErrorBoundaryAdapterProps {
  children: React.ReactNode;
  context?: ErrorContextType;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorType: string) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  isolateErrors?: boolean;
}

/**
 * Client-side adapter for error boundaries
 * Provides a React component wrapper for error handling
 */
export class ErrorBoundaryAdapter extends React.Component<ErrorBoundaryAdapterProps> {
  render() {
    const {
      children,
      context,
      fallbackComponent,
      onError,
      enableRecovery,
      maxRetries,
      isolateErrors,
    } = this.props;

    return (
      <ErrorBoundaryHandler
        context={context}
        fallbackComponent={fallbackComponent}
        onError={onError}
        enableRecovery={enableRecovery}
        maxRetries={maxRetries}
        isolateErrors={isolateErrors}
      >
        {children}
      </ErrorBoundaryHandler>
    );
  }
}

/**
 * HOC for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: {
    fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
    context?: ErrorContextType;
    onError?: (error: Error, errorInfo: React.ErrorInfo, errorType: string) => void;
    enableRecovery?: boolean;
    maxRetries?: number;
    isolateErrors?: boolean;
  } = {}
): ComponentType<P> {
  const {
    fallbackComponent,
    context,
    onError,
    enableRecovery,
    maxRetries,
    isolateErrors,
  } = options;

  const WrappedComponent: ComponentType<P> = (props) => (
    <ErrorBoundaryAdapter
      context={context}
      fallbackComponent={fallbackComponent}
      onError={onError}
      enableRecovery={enableRecovery}
      maxRetries={maxRetries}
      isolateErrors={isolateErrors}
    >
      <Component {...props} />
    </ErrorBoundaryAdapter>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}