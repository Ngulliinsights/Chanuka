/**
 * React Hook for Render Tracking
 * 
 * This hook integrates with the extended logger to automatically
 * track component renders, lifecycle events, and performance metrics.
 */

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';

import { logger, type RenderStats } from '@client/utils/logger';

interface UseRenderTrackerOptions {
  componentName: string;
  trackProps?: boolean;
  trackState?: boolean;
  performanceThreshold?: number; // ms - warn if render takes longer
  infiniteRenderThreshold?: number; // renders per second
}

interface RenderTrackerHook {
  trackRender: (trigger: string, additionalData?: Record<string, unknown>) => void;
  trackPerformance: (renderDuration: number) => void;
  getRenderStats: () => RenderStats;
  clearStats: () => void;
}

export function useRenderTracker(options: UseRenderTrackerOptions): RenderTrackerHook {
  const {
    componentName,
    trackProps = false,
    trackState = false,
    performanceThreshold = 16, // 1 frame at 60fps
    infiniteRenderThreshold = 50
  } = options;

  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(Date.now());
  const lastRenderTimeRef = useRef<number>(Date.now());

  // Track component mount
  useEffect(() => {
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;
    
    logger.trackLifecycle({
      component: componentName,
      action: 'mount',
      timestamp: mountTime
    });

    // Track component unmount
    return () => {
      logger.trackLifecycle({
        component: componentName,
        action: 'unmount',
        timestamp: Date.now()
      });
    };
  }, [componentName]);

  // Track each render
  useEffect(() => {
    const renderStart = performance.now();
    renderCountRef.current += 1;
    const currentTime = Date.now();
    
    // Track the render
    logger.trackRender({
      component: componentName,
      renderCount: renderCountRef.current,
      timestamp: currentTime,
      trigger: 'useEffect-render-tracking'
    });

    // Check for infinite renders
    logger.detectInfiniteRender(componentName, infiniteRenderThreshold);

    // Measure render performance
    const renderEnd = performance.now();
    const renderDuration = renderEnd - renderStart;
    
    if (renderDuration > 0) {
      logger.trackPerformanceImpact({
        component: componentName,
        renderDuration,
        timestamp: currentTime,
        memoryUsage: (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize
      });
    }

    lastRenderTimeRef.current = currentTime;
  });

  const trackRender = useCallback((trigger: string, additionalData?: Record<string, unknown>) => {
    renderCountRef.current += 1;
    const currentTime = Date.now();
    
    logger.trackRender({
      component: componentName,
      renderCount: renderCountRef.current,
      timestamp: currentTime,
      trigger,
      props: trackProps ? additionalData?.props : undefined,
      state: trackState ? additionalData?.state : undefined
    });

    // Check for infinite renders
    logger.detectInfiniteRender(componentName, infiniteRenderThreshold);
  }, [componentName, trackProps, trackState, infiniteRenderThreshold]);

  const trackPerformance = useCallback((renderDuration: number) => {
    logger.trackPerformanceImpact({
      component: componentName,
      renderDuration,
      timestamp: Date.now(),
      memoryUsage: (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize
    });

    if (renderDuration > performanceThreshold) {
      logger.warn(`Slow render detected in ${componentName}`, {
        duration: `${renderDuration.toFixed(2)}ms`,
        threshold: `${performanceThreshold}ms`
      });
    }
  }, [componentName, performanceThreshold]);

  const getRenderStats = useCallback(() => {
    return logger.getRenderStats(componentName);
  }, [componentName]);

  const clearStats = useCallback(() => {
    logger.clearRenderStats(componentName);
  }, [componentName]);

  return {
    trackRender,
    trackPerformance,
    getRenderStats,
    clearStats
  };
}

// Higher-order component for automatic render tracking
export function withRenderTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const TrackedComponent: React.FC<P> = (props: P) => {
    const actualComponentName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent';
    
    const renderTracker = useRenderTracker({
      componentName: actualComponentName,
      trackProps: process.env.NODE_ENV === 'development',
      trackState: process.env.NODE_ENV === 'development'
    });

    // Track render with props change detection
    useEffect(() => {
      renderTracker.trackRender('props-change', { props });
    }, [props, renderTracker]);

    return React.createElement(WrappedComponent, props);
  };

  TrackedComponent.displayName = `withRenderTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return TrackedComponent;
}

// Hook for performance measurement of specific operations
export function usePerformanceMeasurement(componentName: string) {
  return useCallback((operationName: string, operation: () => void | Promise<void>) => {
    const start = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          logger.trackPerformanceImpact({
            component: `${componentName}.${operationName}`,
            renderDuration: end - start,
            timestamp: Date.now()
          });
        });
      } else {
        const end = performance.now();
        logger.trackPerformanceImpact({
          component: `${componentName}.${operationName}`,
          renderDuration: end - start,
          timestamp: Date.now()
        });
        return result;
      }
    } catch (error) {
      const end = performance.now();
      logger.trackPerformanceImpact({
        component: `${componentName}.${operationName}`,
        renderDuration: end - start,
        timestamp: Date.now()
      });
      throw error;
    }
  }, [componentName]);
}