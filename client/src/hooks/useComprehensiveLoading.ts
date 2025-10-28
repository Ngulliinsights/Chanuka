/**
 * DEPRECATED ADAPTER: useComprehensiveLoading
 * This file provides backward compatibility for the old useComprehensiveLoading hook
 * Use useLoadingOperation from @shared/core instead
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadingOperation, useProgressiveLoading } from '../core/loading/hooks';
import { LoadingOptions, ProgressiveStage } from '../core/loading/types';

// Legacy types for backward compatibility
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

/**
 * @deprecated Use useLoadingOperation from @shared/core instead
 */
export function useComprehensiveLoading() {
  console.warn('useComprehensiveLoading is deprecated. Use useLoadingOperation from @shared/core instead.');
  
  const [operationId] = useState(() => `legacy-${Date.now()}`);
  const { execute, isLoading, error, retry, reset } = useLoadingOperation(operationId);
  const [loadingType, setLoadingType] = useState<LoadingType>('initial');
  const [progress, setProgress] = useState<number | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [stage, setStage] = useState<string | undefined>();

  const startLoading = useCallback((type: LoadingType, options: LoadingOptions = {}) => {
    setLoadingType(type);
    setProgress(0);
    setMessage(options.showTimeoutWarning ? 'Loading...' : undefined);
    setStage(undefined);
    
    // Start a dummy operation to trigger loading state
    execute(async () => {
      return new Promise(resolve => {
        // This will be resolved by stopLoading
      });
    });
  }, [execute]);

  const stopLoading = useCallback((success = true, error?: Error) => {
    if (success) {
      setProgress(100);
      setMessage('Completed successfully');
    } else {
      setMessage(error?.message || 'Loading failed');
    }
    
    // Reset after a brief delay
    setTimeout(() => {
      setProgress(undefined);
      setMessage(undefined);
      setStage(undefined);
      reset();
    }, 2000);
  }, [reset]);

  const updateProgress = useCallback((newProgress: number, newMessage?: string) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const setStageCallback = useCallback((newStage: string, newMessage?: string) => {
    setStage(newStage);
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const loadingState: LoadingState = {
    isLoading,
    loadingType,
    progress,
    message,
    error,
    hasTimedOut: error?.message.includes('timeout') || false,
    retryCount: 0, // Legacy field
    stage,
    estimatedTime: undefined, // Legacy field
  };

  return {
    loadingState,
    startLoading,
    stopLoading,
    updateProgress,
    setStage: setStageCallback,
    retry,
    reset,
  };
}

/**
 * @deprecated Use useProgressiveLoading from @shared/core instead
 */
export function useProgressiveLoading(stages: ProgressiveStage[]) {
  console.warn('useProgressiveLoading is deprecated. Use useProgressiveLoading from @shared/core instead.');
  
  return useProgressiveLoading(stages);
}

// Re-export types and hooks for backward compatibility
export type { LoadingOptions, ProgressiveStage } from '../core/loading/types';
export { useTimeoutAwareOperation } from '../core/loading/hooks';