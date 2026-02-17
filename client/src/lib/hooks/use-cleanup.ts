/**
 * Cleanup Hook
 * Provides automatic cleanup for resources and side effects
 */

import { useEffect, useRef, useCallback, useState } from 'react';

import { logger } from '@client/lib/utils/logger';

export interface CleanupFunction {
  (): void;
}

export interface CleanupOptions {
  immediate?: boolean;
  dependencies?: unknown[];
}

export function useCleanup(
  cleanupFn: CleanupFunction,
  options: CleanupOptions = {}
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
} {
  const cleanupRef = useRef<CleanupFunction[]>([]);
  const mountedRef = useRef(true);

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

  // Initial cleanup function
  useEffect(() => {
    if (options.immediate) {
      cleanupRef.current.push(cleanupFn);
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanupFn, options.immediate]);

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
  };
}

export interface ResourceCleanupOptions extends CleanupOptions {
  resourceName: string;
  timeout?: number;
}

export function useResourceCleanup(
  resourceName: string,
  cleanupFn: CleanupFunction,
  options: Partial<ResourceCleanupOptions> = {}
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
  isCleaning: boolean;
} {
  const [isCleaning, setIsCleaning] = useState(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { cleanup, addCleanup, removeCleanup } = useCleanup(cleanupFn, options);

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
  };
}

export interface EventListenerCleanupOptions extends CleanupOptions {
  target?: EventTarget;
  eventType: string;
  listener: EventListener;
}

export function useEventListenerCleanup(
  options: EventListenerCleanupOptions
): {
  cleanup: () => void;
  addCleanup: (fn: CleanupFunction) => void;
  removeCleanup: (fn: CleanupFunction) => void;
} {
  const { target = window, eventType, listener, dependencies } = options;

  const cleanupFn = useCallback(() => {
    target.removeEventListener(eventType, listener);
  }, [target, eventType, listener]);

  return useCleanup(cleanupFn, { dependencies });
}
