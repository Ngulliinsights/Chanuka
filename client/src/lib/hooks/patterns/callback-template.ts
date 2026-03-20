/**
 * Callback Pattern Template
 *
 * Use this template for hooks that require performance optimization
 * through memoization of expensive computations or event handlers.
 *
 * Follows the pattern used in useErrorRecovery.ts
 */

import { useCallback, useMemo, useRef } from 'react';

// 1. Define Input and Output Types
export interface ExampleInput {
  data: unknown[];
  filters: Record<string, unknown>;
  options: {
    debounce?: number;
    cache?: boolean;
  };
}

export interface ExampleOutput {
  processedData: unknown[];
  totalCount: number;
  hasMore: boolean;
}

// 2. Define Dependencies Interface
export interface ExampleDependencies {
  data: unknown[];
  filters: Record<string, unknown>;
  options: ExampleInput['options'];
}

// 3. Create Expensive Computation Function
const expensiveComputation = (input: ExampleInput): ExampleOutput => {
  // Simulate expensive operation
  const startTime = performance.now();

  const processedData = input.data
    .filter(item => {
      // Apply filters
      return Object.entries(input.filters).every(([key, value]) => {
        return item[key] === value;
      });
    })
    .map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));

  const duration = performance.now() - startTime;

  if (duration > 16) {
    console.warn(`Expensive computation took ${duration.toFixed(2)}ms`);
  }

  return {
    processedData,
    totalCount: processedData.length,
    hasMore: processedData.length > 10,
  };
};

// 4. Create Hook with Memoized Callbacks
export function useExampleCallback(input: ExampleInput) {
  const { data, filters, options } = input;

  // 5. Memoize Expensive Computation
  const memoizedResult = useMemo(() => {
    return expensiveComputation(input);
  }, [data, filters, options]);

  // 6. Create Memoized Callbacks
  const handleFilterChange = useCallback((newFilters: Record<string, unknown>) => {
    // This callback is memoized and will only change if dependencies change
    return {
      ...input,
      filters: { ...filters, ...newFilters },
    };
  }, [filters, input]);

  const handleDataUpdate = useCallback((newData: unknown[]) => {
    // Memoized callback for data updates
    return {
      ...input,
      data: newData,
    };
  }, [data, input]);

  const debouncedCallback = useCallback(
    (callback: () => void, delay: number = options.debounce || 300) => {
      const timeoutRef = useRef<NodeJS.Timeout | null>(null);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(callback, delay);
      };
    },
    [options.debounce]
  );

  // 7. Create Cached Operations
  const cacheRef = useRef<Map<string, ExampleOutput>>(new Map());

  const getCachedResult = useCallback((cacheKey: string): ExampleOutput | null => {
    if (!options.cache) return null;

    return cacheRef.current.get(cacheKey) || null;
  }, [options.cache]);

  const setCachedResult = useCallback((cacheKey: string, result: ExampleOutput) => {
    if (!options.cache) return;

    cacheRef.current.set(cacheKey, result);

    // Limit cache size
    if (cacheRef.current.size > 100) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
  }, [options.cache]);

  // 8. Return Memoized Values and Callbacks
  return {
    result: memoizedResult,
    callbacks: {
      handleFilterChange,
      handleDataUpdate,
      debouncedCallback,
    },
    cache: {
      getCachedResult,
      setCachedResult,
    },
  };
}

/**
 * Advanced Callback Pattern with Dependency Tracking
 *
 * For scenarios requiring complex dependency management
 */
export function useAdvancedCallback<T, D extends readonly unknown[]>(
  callback: (...args: D) => T,
  dependencies: D,
  options: {
    debounce?: number;
    throttle?: number;
    memoize?: boolean;
  } = {}
) {
  const { debounce, throttle, memoize = true } = options;

  // Memoize the callback itself
  const memoizedCallback = useMemo(() => callback, dependencies);

  // Apply debouncing if specified
  const debouncedCallback = useMemo(() => {
    if (!debounce) return memoizedCallback;

    let timeoutId: NodeJS.Timeout;

    return (...args: D) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => memoizedCallback(...args), debounce);
    };
  }, [memoizedCallback, debounce]);

  // Apply throttling if specified
  const throttledCallback = useMemo(() => {
    if (!throttle) return memoizedCallback;

    let lastCall = 0;

    return (...args: D) => {
      const now = Date.now();
      if (now - lastCall >= throttle) {
        lastCall = now;
        return memoizedCallback(...args);
      }
    };
  }, [memoizedCallback, throttle]);

  // Return the appropriate callback based on options
  return memoize ? memoizedCallback : debounce ? debouncedCallback : throttledCallback;
}
