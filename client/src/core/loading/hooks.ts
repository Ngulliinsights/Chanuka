/**
 * Loading Hooks - Consolidated from multiple hook implementations
 * Provides simplified, type-safe loading operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoading } from './context';
import { LoadingOptions, LoadingResult, ProgressiveStage, LoadingPriority } from './types';

const DEFAULT_OPTIONS: Required<LoadingOptions> = {
  timeout: 30000,
  retryLimit: 3,
  retryDelay: 1000,
  connectionAware: true,
  showTimeoutWarning: true,
  timeoutWarningThreshold: 0.7,
  priority: 'medium',
};

/**
 * Simplified loading hook that provides a clean, predictable API
 * Consolidates functionality from useSimplifiedLoading and useComprehensiveLoading
 */
export function useLoadingOperation<T = any>(
  operationId: string,
  options: LoadingOptions = {}
): LoadingResult<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    startOperation,
    completeOperation,
    retryOperation,
    cancelOperation,
    getOperation,
  } = useLoading();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const operationRef = useRef<(() => Promise<T>) | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const operation = getOperation(operationId);
  const isLoading = !!operation;
  const estimatedTimeRemaining = operation?.estimatedTime ? operation.estimatedTime - timeElapsed : null;

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

  // Handle operation completion
  useEffect(() => {
    if (!operation) return;

    if (operation.error) {
      if (operation.error.message.includes('timed out')) {
        setIsTimeout(true);
      }
      setError(operation.error);
    }
  }, [operation]);

  const execute = useCallback(async (operationFn: () => Promise<T>): Promise<T | null> => {
    try {
      setError(null);
      setIsTimeout(false);
      setRetryCount(0);
      operationRef.current = operationFn;

      startOperation({
        id: operationId,
        type: 'api',
        message: 'Loading...',
        priority: mergedOptions.priority,
        timeout: mergedOptions.timeout,
        maxRetries: mergedOptions.retryLimit,
        connectionAware: mergedOptions.connectionAware,
      });

      const result = await operationFn();
      setData(result);
      completeOperation(operationId, true);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      completeOperation(operationId, false, error);
      return null;
    }
  }, [operationId, mergedOptions, startOperation, completeOperation]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!operationRef.current || retryCount >= mergedOptions.retryLimit) {
      return null;
    }

    setRetryCount(prev => prev + 1);
    setError(null);
    setIsTimeout(false);

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
    setError(null);
    setIsTimeout(false);
  }, [operationId, cancelOperation]);

  const reset = useCallback(() => {
    cancelOperation(operationId);
    setData(null);
    setError(null);
    setIsTimeout(false);
    setRetryCount(0);
    setTimeElapsed(0);
    operationRef.current = null;
  }, [operationId, cancelOperation]);

  return {
    data,
    error,
    isLoading,
    isTimeout,
    retryCount,
    timeElapsed,
    estimatedTimeRemaining,
    execute,
    retry,
    cancel,
    reset,
  };
}

/**
 * Hook for page-level loading with automatic cleanup
 */
export function usePageLoading(pageId: string, options: LoadingOptions = {}) {
  const { startPageLoading, completePageLoading } = useLoading();

  const startLoading = useCallback((message?: string) => {
    startPageLoading(pageId, message);
  }, [pageId, startPageLoading]);

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
export function useComponentLoading(componentId: string, options: LoadingOptions = {}) {
  const { startComponentLoading, completeComponentLoading, updateOperation } = useLoading();

  const startLoading = useCallback((message?: string, priority?: LoadingPriority) => {
    startComponentLoading(componentId, message, priority);
  }, [componentId, startComponentLoading]);

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
 * Hook for progressive loading with stages
 */
export function useProgressiveLoading(stages: ProgressiveStage[]) {
  const { startOperation, updateOperation, completeOperation } = useLoading();
  const [currentStage, setCurrentStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const start = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setCurrentStage(0);

    const totalTimeout = stages.reduce((sum, stage) => sum + (stage.duration || 5000), 0);

    startOperation({
      id: 'progressive-loading',
      type: 'progressive',
      message: stages[0]?.message || 'Loading...',
      priority: 'high',
      timeout: totalTimeout,
      maxRetries: 1,
      connectionAware: true,
    });
  }, [stages, startOperation]);

  const nextStage = useCallback(() => {
    const nextIndex = currentStage + 1;
    if (nextIndex < stages.length && stages[nextIndex]) {
      setCurrentStage(nextIndex);
      updateOperation('progressive-loading', {
        message: stages[nextIndex].message,
        stage: stages[nextIndex].id,
      });
    } else {
      setIsLoading(false);
      completeOperation('progressive-loading', true);
    }
  }, [currentStage, stages, updateOperation, completeOperation]);

  const fail = useCallback((error: Error) => {
    setError(error);
    setIsLoading(false);
    completeOperation('progressive-loading', false, error);
  }, [completeOperation]);

  return {
    start,
    nextStage,
    fail,
    isLoading,
    error,
    currentStage,
    currentStageData: stages[currentStage],
    progress: stages.length > 0 ? ((currentStage + 1) / stages.length) * 100 : 0,
  };
}

/**
 * Timeout-aware operation hook for handling async operations with time limits
 * Consolidated from useTimeoutAwareOperation
 */
export function useTimeoutAwareOperation<T>(
  operation: () => Promise<T>,
  timeout = 30000
) {
  const mountedRef = useRef(true);
  const operationIdRef = useRef(0);
  
  const [state, setState] = useState({
    isLoading: false,
    data: null as T | null,
    error: null as Error | null,
    hasTimedOut: false,
    timeElapsed: 0,
  });

  const timersRef = useRef<{
    timeout?: NodeJS.Timeout;
    interval?: NodeJS.Timeout;
  }>({});
  const startTimeRef = useRef<number>();

  const execute = useCallback(async () => {
    if (!mountedRef.current) return;
    
    const currentOperationId = ++operationIdRef.current;
    
    // Clear all existing timers
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    timersRef.current = {};

    setState({
      isLoading: true,
      data: null,
      error: null,
      hasTimedOut: false,
      timeElapsed: 0,
    });

    startTimeRef.current = Date.now();

    // Track elapsed time every second
    timersRef.current.interval = setInterval(() => {
      if (!startTimeRef.current || !mountedRef.current) return;
      if (operationIdRef.current !== currentOperationId) return;
      
      setState(prev => ({
        ...prev,
        timeElapsed: Date.now() - startTimeRef.current!,
      }));
    }, 1000);

    // Set timeout handler
    timersRef.current.timeout = setTimeout(() => {
      if (!mountedRef.current || operationIdRef.current !== currentOperationId) return;

      if (timersRef.current.interval) {
        clearInterval(timersRef.current.interval);
      }

      setState({
        isLoading: false,
        data: null,
        hasTimedOut: true,
        error: new Error('Operation timed out'),
        timeElapsed: timeout,
      });
    }, timeout);

    try {
      const result = await operation();

      if (mountedRef.current && operationIdRef.current === currentOperationId) {
        Object.values(timersRef.current).forEach(timer => {
          if (timer) clearTimeout(timer);
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          data: result,
          error: null,
        }));
      }

      return result;
    } catch (error) {
      if (mountedRef.current && operationIdRef.current === currentOperationId) {
        Object.values(timersRef.current).forEach(timer => {
          if (timer) clearTimeout(timer);
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }

      throw error;
    }
  }, [operation, timeout]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return { ...state, execute };
}

