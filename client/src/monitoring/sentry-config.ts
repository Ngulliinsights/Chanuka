import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { CaptureConsole } from '@sentry/integrations';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

class SentryMonitoring {
  private static instance: SentryMonitoring;
  private initialized = false;

  static getInstance(): SentryMonitoring {
    if (!SentryMonitoring.instance) {
      SentryMonitoring.instance = new SentryMonitoring();
    }
    return SentryMonitoring.instance;
  }

  initialize(config: SentryConfig): void {
    if (this.initialized) {
      console.warn('Sentry already initialized');
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release || process.env.REACT_APP_VERSION,
      
      // Performance monitoring
      integrations: [
        new BrowserTracing({
          // Capture interactions and navigation
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
          
          // Custom performance marks
          markBackgroundTransactions: true,
          
          // Trace specific operations
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/api\.chanuka\.ke/,
            /^https:\/\/ws\.chanuka\.ke/,
          ],
        }),
        
        // Capture console errors
        new CaptureConsole({
          levels: ['error', 'warn'],
        }),
        
        // Session replay for debugging
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
          maskAllInputs: true,
        }),
      ],
      
      // Sampling rates
      sampleRate: config.sampleRate,
      tracesSampleRate: config.tracesSampleRate,
      replaysSessionSampleRate: config.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
      
      // Error filtering
      beforeSend: (event, hint) => {
        return this.filterError(event, hint);
      },
      
      // Performance filtering
      beforeSendTransaction: (event) => {
        return this.filterTransaction(event);
      },
      
      // Additional configuration
      autoSessionTracking: true,
      sendClientReports: true,
      
      // Privacy settings
      sendDefaultPii: false,
      
      // Debug mode for development
      debug: config.environment === 'development',
      
      // Initial scope configuration
      initialScope: {
        tags: {
          component: 'chanuka-client',
          platform: 'web',
        },
        contexts: {
          app: {
            name: 'Chanuka Client',
            version: config.release || '1.0.0',
          },
        },
      },
    });

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up user context
    this.setupUserContext();

    this.initialized = true;
    console.log('✅ Sentry monitoring initialized');
  }

  private filterError(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    const error = hint.originalException;
    
    // Filter out known non-critical errors
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading chunk',
      'Network request failed',
    ];
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as Error).message;
      if (ignoredErrors.some(ignored => message.includes(ignored))) {
        return null;
      }
    }
    
    // Add custom context
    event.tags = {
      ...event.tags,
      errorBoundary: hint.mechanism?.handled ? 'caught' : 'uncaught',
    };
    
    // Add user agent info
    if (navigator) {
      event.contexts = {
        ...event.contexts,
        browser: {
          name: this.getBrowserName(),
          version: this.getBrowserVersion(),
        },
        device: {
          type: this.getDeviceType(),
        },
      };
    }
    
    return event;
  }

  private filterTransaction(event: Sentry.Transaction): Sentry.Transaction | null {
    // Filter out very short transactions
    if (event.timestamp && event.start_timestamp) {
      const duration = event.timestamp - event.start_timestamp;
      if (duration < 0.01) { // Less than 10ms
        return null;
      }
    }
    
    // Filter out health check transactions
    if (event.transaction?.includes('/health')) {
      return null;
    }
    
    return event;
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason, {
        tags: {
          errorType: 'unhandledRejection',
        },
        extra: {
          promise: event.promise,
        },
      });
    });
    
    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        Sentry.captureException(new Error(`Resource loading error: ${event.target}`), {
          tags: {
            errorType: 'resourceError',
          },
          extra: {
            element: event.target,
            source: (event.target as any)?.src || (event.target as any)?.href,
          },
        });
      }
    }, true);
  }

  private setupPerformanceMonitoring(): void {
    // Core Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `CLS: ${metric.value}`,
            level: 'info',
            data: metric,
          });
          
          if (metric.value > 0.1) {
            Sentry.captureMessage(`High CLS detected: ${metric.value}`, 'warning');
          }
        });
        
        getFID((metric) => {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `FID: ${metric.value}ms`,
            level: 'info',
            data: metric,
          });
          
          if (metric.value > 100) {
            Sentry.captureMessage(`High FID detected: ${metric.value}ms`, 'warning');
          }
        });
        
        getLCP((metric) => {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `LCP: ${metric.value}ms`,
            level: 'info',
            data: metric,
          });
          
          if (metric.value > 2500) {
            Sentry.captureMessage(`High LCP detected: ${metric.value}ms`, 'warning');
          }
        });
        
        getFCP((metric) => {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `FCP: ${metric.value}ms`,
            level: 'info',
            data: metric,
          });
        });
        
        getTTFB((metric) => {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `TTFB: ${metric.value}ms`,
            level: 'info',
            data: metric,
          });
        });
      });
    }
    
    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
          const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
          
          if (usedMB > 100) { // Alert if using more than 100MB
            Sentry.addBreadcrumb({
              category: 'performance',
              message: `High memory usage: ${usedMB}MB / ${totalMB}MB`,
              level: 'warning',
              data: { usedMB, totalMB },
            });
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupUserContext(): void {
    // Set up user context when authentication changes
    Sentry.setContext('app', {
      name: 'Chanuka Client',
      version: process.env.REACT_APP_VERSION || '1.0.0',
      buildTime: process.env.REACT_APP_BUILD_TIME,
    });
    
    // Device context
    Sentry.setContext('device', {
      type: this.getDeviceType(),
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      platform: navigator.platform,
    });
  }

  // Public methods for application use
  captureError(error: Error, context?: Record<string, any>): void {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
    Sentry.captureMessage(message, level);
    if (context) {
      Sentry.setExtra('messageContext', context);
    }
  }

  setUserContext(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  clearUserContext(): void {
    Sentry.setUser(null);
  }

  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
    });
  }

  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  startTransaction(name: string, op: string): Sentry.Transaction {
    return Sentry.startTransaction({ name, op });
  }

  // Utility methods
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }
}

// React Error Boundary integration
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Performance monitoring HOC
export const withSentryProfiling = <P extends object>(
  Component: React.ComponentType<P>,
  name?: string
) => {
  return Sentry.withProfiler(Component, { name });
};

// Hook for manual error reporting
export const useSentryError = () => {
  const sentry = SentryMonitoring.getInstance();
  
  return {
    captureError: sentry.captureError.bind(sentry),
    captureMessage: sentry.captureMessage.bind(sentry),
    addBreadcrumb: sentry.addBreadcrumb.bind(sentry),
    setTag: sentry.setTag.bind(sentry),
    setContext: sentry.setContext.bind(sentry),
  };
};

export default SentryMonitoring;