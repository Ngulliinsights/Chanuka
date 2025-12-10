/**
 * Components Index
 * 
 * Central export point for all client components
 */

// Standalone Components
export { default as AppProviders } from './AppProviders';
export { default as MigrationManager } from './MigrationManager';

// Error Boundary from correct location
export { ErrorBoundary } from '@client/core/error/components';

// Offline components from correct location
export { OfflineIndicator } from '@client/shared/ui/offline';

// TODO: Verify if these components exist and are still needed
// export { default as ConnectionStatus } from './connection-status';
// export { default as DatabaseStatus } from './database-status';
// export { default as OfflineModal } from './OfflineModal';

// TODO: Move these to features if not deprecated
// export { EngagementDashboard } from './analytics/engagement-dashboard';
// export { JourneyAnalyticsDashboard } from './analytics/JourneyAnalyticsDashboard';
// export { BillCard } from './bills/bill-card';
// export { BillList } from './bills/bill-list';
// export { default as BillTracking } from './bills/bill-tracking';
// export { ImplementationWorkarounds } from './bills/implementation-workarounds';
// export { NotificationCenter } from './notifications/NotificationCenter';
// export { NotificationPreferences } from './notifications/notification-preferences';