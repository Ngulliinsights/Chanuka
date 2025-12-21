/**
 * Main loading hook
 * Following navigation component patterns for hook implementation
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { DEFAULT_LOADING_CONFIG } from '../constants';
import { LoadingError, LoadingOperationFailedError } from '../errors';
import { useLoadingRecovery, createRecoveryContext } from '../recovery';
import { LoadingOperation, LoadingConfig, LoadingType } from '../types';
import { createLoadingOperation } from '../utils/loading-utils';
import { safeValidateLoadingOperation } from '../validation';

/**
 * Statistics about loading operations
 */
export interface LoadingStats {
  loaded: number;
  failed: number;
  connectionType: 'fast' | 'slow' | 'offline';
  isOnline: boolean;
}

/**
 * Progress information for loading operations
 */
export interface LoadingProgress {
  loaded: number;
  total: number;
  phase: 'complete' | 'critical';
}

/**
 * Result type returned by the useLoading hook
 */
export interface LoadingResult {
  isLoading: boolean;
  progress: LoadingProgress | null;
  error: Error | null;
  stats: LoadingStats;
  actions: {
    start: (operationData: Partial<LoadingOperation>) => string;
    complete: (operationId: string) => void;
    fail: (operationId: string, error: Error) => void;
    retry: (operationId: string) => Promise<void>;
    cancel: (operationId: string) => void;
    reset: () => void;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}

/**
 * Configuration options for the useLoading hook
 */
export interface UseLoadingOptions {
  config?: Partial<LoadingConfig>;
  onError?: (error: LoadingError) => void;
  onSuccess?: () => void;
  onStateChange?: (isLoading: boolean) => void;
}

/**
 * Enhanced loading hook with comprehensive error handling and recovery
 * 
 * This hook manages multiple concurrent loading operations with built-in
 * retry logic, progress tracking, and error recovery capabilities. It provides
 * a unified interface for handling all loading states in your application,
 * from simple component loads to complex multi-step operations.
 * 
 * The hook automatically tracks network status, manages operation life cycles,
 * and provides recovery mechanisms for failed operations. It's designed to
 * work seamlessly with your existing error handling infrastructure while
 * providing sensible defaults for common scenarios.
 * 
 * @param options - Configuration options for the loading behavior
 * @returns LoadingResult object with state and control methods
 * 
 * @example
 * ```tsx
 * const { isLoading, actions } = useLoading({
 *   onError: (error) => console.error('Loading failed:', error),
 *   onSuccess: () => console.log('All operations complete')
 * });
 * 
 * // Start a loading operation
 * const opId = actions.start({ type: 'data', description: 'Fetching user data' });
 * 
 * // Complete or fail the operation
 * try {
 *   await fetchData();
 *   actions.complete(opId);
 * } catch (error) {
 *   actions.fail(opId, error);
 * }
 * ```
 */
export function useLoading(options: UseLoadingOptions = {}): LoadingResult {
  // Memoize config to prevent unnecessary re-renders and dependency changes
  // This is crucial for performance as it prevents all callbacks from being
  // recreated on every render when the config object reference changes
  const config = useMemo(
    () => ({ ...DEFAULT_LOADING_CONFIG, ...options.config }),
    [options.config]
  );

  // Track all active loading operations in a Map for efficient lookup
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());

  // Track aggregate statistics about loading operations
  const [stats, setStats] = useState<LoadingStats>({
    loaded: 0,
    failed: 0,
    connectionType: 'fast',
    isOnline: navigator.onLine,
  });

  // Initialize recovery utilities for handling failed operations
  const recovery = useLoadingRecovery(config);

  // Use a ref to access the latest operations in callbacks without re-creating them
  const operationsRef = useRef(operations);
  operationsRef.current = operations;

  // Monitor online/offline status and update stats accordingly
  // This helps the recovery system make better decisions about retries
  useEffect(() => {
    const handleOnline = () =>
      setStats((prev: LoadingStats) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setStats((prev: LoadingStats) => ({
        ...prev,
        isOnline: false,
        connectionType: 'offline'
      }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Updates statistics based on current operations
   * 
   * This function recalculates the loaded and failed counts by examining
   * all current operations. It's called after any operation state change
   * to keep the statistics accurate.
   */
  const updateStats = useCallback(() => {
    const ops = Array.from(operationsRef.current.values());
    const loaded = ops.filter((op) => !op.error).length;
    const failed = ops.filter((op) => op.error).length;

    setStats((prev: LoadingStats) => ({
      ...prev,
      loaded,
      failed,
    }));
  }, []);

  // Cleanup stale operations to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      setOperations((prev) => {
        const newMap = new Map(prev);
        let hasChanges = false;
        
        for (const [id, operation] of newMap.entries()) {
          const operationAge = now - new Date(operation.startTime).getTime();
          
          // Remove operations that are too old and either completed or failed
          if (operationAge > maxAge && (operation.error || operation.progress === 100)) {
            newMap.delete(id);
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          updateStats();
        }
        
        return hasChanges ? newMap : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [updateStats]);

  // Notify parent component whenever the loading state changes
  // This allows parent components to react to loading state without polling
  useEffect(() => {
    const isLoading = operations.size > 0;
    options.onStateChange?.(isLoading);
  }, [operations.size, options]);

  /**
   * Starts a new loading operation
   * 
   * Creates a new operation with a unique ID and adds it to the tracked
   * operations. The operation can optionally be validated based on the
   * configuration settings. If validation is enabled and fails in strict
   * mode, an error will be thrown.
   * 
   * @param operationData - Partial operation data to initialize
   * @returns The unique ID of the created operation
   * @throws LoadingError if validation fails in strict mode
   */
  const startOperation = useCallback(
    (operationData: Partial<LoadingOperation>): string => {
      try {
        // Create operation with defaults for required fields
        const operation = createLoadingOperation(
          (operationData.type as LoadingType) || 'progressive',
          operationData.message || 'Loading...',
          operationData
        );

        // Validate operation and handle validation failures appropriately
        const validation = safeValidateLoadingOperation(operation);
        if (!validation.success && validation.error) {
          const validationError = new LoadingOperationFailedError(
            operation.id,
            `Validation failed: ${validation.error.message}`,
            0
          );
          
          // Always throw validation errors to prevent invalid operations
          options.onError?.(validationError);
          throw validationError;
        }

        setOperations((prev: Map<string, LoadingOperation>) =>
          new Map(prev).set(operation.id, operation)
        );
        updateStats();

        return operation.id;
      } catch (error) {
        const loadingError =
          error instanceof LoadingError
            ? error
            : new LoadingOperationFailedError(
              operationData.id || 'unknown',
              error instanceof Error ? error.message : 'Unknown error',
              0
            );

        options.onError?.(loadingError);
        throw loadingError;
      }
    },
    [options, updateStats]
  );

  /**
   * Marks an operation as successfully completed
   * 
   * Removes the operation from tracking and updates statistics. If this
   * was the last active operation, the onSuccess callback is triggered.
   * 
   * @param operationId - The ID of the operation to complete
   */
  const completeOperation = useCallback(
    (operationId: string) => {
      setOperations((prev: Map<string, LoadingOperation>) => {
        const newMap = new Map(prev);
        const operation = newMap.get(operationId);

        if (operation) {
          newMap.delete(operationId);
          updateStats();

          // Trigger success callback when all operations complete
          if (newMap.size === 0) {
            options.onSuccess?.();
          }
        }

        return newMap;
      });
    },
    [options, updateStats]
  );

  /**
   * Marks an operation as failed with an error
   * 
   * Updates the operation's error state and increments its retry count.
   * The operation remains in tracking so it can potentially be retried.
   * Triggers the onError callback with the error details.
   * 
   * @param operationId - The ID of the operation that failed
   * @param error - The error that caused the failure
   */
  const failOperation = useCallback(
    (operationId: string, error: Error) => {
      setOperations((prev: Map<string, LoadingOperation>) => {
        const newMap = new Map(prev);
        const operation = newMap.get(operationId);

        if (operation) {
          // Update operation with error information
          const updatedOperation: LoadingOperation = {
            ...operation,
            error: error.message,
            retryCount: operation.retryCount + 1,
          };

          newMap.set(operationId, updatedOperation);
          updateStats();

          // Create consistent LoadingError with proper context
          const loadingError = error instanceof LoadingError
            ? error
            : new LoadingOperationFailedError(
                operationId,
                error.message,
                operation.retryCount
              );

          // Store the actual error object for recovery purposes
          recovery.updateError(loadingError);
          options.onError?.(loadingError);
        }

        return newMap;
      });
    },
    [options, updateStats, recovery]
  );

  /**
   * Attempts to retry a failed operation
   * 
   * Creates a recovery context with the current network status and retry
   * count, then attempts recovery using the configured recovery strategy.
   * If recovery succeeds, the operation's error is cleared and it can be
   * attempted again. An optional delay may be applied before returning.
   * 
   * @param operationId - The ID of the operation to retry
   */
  const retryOperation = useCallback(
    async (operationId: string): Promise<void> => {
      const operation = operationsRef.current.get(operationId);
      if (!operation || !operation.error) return;


      // Build recovery context with all relevant information
      const context = createRecoveryContext(
        operationId,
        new LoadingError(operation.error || 'Unknown error'), // Convert string error back to LoadingError
        operation.retryCount,
        config,
        {
          isOnline: stats.isOnline,
          connectionType: stats.connectionType,
        }
      );

      const recoveryResult = await recovery.attemptRecovery(context);

      if (recoveryResult.success) {
        setOperations((prev: Map<string, LoadingOperation>) => {
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

        // Apply recovery delay if specified to prevent overwhelming the system
        if (recoveryResult.delay) {
          await new Promise((resolve) => setTimeout(resolve, recoveryResult.delay));
        }
      }
    },
    [config, stats, recovery]
  );

  /**
   * Cancels and removes an operation
   * 
   * Immediately removes the operation from tracking without triggering
   * any callbacks. Use this when you want to abandon an operation that
   * is no longer needed.
   * 
   * @param operationId - The ID of the operation to cancel
   */
  const cancelOperation = useCallback(
    (operationId: string) => {
      setOperations((prev: Map<string, LoadingOperation>) => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        updateStats();
        return newMap;
      });
    },
    [updateStats]
  );

  /**
   * Resets all operations and statistics
   * 
   * Clears all tracked operations and resets statistics to their initial
   * state. Use this when you want a clean slate, such as when navigating
   * to a new page or after completing a major workflow.
   */
  const reset = useCallback(() => {
    setOperations(new Map());
    setStats((prev: LoadingStats) => ({
      ...prev,
      loaded: 0,
      failed: 0,
    }));
  }, []);

  // Compute derived state from operations
  const isLoading = operations.size > 0;
  const hasErrors = Array.from(operations.values()).some((op) => op.error);
  const currentError = hasErrors
    ? Array.from(operations.values()).find((op) => op.error)?.error || null
    : null;

  // Calculate overall progress across all operations
  // The phase indicates whether we're in a normal completion state or
  // if there are critical errors that need attention
  const progress =
    operations.size > 0
      ? {
        loaded: stats.loaded,
        total: operations.size,
        phase: hasErrors ? ('critical' as const) : ('complete' as const),
      }
      : null;

  // Create Error object from error string for recovery checks
  const currentErrorObject = currentError ? new Error(currentError) : null;

  // Check if the current error is recoverable based on retry count and max retries
  const canRecover = currentErrorObject
    ? recovery.canAttemptRecovery(currentErrorObject as LoadingError, 0, config.maxRetries)
    : false;

  // Get user-friendly suggestions for resolving the current error
  const suggestions = currentErrorObject ? recovery.getSuggestions(currentErrorObject as LoadingError) : [];

  /**
   * Attempts to recover all failed operations
   * 
   * Iterates through all failed operations and attempts to retry each one.
   * Returns true if all operations were successfully recovered (no errors remain),
   * or false if any operations still have errors after recovery attempts.
   * 
   * This is useful for providing a "retry all" button to users when multiple
   * operations have failed.
   * 
   * @returns Promise resolving to true if all operations recovered successfully
   */
  const recover = useCallback(async (): Promise<boolean> => {
    if (!currentError) return false;

    const failedOperations = Array.from(operations.values()).filter((op) => op.error);

    // Attempt recovery for each failed operation
    for (const operation of failedOperations) {
      try {
        await retryOperation(operation.id);
      } catch {
        // Continue with other operations even if one fails
        // This ensures we attempt recovery on all failed operations
      }
    }

    // Return true if no operations have errors after recovery attempts
    return !Array.from(operationsRef.current.values()).some((op) => op.error);
  }, [currentError, operations, retryOperation]);

  return {
    isLoading,
    progress,
    error: currentErrorObject,
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