// Barrel exports for dashboard components

// Types
export * from './types';

// Components
export { UserDashboard } from './UserDashboard';
export { SmartDashboard } from './SmartDashboard';
export { AdaptiveDashboard } from './AdaptiveDashboard';
export { useDashboardData } from './useDashboardData';

// Layouts
export * from './persona-layouts';

// Widgets
export * from './widgets';

// Migration Dashboard
export { MigrationDashboard } from './sections/MigrationDashboard';
export { useMigrationDashboardData } from './useMigrationDashboardData';

// Variants
export { FullPageDashboard } from './variants/FullPageDashboard';
export { SectionDashboard } from './variants/SectionDashboard';

// Sections
export { StatsSection } from './sections/StatsSection';
export { ActivitySection } from './sections/ActivitySection';
export { BillsSection } from './sections/BillsSection';
