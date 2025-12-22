// Re-export the unified logger as the primary logging interface
console.log('DEBUG: Loading logging module from shared/core');
export { UnifiedLogger, logger } from './logger';

// Re-export types for consumers
export type {
  LogLevel,
  LogContext,
  LogMetrics,
  RequestLogData,
  DatabaseQueryLogData,
  CacheOperationLogData,
  SecurityEventLogData,
  BusinessEventLogData,
  PerformanceLogData,
  StoredLogEntry,
  LogQueryFilters,
  LogAggregation,
  LogRotationConfig,
  LoggerOptions,
  ErrorTrackerInterface,
  LogTransport,
  LoggerChild,
} from './types';

// Re-export utilities
export {
  createLogRotationManager,
} from './logger';









































