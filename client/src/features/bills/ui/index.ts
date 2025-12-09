/**
 * Bills Feature UI Components
 * 
 * All UI components specific to the bills feature organized by FSD principles.
 * These components should only be imported by other bills feature modules
 * or by pages that specifically handle bill-related functionality.
 */

// Bill List Components
export { default as BillList } from './BillList';
export { default as BillCard } from './list/BillCard';
export { default as FilterPanel } from './filter-panel';

// Bill Detail Components  
export { default as BillDetail } from './detail/BillDetail';
export { BillHeader } from './detail/BillHeader';
export { default as BillOverviewTab } from './detail/BillOverviewTab';
export { default as BillSponsorsTab } from './detail/BillSponsorsTab';
export { default as BillFullTextTab } from './detail/BillFullTextTab';

// Bill Analysis Components
export { default as BillAnalysis } from './analysis/BillAnalysis';
export { default as BillAnalysisTab } from './analysis/BillAnalysisTab';
export { ConstitutionalAnalysisPanel } from './analysis/ConstitutionalAnalysisPanel';
export { default as ConstitutionalAnalysis } from './analysis/ConstitutionalAnalysis';

// Bill Tracking Components
export { default as BillTracking } from './bill-tracking';
export { default as RealTimeIndicator } from './BillRealTimeIndicator';

// Bill Dashboard Components
export { default as BillsDashboard } from './bills-dashboard';
export { default as StatsOverview } from './stats-overview';

// Mobile Bill Components
export { default as MobileBillDetail } from './MobileBillDetail';
export { default as MobileBillsDashboard } from './MobileBillsDashboard';

// Re-export existing components with proper organization
export { default as VirtualBillGrid } from './virtual-bill-grid';
export { default as ImplementationWorkarounds } from './implementation-workarounds';