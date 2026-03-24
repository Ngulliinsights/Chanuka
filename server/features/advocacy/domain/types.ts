/**
 * Advocacy Feature — Domain Types
 *
 * Core type definitions for campaigns, participants, and related entities.
 */

// ============================================================================
// Campaign Types
// ============================================================================

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignType =
  | 'petition'
  | 'letter_writing'
  | 'phone_banking'
  | 'social_media'
  | 'grassroots'
  | 'coalition'
  | 'awareness';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  goal: string;
  organizerId: string;
  billId?: string;
  targetCount?: number;
  participantCount: number;
  tags?: string[];
  isPublic: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCampaign {
  title: string;
  description: string;
  type: CampaignType;
  goal: string;
  organizerId: string;
  billId?: string;
  targetCount?: number;
  tags?: string[];
  isPublic?: boolean;
  startDate: Date;
  endDate: Date;
}

export interface CampaignParticipant {
  id: string;
  userId: string;
  campaignId: string;
  joinedAt: Date;
  actionCount: number;
}

export interface CampaignMetrics {
  totalParticipants: number;
  totalActions: number;
  participationRate: number;
  reach: number;
  engagement: number;
  conversion: number;
  targetResponse: number;
}

// ============================================================================
// Filter & Pagination Types
// ============================================================================

export interface CampaignFilters {
  type?: CampaignType;
  status?: CampaignStatus;
  billId?: string;
  organizerId?: string;
  tags?: string[];
  activeOnly?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}
