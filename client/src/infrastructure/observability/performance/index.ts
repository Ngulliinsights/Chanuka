/**
 * Performance Monitoring Sub-module
 * 
 * Provides Web Vitals tracking, performance budgets, and custom metrics collection.
 * 
 * Requirements: 3.1, 11.3
 */

// Re-export from performance module for now
// These will be gradually migrated to the new structure
export {
  PerformanceMonitor,
  WebVitalsMonitor,
  PerformanceBudgetChecker,
  PerformanceAlertsManager,
  getPerformanceMonitor,
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
  measureAsync,
  measureSync,
  startTiming,
  markPerformance,
  measurePerformance,
} from '@client/infrastructure/performance';

// Export types
export type {
  PerformanceMetric,
  WebVitalsMetric,
  PerformanceBudget,
  PerformanceAlert,
  BudgetCheckResult,
  PerformanceConfig,
  PerformanceStats,
  OptimizationSuggestion,
} from '@client/infrastructure/performance/types';

/**
 * Track a performance metric
 * Requirements: 11.3
 */
export function trackPerformance(metric: {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  return recordMetric({
    name: metric.name,
    value: metric.value,
    timestamp: metric.timestamp,
    category: metric.category || 'custom',
    metadata: metric.metadata,
  });
}

/**
 * Initialize performance monitoring with configuration
 */
export function initializePerformanceMonitoring(config: {
  enabled?: boolean;
  budgets?: Record<string, { budget: number; warning: number; description?: string }>;
  webVitalsEnabled?: boolean;
}): void {
  if (!config.enabled) {
    return;
  }

  const monitor = getPerformanceMonitor();

  // Set up budgets if provided
  if (config.budgets) {
    Object.entries(config.budgets).forEach(([metric, budget]) => {
      setBudget(metric, budget.budget, budget.warning, budget.description);
    });
  }

  // Web Vitals are enabled by default in the PerformanceMonitor
  console.log('Performance monitoring initialized');
}
