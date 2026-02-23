/**
 * Observability Monitoring Module
 * 
 * Performance monitoring, error tracking, and log aggregation.
 */

// Error tracking
export { errorTracker } from './error-tracker';
export type {
  ErrorContext,
  TrackedError,
  ErrorPattern,
  AlertRule as ErrorAlertRule,
  IntegrationFilter,
  IntegrationStatus,
} from './error-tracker';

// Performance monitoring
export {
  performanceMonitor,
  PerformanceMonitor,
  monitorOperation,
} from './performance-monitor';

// Log aggregation
export { logAggregator, LogAggregator } from './log-aggregator';

// Monitoring scheduler
export { monitoringScheduler, MonitoringScheduler } from './monitoring-scheduler';

// Monitoring policy (thresholds and constants)
export * from './monitoring-policy';
