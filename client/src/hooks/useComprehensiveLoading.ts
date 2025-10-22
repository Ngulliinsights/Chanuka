import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/utils/browser-logger';
import { useConnectionAware } from './useConnectionAware';
import { useOnlineStatus } from './use-online-status';

// Type definitions - more precise and maintainable
export type LoadingType = 'initial' | 'navigation' | 'component' | 'api' | 'progressive';

export interface LoadingState {
  isLoading: boolean;
  loadingType: LoadingType;
  progress?: number;
  message?: string;
  error?: Error | null;
  hasTimedOut: boolean;
  retryCount: number;
  stage?: string;
  estimatedTime?: number;
}

export interface ProgressiveStage {
  id: string;
  message: string;
  duration?: number;
}

export interface LoadingOptions {
  timeout?: number;
  retryLimit?: number;
  retryDelay?: number;
  progressiveStages?: ProgressiveStage[];
  connectionAware?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
}

// Frozen constant for immutability and optimization
const DEFAULT_OPTIONS = Object.freeze<Required<LoadingOptions>>({
  timeout: 30000,
  retryLimit: 3,
  retryDelay: 1000,
  progressiveStages: [],
  connectionAware: true,
  showTimeoutWarning: true,
  timeoutWarningThreshold: 0.7,
});

// Frozen base times - prevents accidental mutations
const BASE_LOADING_TIMES = Object.freeze({
  initial: 5000,
  navigation: 2000,
  component: 3000,
  api: 4000,
  progressive: 10000,
} as const);


// Utility function extracted for reusability
function clearTimeoutSafe(timeout: NodeJS.Timeout | undefined) {
  if (timeout) clearTimeout(timeout);
}

/**
 * Comprehensive loading hook with timeout management, retry logic, and connection awareness.
 * Optimized for minimal re-renders and efficient memory usage.
 */
export function useComprehensiveLoading() {
  // Initial state using a factory function for consistency
  const createInitialState = useCallback((): LoadingState => ({
    isLoading: false,
    loadingType: 'initial',
    hasTimedOut: false,
    retryCount: 0,
  }), []);

  const [loadingState, setLoadingState] = useState<LoadingState>(createInitialState);

  const connectionInfo = useConnectionAware();
  const isOnline = useOnlineStatus();
  
  // Optimized refs - grouped related timers together
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout | undefined>>({});
  const startTimeRef = useRef<number>();
  const optionsRef = useRef<LoadingOptions>(DEFAULT_OPTIONS);
  const retryCallbackRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Efficient cleanup using Object.values iteration
  const clearAllTimeouts = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(clearTimeoutSafe);
    timeoutsRef.current = {};
  }, []);

  // Single cleanup effect on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Memoized connection multiplier with explicit type narrowing
  const connectionMultiplier = useMemo(() => {
    switch (connectionInfo.connectionType) {
      case 'offline': return 3;
      case 'slow': return 2;
      default: return 1;
    }
  }, [connectionInfo.connectionType]);

  // Time calculation made simpler with memoization
  const calculateEstimatedTime = useCallback(
    (type: LoadingType): number => BASE_LOADING_TIMES[type] * connectionMultiplier,
    [connectionMultiplier]
  );

  // Connection monitoring with debouncing through dependency array
  useEffect(() => {
    if (!loadingState.isLoading || !optionsRef.current.connectionAware) return;

    if (!isOnline) {
      clearAllTimeouts();
      setLoadingState(prev => ({
        ...prev,
        error: new Error('Connection lost during loading'),
        message: 'You appear to be offline',
      }));
    } else if (connectionInfo.connectionType === 'slow' &&
               !loadingState.message?.includes('slow connection')) {
      setLoadingState(prev => ({
        ...prev,
        message: `${prev.message || 'Loading...'} (slow connection detected)`,
      }));
    }
  }, [isOnline, connectionInfo.connectionType, loadingState.isLoading, loadingState.message, clearAllTimeouts]);

  const startLoading = useCallback((
    type: LoadingType,
    options: LoadingOptions = {}
  ) => {
    if (!mountedRef.current) return;

    clearAllTimeouts();

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    optionsRef.current = mergedOptions;
    startTimeRef.current = Date.now();
    
    const estimatedTime = calculateEstimatedTime(type);

    // Optimized state update with early return for duplicate loading
    setLoadingState(prev => {
      if (prev.isLoading && prev.loadingType === type) return prev;

      return {
        isLoading: true,
        loadingType: type,
        progress: 0,
        message: undefined,
        error: null,
        hasTimedOut: false,
        retryCount: 0,
        stage: undefined,
        estimatedTime,
      };
    });

    // Setup timeout warning with early exit
    if (mergedOptions.showTimeoutWarning && mountedRef.current) {
      const warningTime = mergedOptions.timeout * mergedOptions.timeoutWarningThreshold;
      timeoutsRef.current.warning = setTimeout(() => {
        if (!mountedRef.current) return;
        setLoadingState(prev => ({
          ...prev,
          message: 'This is taking longer than expected...',
        }));
      }, warningTime);
    }

    // Main timeout with proper error handling
    timeoutsRef.current.main = setTimeout(() => {
      if (!mountedRef.current) return;
      setLoadingState(prev => ({
        ...prev,
        hasTimedOut: true,
        error: new Error('Loading timeout'),
        message: 'Loading timed out. Please try again.',
      }));
    }, mergedOptions.timeout);
  }, [clearAllTimeouts, calculateEstimatedTime]);

  const stopLoading = useCallback((success = true, error?: Error) => {
    if (!mountedRef.current) return;
    
    clearAllTimeouts();

    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      error: error || null,
      progress: success ? 100 : prev.progress,
      message: success ? 'Completed successfully' : (error?.message || 'Loading failed'),
    }));

    // Auto-clear success message with proper cleanup
    if (success && mountedRef.current) {
      timeoutsRef.current.cleanup = setTimeout(() => {
        if (!mountedRef.current) return;
        setLoadingState(prev => ({
          ...prev,
          message: undefined,
          progress: undefined,
        }));
      }, 2000);
    }
  }, [clearAllTimeouts]);

  // Inline bounds checking for better performance
  const updateProgress = useCallback((progress: number, message?: string) => {
    if (!mountedRef.current) return;
    
    const clampedProgress = Math.max(0, Math.min(100, progress));
    setLoadingState(prev => ({
      ...prev,
      progress: clampedProgress,
      ...(message && { message }),
    }));
  }, []);

  const setStage = useCallback((stage: string, message?: string) => {
    if (!mountedRef.current) return;
    
    setLoadingState(prev => ({
      ...prev,
      stage,
      ...(message && { message }),
    }));
  }, []);

  const retry = useCallback(() => {
    if (!mountedRef.current) return;

    clearAllTimeouts();

    const { retryLimit = DEFAULT_OPTIONS.retryLimit, retryDelay = DEFAULT_OPTIONS.retryDelay } = optionsRef.current;
    const currentRetryCount = loadingState.retryCount;

    if (currentRetryCount >= retryLimit) {
      setLoadingState(prev => ({
        ...prev,
        error: new Error('Maximum retry attempts reached'),
        message: 'Failed after multiple attempts. Please refresh the page.',
      }));
      return;
    }

    // Exponential backoff with bit shifting for performance
    const delay = retryDelay * (1 << currentRetryCount);

    setLoadingState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      error: null,
      hasTimedOut: false,
      message: `Retrying in ${Math.ceil(delay / 1000)} seconds...`,
    }));

    timeoutsRef.current.retry = setTimeout(() => {
      if (!mountedRef.current) return;

      if (retryCallbackRef.current) {
        retryCallbackRef.current();
      } else {
        startLoading(loadingState.loadingType, optionsRef.current);
      }
    }, delay);
  }, [clearAllTimeouts, loadingState.retryCount, loadingState.loadingType, startLoading]);

  const reset = useCallback(() => {
    clearAllTimeouts();
    retryCallbackRef.current = null;
    setLoadingState(createInitialState());
  }, [clearAllTimeouts, createInitialState]);

  return {
    loadingState,
    startLoading,
    stopLoading,
    updateProgress,
    setStage,
    retry,
    reset,
    isConnectionAware: optionsRef.current.connectionAware ?? true,
    connectionInfo,
  };
}

/**
 * Progressive loading hook for multi-stage operations.
 * Optimized with Set operations and memoized calculations.
 */
export function useProgressiveLoading(stages: ProgressiveStage[]) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<string>>(() => new Set());
  const [failedStages, setFailedStages] = useState<Set<string>>(() => new Set());
  
  const { 
    loadingState, 
    startLoading, 
    stopLoading, 
    updateProgress, 
    setStage 
  } = useComprehensiveLoading();

  // Memoize current stage to prevent unnecessary recalculations
  const currentStage = useMemo(() => 
    stages[currentStageIndex] || null, 
    [stages, currentStageIndex]
  );
  
  // Calculate total timeout once
  const totalTimeout = useMemo(
    () => stages.reduce((sum, stage) => sum + (stage.duration || 3000), 0),
    [stages]
  );

  const startProgressiveLoading = useCallback(() => {
    setCurrentStageIndex(0);
    setCompletedStages(new Set());
    setFailedStages(new Set());
    
    startLoading('progressive', {
      progressiveStages: stages,
      timeout: totalTimeout,
    });

    if (stages[0]) {
      setStage(stages[0].id, stages[0].message);
    }
  }, [stages, totalTimeout, startLoading, setStage]);

  const completeCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setCompletedStages(prev => new Set([...prev, currentStage.id]));
    
    const progress = ((currentStageIndex + 1) / stages.length) * 100;
    updateProgress(progress);

    const nextIndex = currentStageIndex + 1;
    if (nextIndex < stages.length) {
      setCurrentStageIndex(nextIndex);
      setStage(stages[nextIndex].id, stages[nextIndex].message);
    } else {
      stopLoading(true);
    }
  }, [currentStage, currentStageIndex, stages, updateProgress, setStage, stopLoading]);

  const failCurrentStage = useCallback((error: Error) => {
    if (!currentStage) return;

    setFailedStages(prev => new Set([...prev, currentStage.id]));
    stopLoading(false, error);
  }, [currentStage, stopLoading]);

  const retryCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setFailedStages(prev => {
      const newSet = new Set(prev);
      newSet.delete(currentStage.id);
      return newSet;
    });

    setStage(currentStage.id, `Retrying: ${currentStage.message}`);
  }, [currentStage, setStage]);

  const skipCurrentStage = useCallback(() => {
    if (!currentStage) return;

    const progress = ((currentStageIndex + 1) / stages.length) * 100;
    updateProgress(progress);

    const nextIndex = currentStageIndex + 1;
    if (nextIndex < stages.length) {
      setCurrentStageIndex(nextIndex);
      setStage(stages[nextIndex].id, stages[nextIndex].message);
    } else {
      stopLoading(true);
    }
  }, [currentStage, currentStageIndex, stages, updateProgress, setStage, stopLoading]);

  const progress = useMemo(
    () => stages.length > 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0,
    [currentStageIndex, stages.length]
  );

  return {
    loadingState,
    currentStageIndex,
    currentStage,
    completedStages,
    failedStages,
    startProgressiveLoading,
    completeCurrentStage,
    failCurrentStage,
    retryCurrentStage,
    skipCurrentStage,
    progress,
  };
}

/**
 * Timeout-aware operation hook for handling async operations with time limits.
 * Uses operation IDs to prevent race conditions.
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
    Object.values(timersRef.current).forEach(clearTimeoutSafe);
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

      clearTimeoutSafe(timersRef.current.interval);

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
        Object.values(timersRef.current).forEach(clearTimeoutSafe);

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
        Object.values(timersRef.current).forEach(clearTimeoutSafe);

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
      Object.values(timersRef.current).forEach(clearTimeoutSafe);
    };
  }, []);

  return { ...state, execute };
}











































