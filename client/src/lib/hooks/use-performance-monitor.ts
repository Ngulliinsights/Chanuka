/**
 * Performance Monitoring React Hooks
 *
 * Hooks for monitoring component performance, tracking metrics,
 * and integrating with the runtime performance monitoring system.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '../utils/logger';
import { PerformanceMonitor } from '@client/core/performance/monitor';
import { PerformanceMetric } from '@client/core/performance/types';

const monitor = PerformanceMonitor.getInstance();

// Removed local stub

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  componentName?: string;
  trackRenders?: boolean;
  trackMemory?: boolean;
  alertThreshold?: number; // milliseconds
  enableLogging?: boolean;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  markRenderStart: () => void;
  markRenderEnd: () => void;
  resetMetrics: () => void;
  addCustomMetric: (name: string, value: number) => void;
}

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    componentName = 'UnknownComponent',
    trackRenders = true,
    trackMemory = false,
    alertThreshold = 16, // 60fps threshold
    enableLogging = false,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
  });

  const renderStartRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);

  /**
   * Mark the start of a render
   */
  const markRenderStart = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  /**
   * Mark the end of a render and update metrics
   */
  const markRenderEnd = useCallback(() => {
    if (renderStartRef.current === 0) return;

    const renderTime = performance.now() - renderStartRef.current;
    const newRenderCount = metrics.renderCount + 1;

    // Update render times array
    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift(); // Keep only last 100 renders
    }

    // Calculate statistics
    const sum = renderTimesRef.current.reduce((a: number, b: number) => a + b, 0);
    const averageRenderTime = sum / renderTimesRef.current.length;
    const maxRenderTime = Math.max(...renderTimesRef.current);
    const minRenderTime = Math.min(...renderTimesRef.current);

    const newMetrics: PerformanceMetrics = {
      renderTime,
      renderCount: newRenderCount,
      lastRenderTime: renderTime,
      averageRenderTime,
      maxRenderTime,
      minRenderTime,
    };

    setMetrics(newMetrics);

    // Log performance warnings
    if (enableLogging && renderTime > alertThreshold) {
      logger.warn(`Slow render detected in ${componentName}`, {
        renderTime: renderTime.toFixed(2),
        threshold: alertThreshold,
        renderCount: newRenderCount,
      });
    }

    // Track memory if enabled
    if (trackMemory && 'memory' in performance) {
      const memoryUsage = (performance as any).memory.usedJSHeapSize;
      monitor.recordCustomMetric({
        name: `${componentName}_memory`,
        value: memoryUsage,
        timestamp: new Date(),
        category: 'memory',
        url: window.location.href,
        metadata: { component: componentName }
      });
    }

    renderStartRef.current = 0;
  }, [metrics.renderCount, componentName, alertThreshold, enableLogging, trackMemory]);

  /**
   * Reset performance metrics
   */
  const resetMetrics = useCallback(() => {
    setMetrics({
      renderTime: 0,
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
    });
    renderTimesRef.current = [];
    renderStartRef.current = 0;
  }, []);

  /**
   * Add a custom metric to the global monitor
   */
  const addCustomMetric = useCallback(
    (name: string, value: number) => {
      monitor.recordCustomMetric({
        name: `${componentName}_${name}`,
        value,
        timestamp: new Date(),
        category: 'custom',
        url: window.location.href,
        metadata: { component: componentName }
      });
    },
    [componentName]
  );

  // Auto-track renders if enabled
  useEffect(() => {
    if (trackRenders) {
      markRenderStart();

      // Use requestAnimationFrame to mark render end after paint
      const rafId = requestAnimationFrame(() => {
        markRenderEnd();
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }
  });

  return {
    metrics,
    markRenderStart,
    markRenderEnd,
    resetMetrics,
    addCustomMetric,
  };
}

interface UsePerformanceBudgetOptions {
  componentName?: string;
  checkInterval?: number; // milliseconds
  enableAlerts?: boolean;
}

interface UsePerformanceBudgetReturn {
  isWithinBudget: boolean;
  violations: string[];
  lastCheckTime: number;
  checkBudget: () => Promise<void>;
}

/**
 * Hook for monitoring performance budgets
 */
export function usePerformanceBudget(
  options: UsePerformanceBudgetOptions = {}
): UsePerformanceBudgetReturn {
  const {
    componentName = 'UnknownComponent',
    checkInterval = 30000, // 30 seconds
    enableAlerts = true,
  } = options;

  const [isWithinBudget, setIsWithinBudget] = useState(true);
  const [violations, setViolations] = useState<string[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  /**
   * Check current performance against budgets
   */
  const checkBudget = useCallback(async () => {
    try {
      const budgetChecker = monitor.getBudgetChecker();
      const failingMetrics = budgetChecker.getFailingMetrics();

      const hasViolations = failingMetrics.length > 0;
      setIsWithinBudget(!hasViolations);
      setViolations(failingMetrics.map(m => `${m.metric}: ${m.value.toFixed(2)} > ${m.budget}`));
      setLastCheckTime(Date.now());

      if (enableAlerts && hasViolations) {
        logger.warn(`Performance budget violations detected in ${componentName}`, {
          violations: failingMetrics.length,
          metrics: failingMetrics.map(m => m.metric)
        });
      }
    } catch (error) {
      logger.error(`Failed to check performance budget for ${componentName}`, { error });
    }
  }, [componentName, enableAlerts]);

  // Auto-check budget at intervals
  useEffect(() => {
    checkBudget(); // Initial check

    const intervalId = setInterval(checkBudget, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkBudget, checkInterval]);

  return {
    isWithinBudget,
    violations,
    lastCheckTime,
    checkBudget,
  };
}

interface UseCoreWebVitalsReturn {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  allMetricsLoaded: boolean;
}

/**
 * Hook for accessing Core Web Vitals metrics
 */
export function useCoreWebVitals(): UseCoreWebVitalsReturn {
  const [metrics, setMetrics] = useState<UseCoreWebVitalsReturn>({
    allMetricsLoaded: false,
  });

  useEffect(() => {
    const checkMetrics = () => {
      const webVitals = monitor.getWebVitalsMetrics();
      const metricsMap = webVitals.reduce((acc, m) => {
        acc[m.name.toLowerCase()] = m.value;
        return acc;
      }, {} as Record<string, number>);

      const newMetrics = {
        lcp: metricsMap['lcp'],
        fid: metricsMap['fid'],
        cls: metricsMap['cls'],
        fcp: metricsMap['fcp'],
        ttfb: metricsMap['ttfb'],
        allMetricsLoaded: !!(
          metricsMap['lcp'] &&
          metricsMap['fid'] &&
          metricsMap['cls'] &&
          metricsMap['fcp'] &&
          metricsMap['ttfb']
        ),
      };

      setMetrics(newMetrics);
    };

    // Check immediately
    checkMetrics();

    // Set up periodic checks
    const intervalId = setInterval(checkMetrics, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return metrics;
}

interface UsePerformanceAlertOptions {
  componentName?: string;
  enableSlack?: boolean;
  enableEmail?: boolean;
  enableGitHub?: boolean;
}

interface UsePerformanceAlertReturn {
  sendAlert: (
    type: 'violation' | 'regression' | 'warning',
    title: string,
    description: string,
    metrics?: Record<string, any>
  ) => Promise<void>;
  updateAlertConfig: (config: Partial<{ slack: boolean; email: boolean; github: boolean }>) => void;
}

/**
 * Hook for sending performance alerts
 */
export function usePerformanceAlert(
  options: UsePerformanceAlertOptions = {}
): UsePerformanceAlertReturn {
  const { componentName = 'UnknownComponent' } = options;

  /**
   * Send a performance alert
   */
  const sendAlert = useCallback(
    async (
      type: 'violation' | 'regression' | 'warning',
      title: string,
      description: string,
      metrics: Record<string, any> = {}
    ) => {
      // Manual alerting is not fully supported by core yet, logging for now
      logger.warn(`Performance Alert: ${title}`, {
        type,
        description,
        metrics,
        component: componentName
      });
      // In future: monitor.getAlertsManager().createAlert(...) if exposed
    },
    [componentName]
  );

  /**
   * Update alert configuration
   */
  const updateAlertConfig = useCallback(
    (config: Partial<{ slack: boolean; email: boolean; github: boolean }>) => {
       // Map to match PerformanceConfig['alerts'] structure if possible, or just pass safe subset
       // The config types might not strictly match, so we cast or adapt as needed
       // Assuming partial update is supported
       monitor.getAlertsManager().updateConfig(config as any);
    },
    []
  );

  return {
    sendAlert,
    updateAlertConfig,
  };
}

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseLazyLoadingReturn {
  ref: React.RefObject<Element>;
  isIntersecting: boolean;
  hasTriggered: boolean;
}

/**
 * Hook for performance-optimized lazy loading
 */
export function useLazyLoading(options: UseLazyLoadingOptions = {}): UseLazyLoadingReturn {
  const { threshold = 0.1, rootMargin = '50px', triggerOnce = true } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && triggerOnce && !hasTriggered) {
          setHasTriggered(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return {
    ref,
    isIntersecting,
    hasTriggered,
  };
}
