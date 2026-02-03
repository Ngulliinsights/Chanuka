/**
 * Bills Feature Types
 * Consolidated type definitions for the bills feature
 */

import { Bill, Comment, Sponsor as SharedSponsor } from '@client/lib/types';

// Re-export shared Sponsor to maintain import compatibility where possible,
// but users will need to adapt to the new structure (e.g. name -> legislatorName)
export type BillSponsor = SharedSponsor & {
  // Augment with UI-specific fields if necessary, or strictly use shared type
  conflictOfInterest?: ConflictOfInterest[];
};

export interface BillAnalysis {
  summary: string;
  keyPoints: string[];
  potentialImpact: string;
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

// Query parameters
export interface BillsQueryParams {
  query?: string;
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  sponsors?: string[];
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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
