import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { useLoading } from '@client/core/loading';
import { logger } from '@client/shared/utils/logger';

export interface TimeoutConfig {
  timeout: number;
  warningThreshold: number; // 0-1, percentage of timeout
  showWarning: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

export interface TimeoutState {
  isWarning: boolean;
  isTimeout: boolean;
  timeElapsed: number;
  timeRemaining: number;
  retryCount: number;
  canRetry: boolean;
  nextRetryIn: number;
}

const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  timeout: 30000,
  warningThreshold: 0.7,
  showWarning: true,
  autoRetry: false,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

/**
 * Enhanced timeout-aware loading hook with configurable warnings and recovery
 */
export function useTimeoutAwareLoading<T = any>(
  operationId: string,
  config: Partial<TimeoutConfig> = {}
): {
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
  timeoutState: TimeoutState;
  data: T | null;
  error: Error | null;
  isLoading: boolean;
} {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_TIMEOUT_CONFIG, ...config }), [config]);
  const { startApiLoading, completeApiLoading, retryOperation, cancelOperation, getOperation } =
    useLoading();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [timeoutState, setTimeoutState] = useState<TimeoutState>({
    isWarning: false,
    isTimeout: false,
    timeElapsed: 0,
    timeRemaining: 0,
    retryCount: 0,
    canRetry: true,
    nextRetryIn: 0,
  });

  const operationRef = useRef<(() => Promise<T>) | null>(null);
  const startTimeRef = useRef<number>(0);
  const warningShownRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const operation = getOperation(operationId);
  const isLoading = !!operation;

  // Update timeout state
  useEffect(() => {
    if (!isLoading) {
      setTimeoutState(prev => ({
        ...prev,
        isWarning: false,
        isTimeout: false,
        timeElapsed: 0,
        timeRemaining: 0,
      }));
      warningShownRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, mergedConfig.timeout - elapsed);
      const warningTime = mergedConfig.timeout * mergedConfig.warningThreshold;

      const newState: TimeoutState = {
        isWarning: elapsed >= warningTime && !warningShownRef.current,
        isTimeout: elapsed >= mergedConfig.timeout,
        timeElapsed: elapsed,
        timeRemaining: remaining,
        retryCount: timeoutState.retryCount,
        canRetry: timeoutState.retryCount < mergedConfig.maxRetries,
        nextRetryIn: timeoutState.nextRetryIn,
      };

      // Show warning once
      if (newState.isWarning && mergedConfig.showWarning && !warningShownRef.current) {
        warningShownRef.current = true;
        logger.warn(`Operation ${operationId} is taking longer than expected`, {
          elapsed,
          timeout: mergedConfig.timeout,
          component: 'useTimeoutAwareLoading',
        });
      }

      // Handle timeout
      if (newState.isTimeout && !timeoutState.isTimeout) {
        logger.error(`Operation ${operationId} timed out`, {
          elapsed,
          timeout: mergedConfig.timeout,
          component: 'useTimeoutAwareLoading',
        });
        cancelOperation(operationId);
        setError(new Error(`Operation timed out after ${mergedConfig.timeout}ms`));
      }

      setTimeoutState(newState);
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [isLoading, operationId, mergedConfig, timeoutState.isTimeout, cancelOperation]);

  // Handle operation completion
  useEffect(() => {
    if (!operation) return;

    if (operation.error) {
      setError(operation.error as Error);
    }
  }, [operation]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!operationRef.current) {
      return null;
    }

    // Use functional update to avoid dependency on timeoutState.retryCount
    let shouldRetry = false;
    setTimeoutState(prev => {
      if (prev.retryCount >= mergedConfig.maxRetries) {
        shouldRetry = false;
        return prev;
      }
      shouldRetry = true;
      return {
        ...prev,
        retryCount: prev.retryCount + 1,
        nextRetryIn: 0,
      };
    });

    if (!shouldRetry) {
      return null;
    }

    retryOperation(operationId);

    try {
      const result = await operationRef.current();
      setData(result);
      completeApiLoading(operationId, true);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      completeApiLoading(operationId, false, error);
      return null;
    }
  }, [operationId, mergedConfig.maxRetries, retryOperation, completeApiLoading]);

  const execute = useCallback(
    async (operationFn: () => Promise<T>): Promise<T | null> => {
      try {
        // Reset state
        setData(null);
        setError(null);
        setTimeoutState({
          isWarning: false,
          isTimeout: false,
          timeElapsed: 0,
          timeRemaining: mergedConfig.timeout,
          retryCount: 0,
          canRetry: true,
          nextRetryIn: 0,
        });
        warningShownRef.current = false;
        operationRef.current = operationFn;
        startTimeRef.current = Date.now();

        // Clear any pending retry
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        startApiLoading(operationId, 'Loading...', {
          timeout: mergedConfig.timeout,
          retryLimit: mergedConfig.maxRetries,
          retryDelay: mergedConfig.retryDelay,
        });

        const result = await operationFn();
        setData(result);
        completeApiLoading(operationId, true);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        completeApiLoading(operationId, false, error);

        // Auto-retry if enabled and not a timeout - use functional update to avoid dependency
        if (mergedConfig.autoRetry && !error.message.includes('timed out')) {
          setTimeoutState(prev => {
            if (prev.retryCount < mergedConfig.maxRetries) {
              const delay = mergedConfig.exponentialBackoff
                ? mergedConfig.retryDelay * Math.pow(2, prev.retryCount)
                : mergedConfig.retryDelay;

              retryTimeoutRef.current = setTimeout(() => {
                retry();
              }, delay);

              return {
                ...prev,
                nextRetryIn: delay,
              };
            }
            return prev;
          });
        }

        return null;
      }
    },
    [operationId, mergedConfig, startApiLoading, completeApiLoading, retry]
  );

  const cancel = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    cancelOperation(operationId);
    setError(null);
    setTimeoutState(prev => ({
      ...prev,
      isWarning: false,
      isTimeout: false,
    }));
  }, [operationId, cancelOperation]);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setTimeoutState({
      isWarning: false,
      isTimeout: false,
      timeElapsed: 0,
      timeRemaining: 0,
      retryCount: 0,
      canRetry: true,
      nextRetryIn: 0,
    });
    operationRef.current = null;
    warningShownRef.current = false;
  }, [cancel]);

  return {
    execute,
    retry,
    cancel,
    reset,
    timeoutState,
    data,
    error,
    isLoading,
  };
}

/**
 * Hook for operations with smart timeout recovery
 */
export function useSmartTimeoutRecovery<T = any>(
  operationId: string,
  recoveryStrategies: Array<{
    condition: (error: Error, timeoutState: TimeoutState) => boolean;
    action: () => Promise<T | null>;
    description: string;
  }> = []
) {
  const timeoutLoading = useTimeoutAwareLoading<T>(operationId);

  const executeWithRecovery = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      const result = await timeoutLoading.execute(operation);

      // If failed, try recovery strategies
      if (!result && timeoutLoading.error) {
        for (const strategy of recoveryStrategies) {
          if (strategy.condition(timeoutLoading.error, timeoutLoading.timeoutState)) {
            logger.info(`Attempting recovery strategy: ${strategy.description}`, {
              operationId,
              component: 'useSmartTimeoutRecovery',
            });

            try {
              const recoveryResult = await strategy.action();
              if (recoveryResult) {
                return recoveryResult;
              }
            } catch (recoveryError) {
              logger.warn(`Recovery strategy failed: ${strategy.description}`, {
                operationId,
                error: recoveryError,
                component: 'useSmartTimeoutRecovery',
              });
            }
          }
        }
      }

      return result;
    },
    [operationId, timeoutLoading, recoveryStrategies]
  );

  return {
    ...timeoutLoading,
    execute: executeWithRecovery,
  };
}

/**
 * Hook for progressive timeout handling with stage-based timeouts
 */
export function useProgressiveTimeout(
  operationId: string,
  stages: Array<{
    id: string;
    timeout: number;
    warningThreshold: number;
  }>
) {
  const [currentStage, setCurrentStage] = useState(0);
  const timeoutLoading = useTimeoutAwareLoading(operationId, {
    timeout: stages[0]?.timeout || 30000,
    warningThreshold: stages[0]?.warningThreshold || 0.7,
  });

  const nextStage = useCallback(() => {
    const nextIndex = currentStage + 1;
    if (nextIndex < stages.length) {
      setCurrentStage(nextIndex);
      // Update timeout config for next stage
      // Note: This would need to be implemented in the unified context
    }
  }, [currentStage, stages.length]);

  return {
    ...timeoutLoading,
    currentStage,
    currentStageData: stages[currentStage],
    nextStage,
    progress: stages.length > 0 ? ((currentStage + 1) / stages.length) * 100 : 0,
  };
}
