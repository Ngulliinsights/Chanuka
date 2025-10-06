import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Performance optimization hook for navigation components
 * Provides utilities for smooth animations, layout shift prevention, and performance monitoring
 */
export function useNavigationPerformance() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    transitionDuration: 0,
    layoutShifts: 0,
    renderTime: 0
  });
  
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const layoutShiftObserverRef = useRef<PerformanceObserver | null>(null);
  const renderStartRef = useRef<number>(0);

  // Initialize performance monitoring
  useEffect(() => {
    // Monitor layout shifts
    if ('PerformanceObserver' in window) {
      try {
        layoutShiftObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let totalShift = 0;
          
          entries.forEach((entry) => {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              totalShift += (entry as any).value;
            }
          });
          
          if (totalShift > 0) {
            setPerformanceMetrics(prev => ({
              ...prev,
              layoutShifts: prev.layoutShifts + totalShift
            }));
          }
        });
        
        layoutShiftObserverRef.current.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift monitoring not supported:', error);
      }
    }

    return () => {
      if (layoutShiftObserverRef.current) {
        layoutShiftObserverRef.current.disconnect();
      }
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Start a navigation transition with performance tracking
   */
  const startTransition = useCallback((duration: number = 250) => {
    renderStartRef.current = performance.now();
    setIsTransitioning(true);
    
    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Set timeout to end transition
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      const renderTime = performance.now() - renderStartRef.current;
      
      setPerformanceMetrics(prev => ({
        ...prev,
        transitionDuration: duration,
        renderTime
      }));
    }, duration);
  }, []);

  /**
   * End transition immediately
   */
  const endTransition = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsTransitioning(false);
  }, []);

  /**
   * Optimized callback that prevents unnecessary re-renders
   */
  const useOptimizedCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T => {
    const callbackRef = useRef(callback);
    const depsRef = useRef(deps);
    
    // Update callback if dependencies changed
    if (!depsRef.current || deps.some((dep, index) => dep !== depsRef.current![index])) {
      callbackRef.current = callback;
      depsRef.current = deps;
    }
    
    return callbackRef.current;
  }, []);

  /**
   * Debounced function for performance-sensitive operations
   */
  const useDebounced = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    }, [func, delay]) as T;
  }, []);

  /**
   * Throttled function for high-frequency events
   */
  const useThrottled = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    const lastCallRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    return useCallback((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        func(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          func(...args);
          timeoutRef.current = null;
        }, delay - (now - lastCallRef.current));
      }
    }, [func, delay]) as T;
  }, []);

  /**
   * Preload critical resources for better perceived performance
   */
  const preloadResource = useCallback((url: string, type: 'script' | 'style' | 'image' = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
    }
    
    document.head.appendChild(link);
  }, []);

  /**
   * Force GPU acceleration for smooth animations
   */
  const enableGPUAcceleration = useCallback((element: HTMLElement) => {
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.willChange = 'transform, opacity';
  }, []);

  /**
   * Disable GPU acceleration to save resources
   */
  const disableGPUAcceleration = useCallback((element: HTMLElement) => {
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.willChange = 'auto';
  }, []);

  /**
   * Measure and optimize component render time
   */
  const measureRenderTime = useCallback((componentName: string, renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    
    console.debug(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
    
    // Log warning for slow renders
    if (end - start > 16) { // 60fps threshold
      console.warn(`Slow render detected in ${componentName}: ${(end - start).toFixed(2)}ms`);
    }
  }, []);

  /**
   * Reset performance metrics
   */
  const resetMetrics = useCallback(() => {
    setPerformanceMetrics({
      transitionDuration: 0,
      layoutShifts: 0,
      renderTime: 0
    });
  }, []);

  /**
   * Get performance recommendations based on metrics
   */
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (performanceMetrics.layoutShifts > 0.1) {
      recommendations.push('Consider using CSS containment or fixed dimensions to reduce layout shifts');
    }
    
    if (performanceMetrics.renderTime > 50) {
      recommendations.push('Consider memoizing expensive components or using React.memo');
    }
    
    if (performanceMetrics.transitionDuration > 300) {
      recommendations.push('Consider reducing transition duration for better perceived performance');
    }
    
    return recommendations;
  }, [performanceMetrics]);

  return {
    // State
    isTransitioning,
    performanceMetrics,
    
    // Transition control
    startTransition,
    endTransition,
    
    // Performance utilities
    useOptimizedCallback,
    useDebounced,
    useThrottled,
    preloadResource,
    enableGPUAcceleration,
    disableGPUAcceleration,
    measureRenderTime,
    
    // Metrics
    resetMetrics,
    getPerformanceRecommendations
  };
}

/**
 * Hook for managing smooth transitions without layout shifts
 */
export function useSmoothTransition(duration: number = 250) {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const start = useCallback(() => {
    setIsActive(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, duration);
  }, [duration]);
  
  const end = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsActive(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { isActive, start, end };
}

/**
 * Hook for preventing layout shifts during navigation
 */
export function useLayoutStable() {
  const elementRef = useRef<HTMLElement | null>(null);
  
  const stabilize = useCallback(() => {
    if (elementRef.current) {
      const element = elementRef.current;
      const rect = element.getBoundingClientRect();
      
      // Set explicit dimensions to prevent layout shifts
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.minWidth = `${rect.width}px`;
      element.style.minHeight = `${rect.height}px`;
    }
  }, []);
  
  const unstabilize = useCallback(() => {
    if (elementRef.current) {
      const element = elementRef.current;
      element.style.width = '';
      element.style.height = '';
      element.style.minWidth = '';
      element.style.minHeight = '';
    }
  }, []);
  
  return { elementRef, stabilize, unstabilize };
}