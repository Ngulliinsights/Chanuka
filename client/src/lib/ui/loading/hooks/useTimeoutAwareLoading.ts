/**
 * Timeout-aware loading hook
 * Following navigation component patterns for hook implementation
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { LoadingError, LoadingTimeoutError } from '../errors';
import { LoadingState } from '../types';
import { createTimeoutManager, TimeoutManager, formatTimeRemaining } from '../utils/timeout-utils';

export interface UseTimeoutAwareLoadingOptions {
  timeout?: number;
  warningThreshold?: number;
  showWarning?: boolean;
  onTimeout?: () => void;
  onWarning?: (timeRemaining: number) => void;
  onStateChange?: (state: LoadingState) => void;
  retryable?: boolean;
  maxRetries?: number;
}

export interface UseTimeoutAwareLoadingResult {
  // State
  state: LoadingState;
  isLoading: boolean;
  isTimeout: boolean;
  isWarning: boolean;
  error: LoadingError | null;

  // Time information
  elapsedTime: number;
  remainingTime: number;
  timeoutDuration: number;
  warningThreshold: number;

  // Formatted time strings
  elapsedTimeFormatted: string;
  remainingTimeFormatted: string;

  // Retry information
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;

  // Actions
  start: (operationTimeout?: number) => void;
  stop: () => void;
  reset: () => void;
  retry: () => void;
  extendTimeout: (additionalTime: number) => void;

  // Utilities
  withTimeout: <T>(asyncFn: () => Promise<T>, operationTimeout?: number) => Promise<T>;
}

export function useTimeoutAwareLoading(
  options: UseTimeoutAwareLoadingOptions = {}
): UseTimeoutAwareLoadingResult {
  const {
    timeout = 30000, // 30 seconds default
    warningThreshold = timeout * 0.7, // 70% of timeout
    showWarning = true,
    onTimeout,
    onWarning,
    onStateChange,
    retryable = true,
    maxRetries = 3,
  } = options;

  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState<LoadingError | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(timeout);
  const [retryCount, setRetryCount] = useState(0);
  const [currentTimeout, setCurrentTimeout] = useState(timeout);

  const timeoutManagerRef = useRef<TimeoutManager | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const operationIdRef = useRef<string>('');

  // Update time information periodically
  useEffect(() => {
    if (state === 'loading' && timeoutManagerRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = timeoutManagerRef.current?.getElapsedTime() || 0;
        const remaining = timeoutManagerRef.current?.getRemainingTime() || 0;

        setElapsedTime(elapsed);
        setRemainingTime(remaining);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    return undefined;
  }, [state]);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutManagerRef.current) {
        timeoutManagerRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleTimeout = useCallback(() => {
    const timeoutError = new LoadingTimeoutError(operationIdRef.current, currentTimeout, {
      context: { retryCount },
    });

    setError(timeoutError);
    setState('timeout');
    setIsWarning(false);

    onTimeout?.();
  }, [currentTimeout, retryCount, onTimeout]);

  const handleWarning = useCallback(() => {
    if (showWarning) {
      setIsWarning(true);
      onWarning?.(remainingTime);
    }
  }, [showWarning, remainingTime, onWarning]);

  const start = useCallback(
    (operationTimeout?: number) => {
      const timeoutDuration = operationTimeout || timeout;
      const warningTime = showWarning ? warningThreshold : undefined;

      operationIdRef.current = `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      setCurrentTimeout(timeoutDuration);
      setState('loading');
      setError(null);
      setIsWarning(false);
      setElapsedTime(0);
      setRemainingTime(timeoutDuration);

      if (timeoutManagerRef.current) {
        timeoutManagerRef.current.stop();
      }

      timeoutManagerRef.current = createTimeoutManager({
        timeout: timeoutDuration,
        warningThreshold: warningTime,
        onTimeout: handleTimeout,
        onWarning: handleWarning,
      });

      timeoutManagerRef.current.start();
    },
    [timeout, warningThreshold, showWarning, handleTimeout, handleWarning]
  );

  const stop = useCallback(() => {
    if (timeoutManagerRef.current) {
      timeoutManagerRef.current.stop();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState('success');
    setIsWarning(false);
  }, []);

  const reset = useCallback(() => {
    if (timeoutManagerRef.current) {
      timeoutManagerRef.current.stop();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState('loading');
    setError(null);
    setIsWarning(false);
    setElapsedTime(0);
    setRemainingTime(currentTimeout);
    setRetryCount(0);
  }, [currentTimeout]);

  const retry = useCallback(() => {
    if (!retryable || retryCount >= maxRetries) {
      return;
    }

    setRetryCount(prev => prev + 1);

    // Increase timeout for retry (exponential backoff)
    const newTimeout = currentTimeout * Math.pow(1.5, retryCount + 1);
    start(newTimeout);
  }, [retryable, retryCount, maxRetries, currentTimeout, start]);

  const extendTimeout = useCallback(
    (additionalTime: number) => {
      if (timeoutManagerRef.current && state === 'loading') {
        timeoutManagerRef.current.extend(additionalTime);
        setCurrentTimeout(prev => prev + additionalTime);
        setRemainingTime(prev => prev + additionalTime);
      }
    },
    [state]
  );

  const withTimeout = useCallback(
    async <T>(asyncFn: () => Promise<T>, operationTimeout?: number): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        start(operationTimeout);

        const timeoutPromise = new Promise<never>((_, timeoutReject) => {
          const cleanup = () => {
            if (timeoutManagerRef.current) {
              timeoutManagerRef.current.stop();
            }
          };

          // Override the timeout handler to reject the promise
          if (timeoutManagerRef.current) {
            timeoutManagerRef.current.stop();
          }

          timeoutManagerRef.current = createTimeoutManager({
            timeout: operationTimeout || currentTimeout,
            warningThreshold: showWarning ? warningThreshold : undefined,
            onTimeout: () => {
              cleanup();
              const timeoutError = new LoadingTimeoutError(
                operationIdRef.current,
                operationTimeout || currentTimeout,
                { context: { retryCount } }
              );
              handleTimeout();
              timeoutReject(timeoutError);
            },
            onWarning: handleWarning,
          });

          timeoutManagerRef.current.start();
        });

        Promise.race([asyncFn(), timeoutPromise])
          .then(result => {
            stop();
            resolve(result);
          })
          .catch(error => {
            if (error instanceof LoadingTimeoutError) {
              reject(error);
            } else {
              stop();
              reject(error);
            }
          });
      });
    },
    [
      start,
      stop,
      currentTimeout,
      showWarning,
      warningThreshold,
      retryCount,
      handleTimeout,
      handleWarning,
    ]
  );

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const elapsedTimeFormatted = formatTime(elapsedTime);
  const remainingTimeFormatted = formatTimeRemaining(remainingTime);
  const canRetry = retryable && state === 'timeout' && retryCount < maxRetries;

  return {
    // State
    state,
    isLoading: state === 'loading',
    isTimeout: state === 'timeout',
    isWarning,
    error,

    // Time information
    elapsedTime,
    remainingTime,
    timeoutDuration: currentTimeout,
    warningThreshold,

    // Formatted time strings
    elapsedTimeFormatted,
    remainingTimeFormatted,

    // Retry information
    retryCount,
    maxRetries,
    canRetry,

    // Actions
    start,
    stop,
    reset,
    retry,
    extendTimeout,

    // Utilities
    withTimeout,
  };
}

/**
 * Hook for managing multiple timeout-aware operations
 */

export interface UseMultiTimeoutAwareLoadingOptions {
  defaultTimeout?: number;
  onAnyTimeout?: (operationId: string) => void;
  onAllComplete?: () => void;
}

export interface UseMultiTimeoutAwareLoadingResult {
  operations: Record<string, UseTimeoutAwareLoadingResult>;

  // Aggregate state
  isAnyLoading: boolean;
  hasAnyTimeout: boolean;
  hasAnyWarning: boolean;
  overallProgress: number;

  // Actions
  startOperation: (operationId: string, options?: UseTimeoutAwareLoadingOptions) => void;
  stopOperation: (operationId: string) => void;
  retryOperation: (operationId: string) => void;
  extendOperation: (operationId: string, additionalTime: number) => void;
  resetOperation: (operationId: string) => void;

  startAll: () => void;
  stopAll: () => void;
  resetAll: () => void;
}

export function useMultiTimeoutAwareLoading(
  options: UseMultiTimeoutAwareLoadingOptions = {}
): UseMultiTimeoutAwareLoadingResult {
  const { defaultTimeout, onAnyTimeout, onAllComplete } = options;

  const [operations, setOperations] = useState<Record<string, UseTimeoutAwareLoadingResult>>({});

  const createOperation = useCallback(
    (operationId: string, operationOptions?: UseTimeoutAwareLoadingOptions) => {
      // Return configuration object instead of calling hooks
      const operationConfig = {
        timeout: defaultTimeout,
        ...operationOptions,
        onTimeout: () => {
          operationOptions?.onTimeout?.();
          onAnyTimeout?.(operationId);
        },
        onStateChange: (state: LoadingState) => {
          operationOptions?.onStateChange?.(state);

          // Check if all operations are complete
          if (state === 'success') {
            const allComplete = Object.values(operations).every(
              op => op.state === 'success' || op.state === 'timeout'
            );
            if (allComplete) {
              onAllComplete?.();
            }
          }
        },
      };

      // Store the configuration instead of the hook result
      setOperations(prev => ({ ...prev, [operationId]: operationConfig as any }));
      return operationConfig as any;
    },
    [defaultTimeout, onAnyTimeout, onAllComplete, operations]
  );

  const startOperation = useCallback(
    (operationId: string, operationOptions?: UseTimeoutAwareLoadingOptions) => {
      const operation = operations[operationId] || createOperation(operationId, operationOptions);
      operation.start(operationOptions?.timeout);
    },
    [operations, createOperation]
  );

  const stopOperation = useCallback(
    (operationId: string) => {
      operations[operationId]?.stop();
    },
    [operations]
  );

  const retryOperation = useCallback(
    (operationId: string) => {
      operations[operationId]?.retry();
    },
    [operations]
  );

  const extendOperation = useCallback(
    (operationId: string, additionalTime: number) => {
      operations[operationId]?.extendTimeout(additionalTime);
    },
    [operations]
  );

  const resetOperation = useCallback(
    (operationId: string) => {
      operations[operationId]?.reset();
    },
    [operations]
  );

  const startAll = useCallback(() => {
    Object.values(operations).forEach(op => op.start());
  }, [operations]);

  const stopAll = useCallback(() => {
    Object.values(operations).forEach(op => op.stop());
  }, [operations]);

  const resetAll = useCallback(() => {
    Object.values(operations).forEach(op => op.reset());
  }, [operations]);

  const operationValues = Object.values(operations);
  const isAnyLoading = operationValues.some(op => op.isLoading);
  const hasAnyTimeout = operationValues.some(op => op.isTimeout);
  const hasAnyWarning = operationValues.some(op => op.isWarning);

  const overallProgress =
    operationValues.length > 0
      ? operationValues.reduce((sum, op) => {
          if (op.state === 'success') return sum + 100;
          if (op.state === 'timeout' || op.state === 'error') return sum + 0;
          return sum + ((op.timeoutDuration - op.remainingTime) / op.timeoutDuration) * 100;
        }, 0) / operationValues.length
      : 0;

  return {
    operations,

    isAnyLoading,
    hasAnyTimeout,
    hasAnyWarning,
    overallProgress,

    startOperation,
    stopOperation,
    retryOperation,
    extendOperation,
    resetOperation,

    startAll,
    stopAll,
    resetAll,
  };
}
