/**
 * Error Monitoring Sub-module
 * 
 * Provides error tracking, aggregation, and integration with external
 * monitoring services like Sentry.
 * 
 * Requirements: 3.1, 11.2
 */

// Re-export from monitoring module for now
// These will be gradually migrated to the new structure
export { ErrorMonitor } from '@client/infrastructure/monitoring/error-monitor';
export { default as SentryMonitoring } from '@client/infrastructure/monitoring/sentry-config';
export {
  MonitoringIntegrationService,
  monitoringIntegration,
} from '@client/infrastructure/monitoring/monitoring-integration';

// Export types
export type { MonitoringConfig } from '@client/infrastructure/monitoring/monitoring-integration';

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
}): void {
  if (!config.enabled) {
    return;
  }

  if (config.sentryDsn) {
    const sentry = SentryMonitoring.getInstance();
    sentry.initialize({
      dsn: config.sentryDsn,
      environment: config.environment || 'development',
      sampleRate: 1.0,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }

  // Initialize error monitor
  ErrorMonitor.getInstance();
}
