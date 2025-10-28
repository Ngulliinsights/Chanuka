import { z } from 'zod';

// ==================== Core Types ====================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'critical';

/**
 * Core context interface for structured logging.
 * This gets automatically enriched with async context and request data.
 */
export interface LogContext {
  component?: string | undefined;
  operation?: string | undefined;
  duration?: number | undefined;
  statusCode?: number | undefined;
  errorCode?: string | undefined;
  tags?: string[] | undefined;
  userId?: string | undefined;
  traceId?: string | undefined;
  requestId?: string | undefined;
  sessionId?: string | undefined;
  correlationId?: string | undefined;
  [key: string]: unknown;
}

/**
 * Comprehensive metrics tracking for logger performance and usage
 */
export interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  errorsLogged: number;
  avgLogSize: number;
  logRate: number;
  performanceMetrics: {
    avgProcessingTime: number;
    slowLogs: number;
    p95ProcessingTime: number;
    p99ProcessingTime: number;
  };
}

/**
 * Specialized log data types for different event categories
 */
export interface RequestLogData {
  method: string;
  url: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  contentLength?: number;
  responseTime?: number;
}

export interface DatabaseQueryLogData {
  query: string;
  duration: number;
  rowCount?: number;
  database?: string;
  connectionId?: string;
  slowQuery?: boolean;
}

export interface CacheOperationLogData {
  operation: 'get' | 'set' | 'delete' | 'clear' | 'exists';
  key: string;
  hit: boolean;
  duration?: number;
  size?: number;
  ttl?: number;
}

export interface SecurityEventLogData {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
  userAgent?: string;
  sessionId?: string;
}

export interface BusinessEventLogData {
  event: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceLogData {
  operation: string;
  duration: number;
  threshold?: number;
  exceeded?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Internal log entry for in-memory storage and querying
 */
export interface StoredLogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext | undefined;
  metadata?: Record<string, unknown> | undefined;
  correlationId: string;
  traceId?: string | undefined;
  requestId?: string | undefined;
  userId?: string | undefined;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  component?: string | undefined;
  operation?: string | undefined;
  duration?: number | undefined;
  error?: Record<string, unknown> | undefined;
}

/**
 * Query filters for searching stored logs
 */
export interface LogQueryFilters {
  level?: LogLevel[];
  component?: string[];
  operation?: string[];
  timeRange?: { start: Date; end: Date };
  correlationId?: string;
  traceId?: string;
  requestId?: string;
  userId?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Aggregated statistics about logged events
 */
export interface LogAggregation {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByComponent: Record<string, number>;
  logsByOperation: Record<string, number>;
  recentLogs: StoredLogEntry[];
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalErrors: number;
    errorRate: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  maxFileSize: string | number;
  maxFiles: number;
  compress: boolean;
  compressAfterDays?: number;
  deleteAfterDays?: number;
}

/**
 * Complete logger configuration options
 */
export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  version?: string;
  environment?: string;
  pretty?: boolean;
  asyncTransport?: boolean;
  enableMetrics?: boolean;
  enableInMemoryStorage?: boolean;
  maxStoredLogs?: number;
  redactPaths?: string[];
  maxFileSize?: string | number;
  maxFiles?: number;
  logDirectory?: string;
  slowRequestThreshold?: number;
  metricsReportInterval?: number;
  timerCleanupInterval?: number;
  enableTracing?: boolean;
  samplingRate?: number;
  enableCorrelationIds?: boolean;
  correlationIdGenerator?: () => string;
}

/**
 * Minimal interface for error tracker implementations
 */
export interface ErrorTrackerInterface {
  trackError: (
    error: Error | string,
    context?: Record<string, unknown>,
    severity?: string,
    category?: string
  ) => any;
}

/**
 * Transport interface for log outputs
 */
export interface LogTransport {
  name: string;
  level: LogLevel;
  write: (entry: StoredLogEntry) => Promise<void> | void;
  flush?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
}

/**
 * Logger child context for scoped logging
 */
export interface LoggerChild {
  trace(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  error(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  fatal(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  critical(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerChild;
  withContext<T>(context: LogContext, fn: () => T): T;
  withContextAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T>;
}

// ==================== Validation Schemas ====================

export const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'critical']);

export const logContextSchema = z.object({
  component: z.string().optional(),
  operation: z.string().optional(),
  duration: z.number().optional(),
  statusCode: z.number().optional(),
  errorCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  traceId: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
}).catchall(z.unknown());

export const loggerOptionsSchema = z.object({
  level: logLevelSchema.optional(),
  name: z.string().optional(),
  version: z.string().optional(),
  environment: z.string().optional(),
  pretty: z.boolean().optional(),
  asyncTransport: z.boolean().optional(),
  enableMetrics: z.boolean().optional(),
  enableInMemoryStorage: z.boolean().optional(),
  maxStoredLogs: z.number().min(1).max(100000).optional(),
  redactPaths: z.array(z.string()).optional(),
  maxFileSize: z.union([z.string(), z.number()]).optional(),
  maxFiles: z.number().min(1).max(100).optional(),
  logDirectory: z.string().optional(),
  slowRequestThreshold: z.number().min(0).optional(),
  metricsReportInterval: z.number().min(1000).optional(),
  timerCleanupInterval: z.number().min(1000).optional(),
  enableTracing: z.boolean().optional(),
  samplingRate: z.number().min(0).max(1).optional(),
  enableCorrelationIds: z.boolean().optional(),
});

export const logQueryFiltersSchema = z.object({
  level: z.array(logLevelSchema).optional(),
  component: z.array(z.string()).optional(),
  operation: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  correlationId: z.string().optional(),
  traceId: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  limit: z.number().min(1).max(10000).optional(),
  offset: z.number().min(0).optional(),
  search: z.string().optional(),
});

// ==================== Constants ====================

export const DEFAULT_CONFIG = {
  MAX_STORED_LOGS: 10000,
  SLOW_REQUEST_THRESHOLD_MS: 5000,
  METRICS_REPORT_INTERVAL_MS: 300000, // 5 minutes
  TIMER_CLEANUP_INTERVAL_MS: 600000, // 10 minutes
  MAX_TIMER_AGE_MS: 3600000, // 1 hour
  LOG_ROTATION_CHECK_INTERVAL_MS: 60000, // 1 minute
  MAX_DEPTH: 10,
  REDACT_CENSOR: '[REDACTED]',
  DEFAULT_SAMPLING_RATE: 0.1,
  CORRELATION_ID_LENGTH: 16,
} as const;

export const SENSITIVE_PATHS = [
  '*.password',
  '*.token',
  '*.ssn',
  '*.creditCard',
  '*.authorization',
  '*.cookie',
  '*.secret',
  '*.key',
  '*.apiKey',
  '*.privateKey',
  '*.accessToken',
  '*.refreshToken',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.token',
  'req.body.apiKey',
  '*.databaseUrl',
  '*.connectionString',
] as const;

export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
  critical: 6,
} as const;





































