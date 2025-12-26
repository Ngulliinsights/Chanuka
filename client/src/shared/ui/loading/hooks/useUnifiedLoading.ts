import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { DEFAULT_LOADING_CONFIG } from '../constants';
import { 
  LoadingError, 
  LoadingOperationFailedError,
  LoadingTimeoutError 
} from '../errors';
import { 
  LoadingOperation, 
  LoadingConfig, 
  LoadingStats, 
  UseLoadingResult
} from '../types';
import { 
  createLoadingOperation, 
  hasOperationTimedOut,
  canRetryOperation,
  calculateRetryDelay 
} from '../utils/loading-utils';
import { safeValidateLoadingOperation } from '../validation';

export interface UseUnifiedLoadingOptions {
  config?: Partial<LoadingConfig>;
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (isLoading: boolean) => void;
}

export function useUnifiedLoading(options: UseUnifiedLoadingOptions = {}): UseLoadingResult {
  // Memoize config to prevent recreation on every render
  const config = useMemo(
    () => ({ ...DEFAULT_LOADING_CONFIG, ...options.config }),
    [options.config]
  );

  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const [stats, setStats] = useState<LoadingStats>({
    loaded: 0,
    failed: 0,
    connectionType: 'fast',
    isOnline: navigator.onLine,
  });

  const operationsRef = useRef(operations);
  operationsRef.current = operations;

  // Update online status
  useEffect(() => {
    const handleOnline = () => setStats(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStats(prev => ({ ...prev, isOnline: false, connectionType: 'offline' }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for timeouts
  useEffect(() => {
    const interval = setInterval(() => {
      const timedOutOperations: string[] = [];

      operationsRef.current.forEach((operation, id) => {
        if (hasOperationTimedOut(operation) && !operation.error) {
          timedOutOperations.push(id);
        }
      });

      if (timedOutOperations.length > 0) {
        setOperations(prev => {
          const newMap = new Map(prev);
          timedOutOperations.forEach(id => {
            const operation = newMap.get(id);
            if (operation) {
              const timeoutError = new LoadingTimeoutError(
                id,
                operation.timeout || 30000
              );
              newMap.set(id, { ...operation, error: timeoutError.message });
            }
          });
          return newMap;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Notify state changes
  useEffect(() => {
    const isLoading = operations.size > 0;
    options.onStateChange?.(isLoading);
  }, [operations.size, options]);

  const updateStats = useCallback(() => {
    const ops = Array.from(operationsRef.current.values());
    const loaded = ops.filter(op => !op.error).length;
    const failed = ops.filter(op => op.error).length;

    setStats(prev => ({
      ...prev,
      loaded,
      failed,
    }));
  }, []);

  const startOperation = useCallback((
    operationData: Partial<LoadingOperation>
  ): string => {
    try {
      const operation = createLoadingOperation(
        operationData.type || 'component',
        operationData.message || 'Loading...',
        operationData
      );

      if (config.validation?.enabled) {
        const validation = safeValidateLoadingOperation(operation);
        if (!validation.success) {
          if (config.validation?.strict) {
            throw validation.error;
          } else {
            console.warn('Loading operation validation warning:', validation.error?.message);
          }
        }
      }

      setOperations(prev => new Map(prev).set(operation.id, operation));
      updateStats();

      return operation.id;
    } catch (error) {
      const loadingError = error instanceof LoadingError ? 
        error : 
        new LoadingOperationFailedError(
          operationData.id || 'unknown',
          error instanceof Error ? error.message : 'Unknown error'
        );
      
      options.onError?.(loadingError);
      throw loadingError;
    }
  }, [config, options, updateStats]);

  const completeOperation = useCallback((operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const operation = newMap.get(operationId);
      
      if (operation) {
        newMap.delete(operationId);
        updateStats();
        
        if (newMap.size === 0) {
          options.onSuccess?.();
        }
      }
      
      return newMap;
    });
  }, [options, updateStats]);

  const failOperation = useCallback((operationId: string, error: Error) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const operation = newMap.get(operationId);
      
      if (operation) {
        const updatedOperation = {
          ...operation,
          error: error.message, // Store as string to match LoadingOperation type
          retryCount: operation.retryCount + 1,
        };
        
        newMap.set(operationId, updatedOperation);
        updateStats();
        
        const loadingError = error instanceof LoadingError ? 
          error : 
          new LoadingOperationFailedError(operationId, error.message);
        
        options.onError?.(loadingError);
      }
      
      return newMap;
    });
  }, [options, updateStats]);

  const retryOperation = useCallback(async (operationId: string): Promise<void> => {
    const operation = operationsRef.current.get(operationId);
    if (!operation || !operation.error || !canRetryOperation(operation)) {
      return;
    }

    const delay = calculateRetryDelay(operation.retryCount);
    
    setOperations(prev => {
      const newMap = new Map(prev);
      const op = newMap.get(operationId);
      
      if (op) {
        newMap.set(operationId, {
          ...op,
          error: undefined,
          retryCount: op.retryCount + 1,
        });
      }
      
      return newMap;
    });

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }, []);

  const cancelOperation = useCallback((operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      updateStats();
      return newMap;
    });
  }, [updateStats]);

  const reset = useCallback(() => {
    setOperations(new Map());
    setStats(prev => ({
      ...prev,
      loaded: 0,
      failed: 0,
    }));
  }, []);

  const isLoading = operations.size > 0;
  const hasErrors = Array.from(operations.values()).some(op => op.error);
  const currentError = hasErrors ? 
    new Error(Array.from(operations.values()).find(op => op.error)?.error || 'Unknown error') : 
    null;

  // Calculate overall progress
  const progress = operations.size > 0 ? {
    loaded: stats.loaded,
    total: operations.size,
    phase: hasErrors ? 'critical' as const : isLoading ? 'critical' as const : 'complete' as const,
  } : null;

  // Fix: canRecover should be boolean, not boolean | null
  const canRecover = Boolean(currentError && hasErrors);
  const suggestions = currentError ? 
    ['Try refreshing the page', 'Check your connection'] : 
    [];

  const recover = useCallback(async (): Promise<boolean> => {
    if (!hasErrors) return false;
    
    const failedOperations = Array.from(operations.values()).filter(op => op.error);
    let recoveredCount = 0;
    
    for (const operation of failedOperations) {
      try {
        await retryOperation(operation.id);
        recoveredCount++;
      } catch {
        // Continue with other operations
      }
    }
    
    return recoveredCount > 0;
  }, [hasErrors, operations, retryOperation]);

  return {
    isLoading,
    progress,
    error: currentError,
    stats,
    actions: {
      start: startOperation,
      complete: completeOperation,
      fail: failOperation,
      retry: retryOperation,
      cancel: cancelOperation,
      reset,
    },
    recovery: {
      canRecover,
      suggestions,
      recover,
    },
  };
}