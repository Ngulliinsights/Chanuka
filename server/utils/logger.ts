import { config } from '../config/index.ts';

// Enhanced logger levels with numeric values for comparison
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
} as const;

// Type-safe log level type derived from LOG_LEVELS
type LogLevel = keyof typeof LOG_LEVELS;

// Calculate current log level once at module load time for performance
const currentLogLevel = LOG_LEVELS[config.logging?.level as LogLevel] ?? LOG_LEVELS.info;

// Log entry interface with improved type safety
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  traceId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

// Log context interface with better documentation
export interface LogContext {
  component?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  tags?: string[];
  value?: number; // For metrics logging
  userId?: string; // For security logging
  [key: string]: any;
}

// Log aggregation interface for analytics
export interface LogAggregation {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByComponent: Record<string, number>;
  recentLogs: LogEntry[];
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
  };
}

// Query filters interface for better type safety
export interface LogQueryFilters {
  level?: LogLevel[];
  component?: string[];
  timeRange?: { start: Date; end: Date };
  correlationId?: string;
  userId?: string;
  limit?: number;
}

/**
 * Enhanced unified logger with optimized performance and memory management.
 * This logger provides structured logging with correlation tracking, performance
 * monitoring, and flexible querying capabilities.
 */
class UnifiedLogger {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 10000;
  private correlationCounter = 0;
  
  // Cache for error tracker to avoid repeated require attempts
  private errorTrackerCache: any = null;
  private errorTrackerLoadAttempted = false;

  /**
   * Generates a unique correlation ID for log entry grouping.
   * Uses timestamp and counter to ensure uniqueness across requests.
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${++this.correlationCounter}`;
  }

  /**
   * Formats a log message with structured data in a human-readable format.
   * This method is called lazily only when console output is enabled.
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const correlation = entry.correlationId ? `[${entry.correlationId}]` : '';
    const context = entry.context?.component ? `[${entry.context.component}]` : '';

    let message = `[${timestamp}] ${level} ${correlation} ${context} ${entry.message}`;

    // Only add metadata section if there's actual metadata to display
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    // Display context information beyond just the component name
    if (entry.context && Object.keys(entry.context).length > 1) {
      const contextCopy = { ...entry.context };
      delete contextCopy.component;
      if (Object.keys(contextCopy).length > 0) {
        message += `\nContext: ${JSON.stringify(contextCopy, null, 2)}`;
      }
    }

    return message;
  }

  /**
   * Creates a structured log entry with all available context.
   * Automatically injects request context from global scope if available.
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
      context,
      metadata,
      correlationId: this.generateCorrelationId(),
    };

    // Safely extract request context from global scope if available
    // This enables automatic context propagation across async operations
    if (typeof global !== 'undefined' && (global as any).requestContext) {
      const reqCtx = (global as any).requestContext;
      entry.traceId = reqCtx.traceId;
      entry.requestId = reqCtx.requestId;
      entry.userId = reqCtx.userId;
      entry.sessionId = reqCtx.sessionId;
      entry.ipAddress = reqCtx.ipAddress;
      entry.userAgent = reqCtx.userAgent;
    }

    return entry;
  }

  /**
   * Lazily loads and caches the error tracker to avoid circular dependencies.
   * Only attempts to load once to prevent repeated failures.
   */
  private getErrorTracker(): any {
    if (this.errorTrackerLoadAttempted) {
      return this.errorTrackerCache;
    }

    this.errorTrackerLoadAttempted = true;

    try {
      const { errorTracker } = require('../core/errors/error-tracker.ts');
      this.errorTrackerCache = errorTracker;
      return errorTracker;
    } catch (error) {
      // Error tracker not available - this is acceptable in some deployment scenarios
      console.warn('Error tracker module not available, error tracking will be limited');
      return null;
    }
  }

  /**
   * Stores a log entry in memory and integrates with error tracking system.
   * Maintains circular buffer behavior to prevent unbounded memory growth.
   */
  private storeLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain max logs limit using efficient slice operation
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Forward error and critical logs to error tracker for centralized monitoring
    if (entry.level === 'error' || entry.level === 'critical') {
      const errorTracker = this.getErrorTracker();
      
      if (errorTracker) {
        try {
          const errorContext = {
            traceId: entry.traceId,
            userId: entry.userId,
            ip: entry.ipAddress,
            url: entry.context?.operation,
            method: entry.context?.component,
            headers: entry.userAgent ? { 'User-Agent': entry.userAgent } : undefined,
            endpoint: entry.context?.operation,
            currentAvg: entry.context?.duration,
          };

          errorTracker.trackError(
            entry.message,
            errorContext,
            entry.level === 'critical' ? 'critical' : 'high',
            'system'
          );
        } catch (error) {
          // Fail silently to prevent logging errors from breaking application flow
          console.error('Failed to track error with errorTracker:', error);
        }
      }
    }
  }

  /**
   * Determines if a log at the given level should be processed.
   * Uses numeric comparison for efficiency.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= currentLogLevel;
  }

  /**
   * Outputs a log entry to console if console logging is enabled.
   * Formatting is done lazily only when needed.
   */
  private outputToConsole(entry: LogEntry, consoleMethod: 'debug' | 'log' | 'warn' | 'error'): void {
    if (config.logging?.enableConsole) {
      console[consoleMethod](this.formatMessage(entry));
    }
  }

  // ==================== Core Logging Methods ====================

  /**
   * Logs a debug-level message. Used for detailed diagnostic information
   * that's primarily useful during development and troubleshooting.
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry, 'debug');
  }

  /**
   * Logs an info-level message. Used for general informational messages
   * about application operation and state transitions.
   */
  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry, 'log');
  }

  /**
   * Logs a warning message. Used for potentially problematic situations
   * that don't prevent the application from functioning.
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry, 'warn');
  }

  /**
   * Logs an error message. Used for error conditions that allow
   * the application to continue running but indicate problems.
   */
  error(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createLogEntry('error', message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry, 'error');
  }

  /**
   * Logs a critical message. These are always logged regardless of level.
   * Used for severe errors that require immediate attention.
   */
  critical(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    // Critical logs bypass level filtering
    const entry = this.createLogEntry('critical', message, context, metadata);
    this.storeLogEntry(entry);
    this.outputToConsole(entry, 'error');
  }

  // ==================== Legacy Compatibility ====================

  /**
   * Legacy log method for backward compatibility with older code.
   * New code should use the level-specific methods instead.
   */
  log(obj: object | string, msg?: string, ...args: any[]): void {
    const message = typeof obj === 'string' ? obj : msg || 'Log message';
    const metadata = typeof obj === 'object' ? obj : undefined;
    this.info(message, undefined, metadata);
  }

  // ==================== Analytics and Querying ====================

  /**
   * Aggregates log data over a time window for monitoring and analysis.
   * Calculates error rates, performance metrics, and distribution statistics.
   * 
   * @param timeWindow - Time window in milliseconds (default: 1 hour)
   */
  getLogAggregation(timeWindow: number = 3600000): LogAggregation {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentLogs = this.logs.filter(log => log.timestamp > cutoffTime);

    // Use single pass for efficiency instead of multiple iterations
    const stats = {
      logsByLevel: {} as Record<string, number>,
      logsByComponent: {} as Record<string, number>,
      errorCount: 0,
      totalResponseTime: 0,
      responseTimeCount: 0,
      slowRequests: 0,
    };

    for (const log of recentLogs) {
      // Count by level
      stats.logsByLevel[log.level] = (stats.logsByLevel[log.level] || 0) + 1;

      // Count by component
      if (log.context?.component) {
        const comp = log.context.component;
        stats.logsByComponent[comp] = (stats.logsByComponent[comp] || 0) + 1;
      }

      // Track errors
      if (log.level === 'error' || log.level === 'critical') {
        stats.errorCount++;
      }

      // Track performance metrics
      if (log.context?.duration !== undefined) {
        stats.totalResponseTime += log.context.duration;
        stats.responseTimeCount++;

        if (log.context.duration > 5000) {
          stats.slowRequests++;
        }
      }
    }

    const errorRate = recentLogs.length > 0 
      ? (stats.errorCount / recentLogs.length) * 100 
      : 0;
    
    const averageResponseTime = stats.responseTimeCount > 0 
      ? stats.totalResponseTime / stats.responseTimeCount 
      : 0;

    return {
      totalLogs: recentLogs.length,
      logsByLevel: stats.logsByLevel,
      logsByComponent: stats.logsByComponent,
      recentLogs: recentLogs.slice(-100), // Last 100 logs for quick review
      errorRate,
      performanceMetrics: {
        averageResponseTime,
        slowRequests: stats.slowRequests,
      },
    };
  }

  /**
   * Queries logs with multiple filter criteria for investigation and debugging.
   * Results are sorted by timestamp in descending order (newest first).
   */
  queryLogs(filters: LogQueryFilters): LogEntry[] {
    let filteredLogs = this.logs;

    // Apply filters in order of expected selectivity for performance
    if (filters.correlationId) {
      filteredLogs = filteredLogs.filter(log => 
        log.correlationId === filters.correlationId
      );
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.userId === filters.userId
      );
    }

    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      filteredLogs = filteredLogs.filter(log =>
        log.timestamp >= start && log.timestamp <= end
      );
    }

    if (filters.level?.length) {
      const levelSet = new Set(filters.level);
      filteredLogs = filteredLogs.filter(log => levelSet.has(log.level));
    }

    if (filters.component?.length) {
      const componentSet = new Set(filters.component);
      filteredLogs = filteredLogs.filter(log =>
        log.context?.component && componentSet.has(log.context.component)
      );
    }

    // Sort by timestamp descending (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filters.limit ? filteredLogs.slice(0, filters.limit) : filteredLogs;
  }

  /**
   * Retrieves all logs associated with a correlation ID for request tracing.
   * Results are chronologically ordered to show the flow of a request.
   */
  getLogsByCorrelation(correlationId: string): LogEntry[] {
    return this.logs
      .filter(log => log.correlationId === correlationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ==================== Specialized Logging Methods ====================

  /**
   * Logs performance metrics for an operation.
   * Useful for tracking response times and identifying slow operations.
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation} completed`, {
      component: 'performance',
      operation,
      duration,
    }, metadata);
  }

  /**
   * Logs security-related events for audit trails.
   * These logs are critical for compliance and security monitoring.
   */
  logSecurity(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.info(`Security: ${event}`, {
      component: 'security',
      operation: event,
      userId,
    }, metadata);
  }

  /**
   * Logs business metrics and KPIs for analytics.
   * Enables tracking of business-critical measurements over time.
   */
  logMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.info(`Metric: ${name}`, {
      component: 'metrics',
      operation: name,
      value,
    }, metadata);
  }
}

// Export singleton instance for application-wide use
export const logger = new UnifiedLogger();