import * as Sentry from '@sentry/react';
import * as React from 'react';
import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { onINP } from 'web-vitals';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

// Extended Performance API for memory monitoring
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Extended Navigator with connection APIs
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// Network Information API interface
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

// Layout Shift Entry extends PerformanceEntry
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  sources?: Array<{
    node?: Node;
    previousRect?: DOMRectReadOnly;
    currentRect?: DOMRectReadOnly;
  }>;
}

// Type for HTML elements that can fail to load
interface LoadableElement extends EventTarget {
  src?: string;
  href?: string;
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

      // Performance monitoring with distributed tracing
      integrations: [
        Sentry.browserTracingIntegration({
          // Configure which origins should receive tracing headers
          // This enables distributed tracing across your frontend and backend
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/api\.chanuka\.ke/,
            /^https:\/\/ws\.chanuka\.ke/,
          ],
        }),

        // Capture console errors and warnings automatically
        // Helps catch issues that might otherwise only appear in browser console
        Sentry.captureConsoleIntegration({
          levels: ['error', 'warn'],
        }),

        // Session replay captures user interactions for debugging
        // Helps reproduce bugs by showing exactly what the user did
        Sentry.replayIntegration({
          maskAllText: false, // Show text content for better debugging
          blockAllMedia: false, // Allow media to be captured
          maskAllInputs: true, // But mask sensitive input fields
        }),
      ],

      // Sampling rates control what percentage of events are sent to Sentry
      // This helps manage your quota and focus on the most important data
      sampleRate: config.sampleRate, // General error sampling
      tracesSampleRate: config.tracesSampleRate, // Performance trace sampling
      replaysSessionSampleRate: config.replaysSessionSampleRate, // Regular session replays
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate, // Always replay on errors

      // Error filtering - customize which errors get sent to Sentry
      beforeSend: (event, hint) => {
        return this.filterError(event, hint);
      },

      // Performance event filtering - control which transactions are sent
      beforeSendTransaction: (event, hint) => {
        return this.filterTransaction(event, hint);
      },

      // Session tracking helps understand user engagement patterns
      autoSessionTracking: true,

      // Client reports help Sentry improve SDK reliability
      sendClientReports: true,

      // Privacy: don't send personally identifiable information by default
      sendDefaultPii: false,

      // Enable debug mode in development for troubleshooting
      debug: config.environment === 'development',

      // Set initial scope with app metadata
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

    // Configure additional monitoring capabilities
    this.setupGlobalErrorHandlers();
    this.setupPerformanceMonitoring();
    this.setupUserContext();

    this.initialized = true;
    console.log('✅ Sentry monitoring initialized');
  }

  private filterError(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    const error = hint.originalException;

    // Filter out known non-critical errors that would create noise
    // These are common browser quirks that don't indicate actual problems
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded', // Benign browser behavior
      'Non-Error promise rejection captured', // Often just cancelled requests
      'ChunkLoadError', // Usually network issues during code splitting
      'Loading chunk', // Similar to above
      'Network request failed', // Temporary network issues
    ];

    // Check if this error matches any of our ignored patterns
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as Error).message;
      if (ignoredErrors.some(ignored => message.includes(ignored))) {
        return null; // Don't send this error to Sentry
      }
    }

    // Enhance error events with additional context
    event.tags = {
      ...event.tags,
      // Tag whether the error was caught by error boundary or uncaught
      errorBoundary: hint.mechanism?.handled ? 'caught' : 'uncaught',
    };

    // Add browser and device context for better debugging
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

  private filterTransaction(event: Sentry.Event, _hint: Sentry.EventHint): Sentry.Event | null {
    // Filter out very short transactions (likely measurement errors)
    if (event.timestamp && event.start_timestamp) {
      const duration = event.timestamp - event.start_timestamp;
      if (duration < 0.01) {
        // Less than 10ms - probably a measurement artifact
        return null;
      }
    }

    // Filter out health check and monitoring endpoints
    // These create noise without providing useful performance data
    const transactionName =
      event.transaction_info?.source === 'route' ? event.transaction : event.transaction;
    if (transactionName && typeof transactionName === 'string') {
      const healthCheckPatterns = ['/health', '/ping', '/metrics'];
      if (healthCheckPatterns.some(pattern => transactionName.includes(pattern))) {
        return null;
      }
    }

    return event;
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled promise rejections that would otherwise be silent
    // These often indicate async code that didn't properly handle errors
    window.addEventListener('unhandledrejection', event => {
      Sentry.captureException(event.reason, {
        tags: {
          errorType: 'unhandledRejection',
        },
        extra: {
          promise: event.promise,
        },
      });
    });

    // Catch resource loading errors (failed scripts, images, stylesheets)
    // The 'true' parameter captures events during the capture phase
    window.addEventListener(
      'error',
      event => {
        // Only process resource errors, not general window errors
        if (event.target !== window) {
          const target = event.target as LoadableElement;
          Sentry.captureException(new Error(`Resource loading error: ${target}`), {
            tags: {
              errorType: 'resourceError',
            },
            extra: {
              element: event.target,
              source: target.src || target.href,
            },
          });
        }
      },
      true
    );
  }

  private setupPerformanceMonitoring(): void {
    // Core Web Vitals monitoring - Google's key user experience metrics
    // These metrics are critical for understanding real-world performance

    // Cumulative Layout Shift - measures visual stability
    onCLS((metric: Metric) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `CLS: ${metric.value}`,
        level: 'info',
        data: metric,
      });

      // Alert if CLS exceeds the "good" threshold of 0.1
      if (metric.value > 0.1) {
        Sentry.captureMessage(`High CLS detected: ${metric.value}`, 'warning');
      }
    });

    // Interaction to Next Paint - measures interactivity (replaces FID)
    onINP((metric: Metric) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `INP: ${metric.value}ms`,
        level: 'info',
        data: metric,
      });

      // Alert if INP exceeds the "good" threshold of 200ms
      if (metric.value > 200) {
        Sentry.captureMessage(`High INP detected: ${metric.value}ms`, 'warning');
      }
    });

    // Largest Contentful Paint - measures loading performance
    onLCP((metric: Metric) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `LCP: ${metric.value}ms`,
        level: 'info',
        data: metric,
      });

      // Alert if LCP exceeds the "good" threshold of 2.5 seconds
      if (metric.value > 2500) {
        Sentry.captureMessage(`High LCP detected: ${metric.value}ms`, 'warning');
      }
    });

    // First Contentful Paint - measures perceived loading speed
    onFCP((metric: Metric) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `FCP: ${metric.value}ms`,
        level: 'info',
        data: metric,
      });
    });

    // Time to First Byte - measures server response time
    onTTFB((metric: Metric) => {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `TTFB: ${metric.value}ms`,
        level: 'info',
        data: metric,
      });
    });

    // Memory usage monitoring (Chrome-specific)
    // Helps detect memory leaks before they cause crashes
    const perfWithMemory = performance as PerformanceWithMemory;
    if (perfWithMemory.memory) {
      setInterval(() => {
        const memory = perfWithMemory.memory;
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
          const totalMB = Math.round(memory.totalJSHeapSize / 1048576);

          // Alert if memory usage exceeds 100MB
          if (usedMB > 100) {
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
    // Initialize application context that persists across all events
    Sentry.setContext('app', {
      name: 'Chanuka Client',
      version: process.env.REACT_APP_VERSION || '1.0.0',
      buildTime: process.env.REACT_APP_BUILD_TIME,
    });

    // Set device and browser context for all events
    Sentry.setContext('device', {
      type: this.getDeviceType(),
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      userAgent: navigator.userAgent,
    });
  }

  // Public API methods for application-wide error and performance tracking

  /**
   * Capture an error with optional additional context
   * Use this for caught exceptions that you want to report to Sentry
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message with a severity level
   * Use this for logging important events or warnings
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, unknown>
  ): void {
    Sentry.captureMessage(message, level);
    if (context) {
      Sentry.setExtra('messageContext', context);
    }
  }

  /**
   * Associate all future events with a specific user
   * Call this after authentication to track which users experience issues
   */
  setUserContext(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  /**
   * Clear user context after logout
   */
  clearUserContext(): void {
    Sentry.setUser(null);
  }

  /**
   * Add a breadcrumb to track user actions
   * Breadcrumbs create a trail showing what led up to an error
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
    });
  }

  /**
   * Set a tag for categorizing events
   * Tags are indexed and searchable in Sentry
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set context information that will be attached to events
   * Use this for structured data that helps debugging
   */
  setContext(key: string, context: Record<string, unknown>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Manually start a performance span
   * Use this to measure custom operations or page sections
   */
  startSpan<T>(name: string, op: string, callback: () => T): T {
    return Sentry.startSpan({ name, op }, callback);
  }

  // Browser detection utilities for enriching error context

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
    if (
      /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
        userAgent
      )
    )
      return 'mobile';
    return 'desktop';
  }
}

// React Error Boundary HOC for catching React component errors
// Wrap your app or specific components with this to catch rendering errors
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Performance profiling HOC for React components
// This measures how long components take to render
export const withSentryProfiling = <P extends object>(
  Component: React.ComponentType<P>,
  name?: string
) => {
  return Sentry.withProfiler(Component, { name });
};

// React hook for convenient access to Sentry functionality
// Use this in functional components to report errors or add context
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
