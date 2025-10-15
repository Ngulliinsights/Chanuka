import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import configManager from '../config';
import { promises as fs } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

// ==================== Type Definitions ====================

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
}

export interface DatabaseQueryLogData {
  query: string;
  duration: number;
  rowCount?: number;
  database?: string;
}

export interface CacheOperationLogData {
  operation: 'get' | 'set' | 'delete' | 'clear';
  key: string;
  hit: boolean;
  duration?: number;
}

export interface SecurityEventLogData {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
}

export interface BusinessEventLogData {
  event: string;
  entityType?: string;
  entityId?: string;
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
}

/**
 * Query filters for searching stored logs
 */
export interface LogQueryFilters {
  level?: LogLevel[];
  component?: string[];
  timeRange?: { start: Date; end: Date };
  correlationId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Aggregated statistics about logged events
 */
export interface LogAggregation {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByComponent: Record<string, number>;
  recentLogs: StoredLogEntry[];
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  maxFileSize: string | number;
  maxFiles: number;
  compress: boolean;
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
}

/**
 * Minimal interface for error tracker implementations. The concrete
 * error tracker lives in server code; the shared logger should depend
 * only on this small interface and accept an injected implementation.
 */
export interface ErrorTrackerInterface {
  trackError: (error: Error | string, context?: Record<string, unknown>, severity?: string, category?: string) => any;
}

// ==================== Constants ====================

const DEFAULT_CONFIG = {
  MAX_STORED_LOGS: 10000,
  SLOW_REQUEST_THRESHOLD_MS: 5000,
  METRICS_REPORT_INTERVAL_MS: 300000, // 5 minutes
  TIMER_CLEANUP_INTERVAL_MS: 600000, // 10 minutes
  MAX_TIMER_AGE_MS: 3600000, // 1 hour
  LOG_ROTATION_CHECK_INTERVAL_MS: 60000, // 1 minute
  MAX_DEPTH: 10,
  REDACT_CENSOR: '[REDACTED]',
} as const;

const SENSITIVE_PATHS = [
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
] as const;

// Local convenience reference to the runtime configuration
const config = configManager.config;

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
    if ((config.errors?.includeStack ?? true) && err.stack) {
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
export class UnifiedLogger {
  private pino: pino.Logger;
  private asyncLocalStorage: AsyncLocalStorage<LogContext>;
  
  // In-memory storage with circular buffer
  private logBuffer: CircularBuffer<StoredLogEntry>;
  private readonly storageEnabled: boolean;
  
  // Performance tracking with automatic cleanup
  private performanceTimers = new Map<string, { startTime: number; timestamp: number }>();
  private correlationCounter = 0n;
  private readonly slowRequestThreshold: number;
  private timerCleanupInterval?: NodeJS.Timeout;
  
  // Metrics
  private startTime = Date.now();
  private metrics: LogMetrics = {
    totalLogs: 0,
    logsByLevel: {},
    errorsLogged: 0,
    avgLogSize: 0,
    logRate: 0,
  };
  
  // Log rotation
  private rotationManager?: LogRotationManager;
  
  // Error tracker integration (lazy-loaded)
  private errorTracker: ErrorTrackerInterface | null = null;
  
  private readonly logDirectory: string;

  constructor(options: LoggerOptions = {}) {
    this.asyncLocalStorage = new AsyncLocalStorage();
    this.storageEnabled = options.enableInMemoryStorage ?? true;
  // environment checks use config.app.environment directly where needed
    this.logDirectory = options.logDirectory || './logs';
    this.slowRequestThreshold = options.slowRequestThreshold || DEFAULT_CONFIG.SLOW_REQUEST_THRESHOLD_MS;
    
    // Initialize circular buffer for efficient storage
    const maxStoredLogs = options.maxStoredLogs || DEFAULT_CONFIG.MAX_STORED_LOGS;
    this.logBuffer = new CircularBuffer<StoredLogEntry>(maxStoredLogs);

    // Configure Pino
    this.pino = this.createPinoLogger(options);

    // Enable periodic metrics reporting if requested
    if (options.enableMetrics) {
      this.enableMetricsReporting(options.metricsReportInterval);
    }

    // Set up automatic timer cleanup to prevent memory leaks
    this.enableTimerCleanup(options.timerCleanupInterval);

    // Set up log rotation if file logging is enabled
    if (options.asyncTransport !== false && (options.maxFileSize || options.maxFiles)) {
      this.setupLogRotation(options);
    }
  }

  /**
   * Creates Pino logger with optimal configuration.
   */
  private createPinoLogger(options: LoggerOptions): pino.Logger {
    const pinoOptions: pino.LoggerOptions = {
  level: options.level || config.log?.level || 'info',
      name: options.name || config.app?.name || 'app',
      
      // Comprehensive sensitive data redaction
      redact: {
        paths: options.redactPaths || [...SENSITIVE_PATHS],
        censor: DEFAULT_CONFIG.REDACT_CENSOR,
      },
      
      // Rich base fields attached to every log
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
  environment: options.environment || config.app?.environment || 'development',
        service: options.name || config.app?.name || 'app',
        version: options.version || config.app?.version || '1.0.0',
      },
      
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    // Set up transports based on environment
    if (options.asyncTransport !== false && process.env.NODE_ENV !== 'test') {
      return this.createTransportLogger(pinoOptions, options);
    }
    
    return pino(pinoOptions);
  }

  /**
   * Creates a logger with multiple transport targets.
   */
  private createTransportLogger(
    pinoOptions: pino.LoggerOptions,
    options: LoggerOptions
  ): pino.Logger {
    const transports: pino.TransportTargetOptions[] = [];
  const isDev = config.app?.environment === 'development';

    // Pretty console output in development
    if (options.pretty || isDev) {
      transports.push({
        target: 'pino-pretty',
        level: options.level || 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      });
    } else {
      // JSON to stdout in production
      transports.push({
        target: 'pino/file',
        level: 'info',
        options: { destination: 1 }, // stdout
      });
    }

    // File transports for persistence
    const fileTransports: Array<{ file: string; level: pino.Level }> = [
      { file: 'app.log', level: 'debug' },
      { file: 'error.log', level: 'error' },
      { file: 'security.log', level: 'warn' },
      { file: 'performance.log', level: 'debug' },
    ];

    for (const { file, level } of fileTransports) {
      transports.push({
        target: 'pino/file',
        level,
        options: {
          destination: path.join(this.logDirectory, file),
          mkdir: true,
          sync: false,
        },
      });
    }

    return pino(pinoOptions, pino.transport({ targets: transports }));
  }

  /**
   * Sets up log rotation for all log files.
   */
  private setupLogRotation(options: LoggerOptions): void {
    this.rotationManager = createLogRotationManager({
      maxFileSize: options.maxFileSize || '10MB',
      maxFiles: options.maxFiles || 5,
      compress: true,
    });

    const logFiles = ['app.log', 'error.log', 'security.log', 'performance.log'];
    for (const file of logFiles) {
      this.rotationManager.setupRotationCheck(path.join(this.logDirectory, file));
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
    this.timerCleanupInterval.unref();
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
  child(bindings: Record<string, unknown>): UnifiedLogger {
    const childLogger = Object.create(this) as UnifiedLogger;
    childLogger.pino = this.pino.child(bindings);
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
    
    // Build log object for Pino (minimize allocations)
    const logObj: Record<string, unknown> = metadata ? { ...metadata } : {};
    if (enrichedContext && Object.keys(enrichedContext).length > 0) {
      logObj.context = enrichedContext;
    }

    // Log with Pino
    const pinoLevel = level === 'critical' ? 'fatal' : level;
    // Safely invoke pino level method (it may be undefined in some mocked environments)
    const levelFn = (this.pino as any)[pinoLevel];
    if (typeof levelFn === 'function') {
      levelFn.call(this.pino, logObj, message);
    } else if (typeof (this.pino as any).info === 'function') {
      // Fallback to info if specific level not available
      (this.pino as any).info.call(this.pino, logObj, message);
    }

    // Store in memory if enabled
    if (this.storageEnabled) {
      const entry = this.createStoredLogEntry(
        level,
        message,
        enrichedContext,
        metadata,
        reqCtx
      );
      this.logBuffer.push(entry);
      
      // Forward errors to error tracker (async, non-blocking)
      if (level === 'error' || level === 'fatal' || level === 'critical') {
        this.forwardToErrorTracker(entry).catch(() => {});
      }
    }

    // Update metrics
    this.updateMetrics(level, message.length + (metadata ? 100 : 0)); // Rough size estimate
  }

  /**
   * Extracts request context from global scope.
   * Optimized to avoid unnecessary property access.
   */
  private extractRequestContext(): Partial<StoredLogEntry> | undefined {
    if (typeof globalThis !== 'undefined' && 'requestContext' in globalThis) {
      return (globalThis as { requestContext?: Partial<StoredLogEntry> }).requestContext;
    }
    return undefined;
  }

  /**
   * Creates a stored log entry with minimal overhead.
   */
  private createStoredLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
    reqCtx?: Partial<StoredLogEntry>
  ): StoredLogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context: context && Object.keys(context).length > 0 ? context : undefined,
      metadata,
      correlationId: this.generateCorrelationId(),
      traceId: reqCtx?.traceId || context?.traceId,
      requestId: reqCtx?.requestId || context?.requestId,
      userId: reqCtx?.userId || context?.userId,
      sessionId: reqCtx?.sessionId,
      ipAddress: reqCtx?.ipAddress,
      userAgent: reqCtx?.userAgent,
    };
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
    }, { request: data });
  }

  logDatabaseQuery(data: DatabaseQueryLogData, message?: string): void {
    const msg = message || `Database query executed in ${data.duration}ms`;
    const level: LogLevel = data.duration > 1000 ? 'warn' : 'debug';
    this.logInternal(level, msg, {
      component: 'database',
      operation: 'query',
      duration: data.duration,
    }, { database: data });
  }

  logCacheOperation(data: CacheOperationLogData, message?: string): void {
    const msg = message || `Cache ${data.operation} for key ${data.key} - ${data.hit ? 'HIT' : 'MISS'}`;
    this.debug(msg, {
      component: 'cache',
      operation: data.operation,
      tags: [data.hit ? 'cache-hit' : 'cache-miss'],
    }, { cache: data });
  }

  logSecurityEvent(data: SecurityEventLogData, message?: string): void {
    const msg = message || `Security event: ${data.event} (${data.severity})`;
    const level = this.mapSecuritySeverity(data.severity);
    
    this.logInternal(level, msg, {
      component: 'security',
      operation: data.event,
      userId: data.userId,
      tags: ['security', 'audit', data.severity],
    }, { security: data });
  }

  logBusinessEvent(data: BusinessEventLogData, message?: string): void {
    const msg = message || `Business event: ${data.event}`;
    this.info(msg, {
      component: 'business',
      operation: data.event,
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
   * Get the currently injected error tracker (if any).
   * Using injection avoids importing server-only modules from shared code
   * and prevents circular dependency problems.
   */
  private getErrorTracker(): ErrorTrackerInterface | null {
    return this.errorTracker;
  }

  /**
   * Inject an error tracker implementation (provided by the server).
   */
  setErrorTracker(tracker: ErrorTrackerInterface | null): void {
    this.errorTracker = tracker;
  }

  /**
   * Forwards error logs to error tracker asynchronously.
   */
  private async forwardToErrorTracker(entry: StoredLogEntry): Promise<void> {
    const tracker = await this.getErrorTracker();
    if (!tracker || typeof tracker !== 'object' || !('trackError' in tracker)) return;
    
    const trackFn = (tracker as { trackError: Function }).trackError;
    trackFn.call(tracker,
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
      if (filters.userId && log.userId !== filters.userId) return false;
      
      if (filters.timeRange) {
        const { start, end } = filters.timeRange;
        if (log.timestamp < start || log.timestamp > end) return false;
      }
      
      if (filters.level && filters.level.length > 0) {
        if (!filters.level.includes(log.level)) return false;
      }
      
      if (filters.component && filters.component.length > 0) {
        if (!log.context?.component || !filters.component.includes(log.context.component)) {
          return false;
        }
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
      recentLogs: [],
      errorRate: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        slowRequests: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
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
      if (log.context?.component) {
        const component = log.context.component;
        aggregation.logsByComponent[component] = (aggregation.logsByComponent[component] || 0) + 1;
      }
      
      // Count errors
      if (log.level === 'error' || log.level === 'fatal' || log.level === 'critical') {
        errorCount++;
      }
      
      // Collect response times
      if (typeof log.context?.duration === 'number') {
        const duration = log.context.duration;
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
    this.correlationCounter = 0n;
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
      'duration',
      'userId',
      'traceId',
    ];
    
    const lines = [headers.join(',')];
    
    for (const log of logs) {
      const row = [
        log.timestamp.toISOString(),
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.correlationId,
        log.context?.component ?? '',
        log.context?.duration?.toString() ?? '',
        log.userId ?? '',
        log.traceId ?? '',
      ];
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  // ==================== Utility Methods ====================

  setLevel(level: LogLevel): void {
    this.pino.level = level === 'critical' ? 'fatal' : level;
  }

  getLevel(): string {
    return this.pino.level;
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pino.flush(() => resolve());
    });
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
    };
    this.startTime = Date.now();
  }

  async cleanup(): Promise<void> {
    if (this.timerCleanupInterval) {
      clearInterval(this.timerCleanupInterval);
    }
    if (this.rotationManager) {
      this.rotationManager.stopAllRotationChecks();
    }
    await this.flush();
  }

  // ==================== Private Helper Methods ====================

  /**
   * Generate unique correlation ID efficiently using base36 encoding.
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.correlationCounter).toString(36);
    return `${timestamp}-${counter}`;
  }

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
    
    if (level === 'error' || level === 'fatal') {
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
});

// Re-export types for convenience
// Types are exported inline above; no additional re-export needed here.