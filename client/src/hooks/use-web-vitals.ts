import { useEffect, useRef, useState } from 'react';
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

export interface WebVitalsMetrics {
  cls?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
}

export interface WebVitalsHookOptions {
  enabled?: boolean;
  onMetric?: (metric: Metric) => void;
  onAllMetrics?: (metrics: WebVitalsMetrics) => void;
  reportTo?: string;
}

export const useWebVitals = (options: WebVitalsHookOptions = {}) => {
  const {
    enabled = true,
    onMetric,
    onAllMetrics,
    reportTo
  } = options;

  const metricsRef = useRef<WebVitalsMetrics>({});
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const reportMetric = (metric: Metric) => {
      // Store metric value
      const metricName = metric.name.toLowerCase() as keyof WebVitalsMetrics;
      metricsRef.current[metricName] = metric.value;

      // Call individual metric callback
      onMetric?.(metric);

      // Check if all metrics are collected
      const { cls, fcp, lcp, ttfb } = metricsRef.current;
      if (cls !== undefined && fcp !== undefined &&
          lcp !== undefined && ttfb !== undefined && !hasReportedRef.current) {
        hasReportedRef.current = true;
        onAllMetrics?.(metricsRef.current);

        // Report to analytics endpoint if specified
        if (reportTo) {
          fetch(reportTo, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              metrics: metricsRef.current,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            }),
          }).catch(error => {
            console.warn('Failed to report web vitals:', error);
          });
        }
      }
    };

    // Collect Core Web Vitals
    onCLS(reportMetric);
    onFCP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);

  }, [enabled, onMetric, onAllMetrics, reportTo]);

  return {
    metrics: metricsRef.current,
    isComplete: hasReportedRef.current,
  };
};

// Utility function to get performance rating based on metric values
export const getPerformanceRating = (metric: Metric): 'good' | 'needs-improvement' | 'poor' => {
  const { name, value } = metric;

  switch (name) {
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
};

// Hook for monitoring performance budgets
export const usePerformanceBudget = (budgets?: {
  lcp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}) => {
  const [violations, setViolations] = useState<Array<{
    metric: string;
    value: number;
    budget: number;
    severity: 'warning' | 'error';
  }>>([]);

  const { metrics } = useWebVitals({
    onAllMetrics: (metrics) => {
      const newViolations: typeof violations = [];

      if (budgets?.lcp && metrics.lcp && metrics.lcp > budgets.lcp) {
        newViolations.push({
          metric: 'LCP',
          value: metrics.lcp,
          budget: budgets.lcp,
          severity: metrics.lcp > budgets.lcp * 1.5 ? 'error' : 'warning',
        });
      }


      if (budgets?.cls && metrics.cls && metrics.cls > budgets.cls) {
        newViolations.push({
          metric: 'CLS',
          value: metrics.cls,
          budget: budgets.cls,
          severity: metrics.cls > budgets.cls * 1.5 ? 'error' : 'warning',
        });
      }

      if (budgets?.fcp && metrics.fcp && metrics.fcp > budgets.fcp) {
        newViolations.push({
          metric: 'FCP',
          value: metrics.fcp,
          budget: budgets.fcp,
          severity: metrics.fcp > budgets.fcp * 1.5 ? 'error' : 'warning',
        });
      }

      if (budgets?.ttfb && metrics.ttfb && metrics.ttfb > budgets.ttfb) {
        newViolations.push({
          metric: 'TTFB',
          value: metrics.ttfb,
          budget: budgets.ttfb,
          severity: metrics.ttfb > budgets.ttfb * 1.5 ? 'error' : 'warning',
        });
      }

      setViolations(newViolations);
    },
  });

  return {
    metrics,
    violations,
    hasViolations: violations.length > 0,
    errorCount: violations.filter(v => v.severity === 'error').length,
    warningCount: violations.filter(v => v.severity === 'warning').length,
  };
};