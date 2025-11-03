import { LogLevel, LogContext, LoggerChild } from '../observability/logging/types';

/**
 * Environment detection for adaptive logging behavior
 */
export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production' | 'test';
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isTest: boolean;
  features: {
    serverSync: boolean;
    consoleLogging: boolean;
    performanceTracking: boolean;
    errorTracking: boolean;
    userTracking: boolean;
  };
}

/**
 * Feature flags for gradual migration and A/B testing
 */
export interface FeatureFlags {
  unifiedLogging: boolean;
  serverSync: boolean;
}

/**
 * Unified logging configuration
 */
export interface UnifiedLoggerConfig { environment: EnvironmentConfig;
  featureFlags: FeatureFlags;
  baseUrl?: string;
  sessionId?: string;
  user_id?: string;
  correlationId?: string;
  enableAutoFlush?: boolean;
  flushIntervalMs?: number;
  maxBufferSize?: number;
  flushBatchSize?: number;
  legacyLogger?: LoggerChild;
 }

/**
 * Browser-compatible logger that integrates with the server-side observability system.
 * Enhanced with environment detection, unified API, and feature flag migration support.
 */
export class BrowserLogger implements LoggerChild { private config: UnifiedLoggerConfig;
  private baseUrl: string;
  private sessionId: string;
  private user_id?: string;
  private correlationId?: string;
  private buffer: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    metadata?: Record<string, unknown>;
    timestamp: Date;
   }> = [];
  private flushInterval?: number;
  private isOnline: boolean = navigator.onLine;
  private maxBufferSize: number = 100;
  private flushBatchSize: number = 10;
  private flushIntervalMs: number = 30000; // 30 seconds
  private legacyLogger?: LoggerChild;

  constructor(config: UnifiedLoggerConfig) {
    this.config = config;
    this.legacyLogger = config.legacyLogger;

    this.baseUrl = config.baseUrl || '/api/logs';
    this.sessionId = config.sessionId || this.generateSessionId();
    this.user_id = config.user_id;
    this.correlationId = config.correlationId;

    this.maxBufferSize = config.maxBufferSize || 100;
    this.flushBatchSize = config.flushBatchSize || 10;
    this.flushIntervalMs = config.flushIntervalMs || 30000;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush(); // Flush buffered logs when coming back online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Set up periodic flush if enabled and feature flag allows
    if (config.enableAutoFlush !== false && config.featureFlags.serverSync) {
      this.flushInterval = window.setInterval(() => {
        if (this.isOnline) {
          this.flush();
        }
      }, this.flushIntervalMs);
    }

    // Flush logs on page unload
    window.addEventListener('beforeunload', () => {
      this.flushSync();
    });
  }

  /**
   * Generate a unique session ID for the browser session
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send logs to the server asynchronously
   */
  private async sendLogs(logs: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }>): Promise<void> {
    if (!this.isOnline || logs.length === 0) return;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
          ...(this.user_id && { 'X-User-ID': this.user_id }),
          ...(this.correlationId && { 'X-Correlation-ID': this.correlationId }),
        },
        body: JSON.stringify({ logs: logs.map(log => ({
            ...log,
            timestamp: log.timestamp.toISOString(),
            sessionId: this.sessionId,
            user_id: this.user_id,
            correlationId: this.correlationId,
            user_agent: navigator.user_agent,
            url: window.location.href,
            referrer: document.referrer,
           })),
        }),
        // Use keepalive to ensure logs are sent even if page is unloading
        keepalive: true,
      });

      if (!response.ok) {
        console.warn('Failed to send logs to server:', response.status);
      }
    } catch (error) {
      console.warn('Error sending logs to server:', error);
      // Re-buffer logs that failed to send
      this.buffer.unshift(...logs);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer = this.buffer.slice(-this.maxBufferSize);
      }
    }
  }

  /**
   * Flush buffered logs synchronously (for page unload)
   */
  private flushSync(): void { if (this.buffer.length === 0 || !this.isOnline) return;

    try {
      const logs = this.buffer.splice(0);
      navigator.sendBeacon(this.baseUrl, JSON.stringify({
        logs: logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
          sessionId: this.sessionId,
          user_id: this.user_id,
          correlationId: this.correlationId,
          user_agent: navigator.user_agent,
          url: window.location.href,
          referrer: document.referrer,
         })),
      }));
    } catch (error) {
      console.warn('Error sending logs via sendBeacon:', error);
    }
  }

  /**
   * Flush buffered logs to the server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.flushBatchSize);
    await this.sendLogs(batch);

    // Continue flushing remaining batches
    if (this.buffer.length > 0) {
      setTimeout(() => this.flush(), 100);
    }
  }

  /**
   * Log to console and buffer for server sending
   */
  private logToConsole(level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;

    const logData = { message,
      context,
      metadata,
      sessionId: this.sessionId,
      user_id: this.user_id,
      correlationId: this.correlationId,
     };

    switch (level) {
      case 'error':
      case 'fatal':
      case 'critical':
        console.error(prefix, message, logData);
        break;
      case 'warn':
        console.warn(prefix, message, logData);
        break;
      case 'debug':
        console.debug(prefix, message, logData);
        break;
      default:
        console.log(prefix, message, logData);
    }
  }

  /**
   * Internal logging implementation with unified features
   */
  private logInternal(level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    // Log to console if enabled
    if (this.config.environment.features.consoleLogging) {
      this.logToConsole(level, message, context, metadata);
    }

    // Buffer for server sending if feature flag enabled
    if (this.config.featureFlags.serverSync) {
      this.buffer.push({
        level,
        message,
        context,
        metadata,
        timestamp: new Date(),
      });

      // Prevent buffer from growing too large
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift(); // Remove oldest log
      }

      // Auto-flush if buffer is getting full
      if (this.buffer.length >= this.flushBatchSize && this.isOnline) {
        this.flush();
      }
    }
  }

  // LoggerChild interface implementation

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

  error(message: string, context?: LogContext, metadataOrError?: Record<string, unknown> | unknown): void {
    const processedMetadata = this.processErrorMetadata(message, context, metadataOrError);
    this.logInternal('error', message, context, processedMetadata);
  }

  fatal(message: string, context?: LogContext, metadataOrError?: Record<string, unknown> | unknown): void {
    const processedMetadata = this.processErrorMetadata(message, context, metadataOrError);
    this.logInternal('fatal', message, context, processedMetadata);
  }

  critical(message: string, context?: LogContext, metadataOrError?: Record<string, unknown> | unknown): void {
    const processedMetadata = this.processErrorMetadata(message, context, metadataOrError);
    this.logInternal('fatal', message, context, processedMetadata);
  }

  child(bindings: Record<string, unknown>): LoggerChild {
    const childLogger = new BrowserLogger({
      ...this.config,
      enableAutoFlush: false, // Child loggers don't auto-flush
    });

    // Merge bindings into context for all future logs
    const originalLogInternal = childLogger.logInternal.bind(childLogger);
    childLogger.logInternal = (level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, unknown>) => {
      const mergedContext = context ? { ...bindings, ...context } : bindings;
      originalLogInternal(level, message, mergedContext, metadata);
    };

    return childLogger;
  }

  withContext<T>(context: LogContext, fn: () => T): T {
    // For browser logger, we create a temporary child logger
    const childLogger = this.child(context);
    // Replace global logger temporarily (if available)
    const originalLogger = (window as any).browserLogger;
    (window as any).browserLogger = childLogger;

    try {
      return fn();
    } finally {
      (window as any).browserLogger = originalLogger;
    }
  }

  async withContextAsync<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
    const childLogger = this.child(context);
    const originalLogger = (window as any).browserLogger;
    (window as any).browserLogger = childLogger;

    try {
      return await fn();
    } finally {
      (window as any).browserLogger = originalLogger;
    }
  }

  // Browser-specific methods

  /**
   * Log browser performance metrics with enhanced tracking
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const performanceData = {
      component: 'performance',
      operation,
      duration,
      user_agent: navigator.user_agent,
      url: window.location.href,
      memoryUsage: this.getMemoryUsage(),
      connectionType: this.getConnectionType(),
    };

    this.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, performanceData, metadata);
  }

  /**
   * Log user interaction events
   */
  logUserInteraction(event: string, element?: string, metadata?: Record<string, unknown>): void {
    this.info(`User interaction: ${event}`, {
      component: 'ui',
      operation: event,
      element,
      url: window.location.href,
      user_agent: navigator.user_agent,
    }, metadata);
  }

  /**
   * Log navigation events
   */
  logNavigation(from: string, to: string, metadata?: Record<string, unknown>): void {
    this.info(`Navigation: ${from} -> ${to}`, {
      component: 'navigation',
      operation: 'navigate',
      from,
      to,
      user_agent: navigator.user_agent,
    }, metadata);
  }

  /**
   * Log errors with browser context
   */
  logError(error: Error | string, context?: LogContext, metadata?: Record<string, unknown>): void {
    const errorData = this.processErrorMetadata(error, context, metadata);
    this.error(typeof error === 'string' ? error : error.message, context, errorData);
  }

  /**
   * Process error metadata for browser environment
   */
  private processErrorMetadata(
    messageOrError: string | Error | unknown,
    context?: LogContext,
    metadataOrError?: Record<string, unknown> | unknown
  ): Record<string, unknown> | undefined {
    let error: unknown;
    let metadata: Record<string, unknown> | undefined;

    if (messageOrError instanceof Error) {
      error = messageOrError;
      metadata = metadataOrError as Record<string, unknown>;
    } else if (typeof metadataOrError === 'object' && metadataOrError !== null) {
      // Check if metadataOrError is actually an error
      if (metadataOrError instanceof Error || (metadataOrError as any).stack) {
        error = metadataOrError;
      } else {
        metadata = metadataOrError as Record<string, unknown>;
      }
    }

    if (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        ...metadata,
        error: {
          message: errorObj.message,
          name: errorObj.name,
          stack: errorObj.stack,
          filename: (errorObj as any).filename,
          lineno: (errorObj as any).lineno,
          colno: (errorObj as any).colno,
        },
        browser: {
          user_agent: navigator.user_agent,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        },
      };
    }

    return metadata;
  }

  /**
   * Update user context
   */
  setUserId(user_id: string): void { this.user_id = user_id;
   }

  /**
   * Update correlation ID
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Manually trigger flush
   */
  forceFlush(): Promise<void> {
    return this.flush();
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): Record<string, unknown> | undefined {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit,
      };
    }
    return undefined;
  }

  /**
   * Get connection type information
   */
  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return undefined;
  }

  /**
   * Get current configuration
   */
  getConfig(): UnifiedLoggerConfig {
    return this.config;
  }

  /**
   * Update feature flags dynamically
   */
  updateFeatureFlags(flags: Partial<FeatureFlags>): void {
    this.config.featureFlags = { ...this.config.featureFlags, ...flags };
  }

  /**
   * Set legacy logger for fallback
   */
  setLegacyLogger(logger: LoggerChild): void {
    this.legacyLogger = logger;
  }

  /**
   * Get legacy logger
   */
  getLegacyLogger(): LoggerChild | undefined {
    return this.legacyLogger;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushSync();
  }
}

/**
 * Environment detection utility
 */
export function detectEnvironment(): EnvironmentConfig {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  let name: EnvironmentConfig['name'] = 'development';
  if (hostname.includes('staging') || nodeEnv === 'staging') {
    name = 'staging';
  } else if (hostname.includes('prod') || hostname.includes('production') || nodeEnv === 'production') {
    name = 'production';
  } else if (nodeEnv === 'test') {
    name = 'test';
  }

  const isDevelopment = name === 'development';
  const isStaging = name === 'staging';
  const isProduction = name === 'production';
  const isTest = name === 'test';

  return {
    name,
    isDevelopment,
    isStaging,
    isProduction,
    isTest,
    features: {
      serverSync: !isTest, // Disable server sync in tests
      consoleLogging: isDevelopment || isStaging,
      performanceTracking: isDevelopment || isStaging || isProduction,
      errorTracking: true, // Always enabled
      userTracking: isStaging || isProduction,
    },
  };
}

/**
 * Default feature flags based on environment
 */
export function getDefaultFeatureFlags(environment: EnvironmentConfig): FeatureFlags {
  return {
    unifiedLogging: true, // Always enabled for new logger
    serverSync: environment.features.serverSync,
  };
}

/**
 * Default browser logger instance with unified configuration
 */
export const browserLogger = new BrowserLogger({
  environment: detectEnvironment(),
  featureFlags: getDefaultFeatureFlags(detectEnvironment()),
  baseUrl: process.env.NODE_ENV === 'production'
    ? '/api/logs'
    : 'http://localhost:3000/api/logs',
  enableAutoFlush: true,
  flushIntervalMs: 30000,
  maxBufferSize: 100,
  flushBatchSize: 10,
});

/**
 * Enhanced global error handler integration with unified features
 */
export function setupGlobalErrorHandling(logger: BrowserLogger = browserLogger): void {
  const config = logger.getConfig();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.logError('Unhandled promise rejection', {
      component: 'global-error',
      operation: 'unhandledrejection',
    }, {
      reason: event.reason,
      promise: event.promise,
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.logError('Uncaught error', {
      component: 'global-error',
      operation: 'uncaughterror',
    }, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  // Handle console errors (override console methods) if console logging is enabled
  if (config.environment.features.consoleLogging) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      logger.error(args.join(' '), { component: 'console', operation: 'error' });
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalConsoleWarn.apply(console, args);
      logger.warn(args.join(' '), { component: 'console', operation: 'warn' });
    };
  }
}

/**
 * Migration helper to create browser logger with legacy fallback
 */
export function createBrowserLoggerWithLegacyFallback(
  legacyLogger?: LoggerChild,
  customConfig?: Partial<UnifiedLoggerConfig>
): BrowserLogger {
  const environment = detectEnvironment();
  const defaultConfig: UnifiedLoggerConfig = {
    environment,
    featureFlags: getDefaultFeatureFlags(environment),
    legacyLogger,
    ...customConfig,
  };

  return new BrowserLogger(defaultConfig);
}

/**
 * Utility to check if unified logging is enabled
 */
export function isUnifiedLoggingEnabled(logger: BrowserLogger = browserLogger): boolean {
  return logger.getConfig().featureFlags.unifiedLogging;
}

/**
 * Utility to enable/disable server sync
 */
export function setServerSyncEnabled(enabled: boolean, logger: BrowserLogger = browserLogger): void {
  logger.updateFeatureFlags({ serverSync: enabled });
}

// Auto-setup global error handling if running in browser
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
}
