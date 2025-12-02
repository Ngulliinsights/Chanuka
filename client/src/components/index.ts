/**
 * Components Index
 * 
 * Central export point for all client components
 */

// Layout Components
export { default as Sidebar } from './sidebar';

// Standalone Components
export { default as AppProviders } from './AppProviders';
export { default as ArchitecturePlanning } from './architecture-planning';
export { default as CheckpointDashboard } from './checkpoint-dashboard';
export { default as ConnectionStatus } from './connection-status';
export { default as DatabaseStatus } from './database-status';
export { default as DecisionMatrix } from './decision-matrix';
export { default as EnvironmentSetup } from './environment-setup';
export { ErrorBoundary } from './error-handling/ErrorBoundary';
export { default as FeatureFlagsPanel } from './feature-flags-panel';
export { default as MigrationManager } from './migration-manager';
export { default as OfflineIndicator } from './OfflineIndicator';
export { default as OfflineModal } from './OfflineModal';
export { default as ProjectOverview } from './project-overview';
export { default as SystemHealth } from './system-health';

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