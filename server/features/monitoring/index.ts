/**
 * Integration Monitoring Module
 * 
 * Exports all monitoring components for easy import
 */

// Services
export { integrationMonitor, IntegrationMonitorService } from './domain/integration-monitor.service';
export { alertingService, AlertingService } from './domain/alerting.service';

// Middleware
export {
  createMetricsMiddleware,
  stopMetricsCollection,
  getCurrentMetrics,
} from './infrastructure/metrics-middleware';

// Routes
export { default as monitoringRoutes } from './application/monitoring.routes';

// Types
export type {
  FeatureUsageMetrics,
  FeaturePerformanceMetrics,
  FeatureHealthStatus,
  AlertCondition,
  MonitoringDashboardData,
} from './domain/integration-monitor.service';

export type {
  AlertNotificationChannel,
  AlertNotification,
} from './domain/alerting.service';
