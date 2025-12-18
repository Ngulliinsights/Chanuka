/**
 * Engagement Types
 * 
 * Type definitions for user engagement and interaction metrics
 */

// ============================================================================
// Engagement Models
// ============================================================================

export enum EngagementType {
  VIEW = 'view',
  SAVE = 'save',
  SHARE = 'share',
  COMMENT = 'comment',
  VOTE = 'vote'
}

export interface EngagementMetrics {
  readonly billId: number;
  readonly views: number;
  readonly comments: number;
  readonly shares: number;
  readonly saves: number;
  readonly timestamp: string;
}

export interface EngagementAction {
  readonly actionType: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  readonly entityType: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  readonly entityId: string | number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
