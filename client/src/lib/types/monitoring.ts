/**
 * Monitoring System Types
 *
 * Configuration and status types for the monitoring system
 * including Sentry, Datadog, and performance monitoring.
 */

export interface SentryConfig {
  dsn: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  beforeSend?: (event: unknown) => unknown | null;
}

export interface DatadogConfig {
  applicationId: string;
  clientToken: string;
  site?: string;
  sessionSampleRate?: number;
  sessionReplaySampleRate?: number;
}

export interface MonitoringConfig {
  environment: string;
  version: string;
  userId?: string;
  enableErrorMonitoring: boolean;
  enablePerformanceMonitoring: boolean;
  enableAnalytics: boolean;
  sentry?: SentryConfig;
  datadog?: DatadogConfig;
  debug?: boolean;
}

export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface ServiceStatus {
  enabled: boolean;
  initialized: boolean;
  error?: string;
}

export interface MonitoringStatus {
  initialized: boolean;
  errorMonitoring: boolean;
  performanceMonitoring: boolean;
  analytics: boolean;
  services: {
    sentry: ServiceStatus;
    datadog: ServiceStatus;
    performance: ServiceStatus;
  };
}
