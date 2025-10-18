import React, { ComponentType, lazy, LazyExoticComponent } from 'react';
import { logger } from '@shared/core/src/observability/logging';
import PageErrorBoundary, { ErrorFallbackProps, ErrorType, ErrorContext } from './PageErrorBoundary';
import { 
  ComponentErrorFallback, 
  ApiErrorFallback, 
  ChunkErrorFallback, 
  NetworkErrorFallback,
  CriticalErrorFallback 
} from './ErrorFallback';

// Smart fallback component selector
function getSmartFallback(errorType?: ErrorType, context?: ErrorContext): React.ComponentType<ErrorFallbackProps> {
  if (errorType === 'chunk') return ChunkErrorFallback;
  if (errorType === 'network' || errorType === 'timeout') return NetworkErrorFallback;
  if (context === 'api') return ApiErrorFallback;
  return ComponentErrorFallback;
}

// Enhanced HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: {
    fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
    context?: ErrorContext;
    onError?: (error: Error, errorInfo: React.ErrorInfo, errorType: ErrorType) => void;
    enableRecovery?: boolean;
    maxRetries?: number;
    smartFallback?: boolean;
  } = {}
): ComponentType<P> {
  const {
    fallbackComponent,
    context = 'component',
    onError,
    enableRecovery = true,
    maxRetries = 3,
    smartFallback = true,
  } = options;

  const WrappedComponent: ComponentType<P> = (props) => {
    // Use smart fallback selection if enabled and no specific fallback provided
    const FallbackComponent = fallbackComponent || 
      (smartFallback ? undefined : ComponentErrorFallback);

    return (
      <PageErrorBoundary
        fallbackComponent={FallbackComponent}
        context={context}
        onError={onError}
        enableRecovery={enableRecovery}
        maxRetries={maxRetries}
      >
        <Component {...props} />
      </PageErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Enhanced HOC for wrapping lazy components with error boundaries
export function withLazyErrorBoundary<P extends object>(
  lazyComponent: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
    context?: ErrorContext;
    onError?: (error: Error, errorInfo: React.ErrorInfo, errorType: ErrorType) => void;
    loadingFallback?: React.ComponentType;
    enableRecovery?: boolean;
    maxRetries?: number;
    smartFallback?: boolean;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const {
    fallbackComponent,
    context = 'page',
    onError,
    loadingFallback,
    enableRecovery = true,
    maxRetries = 3,
    smartFallback = true,
  } = options;

  return lazy(async () => {
    try {
      const module = await lazyComponent();
      const Component = module.default;

      // Wrap the component with error boundary
      const WrappedComponent: ComponentType<P> = (props) => {
        const FallbackComponent = fallbackComponent || 
          (smartFallback ? ChunkErrorFallback : ComponentErrorFallback);

        return (
          <PageErrorBoundary
            fallbackComponent={FallbackComponent}
            context={context}
            onError={onError}
            enableRecovery={enableRecovery}
            maxRetries={maxRetries}
          >
            <Component {...props} />
          </PageErrorBoundary>
        );
      };

      WrappedComponent.displayName = `withLazyErrorBoundary(${Component.displayName || Component.name})`;

      return { default: WrappedComponent };
    } catch (error) {
      logger.error('Failed to load lazy component:', { component: 'Chanuka' }, error);
      
      // Return a fallback component that shows the error
      const ErrorComponent: ComponentType<P> = () => (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load component
              </h3>
              <p className="text-sm text-red-700 mt-1">
                This component could not be loaded. Please refresh the page or try again later.
              </p>
            </div>
          </div>
        </div>
      );

      return { default: ErrorComponent };
    }
  });
}

// Utility for creating safe lazy components with built-in error handling
export function createSafeLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName?: string
): LazyExoticComponent<ComponentType<P>> {
  return withLazyErrorBoundary(importFn, {
    context: 'page',
    onError: (error, errorInfo) => {
      console.error(`Error in lazy component ${componentName || 'Unknown'}:`, error, errorInfo);
    },
  });
}

// Enhanced component for wrapping critical sections with error boundaries
export interface CriticalSectionProps {
  children: React.ReactNode;
  name: string;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorType: ErrorType) => void;
  context?: ErrorContext;
  enableRecovery?: boolean;
  maxRetries?: number;
  isolateErrors?: boolean;
}

export const CriticalSection: React.FC<CriticalSectionProps> = ({
  children,
  name,
  fallback,
  onError,
  context = 'component',
  enableRecovery = true,
  maxRetries = 2, // Lower for critical sections
  isolateErrors = true,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo, errorType: ErrorType) => {
    console.error(`Error in critical section "${name}":`, error, errorInfo);
    console.error(`Error type: ${errorType}, Context: ${context}`);
    onError?.(error, errorInfo, errorType);
  };

  // Use smart fallback if none provided
  const FallbackComponent = fallback || getSmartFallback(undefined, context);

  return (
    <PageErrorBoundary
      fallbackComponent={FallbackComponent}
      context={context}
      onError={handleError}
      enableRecovery={enableRecovery}
      maxRetries={maxRetries}
      isolateErrors={isolateErrors}
    >
      {children}
    </PageErrorBoundary>
  );
};

// Hook for managing component error state
export function useErrorState() {
  const [error, setError] = React.useState<Error | null>(null);
  const [hasError, setHasError] = React.useState(false);

  const clearError = React.useCallback(() => {
    setError(null);
    setHasError(false);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    setHasError(true);
    logger.error('Component error:', { component: 'Chanuka' }, error);
  }, []);

  const resetError = React.useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    error,
    hasError,
    clearError,
    handleError,
    resetError,
  };
}

// Component for displaying error states in components
export interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Something went wrong
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {error.message || 'An unexpected error occurred'}
          </p>
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="bg-white px-3 py-1.5 rounded-md text-sm font-medium text-red-800 border border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
