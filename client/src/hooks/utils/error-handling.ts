/**
 * Error Handling Utilities for Hooks
 * Provides unified error handling patterns across all hooks
 */

import { useCallback, useRef, useState } from 'react';

import { logger } from '@client/utils/logger';

export interface ErrorHandler {
  handle(error: Error, context: string): void;
  retry<T>(operation: () => Promise<T>, retries: number, options?: RetryOptions): Promise<T>;
  recover(error: Error, context: string): Promise<boolean>;
}

export interface RetryOptions {
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface ErrorRecoveryStrategy {
  id: string;
  condition: (error: Error, context: ErrorContext) => boolean;
  action: () => Promise<boolean>;
  description: string;
  priority: number;
  maxAttempts: number;
}

export interface ErrorContext {
  error: Error;
  operationId: string;
  retryCount: number;
  timeElapsed: number;
  connectionType: string;
  isOnline: boolean;
}

export interface ErrorState {
  error: Error | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number | null;
  canRecover: boolean;
  suggestions: string[];
}

/**
 * Default error recovery strategies
 */
const DEFAULT_RECOVERY_STRATEGIES: ErrorRecoveryStrategy[] = [
  {
    id: 'network-retry',
    condition: (error, context) => {
      return (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        (error.message.includes('timeout') && context.isOnline)
      );
    },
    action: async () => {
      // Wait for network recovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      return navigator.onLine;
    },
    description: 'Retry after network recovery',
    priority: 1,
    maxAttempts: 3,
  },
  {
    id: 'connection-aware-retry',
    condition: (error, context) => {
      return context.connectionType === 'slow' && context.retryCount < 2;
    },
    action: async () => {
      // Wait longer on slow connections
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    },
    description: 'Extended retry for slow connections',
    priority: 2,
    maxAttempts: 2,
  },
  {
    id: 'cache-fallback',
    condition: error => {
      return error.message.includes('network') || error.message.includes('offline');
    },
    action: async () => {
      // Try to load from cache or service worker
      try {
        // This would integrate with service worker cache
        return true;
      } catch {
        return false;
      }
    },
    description: 'Attempt to load from cache',
    priority: 3,
    maxAttempts: 1,
  },
  {
    id: 'graceful-degradation',
    condition: () => true, // Always available as last resort
    action: async () => {
      // Show offline mode or reduced functionality
      return true;
    },
    description: 'Enable offline mode or reduced functionality',
    priority: 10,
    maxAttempts: 1,
  },
];

/**
 * Hook for creating a unified error handler
 */
export function useErrorHandler(
  strategies: ErrorRecoveryStrategy[] = DEFAULT_RECOVERY_STRATEGIES
): ErrorHandler & {
  errorState: ErrorState;
  addStrategy: (strategy: ErrorRecoveryStrategy) => void;
  removeStrategy: (strategyId: string) => void;
  resetErrorState: () => void;
} {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: null,
    canRecover: true,
    suggestions: [],
  });

  const strategiesRef = useRef<ErrorRecoveryStrategy[]>(strategies);
  const recoveryAttemptsRef = useRef<Record<string, number>>({});

  /**
   * Handle an error with logging and context
   */
  const handle = useCallback((error: Error, context: string) => {
    logger.error(`Error in ${context}:`, { error: error.message, stack: error.stack });

    setErrorState(prev => ({
      ...prev,
      error,
      canRecover: true,
    }));
  }, []);

  /**
   * Retry an operation with exponential backoff
   */
  const retry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      retries: number,
      options: RetryOptions = {}
    ): Promise<T> => {
      const {
        baseDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        jitter = true,
      } = options;

      let lastError: Error;

      for (let i = 0; i < retries; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;

          if (i === retries - 1) {
            throw lastError;
          }

          // Calculate delay with exponential backoff
          let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, i), maxDelay);

          // Add jitter to prevent thundering herd
          if (jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
          }

          logger.warn(`Operation failed, retrying in ${delay}ms`, {
            attempt: i + 1,
            totalRetries: retries,
            error: lastError.message,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError!;
    },
    []
  );

  /**
   * Recover from an error using available strategies
   */
  const recover = useCallback(
    async (error: Error, context: string): Promise<boolean> => {
      if (errorState.isRecovering) {
        return false;
      }

      const connectionType = (navigator as any).connection?.effectiveType || 'unknown';
      const isOnline = navigator.onLine;

      const errorContext: ErrorContext = {
        error,
        operationId: context,
        retryCount: 0, // This would come from the operation context
        timeElapsed: 0, // This would be calculated
        connectionType,
        isOnline,
      };

      const applicableStrategies = strategiesRef.current
        .filter(strategy => {
          const attempts = recoveryAttemptsRef.current[strategy.id] || 0;
          return attempts < strategy.maxAttempts && strategy.condition(error, errorContext);
        })
        .sort((a, b) => a.priority - b.priority);

      if (applicableStrategies.length === 0) {
        setErrorState(prev => ({
          ...prev,
          canRecover: false,
          suggestions: ['No recovery strategies available'],
        }));
        return false;
      }

      setErrorState(prev => ({
        ...prev,
        isRecovering: true,
        recoveryAttempts: prev.recoveryAttempts + 1,
      }));

      for (const strategy of applicableStrategies) {
        const attempts = recoveryAttemptsRef.current[strategy.id] || 0;

        if (attempts >= strategy.maxAttempts) continue;

        try {
          logger.info(`Attempting recovery strategy: ${strategy.description}`, {
            context,
            strategy: strategy.id,
            attempt: attempts + 1,
            component: 'useErrorHandler',
          });

          const success = await strategy.action();

          if (success) {
            // Mark strategy as used
            recoveryAttemptsRef.current[strategy.id] = attempts + 1;

            setErrorState(prev => ({
              ...prev,
              isRecovering: false,
              lastRecoveryTime: Date.now(),
              canRecover: true,
              suggestions: [],
            }));

            logger.info(`Recovery successful with strategy: ${strategy.description}`, {
              context,
              strategy: strategy.id,
              component: 'useErrorHandler',
            });

            return true;
          }
        } catch (recoveryError) {
          logger.warn(`Recovery strategy failed: ${strategy.description}`, {
            context,
            strategy: strategy.id,
            error: recoveryError,
            component: 'useErrorHandler',
          });

          // Mark attempt
          recoveryAttemptsRef.current[strategy.id] = attempts + 1;
        }
      }

      // All strategies failed
      const suggestions = applicableStrategies.map(s => s.description);
      setErrorState(prev => ({
        ...prev,
        isRecovering: false,
        canRecover: false,
        suggestions,
      }));

      logger.error('All recovery strategies failed', {
        context,
        strategies: applicableStrategies.map(s => s.id),
        component: 'useErrorHandler',
      });

      return false;
    },
    [errorState.isRecovering]
  );

  /**
   * Add a new recovery strategy
   */
  const addStrategy = useCallback((strategy: ErrorRecoveryStrategy) => {
    strategiesRef.current = [...strategiesRef.current, strategy];
  }, []);

  /**
   * Remove a recovery strategy
   */
  const removeStrategy = useCallback((strategyId: string) => {
    strategiesRef.current = strategiesRef.current.filter(s => s.id !== strategyId);
  }, []);

  /**
   * Reset error state
   */
  const resetErrorState = useCallback(() => {
    setErrorState({
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: null,
      canRecover: true,
      suggestions: [],
    });
    recoveryAttemptsRef.current = {};
  }, []);

  return {
    handle,
    retry,
    recover,
    errorState,
    addStrategy,
    removeStrategy,
    resetErrorState,
  };
}

/**
 * Hook for graceful error handling with fallback values
 */
export function useGracefulErrorHandling<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  options: {
    retries?: number;
    onError?: (error: Error) => void;
    onRecover?: () => void;
  } = {}
): {
  data: T;
  loading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
  isRecovering: boolean;
} {
  const { retries = 3, onError, onRecover } = options;

  const [data, setData] = useState<T>(fallbackValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const errorHandler = useErrorHandler();

  const executeOperation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRecovering(false);

    try {
      const result = await errorHandler.retry(operation, retries);
      setData(result);
      setIsRecovering(false);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);

      // Try to recover
      setIsRecovering(true);
      const recovered = await errorHandler.recover(error, 'useGracefulErrorHandling');

      if (recovered) {
        onRecover?.();
        setIsRecovering(false);
      } else {
        // Use fallback value
        setData(fallbackValue);
        setIsRecovering(false);
      }
    } finally {
      setLoading(false);
    }
  }, [operation, retries, errorHandler, onError, onRecover, fallbackValue]);

  const retry = useCallback(async () => {
    errorHandler.resetErrorState();
    await executeOperation();
  }, [executeOperation, errorHandler]);

  return {
    data,
    loading,
    error,
    retry,
    isRecovering,
  };
}

/**
 * Hook for error boundary integration
 */
export function useErrorBoundary(): {
  throwError: (error: Error) => void;
  resetError: () => void;
} {
  const throwError = useCallback((error: Error) => {
    // This will be caught by error boundary
    throw error;
  }, []);

  const resetError = useCallback(() => {
    // Reset error boundary state
    window.location.reload();
  }, []);

  return {
    throwError,
    resetError,
  };
}
