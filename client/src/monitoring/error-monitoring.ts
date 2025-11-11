import SentryMonitoring from './sentry-config';

interface ErrorMetrics {
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

class ErrorMonitoring {
  private static instance: ErrorMonitoring;
  private sentry: SentryMonitoring;
  private errorBuffer: Error[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;

  static getInstance(): ErrorMonitoring {
    if (!ErrorMonitoring.instance) {
      ErrorMonitoring.instance = new ErrorMonitoring();
    }
    return ErrorMonitoring.instance;
  }

  constructor() {
    this.sentry = SentryMonitoring.getInstance();
    this.setupErrorTracking();
    this.startMetricsCollection();
  }

  private setupErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript',
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'promise',
          promise: event.promise,
        }
      );
    });

    // Network error tracking
    this.setupNetworkErrorTracking();
    
    // Performance error tracking
    this.setupPerformanceErrorTracking();
  }

  private setupNetworkErrorTracking(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        // Track slow requests
        if (endTime - startTime > 5000) {
          this.sentry.captureMessage(
            `Slow network request: ${args[0]}`,
            'warning',
            {
              url: args[0],
              duration: endTime - startTime,
              status: response.status,
            }
          );
        }
        
        // Track HTTP errors
        if (!response.ok) {
          this.handleNetworkError(response, args[0] as string, endTime - startTime);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.handleNetworkError(error, args[0] as string, endTime - startTime);
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      (this as any)._startTime = performance.now();
      (this as any)._method = method;
      (this as any)._url = url;
      return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('loadend', () => {
        const endTime = performance.now();
        const duration = endTime - (this as any)._startTime;
        
        if (this.status >= 400) {
          ErrorMonitoring.getInstance().handleNetworkError(
            new Error(`HTTP ${this.status}: ${this.statusText}`),
            (this as any)._url,
            duration
          );
        }
      });
      
      return originalXHRSend.call(this, ...args);
    };
  }

  private setupPerformanceErrorTracking(): void {
    // Long task detection
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.sentry.captureMessage(
                `Long task detected: ${entry.duration}ms`,
                'warning',
                {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                }
              );
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
            if ((entry as any).value > 0.1) { // CLS threshold
              this.sentry.captureMessage(
                `High Cumulative Layout Shift: ${(entry as any).value}`,
                'warning',
                {
                  value: (entry as any).value,
                  sources: (entry as any).sources,
                }
              );
            }
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout shift observer not supported');
      }
    }

    // Memory leak detection
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory && memory.usedJSHeapSize > 150 * 1024 * 1024) { // 150MB threshold
          this.sentry.captureMessage(
            `High memory usage detected: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
            'warning',
            {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
            }
          );
        }
      }, 60000); // Check every minute
    }
  }

  private handleError(error: Error, context?: Record<string, any>): void {
    // Add to error buffer for metrics
    this.errorBuffer.push(error);
    
    // Keep buffer size manageable
    if (this.errorBuffer.length > 100) {
      this.errorBuffer = this.errorBuffer.slice(-50);
    }
    
    // Enhance error with additional context
    const enhancedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: this.getConnectionInfo(),
    };
    
    // Send to Sentry
    this.sentry.captureError(error, enhancedContext);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', error, enhancedContext);
    }
  }

  private handleNetworkError(error: any, url: string, duration: number): void {
    const networkError = new Error(`Network error: ${error.message || error.status}`);
    
    this.handleError(networkError, {
      type: 'network',
      url,
      duration,
      status: error.status,
      statusText: error.statusText,
    });
  }

  private getConnectionInfo(): Record<string, any> {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    
    return { available: false };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectAndSendMetrics();
    }, 60000); // Collect metrics every minute
  }

  private collectAndSendMetrics(): void {
    const metrics = this.calculateErrorMetrics();
    
    // Send metrics to monitoring service
    this.sentry.setContext('errorMetrics', metrics);
    
    // Alert on high error rates
    if (metrics.errorRate > 5) { // More than 5% error rate
      this.sentry.captureMessage(
        `High error rate detected: ${metrics.errorRate}%`,
        'error',
        metrics
      );
    }
  }

  private calculateErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // This would typically come from a metrics service
    // For now, we'll use the error buffer as a simple example
    const recentErrors = this.errorBuffer.filter(
      error => (error as any).timestamp > oneHourAgo
    );
    
    return {
      errorRate: (recentErrors.length / 100) * 100, // Simplified calculation
      errorCount: recentErrors.length,
      uniqueErrors: new Set(recentErrors.map(e => e.message)).size,
      topErrors: this.getTopErrors(recentErrors),
      performanceImpact: this.calculatePerformanceImpact(),
    };
  }

  private getTopErrors(errors: Error[]): ErrorSummary[] {
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
          affectedUsers: 1, // Simplified
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
    // This would typically integrate with performance monitoring
    return {
      avgResponseTime: 250, // Placeholder
      errorResponseTime: 500, // Placeholder
      impactScore: 25, // Placeholder
    };
  }

  // Public methods
  reportError(error: Error, context?: Record<string, any>): void {
    this.handleError(error, context);
  }

  reportUserAction(action: string, context?: Record<string, any>): void {
    this.sentry.addBreadcrumb(action, 'user', context);
  }

  reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.sentry.captureMessage(
        `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`,
        'warning',
        { metric, value, threshold }
      );
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