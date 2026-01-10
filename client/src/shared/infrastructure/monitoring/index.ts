/**
 * Shared Infrastructure Monitoring
 *
 * Centralized exports for monitoring infrastructure components
 */

export { ErrorMonitor } from './error-monitor';
export { default as PerformanceMonitor } from './performance-monitor';
export { MonitoringIntegrationService as MonitoringIntegration, monitoringIntegration } from './monitoring-integration';
export { DevelopmentMonitoringDashboard } from './development-dashboard';

export type { MonitoringConfig } from './monitoring-integration';
