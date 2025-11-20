/**
 * Shared types for the moderation system
 */

/**
 * Filters for querying the moderation queue
 */
export interface ContentModerationFilters {
  content_type?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency';
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'escalated';
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  dateRange?: {
    start: Date;
    end: Date;
  };
  moderator?: string;
  reportType?: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
  autoDetected?: boolean;
}

/**
 * Represents a single item in the moderation queue
 */
export interface ModerationItem {
  id: number;
  content_type: 'comment' | 'bill' | 'user_profile' | 'sponsor_transparency';
  content_id: number;
  content: {
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    created_at: Date;
  };
  reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  description?: string;
  reportedBy: string;
  autoDetected: boolean;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'escalated';
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  resolutionNotes?: string | null;
  created_at: Date;
  updated_at: Date;
}

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
