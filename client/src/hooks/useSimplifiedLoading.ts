import { useState, useCallback, useRef, useEffect } from 'react';
import { useUnifiedLoading } from '../contexts/UnifiedLoadingContext';
import { logger } from '../utils/browser-logger';

// Simplified loading hook that consolidates all loading patterns
export interface SimplifiedLoadingOptions {
  timeout?: number;
  retryLimit?: number;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
  priority?: 'high' | 'medium' | 'low';
  connectionAware?: boolean;
}

export interface LoadingResult<T = any> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isTimeout: boolean;
  retryCount: number;
  timeElapsed: number;
  estimatedTimeRemaining: number | null;
  execute: (operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<SimplifiedLoadingOptions> = {
  timeout: 30000,
  retryLimit: 3,
  showTimeoutWarning: true,
  timeoutWarningThreshold: 0.7,
  priority: 'medium',
  connectionAware: true,
};

/**
 * Simplified loading hook that provides a clean, predictable API
 * for all loading operations with built-in timeout and retry handling.
 */
export function useSimplifiedLoading<T = any>(
  operationId: string,
  options: SimplifiedLoadingOptions = {}
): LoadingResult<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    startOperation,
    completeOperation,
    retryOperation,
    cancelOperation,
    getOperation,
    state
  } = useUnifiedLoading();

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
        type: 'api', // Default type, can be overridden
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
export function usePageLoading(pageId: string, options: SimplifiedLoadingOptions = {}) {
  const loading = useSimplifiedLoading(`page-${pageId}`, {
    ...options,
    priority: 'high',
    timeout: options.timeout || 15000,
  });

  return {
    ...loading,
    startLoading: (message?: string) => {
      // Page loading is handled by the unified context
    },
    completeLoading: (success = true, error?: Error) => {
      if (success) {
        loading.reset();
      } else {
        loading.cancel();
      }
    },
  };
}

/**
 * Hook for component loading with progress tracking
 */
export function useComponentLoading(componentId: string, options: SimplifiedLoadingOptions = {}) {
  const { updateOperation } = useUnifiedLoading();
  const loading = useSimplifiedLoading(`component-${componentId}`, {
    ...options,
    priority: options.priority || 'medium',
  });

  const setProgress = useCallback((progress: number, message?: string) => {
    updateOperation(`component-${componentId}`, { progress, message });
  }, [componentId, updateOperation]);

  const setStage = useCallback((stage: string, message?: string) => {
    updateOperation(`component-${componentId}`, { stage, message });
  }, [componentId, updateOperation]);

  return {
    ...loading,
    setProgress,
    setStage,
  };
}

/**
 * Hook for asset loading with progress tracking
 */
export function useAssetLoading(assets: string[] = []) {
  const { loadAssets, state } = useUnifiedLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (assetList = assets) => {
    setIsLoading(true);
    setError(null);

    try {
      const assetConfigs = assetList.map(url => ({
        url,
        type: getAssetType(url) as any,
      }));

      await loadAssets(assetConfigs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [assets, loadAssets]);

  return {
    load,
    isLoading,
    error,
    progress: state.assetLoadingProgress,
  };
}

// Utility function to determine asset type from URL
function getAssetType(url: string): string {
  if (url.endsWith('.js') || url.includes('javascript')) return 'script';
  if (url.endsWith('.css')) return 'style';
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
  if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
  return 'critical';
}

/**
 * Hook for progressive loading with stages
 */
export function useProgressiveLoading(stages: Array<{ id: string; message: string; duration?: number }>) {
  const { startOperation, updateOperation, completeOperation } = useUnifiedLoading();
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
    if (nextIndex < stages.length) {
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