/**
 * Progressive loading hook for multi-stage operations
 * Following navigation component patterns for hook implementation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingStage, LoadingState } from '../types';
import { LoadingError, LoadingStageError } from '../errors';
import { validateLoadingStage } from '../validation';
import { calculateStageProgress, ProgressTracker } from '../utils/progress-utils';
import { createTimeoutManager } from '../utils/timeout-utils';

export interface UseProgressiveLoadingOptions {
  stages: LoadingStage[];
  autoAdvance?: boolean;
  onStageComplete?: (stageId: string, stageIndex: number) => void;
  onStageError?: (stageId: string, error: LoadingError) => void;
  onComplete?: () => void;
  onError?: (error: LoadingError) => void;
  timeout?: number;
  retryable?: boolean;
}

export interface UseProgressiveLoadingResult {
  // Current state
  currentStage: LoadingStage | null;
  currentStageIndex: number;
  progress: number;
  stageProgress: number;
  state: LoadingState;
  error: LoadingError | null;
  
  // Stage information
  stages: LoadingStage[];
  completedStages: string[];
  failedStages: string[];
  skippedStages: string[];
  
  // Actions
  start: () => void;
  nextStage: () => void;
  previousStage: () => void;
  goToStage: (stageIndex: number) => void;
  setStageProgress: (progress: number) => void;
  completeCurrentStage: () => void;
  failCurrentStage: (error: Error | string) => void;
  skipCurrentStage: (reason?: string) => void;
  retryCurrentStage: () => void;
  reset: () => void;
  
  // Utilities
  canGoNext: boolean;
  canGoPrevious: boolean;
  canRetry: boolean;
  canSkip: boolean;
  isComplete: boolean;
  isFirstStage: boolean;
  isLastStage: boolean;
}

export function useProgressiveLoading(options: UseProgressiveLoadingOptions): UseProgressiveLoadingResult {
  const {
    stages,
    autoAdvance = true,
    onStageComplete,
    onStageError,
    onComplete,
    onError,
    timeout,
    retryable = true,
  } = options;

  const [currentStageIndex, setCurrentStageIndex] = useState(-1); // -1 means not started
  const [stageProgress, setStageProgressState] = useState(0);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState<LoadingError | null>(null);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [failedStages, setFailedStages] = useState<string[]>([]);
  const [skippedStages, setSkippedStages] = useState<string[]>([]);

  const progressTrackerRef = useRef<ProgressTracker>();
  const timeoutManagerRef = useRef<any>();

  // Initialize progress tracker
  useEffect(() => {
    progressTrackerRef.current = new ProgressTracker(stages);
  }, [stages]);

  // Validate stages
  useEffect(() => {
    try {
      stages.forEach(stage => validateLoadingStage(stage));
    } catch (err) {
      const validationError = err instanceof LoadingError ? err : new LoadingStageError(
        'unknown',
        'Stage validation',
        err instanceof Error ? err.message : 'Invalid stage configuration'
      );
      setError(validationError);
      onError?.(validationError);
    }
  }, [stages, onError]);

  // Setup timeout for current stage
  useEffect(() => {
    if (currentStageIndex >= 0 && currentStageIndex < stages.length) {
      const currentStage = stages[currentStageIndex];
      const stageTimeout = currentStage.duration || timeout;

      if (stageTimeout && timeoutManagerRef.current) {
        timeoutManagerRef.current.stop();
      }

      if (stageTimeout) {
        timeoutManagerRef.current = createTimeoutManager({
          timeout: stageTimeout,
          onTimeout: () => {
            const timeoutError = new LoadingStageError(
              currentStage.id,
              currentStage.message,
              `Stage timed out after ${stageTimeout}ms`
            );
            failCurrentStage(timeoutError);
          },
        });
        timeoutManagerRef.current.start();
      }
    }

    return () => {
      if (timeoutManagerRef.current) {
        timeoutManagerRef.current.stop();
      }
    };
  }, [currentStageIndex, stages, timeout]);

  const currentStage = currentStageIndex >= 0 && currentStageIndex < stages.length ? 
    stages[currentStageIndex] : null;

  const progress = progressTrackerRef.current ? 
    calculateStageProgress(stages, currentStageIndex, stageProgress) : 0;

  const start = useCallback(() => {
    if (stages.length === 0) {
      setState('success');
      onComplete?.();
      return;
    }

    setCurrentStageIndex(0);
    setStageProgressState(0);
    setState('loading');
    setError(null);
    setCompletedStages([]);
    setFailedStages([]);
    setSkippedStages([]);

    progressTrackerRef.current?.reset();
  }, [stages.length, onComplete]);

  const nextStage = useCallback(() => {
    if (currentStageIndex < stages.length - 1) {
      setCurrentStageIndex(prev => prev + 1);
      setStageProgressState(0);
      progressTrackerRef.current?.nextStage();
    } else {
      // All stages completed
      setState('success');
      onComplete?.();
    }
  }, [currentStageIndex, stages.length, onComplete]);

  const previousStage = useCallback(() => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(prev => prev - 1);
      setStageProgressState(0);
      
      // Remove from completed/failed/skipped if going back
      if (currentStage) {
        setCompletedStages(prev => prev.filter(id => id !== currentStage.id));
        setFailedStages(prev => prev.filter(id => id !== currentStage.id));
        setSkippedStages(prev => prev.filter(id => id !== currentStage.id));
      }
    }
  }, [currentStageIndex, currentStage]);

  const goToStage = useCallback((stageIndex: number) => {
    if (stageIndex >= 0 && stageIndex < stages.length) {
      setCurrentStageIndex(stageIndex);
      setStageProgressState(0);
      setState('loading');
      setError(null);
    }
  }, [stages.length]);

  const setStageProgress = useCallback((progress: number) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    setStageProgressState(clampedProgress);
    progressTrackerRef.current?.setStageProgress(clampedProgress);

    if (autoAdvance && clampedProgress >= 100 && currentStage) {
      completeCurrentStage();
    }
  }, [autoAdvance, currentStage]);

  const completeCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setCompletedStages(prev => [...prev, currentStage.id]);
    onStageComplete?.(currentStage.id, currentStageIndex);

    if (currentStageIndex < stages.length - 1) {
      nextStage();
    } else {
      setState('success');
      onComplete?.();
    }
  }, [currentStage, currentStageIndex, stages.length, onStageComplete, nextStage, onComplete]);

  const failCurrentStage = useCallback((errorInput: Error | string) => {
    if (!currentStage) return;

    const stageError = errorInput instanceof LoadingError ? errorInput : new LoadingStageError(
      currentStage.id,
      currentStage.message,
      typeof errorInput === 'string' ? errorInput : errorInput.message
    );

    setFailedStages(prev => [...prev, currentStage.id]);
    setError(stageError);
    setState('error');
    onStageError?.(currentStage.id, stageError);
    onError?.(stageError);
  }, [currentStage, onStageError, onError]);

  const skipCurrentStage = useCallback((reason?: string) => {
    if (!currentStage) return;

    setSkippedStages(prev => [...prev, currentStage.id]);
    
    if (currentStageIndex < stages.length - 1) {
      nextStage();
    } else {
      setState('success');
      onComplete?.();
    }
  }, [currentStage, currentStageIndex, stages.length, nextStage, onComplete]);

  const retryCurrentStage = useCallback(() => {
    if (!currentStage) return;

    setStageProgressState(0);
    setState('loading');
    setError(null);
    
    // Remove from failed stages
    setFailedStages(prev => prev.filter(id => id !== currentStage.id));
    
    progressTrackerRef.current?.setStageProgress(0);
  }, [currentStage]);

  const reset = useCallback(() => {
    setCurrentStageIndex(-1);
    setStageProgressState(0);
    setState('loading');
    setError(null);
    setCompletedStages([]);
    setFailedStages([]);
    setSkippedStages([]);
    progressTrackerRef.current?.reset();
    
    if (timeoutManagerRef.current) {
      timeoutManagerRef.current.stop();
    }
  }, []);

  const canGoNext = currentStageIndex < stages.length - 1;
  const canGoPrevious = currentStageIndex > 0;
  const canRetry = retryable && state === 'error' && currentStage?.retryable !== false;
  const canSkip = currentStage?.retryable !== false; // If not explicitly non-retryable, assume skippable
  const isComplete = state === 'success';
  const isFirstStage = currentStageIndex === 0;
  const isLastStage = currentStageIndex === stages.length - 1;

  return {
    currentStage,
    currentStageIndex,
    progress,
    stageProgress,
    state,
    error,
    
    stages,
    completedStages,
    failedStages,
    skippedStages,
    
    start,
    nextStage,
    previousStage,
    goToStage,
    setStageProgress,
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
 * Hook for managing multiple progressive loading operations
 */

export interface UseMultiProgressiveLoadingOptions {
  operations: Record<string, UseProgressiveLoadingOptions>;
  onAllComplete?: () => void;
  onAnyError?: (operationId: string, error: LoadingError) => void;
}

export interface UseMultiProgressiveLoadingResult {
  operations: Record<string, UseProgressiveLoadingResult>;
  overallProgress: number;
  isAnyLoading: boolean;
  isAllComplete: boolean;
  hasAnyError: boolean;
  
  startAll: () => void;
  resetAll: () => void;
  startOperation: (operationId: string) => void;
  resetOperation: (operationId: string) => void;
}

export function useMultiProgressiveLoading(
  options: UseMultiProgressiveLoadingOptions
): UseMultiProgressiveLoadingResult {
  const { operations: operationConfigs, onAllComplete, onAnyError } = options;
  
  const operations: Record<string, UseProgressiveLoadingResult> = {};
  
  // Create individual progressive loading hooks
  Object.entries(operationConfigs).forEach(([operationId, config]) => {
    operations[operationId] = useProgressiveLoading({
      ...config,
      onComplete: () => {
        config.onComplete?.();
        
        // Check if all operations are complete
        const allComplete = Object.values(operations).every(op => op.isComplete);
        if (allComplete) {
          onAllComplete?.();
        }
      },
      onError: (error) => {
        config.onError?.(error);
        onAnyError?.(operationId, error);
      },
    });
  });

  const overallProgress = Object.values(operations).length > 0 ?
    Object.values(operations).reduce((sum, op) => sum + op.progress, 0) / Object.values(operations).length :
    0;

  const isAnyLoading = Object.values(operations).some(op => op.state === 'loading');
  const isAllComplete = Object.values(operations).every(op => op.isComplete);
  const hasAnyError = Object.values(operations).some(op => op.state === 'error');

  const startAll = useCallback(() => {
    Object.values(operations).forEach(op => op.start());
  }, [operations]);

  const resetAll = useCallback(() => {
    Object.values(operations).forEach(op => op.reset());
  }, [operations]);

  const startOperation = useCallback((operationId: string) => {
    operations[operationId]?.start();
  }, [operations]);

  const resetOperation = useCallback((operationId: string) => {
    operations[operationId]?.reset();
  }, [operations]);

  return {
    operations,
    overallProgress,
    isAnyLoading,
    isAllComplete,
    hasAnyError,
    
    startAll,
    resetAll,
    startOperation,
    resetOperation,
  };
}

