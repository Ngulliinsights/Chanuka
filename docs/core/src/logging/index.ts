/**
 * Core logging module exports
 */

export { Logger, logger } from './logger';
export * from './legacy-adapters';
export { LogRotationManager, createLogRotationManager } from './log-rotation';
export {
  createRequestLoggingMiddleware,
  contextMiddleware,
  timingMiddleware,
  createRequestLoggingPipeline,
} from './middleware';
export * from './types';

// Legacy logger adapter for backward compatibility
export { logger as legacyLogger } from './legacy-adapters/logger-adapter';

// Re-export commonly used types for convenience
export type {
  LogContext,
  LogMetrics,
  LoggerOptions,
  RequestLogData,
  DatabaseQueryLogData,
  CacheOperationLogData,
  BusinessEventLogData,
  SecurityEventLogData,
} from './types';