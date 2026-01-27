/**
 * Performance Optimization Utilities for Hooks
 * Provides utilities for memoization, debouncing, throttling, and performance monitoring
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';

// 1. Performance Monitoring Interface
export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration: number;
  memoryUsage?: number;
  renderCount: number;
}

// 2. Cache Interface
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

// 3. Performance Monitor Hook
export function usePerformanceMonitor(name: string, enabled: boolean = true) {
  const metricsRef = useRef<PerformanceMetrics>({
    name,
    startTime: 0,
    duration: 0,
    renderCount: 0,
  });

  const start = useCallback(() => {
    if (!enabled) return;

    metricsRef.current.startTime = performance.now();
    metricsRef.current.renderCount++;

    if ('memory' in performance) {
      metricsRef.current.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }, [enabled]);

  const end = useCallback(() => {
    if (!enabled || !metricsRef.current.startTime) return;

    metricsRef.current.endTime = performance.now();
    metricsRef.current.duration = metricsRef.current.endTime - metricsRef.current.startTime;

    // Log performance if it exceeds threshold
    if (metricsRef.current.duration > 16) {
      console.warn(`Performance warning: ${name} took ${metricsRef.current.duration.toFixed(2)}ms`);
    }
  }, [enabled, name]);

  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  useEffect(() => {
    start();
    return end;
  });

  return {
    start,
    end,
    getMetrics,
    renderCount: metricsRef.current.renderCount,
  };
}

// 4. Debounced Callback Hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const lastArgsRef = useRef<any[]>([]);
  const lastThisRef = useRef<any>(null);
  const resultRef = useRef<ReturnType<T>>();

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

    return (
      lastCallTimeRef.current === undefined ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const leadingEdge = useCallback((time: number) => {
    lastInvokeTimeRef.current = time;
    timeoutRef.current = setTimeout(timerExpired, delay) as any;
    return leading ? invokeFunc(time) : resultRef.current;
  }, [delay, leading]);

  const trailingEdge = useCallback((time: number) => {
    timeoutRef.current = null;

    if (trailing && lastArgsRef.current) {
      return invokeFunc(time);
    }
    lastArgsRef.current = lastThisRef.current = undefined;
    return resultRef.current;
  }, [trailing]);

  const timerExpired = useCallback(() => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const remainingWait = delay - timeSinceLastCall;
    timeoutRef.current = setTimeout(timerExpired, remainingWait) as any;
  }, [shouldInvoke, trailingEdge]);

  const invokeFunc = useCallback((time: number) => {
    const args = lastArgsRef.current;
    const thisArg = lastThisRef.current;

    lastArgsRef.current = [] as any;
    lastThisRef.current = null;
    lastInvokeTimeRef.current = time;
    resultRef.current = callback.apply(thisArg, args!);
    return resultRef.current;
  }, [callback]);

  const debounced = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgsRef.current = args;
    lastThisRef.current = null;
    lastCallTimeRef.current = time;

    if (isInvoking) {
      if (timeoutRef.current === null) {
        return leadingEdge(lastCallTimeRef.current);
      }
      if (maxWait !== undefined) {
        timeoutRef.current = setTimeout(timerExpired, delay) as any;
        return invokeFunc(lastCallTimeRef.current);
      }
    }
    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(timerExpired, delay) as any;
    }
    return resultRef.current;
  }, [shouldInvoke, leadingEdge, timerExpired, invokeFunc, delay, maxWait]) as any;

  // Cancel method
  debounced.cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current as any);
    }
    lastInvokeTimeRef.current = 0;
    lastCallTimeRef.current = 0;
    lastArgsRef.current = [];
    lastThisRef.current = null;
    timeoutRef.current = null;
  }, []);

  // Flush method
  debounced.flush = useCallback(() => {
    return timeoutRef.current === null ? resultRef.current : trailingEdge(Date.now());
  }, [trailingEdge]);

  return debounced;
}

// 5. Throttled Callback Hook
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
) {
  const { leading = true, trailing = true } = options;

  const lastCallTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<any[]>([]);
  const lastThisRef = useRef<any>(null);
  const resultRef = useRef<ReturnType<T>>();

  const throttled = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const timeSinceLastCall = time - lastCallTimeRef.current;

    lastArgsRef.current = args;
    lastThisRef.current = this;

    if (lastCallTimeRef.current === 0 && !leading) {
      lastCallTimeRef.current = time;
    }

    if (timeSinceLastCall >= delay) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastCallTimeRef.current = time;
      resultRef.current = callback.apply(lastThisRef.current, lastArgsRef.current);
      lastArgsRef.current = lastThisRef.current = undefined;
    } else if (!timeoutRef.current && trailing) {
      timeoutRef.current = setTimeout(() => {
        lastCallTimeRef.current = leading ? Date.now() : 0;
        timeoutRef.current = null;
        resultRef.current = callback.apply(lastThisRef.current, lastArgsRef.current);
        lastArgsRef.current = lastThisRef.current = undefined;
      }, delay - timeSinceLastCall);
    }

    return resultRef.current;
  }, [callback, delay, leading, trailing]);

  // Cancel method
  throttled.cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }
    lastCallTimeRef.current = 0;
    lastArgsRef.current = lastThisRef.current = timeoutRef.current = undefined;
  }, []);

  // Flush method
  throttled.flush = useCallback(() => {
    if (timeoutRef.current === undefined) {
      return resultRef.current;
    }
    resultRef.current = callback.apply(lastThisRef.current, lastArgsRef.current);
    lastCallTimeRef.current = 0;
    lastArgsRef.current = lastThisRef.current = undefined;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    return resultRef.current;
  }, [callback]);

  return throttled;
}

// 6. Memoized Cache Hook
export function useCachedValue<T>(
  key: string,
  compute: () => T,
  options: {
    ttl?: number;
    maxSize?: number;
    enabled?: boolean;
  } = {}
) {
  const { ttl = 5 * 60 * 1000, maxSize = 100, enabled = true } = options;

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const getValue = useCallback((): T => {
    if (!enabled) {
      return compute();
    }

    const entry = cacheRef.current.get(key);
    const now = Date.now();

    if (entry && now - entry.timestamp < entry.ttl) {
      return entry.value;
    }

    const newValue = compute();
    cacheRef.current.set(key, {
      value: newValue,
      timestamp: now,
      ttl,
    });

    // Cleanup expired entries
    if (cacheRef.current.size > maxSize) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }

    return newValue;
  }, [key, compute, ttl, maxSize, enabled]);

  const invalidate = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys()),
    };
  }, []);

  return {
    value: getValue(),
    invalidate,
    getCacheStats,
  };
}

// 7. Virtualization Hook
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        left: 0,
        right: 0,
      },
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    totalHeight,
    visibleItems,
    onScroll,
    startIndex,
    endIndex,
  };
}

// 8. Memory Management Hook
export function useMemoryManagement<T>(
  cleanup: () => void,
  options: {
    threshold?: number;
    interval?: number;
  } = {}
) {
  const { threshold = 100 * 1024 * 1024, interval = 30000 } = options; // 100MB, 30s

  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > threshold) {
        cleanup();
      }
    }
  }, [cleanup, threshold]);

  useEffect(() => {
    cleanupTimerRef.current = setInterval(checkMemory, interval);

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [checkMemory, interval]);

  const forceCleanup = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    forceCleanup,
    checkMemory,
  };
}

// 9. Render Optimization Hook
export function useRenderOptimization<T>(
  value: T,
  compare: (a: T, b: T) => boolean = (a, b) => a === b
) {
  const prevValueRef = useRef<T>(value);
  const renderCountRef = useRef(0);

  const stableValue = useMemo(() => {
    renderCountRef.current++;

    if (!compare(prevValueRef.current, value)) {
      prevValueRef.current = value;
    }

    return prevValueRef.current;
  }, [value, compare]);

  return {
    value: stableValue,
    renderCount: renderCountRef.current,
  };
}
