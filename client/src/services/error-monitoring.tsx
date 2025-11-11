/**
 * Comprehensive Error Monitoring Service
 * 
 * Integrates with Sentry for production error tracking and monitoring
 * Provides real-time error reporting, performance monitoring, and user session replay
 */

import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import { Replay } from '@sentry/replay';
import React from 'react';

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  buildVersion?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: Record<string, any>;
}

interface CustomError extends Error {
  code?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  recoverable?: boolean;
  userImpact?: string;
}

class ErrorMonitoringService {
  private initialized = false;
  private context: ErrorContext = {};
  private performanceObserver?: PerformanceObserver;

  /**
   * Initialize error monitoring with Sentry configuration
   */
  initialize(config: {
    dsn: string;
    environment: string;
    release?: string;
    sampleRate?: number;
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  }) {
    if (this.initialized) {
      console.warn('Error monitoring already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release || process.env.BUILD_VERSION || 'unknown',
        
        // Performance monitoring
        integrations: [
          new BrowserTracing({
            // Capture interactions like clicks, navigation
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/api\.chanuka\.ke/,
              /^https:\/\/.*\.chanuka\.ke/
            ],
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              // React Router integration would go here
            ),
          }),
          
          // Session replay for debugging
          new Replay({
            // Capture 10% of all sessions
            sessionSampleRate: config.replaysSessionSampleRate || 0.1,
            // Capture 100% of sessions with errors
            errorSampleRate: config.replaysOnErrorSampleRate || 1.0,
            // Privacy settings
            maskAllText: false,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
        ],

        // Performance monitoring sample rates
        tracesSampleRate: config.tracesSampleRate || 0.1,
        
        // Error filtering and enhancement
        beforeSend: (event, hint) => {
          return this.filterAndEnhanceError(event, hint);
        },

        // Breadcrumb filtering
        beforeBreadcrumb: (breadcrumb) => {
          return this.filterBreadcrumb(breadcrumb);
        },

        // Initial context
        initialScope: {
          tags: {
            component: 'chanuka-client',
            version: config.release || 'unknown'
          },
          level: 'info'
        }
      });

      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Set up unhandled promise rejection tracking
      this.setupUnhandledRejectionTracking();

      // Set up custom error boundaries
      this.setupCustomErrorBoundaries();

      this.initialized = true;
      console.log('✅ Error monitoring initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(user: {
    id?: string;
    email?: string;
    role?: string;
    sessionId?: string;
  }) {
    this.context = { ...this.context, ...user };
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.email,
      segment: user.role
    });

    Sentry.setTag('userRole', user.role || 'anonymous');
    Sentry.setTag('sessionId', user.sessionId || 'unknown');
  }

  /**
   * Set feature context for error tracking
   */
  setFeatureContext(feature: string, action?: string, metadata?: Record<string, any>) {
    this.context.feature = feature;
    this.context.action = action;
    this.context.metadata = metadata;

    Sentry.setTag('feature', feature);
    if (action) {
      Sentry.setTag('action', action);
    }

    Sentry.setContext('feature', {
      name: feature,
      action,
      metadata
    });
  }

  /**
   * Capture a custom error with enhanced context
   */
  captureError(error: Error | CustomError, context?: Partial<ErrorContext>) {
    const enhancedError = this.enhanceError(error, context);
    
    Sentry.withScope((scope) => {
      // Set error-specific context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, String(value));
        });
      }

      // Set severity level
      if ('severity' in error && error.severity) {
        scope.setLevel(this.mapSeverityToSentryLevel(error.severity));
      }

      // Add custom fingerprinting for better grouping
      if ('code' in error && error.code) {
        scope.setFingerprint([error.code, error.message]);
      }

      // Capture the error
      Sentry.captureException(enhancedError);
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', enhancedError, context);
    }
  }

  /**
   * Capture a custom message with context
   */
  captureMessage(
    message: string, 
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context?: Record<string, any>
  ) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, String(value));
        });
        scope.setContext('messageContext', context);
      }

      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(
    message: string,
    category: string = 'custom',
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: PerformanceMetric) {
    // Send to Sentry as a custom metric
    Sentry.setMeasurement(metric.name, metric.value, metric.unit);
    
    // Add as breadcrumb for context
    this.addBreadcrumb(
      `Performance: ${metric.name} = ${metric.value}${metric.unit}`,
      'performance',
      'info',
      { ...metric.context, value: metric.value, unit: metric.unit }
    );

    // Send to custom analytics endpoint
    this.sendCustomMetric(metric);
  }

  /**
   * Track user interactions for debugging
   */
  trackUserInteraction(
    action: string,
    element?: string,
    metadata?: Record<string, any>
  ) {
    this.addBreadcrumb(
      `User ${action}${element ? ` on ${element}` : ''}`,
      'user',
      'info',
      { action, element, ...metadata }
    );

    // Track as Sentry transaction
    const transaction = Sentry.startTransaction({
      name: `User Interaction: ${action}`,
      op: 'user.interaction'
    });

    transaction.setTag('action', action);
    if (element) {
      transaction.setTag('element', element);
    }

    // Finish transaction after a short delay to capture any immediate errors
    setTimeout(() => {
      transaction.finish();
    }, 100);
  }

  /**
   * Track API calls and responses
   */
  trackAPICall(
    method: string,
    url: string,
    status: number,
    duration: number,
    error?: Error
  ) {
    const transaction = Sentry.startTransaction({
      name: `${method} ${url}`,
      op: 'http.client'
    });

    transaction.setTag('http.method', method);
    transaction.setTag('http.status_code', status.toString());
    transaction.setData('http.url', url);
    transaction.setData('duration', duration);

    if (error) {
      transaction.setStatus('internal_error');
      this.captureError(error, {
        feature: 'api',
        action: `${method} ${url}`,
        metadata: { status, duration }
      });
    } else if (status >= 400) {
      transaction.setStatus('invalid_argument');
    } else {
      transaction.setStatus('ok');
    }

    transaction.finish();

    // Add breadcrumb
    this.addBreadcrumb(
      `API ${method} ${url} - ${status} (${duration}ms)`,
      'http',
      status >= 400 ? 'error' : 'info',
      { method, url, status, duration }
    );
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring() {
    // Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      this.observePerformanceMetric('largest-contentful-paint', (entries) => {
        const lcp = entries[entries.length - 1];
        this.trackPerformance({
          name: 'LCP',
          value: lcp.startTime,
          unit: 'millisecond',
          timestamp: Date.now()
        });
      });

      // First Input Delay
      this.observePerformanceMetric('first-input', (entries) => {
        const fid = entries[0];
        this.trackPerformance({
          name: 'FID',
          value: fid.processingStart - fid.startTime,
          unit: 'millisecond',
          timestamp: Date.now()
        });
      });

      // Cumulative Layout Shift
      this.observePerformanceMetric('layout-shift', (entries) => {
        let cls = 0;
        for (const entry of entries) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        }
        this.trackPerformance({
          name: 'CLS',
          value: cls,
          unit: 'unitless',
          timestamp: Date.now()
        });
      });
    }

    // Resource loading monitoring
    this.monitorResourceLoading();
  }

  private observePerformanceMetric(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  private monitorResourceLoading() {
    // Monitor slow loading resources
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Flag slow resources (>2 seconds)
        if (resource.duration > 2000) {
          this.addBreadcrumb(
            `Slow resource: ${resource.name} (${resource.duration.toFixed(0)}ms)`,
            'performance',
            'warning',
            {
              url: resource.name,
              duration: resource.duration,
              size: resource.transferSize
            }
          );
        }

        // Flag failed resources
        if (resource.transferSize === 0 && resource.duration > 0) {
          this.captureError(new Error(`Failed to load resource: ${resource.name}`), {
            feature: 'resource-loading',
            metadata: {
              url: resource.name,
              duration: resource.duration
            }
          });
        }
      }
    });

    observer.observe({ type: 'resource', buffered: true });
  }

  /**
   * Set up unhandled promise rejection tracking
   */
  private setupUnhandledRejectionTracking() {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          feature: 'promise-rejection',
          metadata: {
            reason: event.reason,
            promise: event.promise
          }
        }
      );
    });
  }

  /**
   * Set up custom error boundaries
   */
  private setupCustomErrorBoundaries() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        feature: 'global-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  /**
   * Filter and enhance errors before sending to Sentry
   */
  private filterAndEnhanceError(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
    // Filter out known non-critical errors
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Loading chunk'
    ];

    if (event.exception?.values?.[0]?.value) {
      const errorMessage = event.exception.values[0].value;
      if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
        return null; // Don't send to Sentry
      }
    }

    // Enhance with current context
    if (this.context.feature) {
      event.tags = { ...event.tags, feature: this.context.feature };
    }
    if (this.context.action) {
      event.tags = { ...event.tags, action: this.context.action };
    }

    // Add build information
    event.tags = {
      ...event.tags,
      buildVersion: process.env.BUILD_VERSION || 'unknown',
      buildTime: process.env.BUILD_TIME || 'unknown'
    };

    return event;
  }

  /**
   * Filter breadcrumbs to reduce noise
   */
  private filterBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    // Filter out noisy console logs in production
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }

    // Filter out frequent UI events
    if (breadcrumb.category === 'ui.click' && breadcrumb.message?.includes('button')) {
      // Only keep important button clicks
      if (!breadcrumb.message.includes('submit') && !breadcrumb.message.includes('save')) {
        return null;
      }
    }

    return breadcrumb;
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: Error | CustomError, context?: Partial<ErrorContext>): Error {
    const enhanced = error as any;
    
    // Add current context
    enhanced.context = {
      ...this.context,
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    return enhanced;
  }

  /**
   * Map custom severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: string): Sentry.SeverityLevel {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'fatal';
      default: return 'error';
    }
  }

  /**
   * Send custom metrics to analytics endpoint
   */
  private async sendCustomMetric(metric: PerformanceMetric) {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...metric,
          userId: this.context.userId,
          sessionId: this.context.sessionId,
          feature: this.context.feature
        })
      });
    } catch (error) {
      // Don't capture metrics errors to avoid infinite loops
      console.warn('Failed to send custom metric:', error);
    }
  }
}

// Create singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// React Error Boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitoring.captureError(error, {
      feature: 'react-error-boundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name
      }
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="error-boundary">
    <h2>Something went wrong</h2>
    <p>We've been notified about this error and are working to fix it.</p>
    <details>
      <summary>Error details</summary>
      <pre>{error.message}</pre>
    </details>
    <button onClick={() => window.location.reload()}>
      Reload page
    </button>
  </div>
);

// Utility functions for common error scenarios
export const errorUtils = {
  /**
   * Wrap async functions with error handling
   */
  wrapAsync: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: Partial<ErrorContext>
  ): T => {
    return ((...args: any[]) => {
      return fn(...args).catch((error: Error) => {
        errorMonitoring.captureError(error, context);
        throw error; // Re-throw to maintain original behavior
      });
    }) as T;
  },

  /**
   * Create a custom error with enhanced context
   */
  createError: (
    message: string,
    code?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): CustomError => {
    const error = new Error(message) as CustomError;
    error.code = code;
    error.severity = severity;
    return error;
  }
};

export default errorMonitoring;