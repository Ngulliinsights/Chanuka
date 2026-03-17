/**
 * Moderation Types - Re-export from Shared Layer
 * 
 * These types have been migrated to @shared/types/domains/safeguards/moderation.ts
 * This file now simply re-exports them for backward compatibility.
 */

export type {
  ContentModerationFilters,
  ModerationItem
} from '@shared/types';

/**
 * Record of a moderation action
 */
export interface ModerationActionRecord {
  id: number;
  content_type: string;
  content_id: number;
  actionType: 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight';
  reason: string;
  moderatorId: string;
  moderatorName: string;
  created_at: Date;
}

/**
 * Content analysis result
 */
export interface ContentAnalysisResult {
  shouldFlag: boolean;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  detectedIssues: {
    type: string;
    description: string;
    confidence: number;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  }[];
  overallScore: number;
  recommendations: string[];
}

/**
 * Bulk moderation operation parameters
 */
export interface BulkModerationOperation {
  reportIds: number[];
  action: 'resolve' | 'dismiss' | 'escalate' | 'delete';
  resolutionNotes: string;
  moderatorId: string;
}

/**
 * Analytics data about moderation performance
 */
export interface ContentAnalytics {
  totalContent: number;
  pendingModeration: number;
  reviewedContent: number;
  resolvedContent: number;
  dismissedContent: number;
  escalatedContent: number;
  averageReviewTime: number;
  topModerators: {
    id: string;
    name: string;
    actionsCount: number;
  }[];
  contentQualityScore: number;
  reportReasons: {
    reason: string;
    count: number;
  }[];
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}


