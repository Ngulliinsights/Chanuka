/**
 * Bills Components Export
 * 
 * Centralized exports for all bills-related components
 */

export { BillCard } from './bill-card';
export { StatsOverview } from './stats-overview';
export { VirtualBillGrid, BillGrid } from './virtual-bill-grid';
export { BillList } from './bill-list';
export { FilterPanel } from './filter-panel';
export { BillsDashboard } from './bills-dashboard';

// Re-export React Query hooks for convenience
export { useBills, useBill, useBillComments, useBillSponsors, useBillAnalysis, useBillCategories, useBillStatuses, useAddBillComment, useRecordBillEngagement, useVoteOnComment, useEndorseComment, useCreateBillPoll, useBillSponsorshipAnalysis, useBillPrimarySponsorAnalysis, useBillCoSponsorsAnalysis, useBillFinancialNetworkAnalysis } from '@client/features/bills/hooks/useBills';
export type { BillsQueryParams, CommentPayload, EngagementPayload } from '@client/features/bills/types';

// Define BillsStats locally as per migration instructions
interface BillsStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

// Define BillsFilter locally as per migration instructions
interface BillsFilter {
  status: string[];
  urgency: string[];
  policyAreas: string[];
  sponsors: string[];
  constitutionalFlags: boolean;
  controversyLevels: string[];
  dateRange: { start: string | null; end: string | null };
}