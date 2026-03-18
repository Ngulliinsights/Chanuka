/**
 * Error Monitoring Service - Core Infrastructure
 *
 * Migrated from client/src/services/error-monitoring.tsx
 * Comprehensive error monitoring with Sentry integration, performance tracking,
 * and React error boundaries for production error handling.
 */

import * as Sentry from '@sentry/browser';
import { browserTracingIntegration } from '@sentry/browser';
import { replayIntegration } from '@sentry/react';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  buildVersion?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface CustomError extends Error {
  code?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  recoverable?: boolean;
  userImpact?: string;
}

// ---------------------------------------------------------------------------
// Internal dev-only logger
// Replaces raw console.* calls — silenced in production automatically.
// ---------------------------------------------------------------------------

const devLog = {
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') console.warn(...args);  // eslint-disable-line no-console
  },
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') console.log(...args);   // eslint-disable-line no-console
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') console.error(...args); // eslint-disable-line no-console
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class ErrorMonitoringService {
  private initialized = false;
  private context: ErrorContext = {};
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;

  /**
   * Initialize error monitoring with Sentry configuration.
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
      devLog.warn('Error monitoring already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release ?? process.env['BUILD_VERSION'] ?? 'unknown',

        // Performance monitoring
        integrations: [
          browserTracingIntegration(),

          // Session replay for debugging
          replayIntegration({
            maskAllText: false,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
        ],

        tracesSampleRate: config.tracesSampleRate ?? 0.1,

        // Replay sample rates belong at the top-level init, not inside the integration
        replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.1,
        replaysOnErrorSampleRate: config.replaysOnErrorSampleRate ?? 1.0,

        // FIX TS2322: beforeSend must use Sentry.ErrorEvent, not Sentry.Event
        beforeSend: (event: Sentry.ErrorEvent, hint: Sentry.EventHint) =>
          this.filterAndEnhanceError(event, hint),

        beforeBreadcrumb: breadcrumb => this.filterBreadcrumb(breadcrumb),

        initialScope: {
          tags: {
            component: 'chanuka-client',
            version: config.release ?? 'unknown',
          },
          level: 'info',
        },
      });

      this.setupUnhandledRejectionTracking();
      this.setupCustomErrorBoundaries();

      // Register cleanup on app unload to prevent memory leaks
      window.addEventListener('beforeunload', () => this.cleanup());

      this.initialized = true;
      devLog.log('✅ Error monitoring initialized successfully');
    } catch (error) {
      devLog.error('❌ Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Set user context for error tracking.
   */
  setUserContext(user: { id?: string; email?: string; role?: string; sessionId?: string }) {
    this.context = { ...this.context, ...user };

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.email,
      segment: user.role,
    });

    Sentry.setTag('userRole', user.role ?? 'anonymous');
    Sentry.setTag('sessionId', user.sessionId ?? 'unknown');
  }

  /**
   * Set feature context for error tracking.
   */
  setFeatureContext(feature: string, action?: string, metadata?: Record<string, unknown>) {
    this.context.feature = feature;
    this.context.action = action;
    this.context.metadata = metadata;

    Sentry.setTag('feature', feature);
    if (action) Sentry.setTag('action', action);

    Sentry.setContext('feature', { name: feature, action, metadata });
  }

  /**
   * Capture a custom error with enhanced context.
   */
  captureError(error: Error | CustomError, context?: Partial<ErrorContext>) {
    const enhancedError = this.enhanceError(error, context);

    Sentry.withScope(scope => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, String(value));
        });
      }

      if ('severity' in error && error.severity) {
        scope.setLevel(this.mapSeverityToSentryLevel(error.severity));
      }

      if ('code' in error && error.code) {
        scope.setFingerprint([error.code, error.message]);
      }

      Sentry.captureException(enhancedError);
    });

    devLog.error('Error captured:', enhancedError, context);
  }

  /**
   * Capture a custom message with context.
   */
  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context?: Record<string, unknown>
  ) {
    Sentry.withScope(scope => {
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
   * Add a breadcrumb for debugging context.
   */
  addBreadcrumb(
    message: string,
    category: string = 'custom',
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
  ) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Track user interactions for debugging.
   */
  trackUserInteraction(action: string, element?: string, metadata?: Record<string, unknown>) {
    this.addBreadcrumb(
      `User ${action}${element != null ? ` on ${element}` : ''}`,
      'user',
      'info',
      { action, element, ...metadata }
    );

    Sentry.startSpan(
      {
        name: `User Interaction: ${action}`,
        op: 'user.interaction',
        attributes: {
          action,
          element: element ?? 'unknown',
        },
      },
      () => {
        // Span automatically finishes when callback completes
      }
    );
  }

  /**
   * Track API calls and responses.
   */
  trackAPICall(method: string, url: string, status: number, duration: number, error?: Error) {
    Sentry.startSpan(
      {
        name: `${method} ${url}`,
        op: 'http.client',
        attributes: {
          'http.method': method,
          'http.status_code': status,
          'http.url': url,
          duration,
        },
      },
      () => {
        if (error) {
          this.captureError(error, {
            feature: 'api',
            action: `${method} ${url}`,
            metadata: { status, duration },
          });
        }
      }
    );

    this.addBreadcrumb(
      `API ${method} ${url} - ${status} (${duration}ms)`,
      'http',
      status >= 400 ? 'error' : 'info',
      { method, url, status, duration }
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private setupUnhandledRejectionTracking() {
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }

    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      this.captureError(new Error(`Unhandled Promise Rejection: ${String(event.reason)}`), {
        feature: 'promise-rejection',
        metadata: { reason: event.reason, promise: event.promise },
      });
    };

    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  private setupCustomErrorBoundaries() {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }

    this.errorHandler = (event: ErrorEvent) => {
      this.captureError(event.error instanceof Error ? event.error : new Error(event.message), {
        feature: 'global-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    window.addEventListener('error', this.errorHandler);
  }

  cleanup() {
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }

    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }

    this.initialized = false;
  }

  // FIX TS2322: parameter and return type are Sentry.ErrorEvent (not Sentry.Event)
  private filterAndEnhanceError(
    event: Sentry.ErrorEvent,
    _hint: Sentry.EventHint
  ): Sentry.ErrorEvent | null {
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Loading chunk',
    ];

    const firstValue = event.exception?.values?.[0]?.value;
    if (firstValue != null && ignoredErrors.some(msg => firstValue.includes(msg))) {
      return null;
    }

    event.tags = {
      ...event.tags,
      ...(this.context.feature != null && { feature: this.context.feature }),
      ...(this.context.action != null && { action: this.context.action }),
      buildVersion: process.env['BUILD_VERSION'] ?? 'unknown',
      buildTime: process.env['BUILD_TIME'] ?? 'unknown',
    };

    return event;
  }

  private filterBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    // Drop noisy console.log breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }

    // Drop generic button clicks; keep submit/save interactions
    if (
      breadcrumb.category === 'ui.click' &&
      breadcrumb.message?.includes('button') &&
      !breadcrumb.message.includes('submit') &&
      !breadcrumb.message.includes('save')
    ) {
      return null;
    }

    return breadcrumb;
  }

  private enhanceError(error: Error | CustomError, context?: Partial<ErrorContext>): Error {
    const enhanced = error as Error & { context?: unknown };

    enhanced.context = {
      ...this.context,
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    return enhanced;
  }

  private mapSeverityToSentryLevel(severity: string): Sentry.SeverityLevel {
    switch (severity) {
      case 'low':      return 'info';
      case 'medium':   return 'warning';
      case 'high':     return 'error';
      case 'critical': return 'fatal';
      default:         return 'error';
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const errorMonitoring = new ErrorMonitoringService();

// ---------------------------------------------------------------------------
// React Error Boundary
// ---------------------------------------------------------------------------

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  // FIX TS4113: getDerivedStateFromError is NOT typed as overridable in React's
  // base Component types — remove the `override` modifier.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // FIX TS4114: componentDidCatch overrides the base class — must have `override`.
  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitoring.captureError(error, {
      feature: 'react-error-boundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
    });
  }

  // FIX TS4114: render() overrides the base class — must have `override`.
  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;

      // FIX no-non-null-assertion: use a null-safe fallback instead of `error!`
      const error = this.state.error ?? new Error('An unknown error occurred.');
      return <FallbackComponent error={error} />;
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

// FIX react/no-unescaped-entities: replace raw `'` with &apos;
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="error-boundary">
    <h2>Something went wrong</h2>
    <p>We&apos;ve been notified about this error and are working to fix it.</p>
    <details>
      <summary>Error details</summary>
      <pre>{error.message}</pre>
    </details>
    <button type="button" onClick={() => window.location.reload()}>
      Reload page
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export         throw error;
      })) as T;
  },

  createError: (
    message: string,
    code?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): CustomError => {
    const error = new Error(message) as CustomError;
    error.code = code;
    error.severity = severity;
    return error;
  },
};

export default errorMonitoring;