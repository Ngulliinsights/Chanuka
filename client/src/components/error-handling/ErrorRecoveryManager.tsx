import React, { useState, useCallback } from 'react';
import { logger } from '@client/utils/logger';

export interface ErrorRecoveryManagerProps {
  children: React.ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export function ErrorRecoveryManager({ children }: ErrorRecoveryManagerProps) {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    retryCount: 0,
  });

  const handleError = useCallback((error: Error) => {
    logger.error('Error Recovery Manager caught error:', error);
    setErrorState(prev => ({
      hasError: true,
      error,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const retry = useCallback(() => {
    setErrorState({
      hasError: false,
      error: undefined,
      retryCount: 0,
    });
  }, []);

  if (errorState.hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
        <p className="text-gray-600 mb-4 text-center max-w-md">
          {errorState.error?.message || 'An unexpected error occurred'}
        </p>
        <div className="space-x-4">
          <button
            onClick={retry}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reload Page
          </button>
        </div>
        {errorState.retryCount > 2 && (
          <p className="text-sm text-gray-500 mt-4">
            If the problem persists, please contact support.
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

