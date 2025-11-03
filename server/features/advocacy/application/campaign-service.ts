// ============================================================================
// ADVOCACY COORDINATION - Campaign Application Service
// ============================================================================

import { Campaign, NewCampaign } from '../domain/entities/campaign.js';
import { ICampaignRepository } from '../domain/repositories/campaign-repository.js';
import { CampaignDomainService } from '../domain/services/campaign-domain-service.js';
import { CampaignFilters, PaginationOptions, CampaignMetrics } from '../types/index.js';
import { AdvocacyErrors } from '../domain/errors/advocacy-errors.js';
import { logger } from '../../../shared/core/index.js';

export class CampaignService {
  constructor(
    private campaignRepository: ICampaignRepository,
    private campaignDomainService: CampaignDomainService
  ) {}

  async createCampaign(data: NewCampaign, creatorId: string): Promise<Campaign> {
    try {
      return await this.campaignDomainService.createCampaign(data, creatorId);
    } catch (error) {
      logger.error('Failed to create campaign', error, { 
        title: data.title,
        billId: data.billId,
        organizerId: data.organizerId,
        component: 'CampaignService' 
      });
      throw error;
    }
  }

  async getCampaign(campaignId: string, userId?: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    // Check access permissions for private campaigns
    if (!campaign.isPublic && userId !== campaign.organizerId) {
      const isParticipant = await this.campaignRepository.isParticipant(campaignId, userId || '');
      if (!isParticipant) {
        throw AdvocacyErrors.campaignAccessDenied(campaignId, userId || '');
      }
    }

    return campaign;
  }

  async getCampaigns(
    filters?: CampaignFilters, 
    pagination?: PaginationOptions,
    userId?: string
  ): Promise<Campaign[]> {
    // Apply user-specific filters for private campaigns
    const effectiveFilters = { ...filters };
    
    // If user is not specified, only show public campaigns
    if (!userId) {
      // This would be handled at the repository level with proper SQL filtering
    }

    return await this.campaignRepository.findAll(effectiveFilters, pagination);
  }

  async updateCampaign(
    campaignId: string, 
    updates: Partial<Campaign>, 
    userId: string
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    if (campaign.organizerId !== userId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    // Validate updates
    if (updates.status && updates.status !== campaign.status) {
      return await this.campaignDomainService.updateCampaignStatus(campaignId, updates.status, userId);
    }

    const updatedCampaign = await this.campaignRepository.update(campaignId, {
      ...updates,
      updatedAt: new Date()
    });

    if (!updatedCampaign) {
      throw new Error('Failed to update campaign');
    }

    logger.info('Campaign updated', { 
      campaignId, 
      updates: Object.keys(updates),
      component: 'CampaignService' 
    });

    return updatedCampaign;
  }

  async deleteCampaign(campaignId: string, userId: string): Promise<boolean> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    if (campaign.organizerId !== userId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    // Only allow deletion of draft campaigns or campaigns with no participants
    if (campaign.status !== 'draft' && campaign.participantCount > 1) {
      throw AdvocacyErrors.campaignStatus(campaign.status, 'delete');
    }

    const success = await this.campaignRepository.delete(campaignId);
    
    if (success) {
      logger.info('Campaign deleted', { campaignId, component: 'CampaignService' });
    }

    return success;
  }

  async joinCampaign(campaignId: string, userId: string): Promise<boolean> {
    return await this.campaignDomainService.joinCampaign(campaignId, userId);
  }

  async leaveCampaign(campaignId: string, userId: string): Promise<boolean> {
    return await this.campaignDomainService.leaveCampaign(campaignId, userId);
  }

  async getCampaignsByBill(billId: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return await this.campaignRepository.findByBillId(billId, filters);
  }

  async getCampaignsByUser(userId: string, filters?: CampaignFilters): Promise<{
    organized: Campaign[];
    participating: Campaign[];
  }> {
    const [organized, participating] = await Promise.all([
      this.campaignRepository.findByOrganizer(userId, filters),
      this.campaignRepository.findByParticipant(userId, filters)
    ]);

    return { organized, participating };
  }

  async getCampaignMetrics(campaignId: string, userId: string): Promise<CampaignMetrics> {
    const campaign = await this.getCampaign(campaignId, userId);
    return await this.campaignDomainService.updateCampaignMetrics(campaignId);
  }

  async getCampaignAnalytics(campaignId: string, userId: string): Promise<any> {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (campaign.organizerId !== userId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    return await this.campaignDomainService.getCampaignAnalytics(campaignId);
  }

  async searchCampaigns(
    query: string, 
    filters?: CampaignFilters,
    pagination?: PaginationOptions
  ): Promise<Campaign[]> {
    return await this.campaignRepository.search(query, filters);
  }

  async getTrendingCampaigns(limit: number = 10): Promise<Campaign[]> {
    return await this.campaignRepository.findTrending(limit);
  }

  async getRecommendedCampaigns(userId: string, limit: number = 10): Promise<Campaign[]> {
    return await this.campaignRepository.findRecommended(userId, limit);
  }

  async getCampaignParticipants(
    campaignId: string, 
    userId: string,
    pagination?: PaginationOptions
  ): Promise<any[]> {
    const campaign = await this.getCampaign(campaignId, userId);
    
    // Only organizers can see full participant list
    if (campaign.organizerId !== userId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    return await this.campaignRepository.getParticipants(campaignId, pagination);
  }

  async flagCampaignForReview(
    campaignId: string, 
    reason: string, 
    reporterId: string
  ): Promise<boolean> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    const success = await this.campaignRepository.flagForReview(campaignId, reason, reporterId);
    
    if (success) {
      logger.info('Campaign flagged for review', { 
        campaignId, 
        reason, 
        reporterId,
        component: 'CampaignService' 
      });
    }

    return success;
  }

  async getCampaignStats(): Promise<any> {
    return await this.campaignRepository.getStats();
  }

  async getCampaignsRequiringAttention(): Promise<Campaign[]> {
    return await this.campaignDomainService.getCampaignsRequiringAttention();
  }
}