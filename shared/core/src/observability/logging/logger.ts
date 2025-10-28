import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { promises as fs } from 'fs';
import { stat } from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

import {
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
  DEFAULT_CONFIG,
  SENSITIVE_PATHS,
  LOG_LEVEL_VALUES,
  logContextSchema,
  loggerOptionsSchema,
} from './types';

// ==================== Utility Functions ====================

/**
 * Safely normalizes errors into structured objects for logging.
 * Handles circular references, nested causes, and edge cases.
 * Optimized with early returns and reduced allocations.
 */
function normalizeError(err: unknown): Record<string, unknown> {
  // Fast path for null/undefined
  if (err == null) {
    return { error: String(err), type: typeof err };
  }

  // Fast path for Error instances
  if (err instanceof Error) {
    const normalized: Record<string, unknown> = {
      message: err.message,
      name: err.name,
    };

    // Only include stack in non-production for security
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      normalized.stack = err.stack;
    }

    // Recursively handle error causes (ES2022 feature)
    if ('cause' in err && err.cause !== undefined) {
      normalized.cause = normalizeError(err.cause);
    }

    return normalized;
  }

  // Fast path for primitives
  if (typeof err !== 'object') {
    return { error: String(err), type: typeof err };
  }

  // Handle complex objects with circular reference protection
  try {
    const seen = new WeakSet<object>();

    const serialize = (obj: unknown, depth = 0): unknown => {
      // Depth limit to prevent stack overflow
      if (depth > DEFAULT_CONFIG.MAX_DEPTH) return '[Max Depth Exceeded]';

      // Handle primitives and null
      if (obj === null || typeof obj !== 'object') return obj;

      // Handle Error instances recursively
      if (obj instanceof Error) return normalizeError(obj);

      // Check for circular references
      if (seen.has(obj)) return '[Circular]';

      seen.add(obj);

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item, depth + 1));
      }

      // Handle plain objects
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = serialize(value, depth + 1);
      }
      return result;
    };

    return serialize(err) as Record<string, unknown>;
  } catch (serializeError) {
    return {
      error: 'Unserializable object',
      type: Object.prototype.toString.call(err),
      serializationError: serializeError instanceof Error ? serializeError.message : String(serializeError),
    };
  }
}

/**
 * Parse size strings like '10MB' into bytes.
 * Optimized with cached regex and direct lookup.
 */
const SIZE_REGEX = /^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i;
const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1048576, // Pre-calculated 1024 * 1024
  GB: 1073741824, // Pre-calculated 1024 * 1024 * 1024
};

function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  const asString = String(size);
  const match = asString.match(SIZE_REGEX);
  if (!match) return parseInt(asString, 10) || 0;

  const value = match[1] || '0';
  const unitRaw = match[2];
  const unitStr = unitRaw ? unitRaw.toUpperCase() : 'B';
  const multiplier = SIZE_UNITS[unitStr] ?? 1;
  return parseFloat(value) * multiplier;
}

/**
 * Calculate percentile value from sorted array.
 * Optimized utility to avoid repetition.
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil(sortedValues.length * percentile) - 1;
  const idx = Math.max(0, Math.min(index, sortedValues.length - 1));
  return sortedValues[idx] ?? 0;
}

/**
 * Generate unique correlation ID efficiently using base36 encoding.
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex').substring(0, 8);
  return `${timestamp}-${random}`;
}

// ==================== Circular Buffer Implementation ====================

/**
 * Efficient circular buffer for log storage.
 * Optimized to reduce array operations and memory overhead.
 */
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer, overwriting oldest if full.
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  /**
   * Get all valid items in chronological order.
   * Optimized to avoid creating intermediate arrays.
   */
  getAll(): T[] {
    if (this.size === 0) return [];

    const result: T[] = [];
    const start = this.size < this.capacity ? 0 : this.head;

    for (let i = 0; i < this.size; i++) {
      const index = (start + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) result.push(item);
    }

    return result;
  }

  /**
   * Filter items efficiently without multiple passes.
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    const start = this.size < this.capacity ? 0 : this.head;

    for (let i = 0; i < this.size; i++) {
      const index = (start + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined && predicate(item)) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Clear all items efficiently.
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
  }

  /**
   * Get current number of stored items.
   */
  getSize(): number {
    return this.size;
  }
}

// ==================== Log Rotation Manager ====================

export interface LogRotationManager {
  setupRotationCheck(logFilePath: string): void;
  stopAllRotationChecks(): void;
  rotateLog(logFilePath: string): Promise<void>;
}

export function createLogRotationManager(config: LogRotationConfig): LogRotationManager {
  const intervals = new Map<string, NodeJS.Timeout>();
  const maxSizeBytes = parseSize(config.maxFileSize);

  async function shouldRotate(filePath: string): Promise<boolean> {
    try {
      const stats = await stat(filePath);
      return stats.size >= maxSizeBytes;
    } catch {
      return false; // File doesn't exist or can't be accessed
    }
  }

  async function rotateLog(logFilePath: string): Promise<void> {
    try {
      const dir = path.dirname(logFilePath);
      const ext = path.extname(logFilePath);
      const base = path.basename(logFilePath, ext);

      // Shift existing rotated files (newest to oldest to avoid overwrites)
      for (let i = config.maxFiles - 1; i > 0; i--) {
        const oldPath = path.join(dir, `${base}.${i}${ext}${config.compress ? '.gz' : ''}`);
        const newPath = path.join(dir, `${base}.${i + 1}${ext}${config.compress ? '.gz' : ''}`);

        try {
          await fs.rename(oldPath, newPath);
        } catch {
          // File doesn't exist, continue
        }
      }

      // Rotate current file to .1
      const rotatedPath = path.join(dir, `${base}.1${ext}`);
      await fs.rename(logFilePath, rotatedPath);

      // Compress if enabled (asynchronously to avoid blocking)
      if (config.compress) {
        setImmediate(async () => {
          try {
            const { createGzip } = await import('zlib');
            const { createReadStream, createWriteStream } = await import('fs');
            const { pipeline } = await import('stream/promises');

            const gzip = createGzip();
            const source = createReadStream(rotatedPath);
            const destination = createWriteStream(`${rotatedPath}.gz`);

            await pipeline(source, gzip, destination);
            await fs.unlink(rotatedPath);
          } catch (compressionError) {
            console.error('Error compressing rotated log:', compressionError);
          }
        });
      }
    } catch (error) {
      console.error('Error rotating log:', error);
    }
  }

  function setupRotationCheck(logFilePath: string): void {
    // Prevent duplicate intervals for same file
    if (intervals.has(logFilePath)) return;

    const interval = setInterval(async () => {
      if (await shouldRotate(logFilePath)) {
        await rotateLog(logFilePath);
      }
    }, DEFAULT_CONFIG.LOG_ROTATION_CHECK_INTERVAL_MS);

    intervals.set(logFilePath, interval);
  }

  function stopAllRotationChecks(): void {
    for (const interval of intervals.values()) {
      clearInterval(interval);
    }
    intervals.clear();
  }

  return {
    setupRotationCheck,
    stopAllRotationChecks,
    rotateLog,
  };
}

// ==================== Transport Implementations ====================

/**
 * Console transport for development
 */
class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  write(entry: StoredLogEntry): void {
    const levelValue = LOG_LEVEL_VALUES[entry.level];
    const configuredLevel = LOG_LEVEL_VALUES[this.level];

    if (levelValue < configuredLevel) return;

    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const correlationId = entry.correlationId ? `[${entry.correlationId}]` : '';
    const component = entry.component ? `[${entry.component}]` : '';

    const prefix = `${timestamp} ${level} ${correlationId} ${component}`.trim();
    const message = `${prefix} ${entry.message}`;

    // Use appropriate console method
    switch (entry.level) {
      case 'error':
      case 'fatal':
      case 'critical':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      default:
        console.log(message);
    }

    // Log additional context in development
    if (process.env.NODE_ENV !== 'production') {
      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log('  Context:', JSON.stringify(entry.context, null, 2));
      }
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log('  Metadata:', JSON.stringify(entry.metadata, null, 2));
      }
    }
  }
}

/**
 * File transport with rotation support
 */
class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel;
  private filePath: string;
  private rotationManager?: LogRotationManager;
  private writeStream?: fsSync.WriteStream;

  constructor(level: LogLevel, filePath: string, rotationConfig?: LogRotationConfig) {
    this.level = level;
    this.filePath = filePath;

    if (rotationConfig) {
      this.rotationManager = createLogRotationManager(rotationConfig);
      this.rotationManager.setupRotationCheck(filePath);
    }

    this.initializeWriteStream();
  }

  private initializeWriteStream(): void {
    this.writeStream = fsSync.createWriteStream(this.filePath, { flags: 'a' });
  }

  write(entry: StoredLogEntry): void {
    if (!this.writeStream) return;

    const levelValue = LOG_LEVEL_VALUES[entry.level];
    const configuredLevel = LOG_LEVEL_VALUES[this.level];

    if (levelValue < configuredLevel) return;

    const logLine = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      correlationId: entry.correlationId,
      ...entry.context,
      ...entry.metadata,
    }) + '\n';

    this.writeStream.write(logLine);
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream!.end(() => resolve());
      });
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.rotationManager) {
      this.rotationManager.stopAllRotationChecks();
    }
  }
}

// ==================== Main Logger Class ====================

/**
 * Enhanced unified logger with optimized performance and memory usage.
 *
 * Key optimizations:
 * - Circular buffer for efficient log storage
 * - Reduced object allocations in hot paths
 * - Cached computations where possible
 * - Efficient filtering and aggregation
 * - Automatic timer cleanup to prevent memory leaks
 */
export class UnifiedLogger implements LoggerChild {
  private asyncLocalStorage: AsyncLocalStorage<LogContext>;
  private transports: LogTransport[] = [];

  // In-memory storage with circular buffer
  private logBuffer: CircularBuffer<StoredLogEntry>;
  private readonly storageEnabled: boolean;

  // Performance tracking with automatic cleanup
  private performanceTimers = new Map<string, { startTime: number; timestamp: number }>();
  private timerCleanupInterval?: NodeJS.Timeout;

  // Metrics
  private startTime = Date.now();
  private metrics: LogMetrics = {
    totalLogs: 0,
    logsByLevel: {},
    errorsLogged: 0,
    avgLogSize: 0,
    logRate: 0,
    performanceMetrics: {
      avgProcessingTime: 0,
      slowLogs: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
    },
  };

  // Configuration
  private config: LoggerOptions;
  private readonly slowRequestThreshold: number;
  private readonly samplingRate: number;
  private readonly enableTracing: boolean;
  private readonly enableCorrelationIds: boolean;
  private readonly correlationIdGenerator: () => string;

  // Error tracker integration (lazy-loaded)
  private errorTracker: ErrorTrackerInterface | null = null;

  constructor(options: LoggerOptions = {}) {
    // Validate configuration
    const validatedConfig = loggerOptionsSchema.parse(options);
    this.config = {
      level: (validatedConfig.level || 'info') as LogLevel,
      pretty: validatedConfig.pretty ?? process.env.NODE_ENV !== 'production',
      asyncTransport: validatedConfig.asyncTransport ?? true,
      enableMetrics: validatedConfig.enableMetrics ?? true,
      enableInMemoryStorage: validatedConfig.enableInMemoryStorage ?? true,
      maxStoredLogs: validatedConfig.maxStoredLogs ?? DEFAULT_CONFIG.MAX_STORED_LOGS,
      redactPaths: validatedConfig.redactPaths ?? [...SENSITIVE_PATHS],
      maxFileSize: validatedConfig.maxFileSize ?? '10MB',
      maxFiles: validatedConfig.maxFiles ?? 5,
      logDirectory: validatedConfig.logDirectory ?? './logs',
      slowRequestThreshold: validatedConfig.slowRequestThreshold ?? DEFAULT_CONFIG.SLOW_REQUEST_THRESHOLD_MS,
      metricsReportInterval: validatedConfig.metricsReportInterval ?? DEFAULT_CONFIG.METRICS_REPORT_INTERVAL_MS,
      timerCleanupInterval: validatedConfig.timerCleanupInterval ?? DEFAULT_CONFIG.TIMER_CLEANUP_INTERVAL_MS,
      enableTracing: validatedConfig.enableTracing ?? false,
      samplingRate: validatedConfig.samplingRate ?? DEFAULT_CONFIG.DEFAULT_SAMPLING_RATE,
      enableCorrelationIds: validatedConfig.enableCorrelationIds ?? true,
    };

    this.asyncLocalStorage = new AsyncLocalStorage();
    this.storageEnabled = this.config.enableInMemoryStorage ?? true;
    this.slowRequestThreshold = this.config.slowRequestThreshold ?? DEFAULT_CONFIG.SLOW_REQUEST_THRESHOLD_MS;
    this.samplingRate = this.config.samplingRate ?? DEFAULT_CONFIG.DEFAULT_SAMPLING_RATE;
    this.enableTracing = this.config.enableTracing ?? false;
    this.enableCorrelationIds = this.config.enableCorrelationIds ?? true;
    this.correlationIdGenerator = this.config.correlationIdGenerator ?? generateCorrelationId;

    // Initialize circular buffer for efficient storage
    const maxStoredLogs = this.config.maxStoredLogs || DEFAULT_CONFIG.MAX_STORED_LOGS;
    this.logBuffer = new CircularBuffer<StoredLogEntry>(maxStoredLogs);

    // Set up transports
    this.setupTransports();

    // Enable periodic metrics reporting if requested
    if (this.config.enableMetrics) {
      this.enableMetricsReporting(this.config.metricsReportInterval);
    }

    // Set up automatic timer cleanup to prevent memory leaks
    this.enableTimerCleanup(this.config.timerCleanupInterval);
  }

  private setupTransports(): void {
    const isDev = process.env.NODE_ENV !== 'production';

    // Console transport for development or when pretty printing is enabled
    if (isDev || this.config.pretty) {
      this.transports.push(new ConsoleTransport(this.config.level));
    }

    // File transports for persistence
    if (this.config.asyncTransport !== false) {
      const logDir = this.config.logDirectory || './logs';

      // General application logs
      this.transports.push(new FileTransport(
        'debug',
        path.join(logDir, 'app.log'),
        {
          maxFileSize: this.config.maxFileSize || '10MB',
          maxFiles: this.config.maxFiles || 5,
          compress: true,
        }
      ));

      // Error logs
      this.transports.push(new FileTransport(
        'error',
        path.join(logDir, 'error.log'),
        {
          maxFileSize: this.config.maxFileSize || '10MB',
          maxFiles: this.config.maxFiles || 5,
          compress: true,
        }
      ));

      // Security logs
      this.transports.push(new FileTransport(
        'warn',
        path.join(logDir, 'security.log'),
        {
          maxFileSize: this.config.maxFileSize || '10MB',
          maxFiles: this.config.maxFiles || 5,
          compress: true,
        }
      ));

      // Performance logs
      this.transports.push(new FileTransport(
        'info',
        path.join(logDir, 'performance.log'),
        {
          maxFileSize: this.config.maxFileSize || '10MB',
          maxFiles: this.config.maxFiles || 5,
          compress: true,
        }
      ));
    }
  }

  /**
   * Enables automatic cleanup of stale performance timers.
   * Prevents memory leaks from timers that are never ended.
   */
  private enableTimerCleanup(interval?: number): void {
    const cleanupInterval = interval || DEFAULT_CONFIG.TIMER_CLEANUP_INTERVAL_MS;

    this.timerCleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleTimers: string[] = [];

      for (const [name, timer] of this.performanceTimers.entries()) {
        if (now - timer.timestamp > DEFAULT_CONFIG.MAX_TIMER_AGE_MS) {
          staleTimers.push(name);
        }
      }

      for (const name of staleTimers) {
        this.performanceTimers.delete(name);
        this.warn(`Cleaned up stale timer: ${name}`, { component: 'performance' });
      }
    }, cleanupInterval);

    // Prevent interval from keeping process alive
    if (this.timerCleanupInterval) {
      this.timerCleanupInterval.unref();
    }
  }

  // ==================== Context Management ====================

  /**
   * Execute a function with logging context that persists across async boundaries.
   */
  withContext<T>(context: LogContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Execute an async function with logging context.
   */
  async withContextAsync<T>(
    context: LogContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Get current async logging context.
   */
  getContext(): LogContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Create a child logger with permanent context bindings.
   */
  child(bindings: Record<string, unknown>): LoggerChild {
    const childLogger = Object.create(this) as UnifiedLogger;
    // Merge bindings with existing context
    const existingContext = this.getContext();
    const mergedContext = existingContext
      ? { ...existingContext, ...bindings }
      : bindings;

    childLogger.asyncLocalStorage = new AsyncLocalStorage();
    childLogger.asyncLocalStorage.run(mergedContext, () => {});

    return childLogger;
  }

  // ==================== Core Logging Methods ====================

  trace(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.logInternal('trace', message, context, metadata);
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.logInternal('debug', message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.logInternal('info', message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    this.logInternal('warn', message, context, metadata);
  }

  error(
    message: string,
    context?: LogContext,
    metadataOrError?: Record<string, unknown> | unknown
  ): void {
    const metadata = this.processErrorMetadata(metadataOrError);
    this.logInternal('error', message, context, metadata);
  }

  fatal(
    message: string,
    context?: LogContext,
    metadataOrError?: Record<string, unknown> | unknown
  ): void {
    const metadata = this.processErrorMetadata(metadataOrError);
    this.logInternal('fatal', message, context, metadata);
  }

  critical(
    message: string,
    context?: LogContext,
    metadataOrError?: Record<string, unknown> | unknown
  ): void {
    const metadata = this.processErrorMetadata(metadataOrError);
    this.logInternal('fatal', message, context, metadata);
  }

  /**
   * Internal logging implementation with full context enrichment.
   * Optimized to reduce object allocations and method calls.
   */
  private logInternal(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    // Check if we should sample this log
    if (this.enableTracing && level === 'trace' && Math.random() > this.samplingRate) {
      return;
    }

    // Merge contexts efficiently (only if both exist)
    const asyncContext = this.getContext();
    const enrichedContext = asyncContext
      ? context
        ? { ...asyncContext, ...context }
        : asyncContext
      : context;

    // Extract request context from global scope if available
    const reqCtx = this.extractRequestContext();
    if (reqCtx && enrichedContext) {
      Object.assign(enrichedContext, reqCtx);
    }

    // Generate correlation ID if enabled and not present
    let correlationId = enrichedContext?.correlationId as string;
    if (this.enableCorrelationIds && !correlationId) {
      correlationId = this.correlationIdGenerator();
      if (enrichedContext) {
        enrichedContext.correlationId = correlationId;
      }
    }

    // Build log entry
    const entry: StoredLogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: enrichedContext && Object.keys(enrichedContext).length > 0 ? enrichedContext : undefined,
      metadata,
      correlationId: correlationId || this.correlationIdGenerator(),
      traceId: enrichedContext?.traceId as string,
      requestId: enrichedContext?.requestId as string,
      userId: enrichedContext?.userId as string,
      sessionId: enrichedContext?.sessionId as string,
      ipAddress: enrichedContext?.ip as string,
      userAgent: enrichedContext?.userAgent as string,
      component: enrichedContext?.component as string,
      operation: enrichedContext?.operation as string,
      duration: enrichedContext?.duration as number,
      error: level === 'error' || level === 'fatal' || level === 'critical' ? normalizeError(metadata?.error) : undefined,
    };

    // Write to all transports
    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch (error) {
        // Don't let transport errors break logging
        console.error('Transport error:', error);
      }
    }

    // Store in memory if enabled
    if (this.storageEnabled) {
      this.logBuffer.push(entry);

      // Forward errors to error tracker (async, non-blocking)
      if (level === 'error' || level === 'fatal' || level === 'critical') {
        this.forwardToErrorTracker(entry).catch(() => {});
      }
    }

    // Update metrics
    this.updateMetrics(level, message.length + (metadata ? JSON.stringify(metadata).length : 0));
  }

  /**
   * Extracts request context from global scope.
   * Optimized to avoid unnecessary property access.
   */
  private extractRequestContext(): Partial<LogContext> | undefined {
    if (typeof globalThis !== 'undefined' && 'requestContext' in globalThis) {
      return (globalThis as { requestContext?: Partial<LogContext> }).requestContext;
    }
    return undefined;
  }

  /**
   * Processes error metadata with smart type detection.
   */
  private processErrorMetadata(
    metadataOrError?: Record<string, unknown> | unknown
  ): Record<string, unknown> | undefined {
    if (metadataOrError === undefined) return undefined;

    // If it's already a plain metadata object, return as-is
    if (
      typeof metadataOrError === 'object' &&
      metadataOrError !== null &&
      !('stack' in metadataOrError) &&
      !(metadataOrError instanceof Error)
    ) {
      return metadataOrError as Record<string, unknown>;
    }

    // Otherwise, normalize as error
    return { error: normalizeError(metadataOrError) };
  }

  // ==================== Specialized Logging Methods ====================

  logRequest(data: RequestLogData, message?: string): void {
    const msg = message || `${data.method} ${data.url} - ${data.statusCode || 'pending'}`;
    this.info(msg, {
      component: 'http',
      operation: 'request',
      statusCode: data.statusCode,
      duration: data.duration,
      method: data.method,
      url: data.url,
      userAgent: data.userAgent,
      ip: data.ip,
      contentLength: data.contentLength,
      responseTime: data.responseTime,
    }, { request: data });
  }

  logDatabaseQuery(data: DatabaseQueryLogData, message?: string): void {
    const msg = message || `Database query executed in ${data.duration}ms`;
    const level: LogLevel = data.duration > 1000 ? 'warn' : 'debug';
    this.logInternal(level, msg, {
      component: 'database',
      operation: 'query',
      duration: data.duration,
      database: data.database,
      connectionId: data.connectionId,
      slowQuery: data.slowQuery,
    }, { database: data });
  }

  logCacheOperation(data: CacheOperationLogData, message?: string): void {
    const msg = message || `Cache ${data.operation} for key ${data.key} - ${data.hit ? 'HIT' : 'MISS'}`;
    this.debug(msg, {
      component: 'cache',
      operation: data.operation,
      key: data.key,
      hit: data.hit,
      duration: data.duration,
      size: data.size,
      ttl: data.ttl,
    }, { cache: data });
  }

  logSecurityEvent(data: SecurityEventLogData, message?: string): void {
    const msg = message || `Security event: ${data.event} (${data.severity})`;
    const level = this.mapSecuritySeverity(data.severity);

    this.logInternal(level, msg, {
      component: 'security',
      operation: data.event,
      userId: data.userId,
      severity: data.severity,
      ip: data.ip,
      sessionId: data.sessionId,
      tags: ['security', 'audit', data.severity],
    }, { security: data });
  }

  logBusinessEvent(data: BusinessEventLogData, message?: string): void {
    const msg = message || `Business event: ${data.event}`;
    this.info(msg, {
      component: 'business',
      operation: data.event,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      sessionId: data.sessionId,
      tags: ['business-event'],
    }, { business: data });
  }

  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const level: LogLevel = duration > this.slowRequestThreshold ? 'warn' : 'info';
    this.logInternal(
      level,
      `Performance: ${operation} completed in ${duration.toFixed(2)}ms`,
      {
        component: 'performance',
        operation,
        duration,
        threshold: this.slowRequestThreshold,
        exceeded: duration > this.slowRequestThreshold,
        tags: duration > this.slowRequestThreshold ? ['slow-operation'] : undefined,
      },
      metadata
    );
  }

  // ==================== Performance Measurement ====================

  /**
   * Start a named performance timer with timestamp for cleanup.
   */
  startTimer(operationName: string): void {
    this.performanceTimers.set(operationName, {
      startTime: performance.now(),
      timestamp: Date.now(),
    });
  }

  /**
   * End a performance timer and log the duration.
   */
  endTimer(operationName: string, additionalData?: Record<string, unknown>): number {
    const timer = this.performanceTimers.get(operationName);
    if (!timer) {
      this.warn(`Timer not found: ${operationName}`, { component: 'performance' });
      return 0;
    }

    const duration = performance.now() - timer.startTime;
    this.performanceTimers.delete(operationName);
    this.logPerformance(operationName, duration, additionalData);

    return duration;
  }

  /**
   * Measure async function execution time.
   */
  async measureAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    additionalData?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.logPerformance(operationName, duration, {
        success: true,
        ...additionalData
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logPerformance(operationName, duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...additionalData
      });
      throw error;
    }
  }

  /**
   * Measure sync function execution time.
   */
  measure<T>(
    operationName: string,
    fn: () => T,
    additionalData?: Record<string, unknown>
  ): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.logPerformance(operationName, duration, {
        success: true,
        ...additionalData
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logPerformance(operationName, duration, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...additionalData
      });
      throw error;
    }
  }

  // ==================== In-Memory Storage & Querying ====================

  /**
   * Inject an error tracker implementation.
   */
  setErrorTracker(tracker: ErrorTrackerInterface | null): void {
    this.errorTracker = tracker;
  }

  /**
   * Forwards error logs to error tracker asynchronously.
   */
  private async forwardToErrorTracker(entry: StoredLogEntry): Promise<void> {
    if (!this.errorTracker) return;

    try {
      await this.errorTracker.trackError(
        entry.message,
        {
          traceId: entry.traceId,
          userId: entry.userId,
          ip: entry.ipAddress,
          url: entry.context?.operation,
          method: entry.context?.component,
          headers: entry.userAgent ? { 'User-Agent': entry.userAgent } : undefined,
          endpoint: entry.context?.operation,
          currentAvg: entry.context?.duration,
        },
        entry.level === 'critical' || entry.level === 'fatal' ? 'critical' : 'high',
        'system'
      );
    } catch (error) {
      // Silently fail to prevent cascading failures
    }
  }

  /**
   * Query stored logs with comprehensive filters.
   * Optimized to use circular buffer's efficient filtering.
   */
  queryLogs(filters: LogQueryFilters): StoredLogEntry[] {
    if (!this.storageEnabled) {
      throw new Error('In-memory storage is not enabled. Set enableInMemoryStorage: true');
    }

    // Build composite filter for single-pass filtering
    const predicate = (log: StoredLogEntry): boolean => {
      if (filters.correlationId && log.correlationId !== filters.correlationId) return false;
      if (filters.traceId && log.traceId !== filters.traceId) return false;
      if (filters.requestId && log.requestId !== filters.requestId) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.ipAddress && log.ipAddress !== filters.ipAddress) return false;

      if (filters.timeRange) {
        const { start, end } = filters.timeRange;
        if (log.timestamp < start || log.timestamp > end) return false;
      }

      if (filters.level && filters.level.length > 0) {
        if (!filters.level.includes(log.level)) return false;
      }

      if (filters.component && filters.component.length > 0) {
        if (!log.component || !filters.component.includes(log.component)) {
          return false;
        }
      }

      if (filters.operation && filters.operation.length > 0) {
        if (!log.operation || !filters.operation.includes(log.operation)) {
          return false;
        }
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(searchLower);
        const contextMatch = log.context && JSON.stringify(log.context).toLowerCase().includes(searchLower);
        if (!messageMatch && !contextMatch) return false;
      }

      return true;
    };

    let results = this.logBuffer.filter(predicate);

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit;

    if (offset > 0) {
      results = results.slice(offset);
    }

    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Get logs by correlation ID in chronological order.
   */
  getLogsByCorrelation(correlationId: string): StoredLogEntry[] {
    if (!this.storageEnabled) {
      throw new Error('In-memory storage is not enabled');
    }

    const logs = this.logBuffer.filter(log => log.correlationId === correlationId);
    logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return logs;
  }

  /**
   * Get aggregated log statistics with performance metrics.
   * Optimized for single-pass aggregation.
   */
  getLogAggregation(timeWindowMs: number = 3600000): LogAggregation {
    if (!this.storageEnabled) {
      throw new Error('In-memory storage is not enabled');
    }

    const cutoffTime = new Date(Date.now() - timeWindowMs);
    const recentLogs = this.logBuffer.filter(log => log.timestamp >= cutoffTime);

    const aggregation: LogAggregation = {
      totalLogs: recentLogs.length,
      logsByLevel: {
        trace: 0,
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0,
        critical: 0,
      },
      logsByComponent: {},
      logsByOperation: {},
      recentLogs: [],
      errorRate: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        slowRequests: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalErrors: 0,
        errorRate: 0,
      },
      timeRange: {
        start: cutoffTime,
        end: new Date(),
      },
    };

    if (recentLogs.length === 0) return aggregation;

    // Single-pass aggregation for maximum efficiency
    const responseTimes: number[] = [];
    let errorCount = 0;
    let totalResponseTime = 0;

    for (const log of recentLogs) {
      // Count by level
      aggregation.logsByLevel[log.level]++;

      // Count by component
      if (log.component) {
        const component = log.component;
        aggregation.logsByComponent[component] = (aggregation.logsByComponent[component] || 0) + 1;
      }

      // Count by operation
      if (log.operation) {
        const operation = log.operation;
        aggregation.logsByOperation[operation] = (aggregation.logsByOperation[operation] || 0) + 1;
      }

      // Count errors
      if (log.level === 'error' || log.level === 'fatal' || log.level === 'critical') {
        errorCount++;
      }

      // Collect response times
      if (typeof log.duration === 'number') {
        const duration = log.duration;
        responseTimes.push(duration);
        totalResponseTime += duration;

        if (duration > this.slowRequestThreshold) {
          aggregation.performanceMetrics.slowRequests++;
        }
      }
    }

    // Calculate final metrics
    aggregation.errorRate = (errorCount / recentLogs.length) * 100;
    aggregation.recentLogs = recentLogs.slice(-100);
    aggregation.performanceMetrics.totalErrors = errorCount;
    aggregation.performanceMetrics.errorRate = aggregation.errorRate;

    // Calculate response time metrics
    if (responseTimes.length > 0) {
      aggregation.performanceMetrics.averageResponseTime = totalResponseTime / responseTimes.length;

      // Sort once for percentile calculations
      responseTimes.sort((a, b) => a - b);

      aggregation.performanceMetrics.p95ResponseTime = calculatePercentile(responseTimes, 0.95);
      aggregation.performanceMetrics.p99ResponseTime = calculatePercentile(responseTimes, 0.99);
    }

    return aggregation;
  }

  /**
   * Clear all stored logs efficiently.
   */
  clearLogs(): void {
    if (!this.storageEnabled) return;
    this.logBuffer.clear();
  }

  /**
   * Get count of valid log entries.
   */
  getLogCount(): number {
    if (!this.storageEnabled) return 0;
    return this.logBuffer.getSize();
  }

  /**
   * Export logs in JSON or CSV format.
   * Optimized to avoid multiple array iterations.
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (!this.storageEnabled) {
      throw new Error('In-memory storage is not enabled');
    }

    const logs = this.logBuffer.getAll();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV export with efficient string building
    const headers = [
      'timestamp',
      'level',
      'message',
      'correlationId',
      'component',
      'operation',
      'duration',
      'userId',
      'traceId',
      'requestId',
      'ipAddress',
      'userAgent',
    ];

    const lines = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.timestamp.toISOString(),
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.correlationId,
        log.component ?? '',
        log.operation ?? '',
        log.duration?.toString() ?? '',
        log.userId ?? '',
        log.traceId ?? '',
        log.requestId ?? '',
        log.ipAddress ?? '',
        `"${log.userAgent?.replace(/"/g, '""') ?? ''}"`,
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  // ==================== Utility Methods ====================

  setLevel(level: LogLevel): void {
    this.config.level = level;
    // Update transport levels
    for (const transport of this.transports) {
      transport.level = level;
    }
  }

  getLevel(): LogLevel {
    return this.config.level || 'info';
  }

  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }

  getMetrics(): LogMetrics {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return {
      ...this.metrics,
      logRate: uptimeSeconds > 0 ? this.metrics.totalLogs / uptimeSeconds : 0,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {},
      errorsLogged: 0,
      avgLogSize: 0,
      logRate: 0,
      performanceMetrics: {
        avgProcessingTime: 0,
        slowLogs: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
      },
    };
    this.startTime = Date.now();
  }

  async cleanup(): Promise<void> {
    if (this.timerCleanupInterval) {
      clearInterval(this.timerCleanupInterval);
    }
    await this.flush();
    // Close transports
    for (const transport of this.transports) {
      if (transport.close) {
        await transport.close();
      }
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Map security severity to log level.
   */
  private mapSecuritySeverity(severity: string): LogLevel {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warn';
      case 'high': return 'error';
      case 'critical': return 'fatal';
      default: return 'warn';
    }
  }

  /**
   * Update internal metrics efficiently.
   */
  private updateMetrics(level: string, estimatedSize: number): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;

    if (level === 'error' || level === 'fatal' || level === 'critical') {
      this.metrics.errorsLogged++;
    }

    // Update rolling average efficiently
    const totalLogs = this.metrics.totalLogs;
    this.metrics.avgLogSize =
      (this.metrics.avgLogSize * (totalLogs - 1) + estimatedSize) / totalLogs;
  }

  /**
   * Enable periodic metrics reporting.
   */
  private enableMetricsReporting(interval?: number): void {
    const reportInterval = interval || DEFAULT_CONFIG.METRICS_REPORT_INTERVAL_MS;

    const metricsInterval = setInterval(() => {
      const metrics = this.getMetrics();
      this.info('Logger metrics report', { component: 'metrics' }, { metrics });
    }, reportInterval);

    // Prevent interval from keeping process alive
    metricsInterval.unref();
  }
}

// ==================== Default Instance & Exports ====================

/**
 * Default logger instance configured from environment.
 */
export const logger = new UnifiedLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  pretty: process.env.NODE_ENV === 'development',
  asyncTransport: process.env.NODE_ENV !== 'test',
  enableMetrics: process.env.ENABLE_LOG_METRICS === 'true',
  enableInMemoryStorage: process.env.ENABLE_LOG_STORAGE !== 'false',
  maxStoredLogs: parseInt(process.env.MAX_STORED_LOGS || '10000', 10),
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  name: process.env.SERVICE_NAME || 'app',
  version: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  samplingRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
});





































