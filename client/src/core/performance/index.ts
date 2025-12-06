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

// Core types
export * from './types';

// Web Vitals monitoring
export {
  WebVitalsMonitor
} from './web-vitals';

// Performance budgets
export {
  PerformanceBudgetChecker
} from './budgets';

// Performance alerts
export {
  PerformanceAlertsManager
} from './alerts';

// Central monitoring system
export {
  PerformanceMonitor
} from './monitor';

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
  DEFAULT_PERFORMANCE_CONFIG
} from './types';

// Create singleton instances
const performanceMonitor = PerformanceMonitor.getInstance();
const webVitalsMonitor = performanceMonitor.getWebVitalsMonitor();
const budgetChecker = performanceMonitor.getBudgetChecker();
const alertsManager = performanceMonitor.getAlertsManager();

// Export singleton instances
export {
  performanceMonitor,
  webVitalsMonitor,
  budgetChecker,
  alertsManager
};

// Convenience functions for common operations
export async function recordMetric(metric: PerformanceMetric): Promise<void> {
  return performanceMonitor.recordCustomMetric(metric);
}

export function getWebVitalsScores() {
  return webVitalsMonitor.getWebVitalsScores();
}

export function getOverallPerformanceScore(): number {
  return webVitalsMonitor.getOverallScore();
}

export function getPerformanceStats(): PerformanceStats {
  return performanceMonitor.getPerformanceStats();
}

export function getActiveAlerts(): PerformanceAlert[] {
  return alertsManager.getActiveAlerts();
}

export function getBudgetCompliance() {
  return budgetChecker.getComplianceStats();
}

export function checkBudget(metric: PerformanceMetric): BudgetCheckResult {
  return budgetChecker.checkBudget(metric);
}

export function setBudget(
  metric: string, 
  budget: number, 
  warning: number, 
  description?: string
): void {
  return budgetChecker.setBudget(metric, budget, warning, description);
}

export function setAlertThreshold(metric: string, threshold: number): void {
  return alertsManager.setThreshold(metric, threshold);
}

export function resolveAlert(alertId: string): boolean {
  return alertsManager.resolveAlert(alertId);
}

export function addWebVitalsListener(listener: (metric: WebVitalsMetric) => void): void {
  return webVitalsMonitor.addListener(listener);
}

export function addAlertListener(listener: (alert: PerformanceAlert) => void): void {
  return alertsManager.addListener(listener);
}

export function exportPerformanceReport() {
  return performanceMonitor.exportReport();
}

export function resetPerformanceData(): void {
  return performanceMonitor.reset();
}

export function updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
  return performanceMonitor.updateConfig(config);
}

export function stopPerformanceMonitoring(): void {
  return performanceMonitor.stopMonitoring();
}

// Performance measurement utilities
export function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      await recordMetric({
        name,
        value: duration,
        timestamp: new Date(),
        category: 'custom',
        metadata: { type: 'async-operation' }
      });
      
      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      await recordMetric({
        name: `${name}-error`,
        value: duration,
        timestamp: new Date(),
        category: 'custom',
        metadata: { type: 'async-operation-error', error: String(error) }
      });
      
      reject(error);
    }
  });
}

export function measureSync<T>(
  name: string,
  operation: () => T
): T {
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
      metadata: { type: 'sync-operation' }
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
      metadata: { type: 'sync-operation-error', error: String(error) }
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
      metadata: { type: 'manual-timing' }
    });
  };
}

export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

export function measurePerformance(name: string, startMark: string, endMark?: string): number | null {
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
          endMark
        }
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
  
  // Instances
  performanceMonitor,
  webVitalsMonitor,
  budgetChecker,
  alertsManager,
  
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
  measurePerformance
};

export default performanceUtils;