/**
 * Performance Monitoring Module
 *
 * Comprehensive performance budget system with Core Web Vitals tracking,
 * automated monitoring, and CI/CD integration.
 */

// Budget configuration and types
export type {
  PerformanceBudget,
  CoreWebVitalsBudgets,
  BundleSizeBudgets,
  PerformanceBudgetConfig,
} from './budgets';

export {
  DEFAULT_CORE_WEB_VITALS_BUDGETS,
  DEFAULT_BUNDLE_SIZE_BUDGETS,
  PRODUCTION_BUDGETS,
  DEVELOPMENT_BUDGETS,
  getPerformanceBudgets,
  validateBudgetConfig,
} from './budgets';

// Performance monitoring service
export type {
  PerformanceMetric,
  BudgetViolation,
  PerformanceReport,
  AlertConfig,
} from './monitoring';

export {
  PerformanceMonitoringService,
  performanceMonitor,
} from './monitoring';

// Utility functions
export function createPerformanceMonitor(config?: {
  budgets?: import('./budgets').PerformanceBudgetConfig;
  alerts?: Partial<import('./monitoring').AlertConfig>;
}) {
  return new (require('./monitoring').PerformanceMonitoringService)(config?.budgets, config?.alerts);
}

export function startPerformanceMonitoring(config?: {
  budgets?: import('./budgets').PerformanceBudgetConfig;
  alerts?: Partial<import('./monitoring').AlertConfig>;
}) {
  const monitor = createPerformanceMonitor(config);
  monitor.startMonitoring();
  return monitor;
}