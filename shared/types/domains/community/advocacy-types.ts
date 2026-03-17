/**
 * Community Domain - Advocacy Types
 * 
 * Types for advocacy campaigns, coordinated actions, and civic engagement.
 * Migrated from server/features/advocacy/types/index.ts
 * 
 * @module shared/types/domains/community/advocacy-types
 */

// ============================================================================
// Campaign Management
// ============================================================================

/**
 * Filters for querying advocacy campaigns
 */
export interface CampaignFilters {
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  bill_id?: string;
  organizerId?: string;
  category?: string;
  county?: string;
  start_date?: Date;
  end_date?: Date;
  minParticipants?: number;
  maxParticipants?: number;
}

/**
 * Filters for advocacy actions
 */
export interface ActionFilters {
  campaign_id?: string;
  user_id?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  actionType?: 'contact_representative' | 'attend_hearing' | 'submit_comment' | 'share_content' | 'organize_meeting' | 'petition_signature';
  due_date?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Campaign metrics and engagement data
 */
export interface CampaignMetrics {
  totalParticipants: number;
  activeParticipants: number;
  completedActions: number;
  pendingActions: number;
  engagementRate: number;
  impactScore: number;
  reachMetrics: {
    counties: number;
    demographics: Record<string, number>;
    channels: Record<string, number>;
  };
}

/**
 * Action template for campaign actions
 */
export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  actionType: string;
  estimatedTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  template: {
    subject?: string;
    body?: string;
    instructions: string;
  };
}
