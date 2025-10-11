/**
 * Comprehensive logging types and interfaces for enterprise-grade logging systems
 * Optimized for type safety, extensibility, and runtime performance
 */

// Core log level hierarchy - ordered by severity for easy comparison
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
export type LogLevel = typeof LOG_LEVELS[number];

// Utility type for log level comparison and filtering
export type LogLevelValue = {
  readonly [K in LogLevel]: number;
};

export const LOG_LEVEL_VALUES: LogLevelValue = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
} as const;

/**
 * Base context interface with OpenTelemetry-compatible tracing fields
 * The index signature allows for additional custom context while maintaining type safety
 */
export interface LogContext {
  readonly requestId?: string;
  readonly userId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly operationName?: string;
  readonly timestamp?: Date | string;
  readonly service?: string;
  readonly component?: string;
  // Allow additional properties while preserving type safety for known fields
  readonly [key: string]: unknown;
}

/**
 * Enhanced metrics interface with more comprehensive tracking
 * Includes performance and health indicators
 */
export interface LogMetrics {
  readonly totalLogs: number;
  readonly logsByLevel: Readonly<Record<LogLevel, number>>;
  readonly errorsLogged: number;
  readonly avgLogSize: number;
  readonly logRate: number; // logs per second
  readonly peakLogRate: number;
  readonly droppedLogs: number;
  readonly lastLogTime: Date;
  readonly uptimeSeconds: number;
}

/**
 * Comprehensive logger configuration with sensible defaults
 * Supports various transport options and performance tuning
 */
export interface LoggerOptions {
  readonly level?: LogLevel;
  readonly pretty?: boolean;
  readonly redactPaths?: ReadonlyArray<string>;
  readonly asyncTransport?: boolean;
  readonly maxFileSize?: string;
  readonly maxFiles?: number;
  readonly enableMetrics?: boolean;
  readonly name?: string;
  readonly version?: string;
  readonly environment?: 'development' | 'staging' | 'production' | 'test';
  readonly bufferSize?: number; // For batching logs
  readonly flushInterval?: number; // Milliseconds
  readonly enableSampling?: boolean;
  readonly sampleRate?: number; // 0.0 to 1.0
}

/**
 * Transport configuration with type-safe target specification
 * Supports multiple transport types with proper validation
 */
export interface LogTransportOptions {
  readonly target: 'console' | 'file' | 'http' | 'elasticsearch' | 'cloudwatch' | string;
  readonly level?: LogLevel;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly format?: 'json' | 'text' | 'structured';
  readonly enabled?: boolean;
}

/**
 * HTTP request logging with comprehensive request/response data
 * Includes security and performance tracking fields
 */
export interface RequestLogData {
  readonly method: string;
  readonly url: string;
  readonly userAgent?: string;
  readonly ip?: string;
  readonly userId?: string;
  readonly duration?: number;
  readonly statusCode?: number;
  readonly contentLength?: number;
  readonly referer?: string;
  readonly route?: string; // Parameterized route for aggregation
  readonly requestSize?: number;
  readonly responseHeaders?: Readonly<Record<string, string>>;
}

/**
 * Database operation logging with query performance metrics
 * Supports different database types and operations
 */
export interface DatabaseQueryLogData {
  readonly query: string;
  readonly duration: number;
  readonly params?: ReadonlyArray<unknown>;
  readonly rowCount?: number;
  readonly error?: string;
  readonly database?: string;
  readonly table?: string;
  readonly operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | string;
  readonly connectionId?: string;
  readonly queryPlan?: string;
}

/**
 * Cache operation tracking with hit/miss ratios and performance
 * Supports various cache backends and operation types
 */
export interface CacheOperationLogData {
  readonly operation: 'get' | 'set' | 'del' | 'flush' | 'mget' | 'mset' | 'exists' | 'expire';
  readonly key: string;
  readonly hit?: boolean;
  readonly duration?: number;
  readonly size?: number;
  readonly ttl?: number;
  readonly backend?: 'redis' | 'memcached' | 'memory' | string;
  readonly namespace?: string;
  readonly errorCode?: string;
}

/**
 * Business event tracking with structured metadata
 * Enables business intelligence and audit trails
 */
export interface BusinessEventLogData {
  readonly event: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly userId?: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly version?: string; // Event schema version
  readonly source?: string; // Event source system
  readonly correlationId?: string;
  readonly aggregateId?: string;
}

/**
 * Security event logging with threat assessment
 * Includes risk scoring and incident classification
 */
export interface SecurityEventLogData {
  readonly event: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'authentication' | 'authorization' | 'input_validation' | 'data_access' | 'network' | 'system';
  readonly userId?: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly riskScore?: number; // 0-100 scale
  readonly blocked?: boolean;
  readonly actionTaken?: string;
  readonly ruleName?: string;
  readonly attackSignature?: string;
}

/**
 * Performance monitoring log data
 * Tracks system health and resource utilization
 */
export interface PerformanceLogData {
  readonly metric: string;
  readonly value: number;
  readonly unit: 'ms' | 'bytes' | 'percent' | 'count' | 'rate';
  readonly threshold?: number;
  readonly breached?: boolean;
  readonly component?: string;
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Error tracking with stack traces and context
 * Enhanced error classification and debugging info
 */
export interface ErrorLogData {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly code?: string | number;
  readonly category?: 'validation' | 'business' | 'system' | 'network' | 'external';
  readonly severity?: 'recoverable' | 'fatal';
  readonly context?: Readonly<Record<string, unknown>>;
  readonly fingerprint?: string; // For error deduplication
  readonly occurrenceCount?: number;
  readonly firstSeen?: Date;
  readonly lastSeen?: Date;
}

/**
 * Structured log entry interface
 * The foundation for all log messages with consistent structure
 */
export interface LogEntry<T = unknown> {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: LogContext;
  readonly data?: T;
  readonly error?: ErrorLogData;
  readonly metrics?: Partial<LogMetrics>;
}

/**
 * Log transport interface for implementing custom log destinations
 * Provides standardized contract for all transport implementations
 */
export interface LogTransport {
  readonly name: string;
  readonly level: LogLevel;
  write(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

/**
 * Log formatter interface for custom log formatting
 * Enables different output formats while maintaining structure
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Type guards for runtime type checking
 * Ensures type safety when working with log data at runtime
 */
export const isLogLevel = (value: unknown): value is LogLevel => {
  return typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel);
};

export const isValidLogEntry = (value: unknown): value is LogEntry => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'level' in value &&
    'message' in value &&
    'timestamp' in value &&
    isLogLevel((value as LogEntry).level) &&
    typeof (value as LogEntry).message === 'string'
  );
};

/**
 * Utility types for advanced logging scenarios
 */
export type LogEventHandler<T = unknown> = (entry: LogEntry<T>) => void | Promise<void>;
export type LogFilter = (entry: LogEntry) => boolean;
export type LogSerializer<T> = (data: T) => Record<string, unknown>;






