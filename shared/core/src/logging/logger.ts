/**
 * Enhanced Logger class with pino integration and async context preservation
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import {
  LogContext,
  LogMetrics,
  LoggerOptions,
  RequestLogData,
  DatabaseQueryLogData,
  CacheOperationLogData,
  BusinessEventLogData,
  SecurityEventLogData,
} from './types';
import { LogRotationManager, createLogRotationManager } from './log-rotation';

export class Logger {
  private pino: pino.Logger;
  private asyncLocalStorage: AsyncLocalStorage<LogContext>;
  private metrics: LogMetrics;
  private startTime: number;
  private rotationManager?: LogRotationManager;
  private performanceTimers: Map<string, number> = new Map();

  constructor(options: LoggerOptions = {}) {
    this.asyncLocalStorage = new AsyncLocalStorage();
    this.startTime = Date.now();
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {},
      errorsLogged: 0,
      avgLogSize: 0,
      logRate: 0,
    };

    // Configure pino with redaction and transports
    const pinoOptions: pino.LoggerOptions = {
      level: options.level || 'info',
      name: options.name || 'app',
      redact: {
        paths: options.redactPaths || [
          '*.password',
          '*.token',
          '*.ssn',
          '*.creditCard',
          '*.authorization',
          '*.cookie',
          '*.secret',
          '*.key',
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
        environment: options.environment || process.env.NODE_ENV || 'development',
        service: options.name || 'app',
        version: options.version || '1.0.0',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    // Configure transports
    if (options.asyncTransport) {
      const transports: any[] = [];

      // Console transport (pretty in development)
      if (options.pretty || process.env.NODE_ENV === 'development') {
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
        transports.push({
          target: 'pino/file',
          level: 'info',
          options: { destination: 1 }, // stdout
        });
      }

      // File transport for all logs with rotation
      transports.push({
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: './logs/app.log',
          mkdir: true,
          sync: false,
        },
      });

      // Error-specific file transport with rotation
      transports.push({
        target: 'pino/file',
        level: 'error',
        options: {
          destination: './logs/error.log',
          mkdir: true,
          sync: false,
        },
      });

      // Security events file transport
      transports.push({
        target: 'pino/file',
        level: 'warn',
        options: {
          destination: './logs/security.log',
          mkdir: true,
          sync: false,
        },
      });

      // Performance logs file transport
      transports.push({
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: './logs/performance.log',
          mkdir: true,
          sync: false,
        },
      });

      this.pino = pino(
        pinoOptions,
        pino.transport({
          targets: transports,
        })
      );
    } else {
      // Simple console logger
      this.pino = pino(pinoOptions);
    }

    // Enable metrics collection if requested
    if (options.enableMetrics) {
      this.enableMetricsCollection();
    }

    // Set up log rotation if file logging is enabled
    if (options.asyncTransport && (options.maxFileSize || options.maxFiles)) {
      this.rotationManager = createLogRotationManager({
        maxFileSize: options.maxFileSize || '10MB',
        maxFiles: options.maxFiles || 5,
        compress: true,
      });

      // Set up rotation for main log files
      this.rotationManager.setupRotationCheck('./logs/app.log');
      this.rotationManager.setupRotationCheck('./logs/error.log');
      this.rotationManager.setupRotationCheck('./logs/security.log');
      this.rotationManager.setupRotationCheck('./logs/performance.log');
    }
  }

  /**
   * Execute a function with logging context
   */
  withContext<T>(context: LogContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Execute an async function with logging context
   */
  async withContextAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.asyncLocalStorage.run(context, async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Get current logging context
   */
  getContext(): LogContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Create a child logger with additional context
   */
  child(bindings: Record<string, any>): Logger {
    const childLogger = Object.create(this);
    childLogger.pino = this.pino.child(bindings);
    return childLogger;
  }

  /**
   * Update log level dynamically
   */
  setLevel(level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'): void {
    this.pino.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.pino.level;
  }

  // Core logging methods with context enrichment
  fatal(obj: any, msg?: string): void {
    this.logWithContext('fatal', obj, msg);
  }

  error(obj: any, msg?: string): void {
    this.logWithContext('error', obj, msg);
  }

  warn(obj: any, msg?: string): void {
    this.logWithContext('warn', obj, msg);
  }

  info(obj: any, msg?: string): void {
    this.logWithContext('info', obj, msg);
  }

  debug(obj: any, msg?: string): void {
    this.logWithContext('debug', obj, msg);
  }

  trace(obj: any, msg?: string): void {
    this.logWithContext('trace', obj, msg);
  }

  // Specialized logging methods for different event types
  logRequest(data: RequestLogData, msg?: string): void {
    const context = this.getContext();
    this.info(
      {
        type: 'request',
        request: data,
        ...context,
      },
      msg || `${data.method} ${data.url} - ${data.statusCode || 'pending'}`
    );
  }

  logDatabaseQuery(data: DatabaseQueryLogData, msg?: string): void {
    const context = this.getContext();
    this.debug(
      {
        type: 'database_query',
        database: data,
        ...context,
      },
      msg || `Database query executed in ${data.duration}ms`
    );
  }

  logCacheOperation(data: CacheOperationLogData, msg?: string): void {
    const context = this.getContext();
    this.debug(
      {
        type: 'cache_operation',
        cache: data,
        ...context,
      },
      msg || `Cache ${data.operation} for key ${data.key} - ${data.hit ? 'HIT' : 'MISS'}`
    );
  }

  logBusinessEvent(data: BusinessEventLogData, msg?: string): void {
    const context = this.getContext();
    this.info(
      {
        type: 'business_event',
        business: data,
        ...context,
      },
      msg || `Business event: ${data.event}`
    );
  }

  logSecurityEvent(data: SecurityEventLogData, msg?: string): void {
    const context = this.getContext();
    const level = this.getSecurityLogLevel(data.severity);
    
    this[level](
      {
        type: 'security_event',
        security: data,
        ...context,
      },
      msg || `Security event: ${data.event} (${data.severity})`
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): LogMetrics {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;
    
    return {
      ...this.metrics,
      logRate: this.metrics.totalLogs / uptimeSeconds,
    };
  }

  /**
   * Reset metrics
   */
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

  /**
   * Start performance timer for an operation
   */
  startTimer(operationName: string): void {
    this.performanceTimers.set(operationName, performance.now());
  }

  /**
   * End performance timer and log the duration
   */
  endTimer(operationName: string, additionalData?: Record<string, any>): number {
    const startTime = this.performanceTimers.get(operationName);
    if (!startTime) {
      this.warn({ operationName }, 'Timer not found for operation');
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceTimers.delete(operationName);

    // Log performance data
    this.debug(
      {
        type: 'performance',
        operation: operationName,
        duration,
        ...additionalData,
        ...this.getContext(),
      },
      `Operation ${operationName} completed in ${duration.toFixed(2)}ms`
    );

    return duration;
  }

  /**
   * Log performance data for an operation
   */
  logPerformance(
    operationName: string,
    duration: number,
    additionalData?: Record<string, any>
  ): void {
    const context = this.getContext();
    this.debug(
      {
        type: 'performance',
        performance: {
          operation: operationName,
          duration,
          ...additionalData,
        },
        ...context,
      },
      `Performance: ${operationName} took ${duration.toFixed(2)}ms`
    );
  }

  /**
   * Measure and log the execution time of a function
   */
  async measureAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    additionalData?: Record<string, any>
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
   * Measure and log the execution time of a synchronous function
   */
  measure<T>(
    operationName: string,
    fn: () => T,
    additionalData?: Record<string, any>
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

  /**
   * Cleanup resources and stop log rotation
   */
  async cleanup(): Promise<void> {
    if (this.rotationManager) {
      this.rotationManager.stopAllRotationChecks();
    }
    await this.flush();
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pino.flush(() => {
        resolve();
      });
    });
  }

  private logWithContext(level: string, obj: any, msg?: string): void {
    const context = this.getContext();
    const enrichedObj = {
      ...obj,
      ...context,
    };

    // Update metrics
    this.updateMetrics(level, enrichedObj);

    // Log with pino
    (this.pino as any)[level](enrichedObj, msg);
  }

  private updateMetrics(level: string, obj: any): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;
    
    if (level === 'error' || level === 'fatal') {
      this.metrics.errorsLogged++;
    }

    // Estimate log size (rough approximation)
    const logSize = JSON.stringify(obj).length;
    this.metrics.avgLogSize = 
      (this.metrics.avgLogSize * (this.metrics.totalLogs - 1) + logSize) / this.metrics.totalLogs;
  }

  private getSecurityLogLevel(severity: string): 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warn';
      case 'high':
        return 'error';
      case 'critical':
        return 'fatal';
      default:
        return 'warn';
    }
  }

  private enableMetricsCollection(): void {
    // Set up periodic metrics logging (every 5 minutes)
    setInterval(() => {
      const metrics = this.getMetrics();
      this.info({ metrics }, 'Logger metrics report');
    }, 5 * 60 * 1000);
  }
}

// Create a default logger instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as any) || 'info',
  pretty: process.env.NODE_ENV === 'development',
  asyncTransport: process.env.NODE_ENV !== 'test',
  enableMetrics: process.env.ENABLE_LOG_METRICS === 'true',
  name: process.env.SERVICE_NAME || 'app',
  version: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});






