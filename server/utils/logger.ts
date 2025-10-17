/**
 * @deprecated This logger module is deprecated. Use the core logger instead:
 * import { logger } from '../../../shared/core/src/logging';
 *
 * This file is kept for backward compatibility but will be removed in a future version.
 * All logging should migrate to the shared/core logger for consistency and better features.
 */

// Consolidated with shared/core logging - this file should be deprecated
// Use import { logger } from '../../../shared/core/src/logging' instead
import { config } from '../config/index.ts';

/**
 * Safely normalizes unknown errors into structured objects for logging.
 * Optimized with early returns and improved circular reference handling.
 */
function normalizeError(err: unknown): Record<string, any> {
  // Handle null/undefined first (most common edge case)
  if (err == null) {
    return { error: String(err), type: typeof err };
  }

  // Fast path for Error instances (most common case)
  if (err instanceof Error) {
    const normalized: Record<string, any> = {
      message: err.message,
      name: err.name,
    };
    
    // Only include stack in non-production for security
    // Fixed: Use config.server.nodeEnv instead of config.environment
    if (config.server.nodeEnv !== 'production' && err.stack) {
      normalized.stack = err.stack;
    }
    
    // Recursively handle error causes
    // Fixed: Type assertion for cause property (ES2022 feature)
    if ('cause' in err && err.cause !== undefined) {
      normalized.cause = normalizeError(err.cause);
    }
    
    return normalized;
  }

  // Handle primitives efficiently
  if (typeof err !== 'object') {
    return { error: String(err), type: typeof err };
  }

  // Handle objects with improved circular reference detection
  try {
    const seen = new WeakSet<object>();
    
    const serialize = (obj: any, depth = 0): any => {
      // Limit recursion depth to prevent stack overflow
      if (depth > 10) return '[Max Depth Exceeded]';
      
      if (obj === null || typeof obj !== 'object') return obj;
      
      if (obj instanceof Error) {
        return normalizeError(obj);
      }
      
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item, depth + 1));
      }
      
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = serialize(value, depth + 1);
      }
      return result;
    };
    
    return serialize(err);
  } catch (serializeError) {
    // Fallback for truly unserializable objects
    return {
      error: 'Unserializable object',
      type: Object.prototype.toString.call(err),
      serializationError: (serializeError as Error).message,
    };
  }
}

// Log levels as const enum for better minification
const enum LogLevelValue {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Critical = 4,
}

// Public log level type
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// Efficient log level mapping
const LOG_LEVEL_MAP: Record<LogLevel, LogLevelValue> = {
  debug: LogLevelValue.Debug,
  info: LogLevelValue.Info,
  warn: LogLevelValue.Warn,
  error: LogLevelValue.Error,
  critical: LogLevelValue.Critical,
};

// Pre-calculate current log level once
const CURRENT_LOG_LEVEL = LOG_LEVEL_MAP[(config.logging?.level as LogLevel) ?? 'info'];

// Console output configuration
const CONSOLE_ENABLED = config.logging?.enableConsole !== false;
// Fixed: Use config.server.nodeEnv instead of config.environment
const IS_PRODUCTION = config.server.nodeEnv === 'production';

/**
 * Structured log entry with comprehensive tracking information
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  correlationId: string;
  traceId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Context object for structured logging information
 */
export interface LogContext {
  component?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  tags?: string[];
  value?: number;
  userId?: string;
  [key: string]: any;
}

/**
 * Aggregated log statistics for monitoring
 */
export interface LogAggregation {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByComponent: Record<string, number>;
  recentLogs: LogEntry[];
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

/**
 * Filter criteria for log queries
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
 * Request context interface for type safety
 */
interface RequestContext {
  traceId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * @deprecated This UnifiedLogger class is deprecated. Use the core logger instead:
 * import { logger } from '../../../shared/core/src/logging';
 *
 * This class is kept for backward compatibility but will be removed in a future version.
 * All logging should migrate to the shared/core logger for consistency and better features.
 */
class UnifiedLogger {
  // Use a circular buffer with pre-allocated array for better memory efficiency
  private readonly logs: LogEntry[] = [];
  private logIndex = 0;
  private readonly MAX_LOGS: number;
  private readonly SLOW_REQUEST_THRESHOLD = 5000; // ms
  
  // Use BigInt for correlation counter to avoid number overflow
  private correlationCounter = 0n;
  
  // Lazy-loaded error tracker
  private errorTracker: any = null;
  private errorTrackerLoadAttempted = false;
  
  // Performance optimization: pre-compiled formatters
  // Fixed: Removed fractionalSecondDigits which requires ES2021+
  // For backwards compatibility, using standard precision
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  constructor() {
    // Fixed: Use hardcoded default since maxLogs is not in config
    // Alternatively, you could add maxLogs to your logging config interface
    this.MAX_LOGS = 10000;
    
    // Pre-allocate array for better performance
    this.logs.length = this.MAX_LOGS;
  }

  /**
   * Generates a unique correlation ID with better performance.
   * Uses BigInt counter and base36 encoding for shorter IDs.
   */
  private generateCorrelationId(): string {
    // Use base36 for more compact representation
    const timestamp = Date.now().toString(36);
    const counter = (++this.correlationCounter).toString(36);
    return `${timestamp}-${counter}`;
  }

  /**
   * Formats log entry for console output with improved performance.
   */
  private formatMessage(entry: LogEntry): string {
    // Use string builder pattern for better performance
    const parts: string[] = [];
    
    // Use ISO string for consistent timestamp formatting
    parts.push(`[${entry.timestamp.toISOString()}]`);
    parts.push(entry.level.toUpperCase().padEnd(8));
    
    if (entry.correlationId) {
      parts.push(`[${entry.correlationId}]`);
    }
    
    if (entry.context?.component) {
      parts.push(`[${entry.context.component}]`);
    }
    
    parts.push(entry.message);
    
    // Build the base message
    let output = parts.join(' ');
    
    // Only stringify additional data if not in production
    if (!IS_PRODUCTION) {
      const additionalData: string[] = [];
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        additionalData.push(`  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`);
      }
      
      if (entry.context) {
        const { component, ...restContext } = entry.context;
        if (Object.keys(restContext).length > 0) {
          additionalData.push(`  Context: ${JSON.stringify(restContext, null, 2)}`);
        }
      }
      
      if (additionalData.length > 0) {
        output += '\n' + additionalData.join('\n');
      }
    }
    
    return output;
  }

  /**
   * Extracts request context from global scope if available.
   */
  private getRequestContext(): RequestContext | undefined {
    // Type-safe access to global request context
    if (typeof globalThis !== 'undefined' && 'requestContext' in globalThis) {
      return (globalThis as any).requestContext as RequestContext;
    }
    return undefined;
  }

  /**
   * Creates a log entry with automatic context injection.
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      correlationId: this.generateCorrelationId(),
    };
    
    // Only add defined properties to avoid unnecessary memory usage
    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }
    
    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }
    
    // Extract request context efficiently
    const reqCtx = this.getRequestContext();
    if (reqCtx) {
      // Use object spread for cleaner code
      Object.assign(entry, {
        traceId: reqCtx.traceId,
        requestId: reqCtx.requestId,
        userId: reqCtx.userId,
        sessionId: reqCtx.sessionId,
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }
    
    return entry;
  }

  /**
   * Lazy-loads error tracker with improved error handling.
   */
  private async getErrorTracker(): Promise<any> {
    if (this.errorTrackerLoadAttempted) {
      return this.errorTracker;
    }
    
    this.errorTrackerLoadAttempted = true;
    
    try {
      // Use dynamic import for better code splitting
      const module = await import('../core/errors/error-tracker.ts');
      this.errorTracker = module.errorTracker;
      return this.errorTracker;
    } catch (error) {
      // Log the error in development
      if (!IS_PRODUCTION) {
        console.warn('Error tracker unavailable:', error);
      }
      return null;
    }
  }

  /**
   * Stores log entry using circular buffer for memory efficiency.
   */
  private async storeLogEntry(entry: LogEntry): Promise<void> {
    // Use circular buffer index for O(1) insertion
    this.logs[this.logIndex] = entry;
    this.logIndex = (this.logIndex + 1) % this.MAX_LOGS;
    
    // Forward errors to error tracker asynchronously
    if (entry.level === 'error' || entry.level === 'critical') {
      // Don't await to avoid blocking
      this.forwardToErrorTracker(entry).catch(() => {
        // Silently fail to prevent cascading failures
      });
    }
  }

  /**
   * Forwards error logs to error tracker with improved error handling.
   */
  private async forwardToErrorTracker(entry: LogEntry): Promise<void> {
    const tracker = await this.getErrorTracker();
    if (!tracker) return;
    
    tracker.trackError(
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
      entry.level === 'critical' ? 'critical' : 'high',
      'system'
    );
  }

  /**
   * Checks if logging is enabled for the given level.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_MAP[level] >= CURRENT_LOG_LEVEL;
  }

  /**
   * Outputs to console using appropriate method.
   * Fixed: Added proper type guard for console methods
   */
  private outputToConsole(entry: LogEntry): void {
    if (!CONSOLE_ENABLED) return;
    
    // Use explicit method calls instead of dynamic access to avoid type issues
    const message = this.formatMessage(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.log(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
      case 'critical':
        console.error(message);
        break;
    }
  }

  /**
   * Internal logging method to reduce code duplication.
   */
  private logInternal(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    if (level !== 'critical' && !this.shouldLog(level)) return;
    
    const entry = this.createLogEntry(level, message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry);
  }

  // ==================== Public Logging Methods ====================

  /**
   * Logs debug-level information for development.
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('debug', message, context, metadata);
  }

  /**
   * Logs informational messages about normal operations.
   */
  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('info', message, context, metadata);
  }

  /**
   * Logs warning messages for potentially problematic situations.
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.logInternal('warn', message, context, metadata);
  }

  /**
   * Logs errors with automatic error normalization.
   */
  error(
    message: string,
    context?: LogContext,
    metadataOrError?: Record<string, any> | unknown
  ): void {
    const metadata = this.processErrorMetadata(metadataOrError);
    this.logInternal('error', message, context, metadata);
  }

  /**
   * Logs critical errors that always bypass level filtering.
   */
  critical(
    message: string,
    context?: LogContext,
    metadataOrError?: Record<string, any> | unknown
  ): void {
    const metadata = this.processErrorMetadata(metadataOrError);
    this.logInternal('critical', message, context, metadata);
  }

  /**
   * Processes error metadata with improved type checking.
   */
  private processErrorMetadata(
    metadataOrError?: Record<string, any> | unknown
  ): Record<string, any> | undefined {
    if (metadataOrError === undefined) return undefined;
    
    // Check if it's already a metadata object
    if (
      typeof metadataOrError === 'object' &&
      metadataOrError !== null &&
      !('stack' in metadataOrError) &&
      !(metadataOrError instanceof Error)
    ) {
      return metadataOrError as Record<string, any>;
    }
    
    // Otherwise, normalize as error
    return normalizeError(metadataOrError);
  }

  /**
   * Legacy logging method for backward compatibility.
   * @deprecated Use level-specific methods instead. This entire logger is deprecated - migrate to:
   * import { logger } from '../../../shared/core/src/logging';
   */
  log(obj: object | string, msg?: string, ...args: any[]): void {
    const message = typeof obj === 'string' ? obj : msg ?? 'Log entry';
    const metadata = typeof obj === 'object'
      ? { data: obj, ...(args.length > 0 && { extra: args }) }
      : args.length > 0
      ? { extra: args }
      : undefined;
    this.info(message, undefined, metadata);
  }

  // ==================== Analytics and Querying ====================

  /**
   * Gets valid logs (non-null entries) from the circular buffer.
   */
  private getValidLogs(): LogEntry[] {
    return this.logs.filter(log => log != null);
  }

  /**
   * Aggregates log statistics with improved performance.
   */
  getLogAggregation(timeWindow: number = 3600000): LogAggregation {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const validLogs = this.getValidLogs();
    const recentLogs = validLogs.filter(log => log.timestamp >= cutoffTime);
    
    // Initialize aggregation data
    const aggregation: LogAggregation = {
      totalLogs: recentLogs.length,
      logsByLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
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
    
    // Collect data in single pass
    const responseTimes: number[] = [];
    let errorCount = 0;
    let slowRequests = 0;
    let totalResponseTime = 0;
    
    for (const log of recentLogs) {
      // Count by level
      aggregation.logsByLevel[log.level]++;
      
      // Count by component
      if (log.context?.component) {
        aggregation.logsByComponent[log.context.component] =
          (aggregation.logsByComponent[log.context.component] ?? 0) + 1;
      }
      
      // Count errors
      if (log.level === 'error' || log.level === 'critical') {
        errorCount++;
      }
      
      // Collect performance metrics
      if (typeof log.context?.duration === 'number') {
        const duration = log.context.duration;
        responseTimes.push(duration);
        totalResponseTime += duration;
        
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          slowRequests++;
        }
      }
    }
    
    // Calculate statistics
    aggregation.errorRate = (errorCount / recentLogs.length) * 100;
    aggregation.recentLogs = recentLogs.slice(-100);
    aggregation.performanceMetrics.slowRequests = slowRequests;
    
    // Calculate percentiles if we have data
    if (responseTimes.length > 0) {
      aggregation.performanceMetrics.averageResponseTime =
        totalResponseTime / responseTimes.length;
      
      // Sort for percentile calculation
      responseTimes.sort((a, b) => a - b);
      
      const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
      const p99Index = Math.ceil(responseTimes.length * 0.99) - 1;
      
      aggregation.performanceMetrics.p95ResponseTime =
        responseTimes[Math.max(0, p95Index)] ?? 0;
      aggregation.performanceMetrics.p99ResponseTime =
        responseTimes[Math.max(0, p99Index)] ?? 0;
    }
    
    return aggregation;
  }

  /**
   * Queries logs with improved filtering performance.
   */
  queryLogs(filters: LogQueryFilters): LogEntry[] {
    let results = this.getValidLogs();
    
    // Apply filters in order of selectivity
    if (filters.correlationId) {
      results = results.filter(log => log.correlationId === filters.correlationId);
    }
    
    if (filters.userId) {
      results = results.filter(log => log.userId === filters.userId);
    }
    
    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      results = results.filter(
        log => log.timestamp >= start && log.timestamp <= end
      );
    }
    
    if (filters.level && filters.level.length > 0) {
      const levelSet = new Set(filters.level);
      results = results.filter(log => levelSet.has(log.level));
    }
    
    if (filters.component && filters.component.length > 0) {
      const componentSet = new Set(filters.component);
      results = results.filter(
        log => log.context?.component && componentSet.has(log.context.component)
      );
    }
    
    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    if (filters.offset) {
      results = results.slice(filters.offset);
    }
    
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }
    
    return results;
  }

  /**
   * Gets logs by correlation ID in chronological order.
   */
  getLogsByCorrelation(correlationId: string): LogEntry[] {
    return this.getValidLogs()
      .filter(log => log.correlationId === correlationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ==================== Specialized Logging Methods ====================

  /**
   * Logs performance metrics for operations.
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const level: LogLevel = duration > this.SLOW_REQUEST_THRESHOLD ? 'warn' : 'info';
    this.logInternal(
      level,
      `Performance: ${operation} completed in ${duration}ms`,
      {
        component: 'performance',
        operation,
        duration,
      },
      metadata
    );
  }

  /**
   * Logs security events with appropriate severity.
   */
  logSecurity(
    event: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.warn(`Security Event: ${event}`, {
      component: 'security',
      operation: event,
      userId,
      tags: ['security', 'audit'],
    }, metadata);
  }

  /**
   * Logs business metrics for analytics.
   */
  logMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    this.info(`Metric: ${name} = ${value}`, {
      component: 'metrics',
      operation: name,
      value,
      tags: ['metric', 'analytics'],
    }, metadata);
  }

  /**
   * Clears all logs. Use with caution.
   */
  clearLogs(): void {
    this.logs.length = 0;
    this.logs.length = this.MAX_LOGS;
    this.logIndex = 0;
    this.correlationCounter = 0n;
  }

  /**
   * Gets the count of valid log entries.
   */
  getLogCount(): number {
    return this.getValidLogs().length;
  }

  /**
   * Exports logs in a format suitable for external processing.
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getValidLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    // CSV export
    const headers = [
      'timestamp',
      'level',
      'message',
      'correlationId',
      'component',
      'duration',
      'userId',
    ];
    
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      `"${log.message.replace(/"/g, '""')}"`,
      log.correlationId,
      log.context?.component ?? '',
      log.context?.duration?.toString() ?? '',
      log.userId ?? '',
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }
}

// Export singleton instance
/**
 * @deprecated This logger instance is deprecated. Use the core logger instead:
 * import { logger } from '../../../shared/core/src/logging';
 *
 * This instance is kept for backward compatibility but will be removed in a future version.
 * All logging should migrate to the shared/core logger for consistency and better features.
 */
export const logger = new UnifiedLogger();

// Export for testing purposes
export { UnifiedLogger };

// Re-export shared/core logger as the primary logger
// Note: Import path may need adjustment based on actual file structure
// export { logger as sharedLogger } from '../../../shared/core/src/logging';

/**
 * @deprecated This module is deprecated. Use the core logger instead:
 * import { logger } from '../../../shared/core/src/logging';
 *
 * This file is kept for backward compatibility but will be removed in a future version.
 * All logging should migrate to the shared/core logger for consistency and better features.
 */