/**
 * Observability Core Module
 * 
 * Core logging and type definitions for the observability stack.
 */

// Logger and buffer
export { logger, logBuffer } from './logger';
export type { Logger } from './logger';

// Log buffer
export { LogBuffer } from './log-buffer';

// Types
export type {
  ObservabilityStack,
  MetricsProvider,
  RiskLevel,
  Severity,
  SecurityEvent,
  SecurityEventType,
  AuditLogEntry,
  DatabaseOperationContext,
  DatabaseOperationResult,
  AuditOperation,
  DbOperation,
  AuditAction,
  AuditEntityType,
  PerformanceMetric,
  OperationMetrics,
  ServicePerformanceReport,
  SystemHealthMetrics,
  LogAggregationResult,
  AlertCondition,
  AlertRule,
} from './types';
