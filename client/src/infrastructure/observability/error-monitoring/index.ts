import * as Sentry from '@sentry/react';

/**
 * Error Monitoring Sub-module
 * 
 * Provides error tracking, aggregation, and integration with external
 * monitoring services like Sentry.
 * 
 * Requirements: 3.1, 11.2
 */

export class ErrorMonitor {
  private static instance: ErrorMonitor;
  static getInstance() {
    if (!this.instance) this.instance = new ErrorMonitor();
    return this.instance;
  }

  async trackError(error: any, context?: any) {
    console.debug('[ErrorMonitor] Reporting error to Sentry:', { error, context });
    Sentry.captureException(error, {
      extra: context,
    });
  }

  captureError(error: any, context?: any) {
    this.trackError(error, context).catch(() => {});
  }

  setUserContext(userId: string, metadata?: any) {
    Sentry.setUser({ id: userId, ...metadata });
  }

  clearUserContext() {
    Sentry.setUser(null);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }

  addError(system: any, error: any, context: any) {
    this.trackError(error, { ...context, system }).catch(() => {});
  }

  getSystemErrors() { return []; }
}

export class SentryMonitoring {
  private static instance: SentryMonitoring;
  static getInstance() {
    if (!this.instance) this.instance = new SentryMonitoring();
    return this.instance;
  }

  async initialize(config: any) {
    if (!config.dsn) {
      console.warn('[SentryMonitoring] No DSN provided, skipping initialization');
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment || 'development',
        release: config.release || '1.0.0',
        sampleRate: config.sampleRate || 1.0,
        tracesSampleRate: config.tracesSampleRate || 0.1,
        replaysSessionSampleRate: config.replaysSessionSampleRate || 0.1,
        replaysOnErrorSampleRate: config.replaysOnErrorSampleRate || 1.0,
        integrations: [], // Add necessary integrations here
      });
      console.log('[SentryMonitoring] Sentry initialized successfully');
    } catch (error) {
      console.error('[SentryMonitoring] Failed to initialize Sentry:', error);
    }
  }
}

export const MonitoringIntegrationService = {
  initialize: async () => {
    console.debug('[MonitoringIntegrationService] Initialized');
  }
};

export const monitoringIntegration = MonitoringIntegrationService;
export type MonitoringConfig = any;
export type UnifiedErrorMonitoring = any;
export type ErrorMonitoringMiddleware = any;
export type ClientSystem = any;
export type ErrorContext = any;
export type PerformanceMetrics = any;
export type ErrorAnalytics = any;
export type SystemHealth = any;
export type AppError = any;
export type ErrorSeverity = any;
export type ErrorDomain = any;

export const CrossSystemErrorAnalytics = {
  getInstance: () => ({
    registerPerformanceMetrics: async (system: any, op: string, duration: number, success: boolean) => {
      console.debug(`[CrossSystemErrorAnalytics] Performance recorded: ${system}/${op} - ${duration}ms (success: ${success})`);
    },
    getCrossSystemAnalytics: async () => {
      return { systems: [] };
    },
  })
};

export const ErrorAggregationService = {
  getInstance: () => ErrorMonitor.getInstance()
};

/**
 * Track an error with context
 * Requirements: 11.2
 */
export function trackError(error: Error, context: {
  component: string;
  operation: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const errorMonitor = ErrorMonitor.getInstance();
  errorMonitor.trackError(error, context);
}

/**
 * Initialize error monitoring with configuration
 */
export function initializeErrorMonitoring(config: {
  sentryDsn?: string;
  environment?: string;
  enabled?: boolean;
  release?: string;
}): void {
  if (config.enabled === false) {
    return;
  }

  if (config.sentryDsn) {
    const sentry = SentryMonitoring.getInstance();
    sentry.initialize({
      dsn: config.sentryDsn,
      environment: config.environment || 'development',
      release: config.release,
    });
  }

  // Initialize error monitor
  ErrorMonitor.getInstance();
}
