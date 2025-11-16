/**
 * useCleanup Hook
 * 
 * A utility hook to manage cleanup operations and prevent memory leaks.
 * Provides a centralized way to register cleanup functions that will be
 * called when the component unmounts.
 * 
 * @example
 * const { addCleanup, isMounted } = useCleanup();
 * 
 * useEffect(() => {
 *   const timer = setTimeout(() => {
 *     if (isMounted()) {
 *       // Safe to update state
 *     }
 *   }, 1000);
 *   
 *   addCleanup(() => clearTimeout(timer));
 * }, []);
 */

import { useEffect, useRef, useCallback } from 'react';

type CleanupFunction = () => void;

export function useCleanup() {
  // Store cleanup functions in a ref to avoid recreating the array on each render
  const cleanupFunctionsRef = useRef<CleanupFunction[]>([]);
  
  // Track mount status to prevent operations on unmounted components
  const isMountedRef = useRef(false);

  /**
   * Registers a cleanup function to be called on unmount.
   * Only adds the function if the component is currently mounted.
   */
  const addCleanup = useCallback((cleanupFn: CleanupFunction) => {
    if (isMountedRef.current) {
      cleanupFunctionsRef.current.push(cleanupFn);
    }
  }, []);

  /**
   * Removes a previously registered cleanup function.
   * Useful when you need to conditionally skip certain cleanup operations.
   */
  const removeCleanup = useCallback((cleanupFn: CleanupFunction) => {
    const index = cleanupFunctionsRef.current.indexOf(cleanupFn);
    if (index > -1) {
      cleanupFunctionsRef.current.splice(index, 1);
    }
  }, []);

  /**
   * Manually runs all cleanup functions and clears the registry.
   * This is automatically called on unmount, but can be called manually
   * if you need to reset state during the component lifecycle.
   */
  const runCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });
    cleanupFunctionsRef.current = [];
  }, []);

  /**
   * Returns whether the component is currently mounted.
   * Useful for conditionally executing code based on mount status.
   */
  const isMounted = useCallback(() => isMountedRef.current, []);

  useEffect(() => {
    // Mark component as mounted when effect runs
    isMountedRef.current = true;
    
    return () => {
      // Mark as unmounted first to prevent any new cleanup registrations
      isMountedRef.current = false;
      // Execute all registered cleanup functions
      runCleanup();
    };
  }, [runCleanup]);

  return {
    addCleanup,
    removeCleanup,
    runCleanup,
    isMounted
  };
}

/**
 * useAbortController Hook
 * 
 * A specialized hook for managing AbortController instances to cancel
 * async operations and prevent race conditions. This is particularly
 * useful for fetch requests, timers, and other async work that should
 * be cancelled when the component unmounts or when starting new operations.
 * 
 * @example
 * const { getController, abort } = useAbortController();
 * 
 * const fetchData = async () => {
 *   const controller = getController();
 *   const response = await fetch(url, { signal: controller.signal });
 *   // Process response...
 * };
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addCleanup, isMounted } = useCleanup();

  /**
   * Gets the current AbortController, creating a new one if needed.
   * Automatically registers cleanup to abort on unmount.
   */
  const getController = useCallback(() => {
    // Only create a new controller if we don't have one or if it's been aborted
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
      // Abort any existing controller before replacing it
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create fresh controller for new operations
      abortControllerRef.current = new AbortController();
      
      // Register automatic cleanup on unmount
      addCleanup(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      });
    }
    
    return abortControllerRef.current;
  }, [addCleanup]);

  /**
   * Manually aborts the current controller and clears the reference.
   * Use this to cancel ongoing operations before starting new ones.
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Checks if the current controller's signal has been aborted.
   */
  const isAborted = useCallback(() => {
    return abortControllerRef.current?.signal.aborted ?? false;
  }, []);

  return {
    getController,
    abort,
    isAborted,
    isMounted
  };
}

/**
 * useAsyncOperation Hook
 * 
 * A comprehensive hook that combines abort controller with mounted state checking
 * to safely handle async operations. This hook ensures that:
 * - Operations are cancelled when the component unmounts
 * - State updates don't happen on unmounted components
 * - Race conditions are avoided when multiple operations are triggered
 * - Errors are handled gracefully
 * 
 * @example
 * const { safeAsync, abort } = useAsyncOperation();
 * 
 * const loadData = async () => {
 *   await safeAsync(
 *     async (signal) => {
 *       const response = await fetch(url, { signal });
 *       return response.json();
 *     },
 *     (data) => setData(data),
 *     (error) => setError(error.message)
 *   );
 * };
 */
export function useAsyncOperation() {
  const { getController, abort, isAborted, isMounted } = useAbortController();

  /**
   * Wraps an async operation with safety checks and cancellation support.
   * 
   * @param operation - The async function to execute, receives an AbortSignal
   * @param onSuccess - Optional callback when operation succeeds (only called if mounted)
   * @param onError - Optional callback when operation fails (only called if mounted and not aborted)
   * @returns The result of the operation, or null if cancelled/unmounted
   */
  const safeAsync = useCallback(
    async function <T>(
      operation: (signal: AbortSignal) => Promise<T>,
      onSuccess?: (result: T) => void,
      onError?: (error: Error) => void
    ): Promise<T | null> {
      try {
        const controller = getController();
        const result = await operation(controller.signal);

        // Only process result if component is still mounted and operation wasn't cancelled
        if (isMounted() && !isAborted()) {
          onSuccess?.(result);
          return result;
        }

        return null;
      } catch (error) {
        // Silently ignore errors from cancelled requests or unmounted components
        if (isAborted() || !isMounted()) {
          return null;
        }

        // Silently ignore AbortErrors as they're expected when cancelling
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }

        // Only call error handler if component is still mounted
        if (isMounted()) {
          onError?.(error instanceof Error ? error : new Error('Unknown error'));
        }
        
        // Re-throw so calling code can also handle the error if needed
        throw error;
      }
    },
    [getController, isAborted, isMounted]
  );

  return {
    safeAsync,
    abort,
    isAborted,
    isMounted
  };
}