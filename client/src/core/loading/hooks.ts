/**
 * Unified Loading Hooks - Consolidated from multiple implementations
 * Provides simplified, type-safe loading operations with error integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { useLoading } from './context';
import { LoadingOptions, LoadingResult, ProgressiveLoadingResult, TimeoutAwareLoadingResult, LoadingHookOptions, LoadingState, ProgressiveStage, LoadingError, LoadingTimeoutError } from './types';

const DEFAULT_OPTIONS: LoadingOptions = {
  timeout: 30000,
  retryLimit: 3,
  retryDelay: 1000,
  retryStrategy: 'exponential',
  connectionAware: true,
  showTimeoutWarning: true,
  timeoutWarningThreshold: 0.7,
  priority: 'medium',
  type: 'api',
};

/**
 * Unified loading hook that provides a clean, predictable API
 * Consolidates functionality from multiple loading hook implementations
 */
export function useLoadingOperation<T = any>(
  operationId: string,
  options: LoadingHookOptions = {}
): LoadingResult<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    startOperation,
    completeOperation,
    retryOperation,
    cancelOperation,
    getOperation,
    updateOperation,
  } = useLoading();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const operationRef = useRef<(() => Promise<T>) | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const operation = getOperation(operationId);
  const isLoading = !!operation && !operation.cancelled && !operation.error;
  const estimatedTimeRemaining = operation?.estimatedTime ? operation.estimatedTime - timeElapsed : null;
  const progress = operation?.progress || null;

  // Update time elapsed
  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setTimeElapsed(0);

      intervalRef.current = setInterval(() => {
        setTimeElapsed(Date.now() - startTimeRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading]);

  // Handle operation completion and errors
  useEffect(() => {
    if (!operation) return;

    if (operation.error) {
      if (operation.error.message.includes('timed out')) {
        setIsTimeout(true);
      }
      setError(operation.error);
      options.onError?.(operation.error instanceof LoadingError ? operation.error :
        new LoadingError(operationId, operation.error.message, 'OPERATION_FAILED', { originalError: operation.error }));
    }

    if (operation.cancelled) {
      setIsCancelled(true);
    }
  }, [operation, operationId, options]);

  const execute = useCallback(async (operationFn: () => Promise<T>): Promise<T | null> => {
    try {
      setError(null);
      setIsTimeout(false);
      setIsCancelled(false);
      setRetryCount(0);
      operationRef.current = operationFn;

      startOperation({
        id: operationId,
        type: mergedOptions.type!,
        message: mergedOptions.message || 'Loading...',
        priority: mergedOptions.priority!,
        timeout: mergedOptions.timeout!,
        maxRetries: mergedOptions.retryLimit!,
        connectionAware: mergedOptions.connectionAware!,
        retryStrategy: mergedOptions.retryStrategy!,
        retryDelay: mergedOptions.retryDelay!,
        metadata: mergedOptions.metadata,
      });

      const result = await operationFn();
      setData(result);
      completeOperation(operationId, true);
      options.onSuccess?.();
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      completeOperation(operationId, false, error);
      return null;
    }
  }, [operationId, mergedOptions, startOperation, completeOperation, options]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!operationRef.current || retryCount >= (mergedOptions.retryLimit || 3)) {
      return null;
    }

    setRetryCount(prev => prev + 1);
    setError(null);
    setIsTimeout(false);
    setIsCancelled(false);

    retryOperation(operationId);

    try {
      const result = await operationRef.current();
      setData(result);
      completeOperation(operationId, true);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      completeOperation(operationId, false, error);
      return null;
    }
  }, [operationId, retryCount, mergedOptions.retryLimit, retryOperation, completeOperation]);

  const cancel = useCallback(() => {
    cancelOperation(operationId);
    setIsCancelled(true);
  }, [operationId, cancelOperation]);

  const reset = useCallback(() => {
    cancelOperation(operationId);
    setData(null);
    setError(null);
    setIsTimeout(false);
    setIsCancelled(false);
    setRetryCount(0);
    setTimeElapsed(0);
    operationRef.current = null;
  }, [operationId, cancelOperation]);

  return {
    data,
    error,
    isLoading,
    isTimeout,
    isCancelled,
    retryCount,
    timeElapsed,
    estimatedTimeRemaining,
    progress,
    execute,
    retry,
    cancel,
    reset,
  };
}

/**
 * Hook for page-level loading with automatic cleanup
 */
export function usePageLoading(pageId: string, options: LoadingHookOptions = {}) {
  const { startPageLoading, completePageLoading } = useLoading();

  const startLoading = useCallback((message?: string) => {
    startPageLoading(pageId, message, options);
  }, [pageId, startPageLoading, options]);

  const completeLoading = useCallback((success = true, error?: Error) => {
    completePageLoading(pageId, success, error);
  }, [pageId, completePageLoading]);

  return {
    startLoading,
    completeLoading,
  };
}

/**
 * Hook for component loading with progress tracking
 */
export function useComponentLoading(componentId: string, options: LoadingHookOptions = {}) {
  const { startComponentLoading, completeComponentLoading, updateOperation } = useLoading();

  const startLoading = useCallback((message?: string) => {
    startComponentLoading(componentId, message, options);
  }, [componentId, startComponentLoading, options]);

  const completeLoading = useCallback((success = true, error?: Error) => {
    completeComponentLoading(componentId, success, error);
  }, [componentId, completeComponentLoading]);

  const setProgress = useCallback((progress: number, message?: string) => {
    updateOperation(`component-${componentId}`, { progress, message });
  }, [componentId, updateOperation]);

  const setStage = useCallback((stage: string, message?: string) => {
    updateOperation(`component-${componentId}`, { stage, message });
  }, [componentId, updateOperation]);

  return {
    startLoading,
    completeLoading,
    setProgress,
    setStage,
  };
}

/**
 * Hook for API loading with automatic retry logic
 */
export function useApiLoading(apiId: string, options: LoadingHookOptions = {}) {
  const { startApiLoading, completeApiLoading, retryOperation } = useLoading();

  const startLoading = useCallback((message?: string) => {
    startApiLoading(apiId, message, options);
  }, [apiId, startApiLoading, options]);

  const completeLoading = useCallback((success = true, error?: Error) => {
    completeApiLoading(apiId, success, error);
  }, [apiId, completeApiLoading]);

  const retry = useCallback(() => {
    retryOperation(`api-${apiId}`);
  }, [apiId, retryOperation]);

  return {
    startLoading,
    completeLoading,
    retry,
  };
}

/**
 * Hook for progressive loading with stages
 */
export interface UseProgressiveLoadingOptions extends LoadingHookOptions {
  stages: ProgressiveStage[];
  autoAdvance?: boolean;
  onStageComplete?: (stageId: string, stageIndex: number) => void;
  onStageError?: (stageId: string, error: LoadingError) => void;
}

export function useProgressiveLoading(
  stages: ProgressiveStage[],
  options: LoadingHookOptions = {}
): ProgressiveLoadingResult {
  const { startOperation, updateOperation, completeOperation } = useLoading();
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<LoadingError | null>(null);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [failedStages, setFailedStages] = useState<string[]>([]);
  const [skippedStages, setSkippedStages] = useState<string[]>([]);

  const currentStage: ProgressiveStage | null = currentStageIndex >= 0 && currentStageIndex < stages.length ?
    stages[currentStageIndex] : null;

  const overallProgress = stages.length > 0 ?
    ((completedStages.length + (currentStage ? (currentStage.progress || 0) / 100 : 0)) / stages.length) * 100 : 0;

  const stageProgress = currentStage?.progress || 0;

  const start = useCallback(() => {
    if (stages.length === 0) {
      setState('success');
      options.onSuccess?.();
      return;
    }

    setCurrentStageIndex(0);
    setState('loading');
    setError(null);
    setCompletedStages([]);
    setFailedStages([]);
    setSkippedStages([]);

    const totalTimeout = stages.reduce((sum, stage) => sum + (stage.duration || 5000), 0);

    startOperation({
      id: 'progressive-loading',
      type: 'progressive',
      message: stages[0]?.message || 'Loading...',
      priority: options.priority || 'high',
      timeout: totalTimeout,
      maxRetries: options.retryLimit || 1,
      connectionAware: options.connectionAware ?? true,
      retryStrategy: options.retryStrategy || 'linear',
      retryDelay: options.retryDelay || 1000,
      metadata: options.metadata,
    });
  }, [stages, options]);

  const nextStage = useCallback(() => {
    if (currentStageIndex < stages.length - 1) {
      setCurrentStageIndex(prev => prev + 1);
      updateOperation('progressive-loading', {
        message: stages[currentStageIndex + 1]?.message || 'Loading...',
        stage: stages[currentStageIndex + 1]?.id,
      });
    } else {
      // All stages completed
      setState('success');
      completeOperation('progressive-loading', true);
      options.onSuccess?.();
    }
  }, [currentStageIndex, stages, updateOperation, completeOperation, options]);

  const completeCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setCompletedStages(prev => [...prev, currentStage.id]);
    // Note: onStageComplete not available in LoadingHookOptions

    if (currentStageIndex < stages.length - 1) {
      nextStage();
    } else {
      setState('success');
      completeOperation('progressive-loading', true);
      options.onSuccess?.();
    }
  }, [currentStage, currentStageIndex, stages.length, options, nextStage, completeOperation]);

  const failCurrentStage = useCallback((errorInput: Error | string) => {
    if (!currentStage) return;

    const stageError = errorInput instanceof LoadingError ? errorInput : new LoadingError(
      currentStage.id,
      typeof errorInput === 'string' ? errorInput : errorInput.message,
      'STAGE_FAILED',
      { stage: currentStage, stageIndex: currentStageIndex }
    );

    setFailedStages(prev => [...prev, currentStage.id]);
    setError(stageError);
    setState('error');
    completeOperation('progressive-loading', false, stageError);
    options.onError?.(stageError);
  }, [currentStage, currentStageIndex, completeOperation, options]);

  const skipCurrentStage = useCallback((reason?: string) => {
    if (!currentStage) return;

    setSkippedStages(prev => [...prev, currentStage.id]);

    if (currentStageIndex < stages.length - 1) {
      nextStage();
    } else {
      setState('success');
      completeOperation('progressive-loading', true);
      options.onSuccess?.();
    }
  }, [currentStage, currentStageIndex, stages.length, nextStage, completeOperation, options]);

  const retryCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setState('loading');
    setError(null);
    // Remove from failed stages
    setFailedStages(prev => prev.filter(id => id !== currentStage.id));
  }, [currentStage]);

  const reset = useCallback(() => {
    setCurrentStageIndex(-1);
    setState('idle');
    setError(null);
    setCompletedStages([]);
    setFailedStages([]);
    setSkippedStages([]);
  }, []);

  const canGoNext = currentStageIndex < stages.length - 1;
  const canGoPrevious = currentStageIndex > 0;
  const canRetry = state === 'error' && currentStage?.retryable !== false;
  const canSkip = currentStage?.retryable !== false;
  const isComplete = state === 'success';
  const isFirstStage = currentStageIndex === 0;
  const isLastStage = currentStageIndex === stages.length - 1;

  return {
    currentStage,
    currentStageIndex,
    progress: overallProgress,
    stageProgress,
    state,
    error,
    completedStages,
    failedStages,
    skippedStages,
    start,
    nextStage,
    previousStage: () => {}, // Not implemented for simplicity
    goToStage: () => {}, // Not implemented for simplicity
    setStageProgress: () => {}, // Not implemented for simplicity
    completeCurrentStage,
    failCurrentStage,
    skipCurrentStage,
    retryCurrentStage,
    reset,
    canGoNext,
    canGoPrevious,
    canRetry,
    canSkip,
    isComplete,
    isFirstStage,
    isLastStage,
  };
}

/**
 * Hook for timeout-aware operations
 */
export function useTimeoutAwareLoading(options: LoadingHookOptions = {}): TimeoutAwareLoadingResult {
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<LoadingError | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(options.timeout || 30000);
  const [retryCount, setRetryCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const operationIdRef = useRef<string>('');

  const start = useCallback((timeout?: number) => {
    const timeoutDuration = timeout || options.timeout || 30000;
    operationIdRef.current = `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setState('loading');
    setError(null);
    setIsWarning(false);
    setElapsedTime(0);
    setRemainingTime(timeoutDuration);

    // Start timeout
    timeoutRef.current = setTimeout(() => {
      const timeoutError = new LoadingTimeoutError(operationIdRef.current, timeoutDuration, {
        retryCount,
      });
      setError(timeoutError);
      setState('timeout');
      options.onError?.(timeoutError);
    }, timeoutDuration);

    // Update elapsed time
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsed = prev + 1000;
        const newRemaining = timeoutDuration - newElapsed;
        setRemainingTime(newRemaining);

        // Show warning if close to timeout
        if (!isWarning && newRemaining < (timeoutDuration * (options.timeoutWarningThreshold || 0.7))) {
          setIsWarning(true);
        }

        return newElapsed;
      });
    }, 1000);
  }, [options, retryCount, isWarning]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('success');
    setIsWarning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setState('idle');
    setError(null);
    setElapsedTime(0);
    setRetryCount(0);
  }, [stop]);

  const retry = useCallback(() => {
    if (retryCount >= (options.retryLimit || 3)) return;

    setRetryCount(prev => prev + 1);
    const newTimeout = (options.timeout || 30000) * Math.pow(1.5, retryCount + 1);
    start(newTimeout);
  }, [retryCount, options, start]);

  const extendTimeout = useCallback((additionalTime: number) => {
    if (state === 'loading') {
      setRemainingTime(prev => prev + additionalTime);
    }
  }, [state]);

  const withTimeout = useCallback(async <T>(asyncFn: () => Promise<T>, timeout?: number): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      start(timeout);

      Promise.race([asyncFn(), new Promise<never>((_, rejectTimeout) => {
        setTimeout(() => {
          const timeoutError = new LoadingTimeoutError(operationIdRef.current, timeout || options.timeout || 30000, {
            retryCount,
          });
          rejectTimeout(timeoutError);
        }, timeout || options.timeout || 30000);
      })])
        .then((result) => {
          stop();
          resolve(result);
        })
        .catch((error) => {
          setError(error instanceof LoadingError ? error : new LoadingError(
            operationIdRef.current,
            error.message,
            'OPERATION_FAILED',
            { originalError: error }
          ));
          reject(error);
        });
    });
  }, [start, stop, options, retryCount]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const elapsedTimeFormatted = formatTime(elapsedTime);
  const remainingTimeFormatted = formatTime(Math.max(0, remainingTime));
  const canRetry = state === 'timeout' && retryCount < (options.retryLimit || 3);

  return {
    state,
    isLoading: state === 'loading',
    isTimeout: state === 'timeout',
    isWarning,
    error,
    elapsedTime,
    remainingTime,
    timeoutDuration: options.timeout || 30000,
    warningThreshold: (options.timeout || 30000) * (options.timeoutWarningThreshold || 0.7),
    elapsedTimeFormatted,
    remainingTimeFormatted,
    retryCount,
    maxRetries: options.retryLimit || 3,
    canRetry,
    start,
    stop,
    reset,
    retry,
    extendTimeout,
    withTimeout,
  };
}
