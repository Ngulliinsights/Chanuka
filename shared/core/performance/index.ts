/**
 * Performance Monitoring Module
 *
 * Comprehensive performance budget system with Core Web Vitals tracking,
 * automated monitoring, and CI/CD integration.
 */
console.log('DEBUG: Loading performance module from shared/core');

// Budget configuration and types
export type {
  PerformanceBudget,
  CoreWebVitalsBudgets,
  BundleSizeBudgets,
  StylingBudgets,
  PerformanceBudgetConfig,
} from './budgets';

export {
  DEFAULT_CORE_WEB_VITALS_BUDGETS,
  DEFAULT_BUNDLE_SIZE_BUDGETS,
  DEFAULT_STYLING_BUDGETS,
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

// Method timing service
export type {
  MethodTimingData,
  MethodTimingStats,
  MethodTimingConfig,
  TimingHandle,
} from './method-timing';

export {
  MethodTimingService,
  methodTimingService,
  timed,
  timeMethod,
  getGlobalMethodTimingService,
  setGlobalMethodTimingService,
} from './method-timing';

// Unified performance monitoring service
export type {
  UnifiedPerformanceMetric,
  EnvironmentPerformanceReport,
  PerformanceInsight,
  CrossEnvironmentComparison,
  UnifiedMonitoringConfig,
} from './unified-monitoring';

export {
  UnifiedPerformanceMonitoringService,
  unifiedPerformanceMonitor,
} from './unified-monitoring';

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



