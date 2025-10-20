/**
 * Unified Observability Interfaces
 * 
 * This module defines the core interfaces for the observability stack,
 * providing a unified API for logging, metrics, tracing, and health checking.
 * These interfaces are designed to work together seamlessly and provide
 * consistent observability across all system components.
 */

import { Result } from '../primitives/types';
import { BaseError } from '../primitives/errors';

// ==================== Core Observability Types ====================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'critical';

export interface LogContext {
  component?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  tags?: string[];
  userId?: string;
  traceId?: string;
  requestId?: string;
  sessionId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

// ==================== Logger Interface ====================

/**
 * Unified Logger interface for structured logging with correlation support
 */
export interface Logger {
  /**
   * Log a trace message (most verbose)
   */
  trace(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log a fatal error message
   */
  fatal(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Log a critical error message
   */
  critical(message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Create a child logger with bound context
   */
  child(bindings: Record<string, unknown>): Logger;

  /**
   * Execute function with additional context
   */
  withContext<T>(context: LogContext, fn: () => T): T;

  /**
   * Execute async function with additional context
   */
  withContextAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T>;
}

// ==================== MetricsCollector Interface ====================

/**
 * Unified MetricsCollector interface for collecting application metrics
 */
export interface MetricsCollector {
  /**
   * Increment a counter metric
   */
  counter(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * Set a gauge metric value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Record a histogram observation
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Record a summary observation
   */
  summary(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Increment a gauge metric
   */
  incrementGauge(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * Decrement a gauge metric
   */
  decrementGauge(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * Time an operation and record as histogram
   */
  time<T>(name: string, fn: () => T, labels?: Record<string, string>): T;

  /**
   * Time an async operation and record as histogram
   */
  timeAsync<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T>;

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Record<string, unknown>;
}

// ==================== Tracer Interface ====================

export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';
export type SpanStatus = 'ok' | 'error' | 'unset';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
  flags?: number;
}

export interface Span {
  /**
   * Get the span context
   */
  context(): SpanContext;

  /**
   * Set a single attribute on the span
   */
  setAttribute(key: string, value: string | number | boolean): Span;

  /**
   * Set multiple attributes on the span
   */
  setAttributes(attributes: Record<string, string | number | boolean>): Span;

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): Span;

  /**
   * Set the span status
   */
  setStatus(status: SpanStatus, message?: string): Span;

  /**
   * End the span
   */
  end(endTime?: Date): void;

  /**
   * Check if the span is recording
   */
  isRecording(): boolean;
}

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parent?: Span | SpanContext;
  startTime?: Date;
}

/**
 * Unified Tracer interface for distributed tracing
 */
export interface Tracer {
  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions): Span;

  /**
   * Get the currently active span
   */
  currentSpan(): Span | undefined;

  /**
   * Set the currently active span
   */
  setCurrentSpan(span: Span): void;

  /**
   * Extract trace context from carrier
   */
  extract(carrier: any, format?: string): SpanContext | undefined;

  /**
   * Inject trace context into carrier
   */
  inject(spanContext: SpanContext, carrier: any, format?: string): void;

  /**
   * Execute function with span context
   */
  withSpan<T>(span: Span, fn: () => T): T;

  /**
   * Execute async function with span context
   */
  withSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T>;
}

// ==================== HealthChecker Interface ====================

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  duration: number;
  error?: Error;
}

export interface HealthCheck {
  name: string;
  description?: string;
  check: () => Promise<HealthCheckResult>;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
  tags?: string[];
  dependencies?: string[];
}

export interface AggregatedHealth {
  status: HealthStatus;
  timestamp: Date;
  duration: number;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Unified HealthChecker interface for system health monitoring
 */
export interface HealthChecker {
  /**
   * Register a health check
   */
  registerCheck(name: string, check: HealthCheck): Result<void, BaseError>;

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): Result<void, BaseError>;

  /**
   * Run all health checks and return aggregated results
   */
  checkHealth(): Promise<Result<AggregatedHealth, BaseError>>;

  /**
   * Run a specific health check
   */
  checkHealthFor(name: string): Promise<Result<HealthCheckResult, BaseError>>;

  /**
   * Get list of registered health checks
   */
  getRegisteredChecks(): string[];

  /**
   * Enable a health check
   */
  enableCheck(name: string): Result<void, BaseError>;

  /**
   * Disable a health check
   */
  disableCheck(name: string): Result<void, BaseError>;

  /**
   * Get health check configuration
   */
  getCheckConfig(name: string): Result<HealthCheck, BaseError>;
}

// ==================== Correlation Context Interface ====================

/**
 * Correlation context for request tracing
 */
export interface CorrelationContext {
  correlationId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Correlation manager for managing request context
 */
export interface CorrelationManager {
  /**
   * Start a new request context
   */
  startRequest(context?: Partial<CorrelationContext>): CorrelationContext;

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined;

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined;

  /**
   * Execute function with correlation context
   */
  withContext<T>(context: CorrelationContext, fn: () => T): T;

  /**
   * Execute async function with correlation context
   */
  withContextAsync<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T>;

  /**
   * Set context metadata
   */
  setMetadata(key: string, value: unknown): void;

  /**
   * Get context metadata
   */
  getMetadata(key: string): unknown;
}

// ==================== Configuration Interfaces ====================

export interface LoggingConfig {
  level?: LogLevel;
  format?: 'json' | 'pretty';
  destination?: 'stdout' | 'file' | 'both';
  enableMetrics?: boolean;
  enableInMemoryStorage?: boolean;
  maxStoredLogs?: number;
  redactPaths?: string[];
  logDirectory?: string;
}

export interface MetricsConfig {
  enabled?: boolean;
  prefix?: string;
  defaultLabels?: Record<string, string>;
  exportInterval?: number;
  exporters?: Array<'prometheus' | 'statsd' | 'cloudwatch' | 'console'>;
}

export interface TracingConfig {
  enabled?: boolean;
  serviceName: string;
  serviceVersion?: string;
  samplingRate?: number;
  exporters?: Array<'jaeger' | 'zipkin' | 'otlp' | 'console'>;
}

export interface HealthConfig {
  enabled?: boolean;
  checkInterval?: number;
  cacheTTL?: number;
  defaultTimeout?: number;
  maxConcurrentChecks?: number;
}

/**
 * Complete observability configuration
 */
export interface ObservabilityConfig {
  logging?: LoggingConfig;
  metrics?: MetricsConfig;
  tracing?: TracingConfig;
  health?: HealthConfig;
  correlation?: {
    enabled?: boolean;
    generateIds?: boolean;
    propagateHeaders?: boolean;
  };
}