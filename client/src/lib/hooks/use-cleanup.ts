/**
 * Cleanup Hook Suite
 * Provides automatic cleanup for resources, side effects, and async operations
 * 
 * Consolidated from multiple implementations to provide comprehensive cleanup utilities:
 * - useCleanup: Basic cleanup function management
 * - useResourceCleanup: Named resource cleanup with timeout support
 * - useEventListenerCleanup: Event listener cleanup
 * - useAbortController: AbortController management for async operations
 * - useAsyncOperation: Safe async operations with automatic cancellation
 */

import { useEffect, useRef, useCallback, useState } from 'react';

import { logger } from '@client/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface CleanupFunction {
  (): void;
}

export interface CleanupOptions {
  immediate?: boolean;
  dependencies?: unknown[];
}

export interface ResourceCleanupOptions extends CleanupOptions {
  resourceName: string;
  timeout?: number;
}

export interface EventListenerCleanupOptions extends CleanupOptions {
  target?: EventTarget;
  eventType: string;
  listener: EventListener;
}

// ============================================================================
// Core Cleanup Hook
// ============================================================================

/**
 * useCleanup Hook
 * 
 * A utility hook to manage cleanup operations and prevent memory leaks.
 * Provides a centralized way to register cleanup functions that will be
 * called when the component unmounts.
 *
 * @example
 * const { addCleanup, cleanup, isMounted } = useCleanup();
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
export function useCleanup(
  cleanupFn?: CleanupFunction,
  options: CleanupOptions = {}
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
  runCleanup: () => void;
  isMounted: () => boolean;
} {
  const cleanupRef = useRef<CleanupFunction[]>([]);
  const mountedRef = useRef(false);

  // Add cleanup function
  const addCleanup = useCallback((fn: CleanupFunction) => {
    if (mountedRef.current) {
      cleanupRef.current.push(fn);
    }
  }, []);

  // Remove cleanup function
  const removeCleanup = useCallback((fn: CleanupFunction) => {
    if (mountedRef.current) {
      cleanupRef.current = cleanupRef.current.filter(cleanup => cleanup !== fn);
    }
  }, []);

  // Execute all cleanup functions
  const cleanup = useCallback(() => {
    if (mountedRef.current) {
      cleanupRef.current.forEach(fn => {
        try {
          fn();
        } catch (error) {
          logger.warn('Cleanup function failed', { error, component: 'useCleanup' });
        }
      });
      cleanupRef.current = [];
    }
  }, []);

  // Alias for consistency with other implementations
  const runCleanup = cleanup;

  // Returns whether the component is currently mounted
  const isMounted = useCallback(() => mountedRef.current, []);

  // Initial cleanup function and mount tracking
  useEffect(() => {
    mountedRef.current = true;

    if (cleanupFn && options.immediate) {
      cleanupRef.current.push(cleanupFn);
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanupFn, options.immediate, cleanup]);

  // Cleanup on dependency changes
  useEffect(() => {
    return () => {
      if (options.dependencies) {
        cleanup();
      }
    };
  }, options.dependencies || []);

  return {
    cleanup,
    addCleanup,
    removeCleanup,
    runCleanup,
    isMounted,
  };
}

// ============================================================================
// Resource Cleanup Hook
// ============================================================================

/**
 * useResourceCleanup Hook
 * 
 * Enhanced cleanup for named resources with timeout support and logging.
 * Useful for tracking cleanup of specific resources like connections,
 * subscriptions, or file handles.
 *
 * @example
 * const { cleanup, isCleaning } = useResourceCleanup(
 *   'WebSocket Connection',
 *   () => ws.close(),
 *   { timeout: 5000 }
 * );
 */
export function useResourceCleanup(
  resourceName: string,
  cleanupFn: CleanupFunction,
  options: Partial<ResourceCleanupOptions> = {}
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
  isCleaning: boolean;
  isMounted: () => boolean;
} {
  const [isCleaning, setIsCleaning] = useState(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { cleanup, addCleanup, removeCleanup, isMounted } = useCleanup(cleanupFn, options);

  const resourceCleanup = useCallback(() => {
    if (isCleaning) return;

    setIsCleaning(true);
    logger.info(`Starting cleanup for resource: ${resourceName}`, { component: 'useResourceCleanup' });

    if (options.timeout) {
      cleanupTimerRef.current = setTimeout(() => {
        logger.warn(`Resource cleanup timeout for: ${resourceName}`, { component: 'useResourceCleanup' });
        setIsCleaning(false);
      }, options.timeout);
    }

    try {
      cleanup();
      logger.info(`Successfully cleaned up resource: ${resourceName}`, { component: 'useResourceCleanup' });
    } catch (error) {
      logger.error(`Failed to cleanup resource: ${resourceName}`, { error, component: 'useResourceCleanup' });
    } finally {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      setIsCleaning(false);
    }
  }, [cleanup, resourceName, options.timeout, isCleaning]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  return {
    cleanup: resourceCleanup,
    addCleanup,
    removeCleanup,
    isCleaning,
    isMounted,
  };
}

// ============================================================================
// Event Listener Cleanup Hook
// ============================================================================

/**
 * useEventListenerCleanup Hook
 * 
 * Specialized cleanup for event listeners with automatic removal on unmount.
 *
 * @example
 * const { cleanup } = useEventListenerCleanup({
 *   target: window,
 *   eventType: 'resize',
 *   listener: handleResize,
 * });
 */
export function useEventListenerCleanup(
  options: EventListenerCleanupOptions
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
  isMounted: () => boolean;
} {
  const { target = window, eventType, listener, dependencies } = options;

  const cleanupFn = useCallback(() => {
    target.removeEventListener(eventType, listener);
  }, [target, eventType, listener]);

  return useCleanup(cleanupFn, { dependencies });
}

// ============================================================================
// AbortController Hook
// ============================================================================

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
    isMounted,
  };
}

// ============================================================================
// Async Operation Hook
// ============================================================================

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
    isMounted,
  };
}
