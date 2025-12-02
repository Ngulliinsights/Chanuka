/**
 * Bills UI Layer - Feature-Sliced Design
 *
 * Centralized exports for all bills-related UI components
 */

// Component exports
export { BillCard } from './BillCard';
export { BillList } from './BillList';
export { StatsOverview } from './stats-overview';
export { VirtualBillGrid, BillGrid } from './virtual-bill-grid';
export { FilterPanel } from './filter-panel';
export { BillsDashboard } from './bills-dashboard';
export { BillRealTimeIndicator } from './BillRealTimeIndicator';
export { MobileBillDetail } from './MobileBillDetail';
export { MobileBillsDashboard } from './MobileBillsDashboard';
// Note: bill-tracking exports as default
export { default as BillTracking } from './bill-tracking';

// Alternative component names (keeping backward compatibility)
export { BillCard as default } from './BillCard';
export { BillList as BillsList } from './BillList';