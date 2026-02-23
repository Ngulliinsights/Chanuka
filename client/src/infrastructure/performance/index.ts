/**
 * Core Performance Module - Modular Performance System
 *
 * This module provides comprehensive performance monitoring including:
 * - Web Vitals tracking (LCP, FID, INP, CLS, FCP, TTFB)
 * - Performance budget monitoring and compliance
 * - Real-time alerts and threshold management
 * - Custom metrics collection and analysis
 * - Performance optimization insights
 */

import { PerformanceAlertsManager } from './alerts';
import { PerformanceBudgetChecker } from './budgets';
import { PerformanceMonitor } from './monitor';
import type {
  BudgetCheckResult,
  PerformanceAlert,
  PerformanceConfig,
  PerformanceMetric,
  PerformanceStats,
  WebVitalsMetric,
} from './types';
import { WebVitalsMonitor } from './web-vitals';

// Core types
export * from './types';

// Web Vitals monitoring
export { WebVitalsMonitor } from './web-vitals';

// Performance budgets
export { PerformanceBudgetChecker } from './budgets';

// Performance alerts
export { PerformanceAlertsManager } from './alerts';

// Central monitoring system
export { PerformanceMonitor } from './monitor';

// Convenience re-exports for common use cases
export {
  type PerformanceMetric,
  type WebVitalsMetric,
  type PerformanceBudget,
  type PerformanceAlert,
  type BudgetCheckResult,
  type PerformanceConfig,
  type PerformanceStats,
  type OptimizationSuggestion,
  DEFAULT_PERFORMANCE_CONFIG,
} from './types';

// Lazy-loaded singleton instance to avoid initialization issues
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Gets or initializes the performance monitor singleton
 */
function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = PerformanceMonitor.getInstance();
  }
  return performanceMonitor;
}

// Export singleton getter
export { getPerformanceMonitor };

// Convenience functions for common operations
export async function recordMetric(metric: PerformanceMetric): Promise<void> {
  return getPerformanceMonitor().recordCustomMetric(metric);
}

export function getWebVitalsScores() {
  const monitor = getPerformanceMonitor();
  return monitor.getWebVitalsMonitor().getWebVitalsScores();
}

export function getOverallPerformanceScore(): number {
  const monitor = getPerformanceMonitor();
  return monitor.getWebVitalsMonitor().getOverallScore();
}

export function getPerformanceStats(): PerformanceStats {
  return getPerformanceMonitor().getPerformanceStats();
}

export function getActiveAlerts(): PerformanceAlert[] {
  const monitor = getPerformanceMonitor();
  return monitor.getAlertsManager().getActiveAlerts();
}

export function getBudgetCompliance() {
  const monitor = getPerformanceMonitor();
  return monitor.getBudgetChecker().getComplianceStats();
}

export function checkBudget(metric: PerformanceMetric): BudgetCheckResult {
  const monitor = getPerformanceMonitor();
  return monitor.getBudgetChecker().checkBudget(metric);
}

export function setBudget(
  metric: string,
  budget: number,
  warning: number,
  description?: string
): void {
  const monitor = getPerformanceMonitor();
  return monitor.getBudgetChecker().setBudget(metric, budget, warning, description);
}

export function setAlertThreshold(metric: string, threshold: number): void {
  const monitor = getPerformanceMonitor();
  return monitor.getAlertsManager().setThreshold(metric, threshold);
}

export function resolveAlert(alertId: string): boolean {
  const monitor = getPerformanceMonitor();
  return monitor.getAlertsManager().resolveAlert(alertId);
}

export function addWebVitalsListener(listener: (metric: WebVitalsMetric) => void): void {
  const monitor = getPerformanceMonitor();
  monitor.getWebVitalsMonitor().addListener(listener);
}

export function addAlertListener(listener: (alert: PerformanceAlert) => void): void {
  const monitor = getPerformanceMonitor();
  monitor.getAlertsManager().addListener(listener);
}

export function exportPerformanceReport() {
  return getPerformanceMonitor().exportReport();
}

export function resetPerformanceData(): void {
  return getPerformanceMonitor().reset();
}

export function updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
  return getPerformanceMonitor().updateConfig(config);
}

export function stopPerformanceMonitoring(): void {
  return getPerformanceMonitor().stopMonitoring();
}

export function measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
  return (async () => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      await recordMetric({
        name,
        value: duration,
        timestamp: new Date(),
        category: 'custom',
        metadata: { type: 'async-operation' },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await recordMetric({
        name: `${name}-error`,
        value: duration,
        timestamp: new Date(),
        category: 'custom',
        metadata: { type: 'async-operation-error', error: String(error) },
      });

      throw error;
    }
  })();
}

export function measureSync<T>(name: string, operation: () => T): T {
  const startTime = performance.now();

  try {
    const result = operation();
    const duration = performance.now() - startTime;

    // Record metric asynchronously to not block the operation
    recordMetric({
      name,
      value: duration,
      timestamp: new Date(),
      category: 'custom',
      metadata: { type: 'sync-operation' },
    }).catch(error => {
      console.warn('Failed to record sync metric:', error);
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Record error metric asynchronously
    recordMetric({
      name: `${name}-error`,
      value: duration,
      timestamp: new Date(),
      category: 'custom',
      metadata: { type: 'sync-operation-error', error: String(error) },
    }).catch(recordError => {
      console.warn('Failed to record sync error metric:', recordError);
    });

    throw error;
  }
}

// Performance timing utilities
export function startTiming(name: string): () => Promise<void> {
  const startTime = performance.now();

  return async () => {
    const duration = performance.now() - startTime;
    await recordMetric({
      name,
      value: duration,
      timestamp: new Date(),
      category: 'custom',
      metadata: { type: 'manual-timing' },
    });
  };
}

export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }

    const entries = performance.getEntriesByName(name, 'measure');
    const latestEntry = entries[entries.length - 1];

    if (latestEntry) {
      // Record the measurement as a custom metric
      recordMetric({
        name,
        value: latestEntry.duration,
        timestamp: new Date(),
        category: 'custom',
        metadata: {
          type: 'performance-measure',
          startMark,
          endMark,
        },
      }).catch(error => {
        console.warn('Failed to record performance measure:', error);
      });

      return latestEntry.duration;
    }
  } catch (error) {
    console.warn('Failed to measure performance:', error);
  }

  return null;
}

// Legacy export object for backward compatibility
export const performanceUtils = {
  // Classes
  PerformanceMonitor,
  WebVitalsMonitor,
  PerformanceBudgetChecker,
  PerformanceAlertsManager,

  // Getter function for lazy initialization
  getPerformanceMonitor,

  // Convenience functions
  recordMetric,
  getWebVitalsScores,
  getOverallPerformanceScore,
  getPerformanceStats,
  getActiveAlerts,
  getBudgetCompliance,
  checkBudget,
  setBudget,
  setAlertThreshold,
  resolveAlert,
  addWebVitalsListener,
  addAlertListener,
  exportPerformanceReport,
  resetPerformanceData,
  updatePerformanceConfig,
  stopPerformanceMonitoring,

  // Measurement utilities
  measureAsync,
  measureSync,
  startTiming,
  markPerformance,
  measurePerformance,
};

// Remove duplicate export - keep only the default export
// export default performanceUtils;
