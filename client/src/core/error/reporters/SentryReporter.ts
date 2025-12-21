/**
 * Sentry Reporter
 *
 * Integrates with Sentry for error tracking and monitoring.
 * Provides comprehensive error reporting with context and breadcrumbs.
 */

import { AppError, ErrorReporter } from '../types';

export interface SentryReporterConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  enableTracing?: boolean;
  enableBreadcrumbs?: boolean;
  maxBreadcrumbs?: number;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

export class SentryReporter implements ErrorReporter {
  private config: Required<SentryReporterConfig>;
  private sentry: typeof import('@sentry/browser') | null = null;
  private isInitialized = false;

  constructor(config: Partial<SentryReporterConfig> = {}) {
    this.config = {
      dsn: '',
      environment: 'production',
      release: '',
      sampleRate: 1.0,
      enableTracing: false,
      enableBreadcrumbs: true,
      maxBreadcrumbs: 100,
      tags: {},
      user: {},
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import to avoid bundling Sentry if not used
      const Sentry = await import('@sentry/browser');

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate,
        integrations: [],
        maxBreadcrumbs: this.config.maxBreadcrumbs,
        beforeSend: (event: import('@sentry/browser').ErrorEvent) => {
          // Add custom tags
          if (this.config.tags) {
            event.tags = { ...event.tags, ...this.config.tags };
          }
          return event;
        },
      });

      // Set user context
      if (this.config.user.id || this.config.user.email || this.config.user.username) {
        Sentry.setUser(this.config.user);
      }

      this.sentry = Sentry;
      this.isInitialized = true;

      console.info('Sentry reporter initialized', {
        component: 'SentryReporter',
        environment: this.config.environment,
        release: this.config.release,
      });
    } catch (error) {
      console.warn('Failed to initialize Sentry reporter:', error);
      // Continue without Sentry - reporter will be a no-op
    }
  }

  async report(error: AppError): Promise<void> {
    if (!this.isInitialized || !this.sentry) {
      // If Sentry not available, silently skip
      return;
    }

    try {
      // Set error context
      this.sentry.withScope((scope: import('@sentry/browser').Scope) => {
        // Add error metadata
        scope.setTag('error_domain', error.type);
        scope.setTag('error_severity', error.severity);
        scope.setTag('error_code', error.code);
        scope.setTag('error_recoverable', error.recoverable);
        scope.setTag('error_retryable', error.retryable);

        // Add user context if available
        if (error.context?.userId) {
          scope.setUser({
            id: error.context.userId,
            ...this.config.user,
          });
        }

        // Add session context
        if (error.context?.sessionId) {
          scope.setTag('session_id', error.context.sessionId);
        }

        // Add component context
        if (error.context?.component) {
          scope.setTag('component', error.context.component);
        }

        // Add operation context
        if (error.context?.operation) {
          scope.setTag('operation', error.context.operation);
        }

        // Add route context
        if (error.context?.route) {
          scope.setTag('route', error.context.route);
        }

        // Add retry count
        if (error.retryCount > 0) {
          scope.setTag('retry_count', error.retryCount.toString());
        }

        // Add correlation ID
        if (error.correlationId) {
          scope.setTag('correlation_id', error.correlationId);
        }

        // Add breadcrumbs if enabled
        if (this.config.enableBreadcrumbs) {
          this.addBreadcrumbs(scope, error);
        }

        // Set level based on severity
        const level = this.mapSeverityToLevel(error.severity);
        scope.setLevel(level as import('@sentry/browser').SeverityLevel);

        // Add extra data
        if (error.details) {
          scope.setExtras(error.details);
        }

        // Capture the error
        if (error.cause instanceof Error) {
          this.sentry?.captureException(error.cause, {
            contexts: {
              appError: {
                id: error.id,
                message: error.message,
                type: error.type,
                severity: error.severity,
                code: error.code,
                recoverable: error.recoverable,
                retryable: error.retryable,
                timestamp: error.timestamp,
                context: error.context,
                details: error.details,
              },
            },
          });
        } else {
          // Capture as message if no cause error
          this.sentry?.captureMessage(error.message, level as import('@sentry/browser').SeverityLevel);
        }
      });
    } catch (reportError) {
      console.error('Failed to report error to Sentry:', reportError);
    }
  }

  private mapSeverityToLevel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  private addBreadcrumbs(scope: import('@sentry/browser').Scope, error: AppError): void {
    // Add error-specific breadcrumbs
    if (error.context?.operation) {
      scope.addBreadcrumb({
        message: `Operation: ${error.context.operation}`,
        category: 'error',
        level: 'info',
        timestamp: error.timestamp / 1000,
      });
    }

    if (error.context?.component) {
      scope.addBreadcrumb({
        message: `Component: ${error.context.component}`,
        category: 'ui',
        level: 'info',
        timestamp: error.timestamp / 1000,
      });
    }

    if (error.retryCount > 0) {
      scope.addBreadcrumb({
        message: `Retry attempt: ${error.retryCount}`,
        category: 'error',
        level: 'warning',
        timestamp: error.timestamp / 1000,
      });
    }
  }

  updateConfig(config: Partial<SentryReporterConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-initialize if DSN changed
    if (config.dsn && config.dsn !== this.config.dsn) {
      this.isInitialized = false;
      this.initialize().catch(error => {
        console.error('Failed to re-initialize Sentry with new config:', error);
      });
    }
  }

  setUser(user: SentryReporterConfig['user']): void {
    this.config.user = { ...this.config.user, ...user };
    if (this.sentry && this.isInitialized && user) {
      this.sentry.setUser(user);
    }
  }

  addTag(key: string, value: string): void {
    this.config.tags[key] = value;
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: import('@sentry/browser').SeverityLevel;
    data?: Record<string, unknown>;
  }): void {
    if (this.sentry && this.isInitialized && this.config.enableBreadcrumbs) {
      this.sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: breadcrumb.level as import('@sentry/browser').SeverityLevel,
        data: breadcrumb.data
      });
    }
  }

  destroy(): void {
    if (this.sentry && this.isInitialized) {
      this.sentry.close();
    }
    this.isInitialized = false;
    this.sentry = null;
  }
}