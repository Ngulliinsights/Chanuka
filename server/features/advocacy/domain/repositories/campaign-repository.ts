// ============================================================================
// ADVOCACY COORDINATION - Campaign Repository Interface
// ============================================================================

import { Campaign, NewCampaign } from '../entities/campaign.js';
import { CampaignFilters, PaginationOptions, CampaignMetrics } from '../../types/index.js';

export interface ICampaignRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Campaign | null>;
  findAll(filters?: CampaignFilters, pagination?: PaginationOptions): Promise<Campaign[]>;
  create(campaign: NewCampaign): Promise<Campaign>;
  update(id: string, updates: Partial<Campaign>): Promise<Campaign | null>;
  delete(id: string): Promise<boolean>;

  // Campaign-specific queries
  findByBillId(billId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  findByOrganizer(organizerId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  findByParticipant(userId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  findByCounty(county: string, filters?: CampaignFilters): Promise<Campaign[]>;
  findByCategory(category: string, filters?: CampaignFilters): Promise<Campaign[]>;
  
  // Status and lifecycle
  findByStatus(status: Campaign['status']): Promise<Campaign[]>;
  findActive(): Promise<Campaign[]>;
  findExpired(): Promise<Campaign[]>;
  findRequiringAttention(): Promise<Campaign[]>;
  
  // Participation management
  addParticipant(campaignId: string, userId: string, metadata?: Record<string, any>): Promise<boolean>;
  removeParticipant(campaignId: string, userId: string): Promise<boolean>;
  getParticipants(campaignId: string, pagination?: PaginationOptions): Promise<{
    userId: string;
    joinedAt: Date;
    role: 'participant' | 'organizer' | 'moderator';
    contributionScore: number;
    metadata?: Record<string, any>;
  }[]>;
  getParticipantCount(campaignId: string): Promise<number>;
  isParticipant(campaignId: string, userId: string): Promise<boolean>;
  
  // Metrics and analytics
  updateMetrics(campaignId: string, metrics: Partial<CampaignMetrics>): Promise<boolean>;
  getMetrics(campaignId: string): Promise<CampaignMetrics | null>;
  getCampaignAnalytics(campaignId: string): Promise<{
    participationTrend: Array<{ date: Date; count: number }>;
    actionCompletionRate: number;
    geographicDistribution: Record<string, number>;
    demographicBreakdown: Record<string, number>;
    engagementMetrics: {
      averageActionsPerParticipant: number;
      retentionRate: number;
      completionRate: number;
    };
  }>;
  
  // Search and discovery
  search(query: string, filters?: CampaignFilters): Promise<Campaign[]>;
  findSimilar(campaignId: string, limit?: number): Promise<Campaign[]>;
  findTrending(limit?: number): Promise<Campaign[]>;
  findRecommended(userId: string, limit?: number): Promise<Campaign[]>;
  
  // Bulk operations
  bulkUpdateStatus(campaignIds: string[], status: Campaign['status']): Promise<number>;
  bulkDelete(campaignIds: string[]): Promise<number>;
  
  // Statistics
  getStats(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    campaignsByStatus: Array<{ status: string; count: number }>;
    campaignsByCategory: Array<{ category: string; count: number }>;
    averageParticipation: number;
    successRate: number;
  }>;
  
  // Coalition and collaboration
  findPotentialCoalitions(campaignId: string): Promise<{
    campaignId: string;
    sharedObjectives: string[];
    alignmentScore: number;
    potentialSynergies: string[];
  }[]>;
  
  // Moderation and verification
  flagForReview(campaignId: string, reason: string, reporterId: string): Promise<boolean>;
  updateVerificationStatus(campaignId: string, isVerified: boolean, notes?: string): Promise<boolean>;
  getModerationQueue(): Promise<Campaign[]>;
}