/**
 * Components Index
 * 
 * Central export point for all client components
 */

// Standalone Components
export { default as AppProviders } from './AppProviders';
export { default as ConnectionStatus } from './connection-status';
export { default as DatabaseStatus } from './database-status';
export { ErrorBoundary } from './error-handling/ErrorBoundary';
export { default as MigrationManager } from './MigrationManager';
export { default as OfflineIndicator } from './OfflineIndicator';
export { default as OfflineModal } from './OfflineModal';

// Analytics Components
export { EngagementDashboard } from './analytics/engagement-dashboard';
export { JourneyAnalyticsDashboard } from './analytics/JourneyAnalyticsDashboard';

// Bills Components
export { BillCard } from './bills/bill-card';
export { BillList } from './bills/bill-list';
export { default as BillTracking } from './bills/bill-tracking';
export { ImplementationWorkarounds } from './bills/implementation-workarounds';

// Notifications Components
export { NotificationCenter } from './notifications/NotificationCenter';
export { NotificationPreferences } from './notifications/notification-preferences';