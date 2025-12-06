/**
 * Error Boundary Provider
 * 
 * Provides comprehensive error handling across the entire application
 * with different strategies for different types of errors.
 */

import React, { ReactNode } from 'react';

import { logger } from '../../utils/browser-logger';

import { ErrorBoundary, ErrorSeverity, ErrorDomain } from './ErrorBoundary';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

/**
 * Critical error fallback for application-level errors
 */
const CriticalErrorFallback: React.FC<{
  error: any;
  resetError: () => void;
}> = ({ error, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-medium text-gray-900">
              Application Error
            </h1>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            The application encountered an unexpected error and needs to be restarted.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-sm text-gray-500 cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reload Page
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Chunk loading error fallback
 */
const ChunkErrorFallback: React.FC<{
  error: any;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const handleReload = () => {
    // Clear any cached chunks
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('workbox') || name.includes('precache')) {
            caches.delete(name);
          }
        });
      }).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-medium text-gray-900">
              Update Required
            </h1>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            The application has been updated. Please reload the page to get the latest version.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleReload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reload Now
          </button>
          <button
            onClick={resetError}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Network error fallback
 */
const NetworkErrorFallback: React.FC<{
  error: any;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
            </svg>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-medium text-gray-900">
              Connection Error
            </h1>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {isOnline 
              ? "Unable to connect to the server. Please try again."
              : "You appear to be offline. Please check your internet connection."
            }
          </p>
          <div className="mt-2 flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            disabled={!isOnline}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isOnline ? 'Try Again' : 'Waiting for Connection...'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Determines the appropriate fallback component based on error type
 */
function getFallbackComponent(error: any) {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('chunk') || message.includes('loading')) {
    return ChunkErrorFallback;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return NetworkErrorFallback;
  }
  
  return CriticalErrorFallback;
}

/**
 * Main error boundary provider component
 */
export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({ children }) => {
  const handleError = (error: any, errorInfo: any) => {
    // Log the error
    logger.error('Application error caught by boundary', {
      component: 'ErrorBoundaryProvider'
    }, error);

    // Send to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={({ error, resetError }) => {
        const FallbackComponent = getFallbackComponent(error);
        return <FallbackComponent error={error} resetError={resetError} />;
      }}
      maxRetries={3}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryProvider;