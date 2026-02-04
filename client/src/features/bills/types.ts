/**
 * Bills Feature Types
 * Consolidated type definitions for the bills feature
 */

import { 
  Bill, 
  BillStatus,
  UrgencyLevel,
  BillAnalysis as SharedBillAnalysis,
  Sponsor as SharedSponsor,
  BillsQueryParams as SharedBillsQueryParams
} from '@client/lib/types';

// Re-export shared types
export type { Bill, BillStatus, UrgencyLevel };

// Feature-specific Sponsor extension
export type BillSponsor = SharedSponsor & {
  conflictOfInterest?: ConflictOfInterest[];
};

// Feature-specific Analysis (augmenting shared type)
export interface BillAnalysis extends Partial<SharedBillAnalysis> {
  summary: string;
  keyPoints: string[];
  potentialImpact: string; // Mapped to 'impact' in shared type
  stakeholderAnalysis: StakeholderImpact[];
  generatedAt: string;
}

export interface StakeholderImpact {
  group: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  confidence: number;
}

export interface ConflictOfInterest {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export interface EngagementMetrics {
  views: number;
  shares: number;
  comments: number;
  bookmarks: number;
  last_engaged_at: string;
}

// Query parameters (Extending shared params)
export interface BillsQueryParams extends Omit<SharedBillsQueryParams, 'sortBy' | 'sponsors'> {
  policyAreas?: string[];
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
  // Extended sort fields for UI - combines SortField plus additional UI options
  sortBy?: 'date' | 'title' | 'status' | 'urgency' | 'engagement' | 'relevance' | 'complexity' | 'score';
  // Allow string IDs for sponsors (matching Sponsor.id)
  sponsors?: (string | number)[];
}

// Mutation payloads
export interface CommentPayload {
  content: string;
  commentType?: string;
  user_id: string;
  parent_id?: string;
}

export interface EngagementPayload {
  user_id: string;
  engagement_type: 'view' | 'share' | 'bookmark' | 'comment';
  metadata?: Record<string, unknown>;
}

// API response types
export interface BillsResponse {
  bills: Bill[];
  total: number;
  hasMore: boolean;
}

export interface BillCategoriesResponse {
  categories: string[];
}

export interface BillStatusesResponse {
  statuses: string[];
}
