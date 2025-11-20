/**
 * Main loading hook
 * Following navigation component patterns for hook implementation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { UseLoadingResult, LoadingOperation, LoadingConfig, LoadingStats } from '@client/types';
import { LoadingError, LoadingOperationFailedError } from '../errors';
import { createLoadingOperation, generateOperationId } from '@client/utils/loading-utils';
import { createRecoveryContext, useLoadingRecovery } from '../recovery';
import { validateLoadingOperation, safeValidateLoadingOperation } from '../validation';
import { DEFAULT_LOADING_CONFIG } from '../constants';

export interface UseLoadingOptions {
  config?: Partial<LoadingConfig>;
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (isLoading: boolean) => void;
}

export function useLoading(options: UseLoadingOptions = {}): UseLoadingResult {
  const config = { ...DEFAULT_LOADING_CONFIG, ...options.config };
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const [stats, setStats] = useState<LoadingStats>({
    loaded: 0,
    failed: 0,
    connectionType: 'fast',
    isOnline: navigator.onLine,
  });

  const recovery = useLoadingRecovery(config);
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

      if (config.validation.enabled) {
        const validation = safeValidateLoadingOperation(operation);
        if (!validation.success) {
          if (config.validation.strict) {
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
          error instanceof Error ? error.message : 'Unknown error',
          0
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
          error,
          retryCount: operation.retryCount + 1,
        };
        
        newMap.set(operationId, updatedOperation);
        updateStats();
        
        const loadingError = error instanceof LoadingError ? 
          error : 
          new LoadingOperationFailedError(operationId, error.message, operation.retryCount);
        
        options.onError?.(loadingError);
      }
      
      return newMap;
    });
  }, [options, updateStats]);

  const retryOperation = useCallback(async (operationId: string): Promise<void> => {
    const operation = operationsRef.current.get(operationId);
    if (!operation || !operation.error) return;

    const context = createRecoveryContext(
      operationId,
      operation.error instanceof LoadingError ? operation.error : new LoadingOperationFailedError(
        operationId,
        operation.error.message,
        operation.retryCount
      ),
      operation.retryCount,
      config,
      {
        isOnline: stats.isOnline,
        connectionType: stats.connectionType,
      }
    );

    const recoveryResult = await recovery.attemptRecovery(context);
    
    if (recoveryResult.success) {
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
      
      if (recoveryResult.delay) {
        await new Promise(resolve => setTimeout(resolve, recoveryResult.delay));
      }
    }
  }, [config, stats, recovery]);

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
    Array.from(operations.values()).find(op => op.error)?.error || null : 
    null;

  // Calculate overall progress
  const progress = operations.size > 0 ? {
    loaded: stats.loaded,
    total: operations.size,
    phase: hasErrors ? 'critical' as const : 'complete' as const,
  } : null;

  const canRecover = currentError instanceof LoadingError ? 
    recovery.canAttemptRecovery(currentError, 0, config.errorHandling.maxRetries) : 
    false;

  const suggestions = currentError instanceof LoadingError ? 
    recovery.getSuggestions(currentError) : 
    [];

  const recover = useCallback(async (): Promise<boolean> => {
    if (!currentError || !(currentError instanceof LoadingError)) return false;
    
    const failedOperations = Array.from(operations.values()).filter(op => op.error);
    
    for (const operation of failedOperations) {
      try {
        await retryOperation(operation.id);
      } catch {
        // Continue with other operations
      }
    }
    
    return !Array.from(operationsRef.current.values()).some(op => op.error);
  }, [currentError, operations, retryOperation]);

  return {
    isLoading,
    progress,
    error: currentError instanceof Error ? currentError : null,
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

