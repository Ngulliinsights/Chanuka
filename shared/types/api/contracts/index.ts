/**
 * API Contracts Index
 * Centralized exports for all API contracts
 */

// Core contracts
export * from './core.contracts';

// Endpoint contract system
export * from './endpoint';

// Feature-specific contracts
export * from './government-data.contracts';
export * from './analytics.contracts';

// Community contracts
export * from './community.contracts';

// New detailed contracts
export * from './feature-flags.contracts';
export * from './bill.contract';
export type { GetHealthCheckResponse, GetMonitoringDashboardResponse, GetMetricsResponse, GetAlertsResponse, Metric, Alert, MonitoringDashboard } from './monitoring-community.contracts';

// Validation schemas (runtime validation)
export * from './validation.schemas';

// Modernized generic API contracts
export * from './user.contract';
export * from './admin.contract';