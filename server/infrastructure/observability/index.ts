/**
 * Observability — Public Barrel
 *
 * This file is the ONLY entry point for:
 *   import { logger } from '@server/infrastructure/observability'
 *
 * Previously this file did not exist, which made every import of the above
 * path fail silently. All server modules (error-tracker, schema-validation-service,
 * admin-router, external-api-dashboard, etc.) depend on this barrel resolving.
 *
 * Sub-module paths are implementation details — always import from this file.
 */

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  loggingConfig,
  getLoggingConfig,
  validateLoggingConfig,
} from './logging-config';
export type { LoggingConfig } from './logging-config';

// ─── Core logger (most-imported export in the codebase) ──────────────────────
export { logger, logBuffer } from './core';
export type { Logger } from './core';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  PerformanceMetric,
  OperationMetrics,
  ServicePerformanceReport,
  SystemHealthMetrics,
  LogAggregationResult,
  AlertRule,
  AlertCondition,
} from './core';

// ─── HTTP middleware ──────────────────────────────────────────────────────────
export { auditMiddleware, logSensitiveOperation } from './http/audit-middleware';
export * from './http/response-wrapper';

// ─── Security ─────────────────────────────────────────────────────────────────
export {
  isSensitiveEndpoint,
  classifyRisk,
  classifySecurityEventType,
} from '../../features/security/security-policy';
export {
  emitSecurityEvent,
  emitSensitiveOperationAudit,
} from '../../features/security/security-event-logger';

// ─── Database ─────────────────────────────────────────────────────────────────
export {
  databaseLogger,
  DatabaseLogger,
  DatabaseOperationContextBuilder,
} from './database-logger';

// ─── Monitoring ───────────────────────────────────────────────────────────────
export * from './monitoring';
export {
  performanceMonitor,
  PerformanceMonitor,
  monitorOperation,
  logAggregator,
  LogAggregator,
  monitoringScheduler,
  MonitoringScheduler,
  errorTracker,
} from './monitoring';

// ─── Express middleware factories ─────────────────────────────────────────────
import type { NextFunction, Request, Response } from 'express';
import { logger as _logger } from './core/logger';

/** Attach request-finish logging to every Express route. */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    res.on('finish', () => {
      _logger.info({
        message: 'HTTP Request',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - start,
        userAgent: req.get('user-agent'),
      });
    });
    next();
  };
}

/** Log errors that reach the Express error pipeline. */
export function errorLoggingMiddleware() {
  return (err: Error, req: Request, _res: Response, next: NextFunction): void => {
    _logger.error({
      message: 'HTTP Error',
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
    });
    next(err);
  };
}

/** Emit a startup log entry. */
export function initializeServerObservability(config: {
  serviceName: string;
  environment: string;
}): void {
  _logger.info({
    message: 'Server observability initialized',
    ...config,
  });
}