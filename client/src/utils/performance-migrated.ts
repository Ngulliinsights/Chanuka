/**
 * Performance Utilities - Migrated to Modular Core System
 * 
 * MIGRATION NOTICE: This file has been migrated to use the modular performance system.
 * All functionality is now available through @client/core/performance
 * 
 * This file maintains backward compatibility during the migration period.
 * 
 * @deprecated Use @client/core/performance instead
 */

// Import everything from the new modular system
export * from '../core/performance';

// Legacy imports for backward compatibility
import {
  PerformanceMonitor as CorePerformanceMonitor,
  WebVitalsMonitor as CoreWebVitalsMonitor,
  PerformanceBudgetChecker as CoreBudgetChecker,
  PerformanceAlertsManager as CoreAlertsManager,
  performanceMonitor,
  webVitalsMonitor,
  budgetChecker,
  alertsManager,
  recordMetric,
  getWebVitalsScores,
  getOverallPerformanceScore,
  getPerformanceStats,
  getActiveAlerts,
  getBudgetCompliance,
  checkBudget,
  setBudget,
  setAlertThreshold,
  measureAsync,
  measureSync,
  startTiming,
  type PerformanceMetric,
  type WebVitalsMetric,
  type PerformanceBudget,
  type PerformanceAlert,
  type BudgetCheckResult,
  type OptimizationSuggestion
} from '../core/performance';

/**
 * Legacy PerformanceAlerts class (maps to PerformanceAlertsManager)
 * @deprecated Use PerformanceAlertsManager from @client/core/performance instead
 */
export class PerformanceAlerts extends CoreAlertsManager {
  static getInstance() {
    return CoreAlertsManager.getInstance();
  }
}

/**
 * Legacy PerformanceBudgetChecker class
 * @deprecated Use PerformanceBudgetChecker from @client/core/performance instead
 */
export class PerformanceBudgetChecker extends CoreBudgetChecker {
  static getInstance() {
    return CoreBudgetChecker.getInstance();
  }
}

/**
 * Legacy WebVitalsMonitor class
 * @deprecated Use WebVitalsMonitor from @client/core/performance instead
 */
export class WebVitalsMonitor extends CoreWebVitalsMonitor {
  static getInstance() {
    return CoreWebVitalsMonitor.getInstance();
  }
}

/**
 * Legacy PerformanceOptimizer class (placeholder for backward compatibility)
 * @deprecated Use optimization suggestions from the performance system instead
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  getSuggestions(): OptimizationSuggestion[] {
    // Return empty array for now - optimization suggestions would be implemented
    // in a separate optimizer module
    return [];
  }

  analyzePage(): void {
    console.warn('PerformanceOptimizer.analyzePage is deprecated. Use the new performance monitoring system.');
  }
}

// Legacy singleton instances (re-export from core)
export { performanceMonitor, webVitalsMonitor, budgetChecker, alertsManager };

// Create legacy instances for backward compatibility
export const performanceAlerts = alertsManager;
export const performanceBudgetChecker = budgetChecker;
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Legacy convenience functions (re-export from core)
export {
  recordMetric,
  getWebVitalsScores,
  getOverallPerformanceScore,
  getPerformanceStats,
  getActiveAlerts,
  getBudgetCompliance,
  checkBudget,
  setBudget,
  setAlertThreshold,
  measureAsync,
  measureSync,
  startTiming
};

// Additional legacy functions for backward compatibility
export async function trackPerformanceMetric(
  name: string, 
  value: number, 
  category?: string
): Promise<void> {
  return recordMetric({
    name,
    value,
    timestamp: new Date(),
    category: (category as PerformanceMetric['category']) || 'custom'
  });
}

export function getWebVitals(): WebVitalsMetric[] {
  return webVitalsMonitor.getMetrics();
}

export function getLatestWebVital(name: WebVitalsMetric['name']): WebVitalsMetric | undefined {
  return webVitalsMonitor.getLatestMetric(name);
}

export function createPerformanceBudget(
  metric: string,
  budget: number,
  warning: number
): void {
  return setBudget(metric, budget, warning);
}

export function checkPerformanceBudget(metric: PerformanceMetric): BudgetCheckResult {
  return checkBudget(metric);
}

export function createPerformanceAlert(
  metric: string,
  threshold: number
): void {
  return setAlertThreshold(metric, threshold);
}

export function getPerformanceAlerts(): PerformanceAlert[] {
  return getActiveAlerts();
}

export function measureFunction<T>(
  name: string,
  fn: () => T
): T {
  return measureSync(name, fn);
}

export async function measureAsyncFunction<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return measureAsync(name, fn);
}

export function startPerformanceTimer(name: string): () => Promise<void> {
  return startTiming(name);
}

export function getPerformanceSummary() {
  return {
    webVitals: getWebVitalsScores(),
    overallScore: getOverallPerformanceScore(),
    stats: getPerformanceStats(),
    alerts: getActiveAlerts(),
    budgetCompliance: getBudgetCompliance()
  };
}

// Legacy export object
export const performanceUtils = {
  // Classes
  PerformanceAlerts: CoreAlertsManager,
  PerformanceBudgetChecker: CoreBudgetChecker,
  WebVitalsMonitor: CoreWebVitalsMonitor,
  PerformanceOptimizer,
  PerformanceMonitor: CorePerformanceMonitor,
  
  // Instances
  performanceAlerts,
  performanceBudgetChecker,
  webVitalsMonitor,
  performanceOptimizer,
  performanceMonitor,
  
  // Convenience functions
  recordMetric,
  trackPerformanceMetric,
  getWebVitalsScores,
  getWebVitals,
  getLatestWebVital,
  getOverallPerformanceScore,
  getPerformanceStats,
  getActiveAlerts,
  getBudgetCompliance,
  checkBudget,
  checkPerformanceBudget,
  setBudget,
  createPerformanceBudget,
  setAlertThreshold,
  createPerformanceAlert,
  getPerformanceAlerts,
  measureAsync,
  measureSync,
  measureFunction,
  measureAsyncFunction,
  startTiming,
  startPerformanceTimer,
  getPerformanceSummary
};

export default performanceUtils;