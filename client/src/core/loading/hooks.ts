/**
 * Loading Operation Hooks
 * 
 * Hooks for managing loading states with timeout detection
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@client/utils/logger';

export interface LoadingOperationOptions {
  timeout?: number;
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
}

export interface LoadingOperationReturn {
  isLoading: boolean;
  error: Error | null;
  isTimeout: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error | null) => void;
}

export function useLoadingOperation(
  operationName: string,
  options: LoadingOperationOptions = {}
): LoadingOperationReturn {
  const {
    timeout = 15000,
    connectionAware = true,
    showTimeoutWarning = true
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setIsTimeout(false);

    logger.info(`Loading operation started: ${operationName}`, {
      component: 'useLoadingOperation',
      operationName,
      timeout
    });
  }, [operationName, timeout]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setIsTimeout(false);

    logger.info(`Loading operation completed: ${operationName}`, {
      component: 'useLoadingOperation',
      operationName
    });
  }, [operationName]);

  const handleSetError = useCallback((error: Error | null) => {
    setError(error);
    if (error) {
      setIsLoading(false);
      logger.error(`Loading operation failed: ${operationName}`, {
        component: 'useLoadingOperation',
        operationName,
        error: error.message
      });
    }
  }, [operationName]);

  // Timeout detection
  useEffect(() => {
    if (!isLoading) return;

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsTimeout(true);
        
        if (showTimeoutWarning) {
          const timeoutError = new Error(`Operation ${operationName} timed out after ${timeout}ms`);
          setError(timeoutError);
        }

        logger.warn(`Loading operation timed out: ${operationName}`, {
          component: 'useLoadingOperation',
          operationName,
          timeout
        });
      }
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [isLoading, operationName, timeout, showTimeoutWarning]);

  return {
    isLoading,
    error,
    isTimeout,
    startLoading,
    stopLoading,
    setError: handleSetError
  };
}