/**
 * Enhanced Error Monitoring Service
 * Integrates with and extends the core error system
 */

import {
  AppError,
  ErrorDomain,
  ErrorSeverity,
  coreErrorHandler,
  createError,
  ErrorAnalyticsService,
} from '@client/core/error';

import SentryMonitoring from './sentry-config';

// ============================================================================
// Enhanced Types (extending core)
// ============================================================================

interface ErrorMetrics extends Record<string, unknown> {
  errorRate: number;
  errorCount: number;
  uniqueErrors: number;
  topErrors: ErrorSummary[];
  performanceImpact: PerformanceImpact;
}

interface ErrorSummary {
  message: string;
  count: number;
  lastSeen: Date;
  affectedUsers: number;
  stackTrace?: string;
  tags: Record<string, string>;
}

interface PerformanceImpact {
  avgResponseTime: number;
  errorResponseTime: number;
  impactScore: number; // 0-100
}

// Enhanced error type to track timestamps
interface TrackedError extends Error {
  timestamp?: number;
  appError?: AppError;
}

// ============================================================================
// Enhanced Error Monitoring Class (integrating with core)
// ============================================================================

class ErrorMonitoring {
  private static instance: ErrorMonitoring;
  private sentry: SentryMonitoring;
  private errorBuffer: TrackedError[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private analyticsService: ErrorAnalyticsService;

  static getInstance(): ErrorMonitoring {
    if (!ErrorMonitoring.instance) {
      ErrorMonitoring.instance = new ErrorMonitoring();
    }
    return ErrorMonitoring.instance;
  }

  constructor() {
    this.sentry = SentryMonitoring.getInstance();
    this.analyticsService = ErrorAnalyticsService.getInstance();
    this.setupErrorTracking();
    this.startMetricsCollection();
    this.integrateWithCoreSystem();
  }

  private integrateWithCoreSystem(): void {
    // Add this monitoring service as a reporter to the core error system
    const monitoringReporter = {
      report: async (error: AppError): Promise<void> => {
        await this.handleCoreError(error);
      }
    };

    coreErrorHandler.addReporter(monitoringReporter);

    // Configure analytics service
    this.analyticsService.configure({
      enabled: true,
      monitoring: {
        level: 'detailed',
        enableAggregation: true,
        enableTrendAnalysis: true,
        enableRateLimiting: true,
        maxErrorsPerMinute: 60,
        retentionPeriodHours: 24,
        backends: [],
        flushIntervalMs: 30000,
      }
    });
  }

  private async handleCoreError(error: AppError): Promise<void> {
    // Convert AppError to TrackedError for compatibility
    const trackedError: TrackedError = new Error(error.message);
    trackedError.name = error.code;
    trackedError.stack = error.stack;
    trackedError.timestamp = error.timestamp;
    trackedError.appError = error;

    // Add to buffer
    this.errorBuffer.push(trackedError);

    // Keep buffer size manageable
    if (this.errorBuffer.length > 100) {
      this.errorBuffer = this.errorBuffer.slice(-50);
    }

    // Track with analytics service
    await this.analyticsService.track(error);

    // Send to Sentry with enhanced context
    this.sentry.captureError(trackedError, {
      errorId: error.id,
      domain: error.type,
      severity: error.severity,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable,
    });
  }

  private setupErrorTracking(): void {
    // Global error handler - captures uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createAppErrorFromEvent(event);
      coreErrorHandler.handleError(error);
    });

    // Promise rejection handler - captures unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createAppErrorFromRejection(event);
      coreErrorHandler.handleError(error);
    });

    // Network error tracking
    this.setupNetworkErrorTracking();
    
    // Performance error tracking
    this.setupPerformanceErrorTracking();
  }

  private createAppErrorFromEvent(event: ErrorEvent): Partial<AppError> {
    return {
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: event.message,
      code: 'UNCAUGHT_JAVASCRIPT_ERROR',
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        component: 'GlobalErrorHandler',
      },
      recoverable: false,
      retryable: false,
    };
  }

  private createAppErrorFromRejection(event: PromiseRejectionEvent): Partial<AppError> {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    return {
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: reason.message,
      code: 'UNHANDLED_PROMISE_REJECTION',
      context: {
        component: 'PromiseRejectionHandler',
        promise: event.promise,
      },
      recoverable: false,
      retryable: false,
    };
  }

  private setupNetworkErrorTracking(): void {
    // Intercept fetch requests to track network errors and performance
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Track slow requests (longer than 5 seconds)
        if (duration > 5000) {
          const slowRequestError = createError(
            ErrorDomain.NETWORK,
            ErrorSeverity.MEDIUM,
            `Slow network request: ${args[0]}`,
            {
              details: {
                url: String(args[0]),
                duration,
                status: response.status,
              },
              context: {
                component: 'NetworkMonitoring',
                operation: 'fetch',
              },
              recoverable: true,
              retryable: true,
            }
          );
          
          coreErrorHandler.handleError(slowRequestError);
        }
        
        // Track HTTP errors (4xx and 5xx status codes)
        if (!response.ok) {
          this.handleNetworkError(response, String(args[0]), duration);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.handleNetworkError(error, String(args[0]), endTime - startTime);
        throw error;
      }
    };

    // XMLHttpRequest tracking (similar pattern)
    this.setupXHRTracking();
  }

  private setupXHRTracking(): void {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(
      this: XMLHttpRequest & { _startTime?: number; _method?: string; _url?: string },
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._startTime = performance.now();
      this._method = method;
      this._url = String(url);
      
      if (username !== undefined) {
        return originalXHROpen.call(this, method, url, async, username, password);
      }
      return originalXHROpen.call(this, method, url, async);
    };
    
    XMLHttpRequest.prototype.send = function(
      this: XMLHttpRequest & { _startTime?: number; _method?: string; _url?: string },
      body?: Document | XMLHttpRequestBodyInit | null
    ): void {
      this.addEventListener('loadend', () => {
        const endTime = performance.now();
        const duration = this._startTime ? endTime - this._startTime : 0;
        
        if (this.status >= 400) {
          const networkError = createError(
            ErrorDomain.NETWORK,
            this.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
            `HTTP ${this.status}: ${this.statusText}`,
            {
              details: {
                url: this._url || 'unknown',
                method: this._method || 'unknown',
                status: this.status,
                statusText: this.statusText,
                duration,
              },
              context: {
                component: 'XHRMonitoring',
                operation: 'xhr_request',
              },
              recoverable: this.status < 500,
              retryable: this.status >= 500 || this.status === 408 || this.status === 429,
            }
          );
          
          coreErrorHandler.handleError(networkError);
        }
      });
      
      return originalXHRSend.call(this, body);
    };
  }

  private setupPerformanceErrorTracking(): void {
    if ('PerformanceObserver' in window) {
      // Long task detection
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              const performanceError = createError(
                ErrorDomain.SYSTEM,
                ErrorSeverity.MEDIUM,
                `Long task detected: ${entry.duration}ms`,
                {
                  details: {
                    duration: entry.duration,
                    startTime: entry.startTime,
                    name: entry.name,
                  },
                  context: {
                    component: 'PerformanceMonitoring',
                    operation: 'long_task_detection',
                  },
                  recoverable: false,
                  retryable: false,
                }
              );
              
              coreErrorHandler.handleError(performanceError);
            }
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task observer not supported');
      }

      // Layout shift detection
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutEntry = entry as PerformanceEntry & { value: number; sources?: unknown[] };
            if (layoutEntry.value > 0.1) {
              const layoutError = createError(
                ErrorDomain.SYSTEM,
                ErrorSeverity.MEDIUM,
                `High Cumulative Layout Shift: ${layoutEntry.value}`,
                {
                  details: {
                    value: layoutEntry.value,
                    sources: layoutEntry.sources,
                  },
                  context: {
                    component: 'PerformanceMonitoring',
                    operation: 'layout_shift_detection',
                  },
                  recoverable: false,
                  retryable: false,
                }
              );
              
              coreErrorHandler.handleError(layoutError);
            }
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift observer not supported');
      }
    }

    // Memory leak detection
    this.setupMemoryMonitoring();
  }

  private setupMemoryMonitoring(): void {
    const extendedPerf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (extendedPerf.memory) {
      setInterval(() => {
        const memory = extendedPerf.memory;
        if (memory && memory.usedJSHeapSize > 150 * 1024 * 1024) { // 150MB threshold
          const memoryError = createError(
            ErrorDomain.SYSTEM,
            ErrorSeverity.HIGH,
            `High memory usage detected: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
            {
              details: {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
              },
              context: {
                component: 'MemoryMonitoring',
                operation: 'memory_usage_check',
              },
              recoverable: false,
              retryable: false,
            }
          );
          
          coreErrorHandler.handleError(memoryError);
        }
      }, 60000); // Check every minute
    }
  }

  private handleNetworkError(error: unknown, url: string, duration: number): void {
    let errorMessage = 'Unknown network error';
    let status: number | undefined;
    let statusText: string | undefined;
    let severity = ErrorSeverity.MEDIUM;
    
    if (error instanceof Response) {
      errorMessage = `Network error: ${error.status}`;
      status = error.status;
      statusText = error.statusText;
      severity = error.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    } else if (error instanceof Error) {
      errorMessage = `Network error: ${error.message}`;
    }
    
    const networkError = createError(
      ErrorDomain.NETWORK,
      severity,
      errorMessage,
      {
        details: {
          url,
          duration,
          status,
          statusText,
        },
        context: {
          component: 'NetworkMonitoring',
          operation: 'network_request',
        },
        recoverable: true,
        retryable: !status || status >= 500 || status === 408 || status === 429,
      }
    );
    
    coreErrorHandler.handleError(networkError);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectAndSendMetrics();
    }, 60000); // Collect metrics every minute
  }

  private collectAndSendMetrics(): void {
    const metrics = this.calculateErrorMetrics();
    
    // Send metrics to core analytics service
    this.analyticsService.flush();
    
    // Alert on high error rates
    if (metrics.errorRate > 5) {
      const highErrorRateError = createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.CRITICAL,
        `High error rate detected: ${metrics.errorRate}%`,
        {
          details: metrics,
          context: {
            component: 'ErrorMonitoring',
            operation: 'metrics_analysis',
          },
          recoverable: false,
          retryable: false,
        }
      );
      
      coreErrorHandler.handleError(highErrorRateError);
    }
  }

  private calculateErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentErrors = this.errorBuffer.filter(
      error => error.timestamp && error.timestamp > oneHourAgo
    );
    
    return {
      errorRate: (recentErrors.length / 100) * 100,
      errorCount: recentErrors.length,
      uniqueErrors: new Set(recentErrors.map(e => e.message)).size,
      topErrors: this.getTopErrors(recentErrors),
      performanceImpact: this.calculatePerformanceImpact(),
    };
  }

  private getTopErrors(errors: TrackedError[]): ErrorSummary[] {
    const errorGroups = new Map<string, ErrorSummary>();
    
    errors.forEach(error => {
      const key = error.message;
      const existing = errorGroups.get(key);
      
      if (existing) {
        existing.count++;
        existing.lastSeen = new Date();
      } else {
        errorGroups.set(key, {
          message: error.message,
          count: 1,
          lastSeen: new Date(),
          affectedUsers: 1,
          stackTrace: error.stack,
          tags: {},
        });
      }
    });
    
    return Array.from(errorGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculatePerformanceImpact(): PerformanceImpact {
    return {
      avgResponseTime: 250,
      errorResponseTime: 500,
      impactScore: 25,
    };
  }

  // ============================================================================
  // Public API (enhanced with core integration)
  // ============================================================================

  reportError(error: Error, context?: Record<string, unknown>): void {
    const appError = createError(
      ErrorDomain.UNKNOWN,
      ErrorSeverity.MEDIUM,
      error.message,
      {
        details: {
          originalError: error.name,
          stack: error.stack,
        },
        context: {
          component: 'ManualErrorReport',
          ...context,
        },
        recoverable: false,
        retryable: false,
      }
    );
    
    coreErrorHandler.handleError(appError);
  }

  reportUserAction(action: string, context?: Record<string, unknown>): void {
    this.sentry.addBreadcrumb(action, 'user', context);
  }

  reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      const performanceError = createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.MEDIUM,
        `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`,
        {
          details: { metric, value, threshold },
          context: {
            component: 'PerformanceMonitoring',
            operation: 'threshold_check',
          },
          recoverable: false,
          retryable: false,
        }
      );
      
      coreErrorHandler.handleError(performanceError);
    }
  }

  setUserContext(user: { id: string; email?: string; username?: string }): void {
    this.sentry.setUserContext(user);
  }

  clearUserContext(): void {
    this.sentry.clearUserContext();
  }

  getErrorMetrics(): ErrorMetrics {
    return this.calculateErrorMetrics();
  }

  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
}

export default ErrorMonitoring;