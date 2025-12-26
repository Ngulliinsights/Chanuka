// ============================================================================
// ADVOCACY COORDINATION - Campaign Application Service
// ============================================================================

import { CampaignFilters, CampaignMetrics,PaginationOptions } from '@server/types/index.ts';
import { logger  } from '@shared/core';
import { Campaign, NewCampaign } from '@shared/domain/entities/campaign.js';
import { AdvocacyErrors } from '@shared/domain/errors/advocacy-errors.js';
// Repository interface removed - using direct service calls
import { CampaignDomainService } from '@shared/domain/services/campaign-domain-service.js';

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
        bill_id: data.bill_id,
        organizerId: data.organizerId,
        component: 'CampaignService' 
      });
      throw error;
    }
  }

  async getCampaign(campaign_id: string, user_id?: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    // Check access permissions for private campaigns
    if (!campaign.is_public && user_id !== campaign.organizerId) {
      const isParticipant = await this.campaignRepository.isParticipant(campaign_id, user_id || '');
      if (!isParticipant) {
        throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id || '');
      }
    }

    return campaign;
  }

  async getCampaigns(
    filters?: CampaignFilters, 
    pagination?: PaginationOptions,
    user_id?: string
  ): Promise<Campaign[]> {
    // Apply user-specific filters for private campaigns
    const effectiveFilters = { ...filters };
    
    // If user is not specified, only show public campaigns
    if (!user_id) {
      // This would be handled at the repository level with proper SQL filtering
    }

    return await this.campaignRepository.findAll(effectiveFilters, pagination);
  }

  async updateCampaign(
    campaign_id: string, 
    updates: Partial<Campaign>, 
    user_id: string
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    if (campaign.organizerId !== user_id) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    // Validate updates
    if (updates.status && updates.status !== campaign.status) {
      return await this.campaignDomainService.updateCampaignStatus(campaign_id, updates.status, user_id);
    }

    const updatedCampaign = await this.campaignRepository.update(campaign_id, {
      ...updates,
      updated_at: new Date()
    });

    if (!updatedCampaign) {
      throw new Error('Failed to update campaign');
    }

    logger.info('Campaign updated', { 
      campaign_id, 
      updates: Object.keys(updates),
      component: 'CampaignService' 
    });

    return updatedCampaign;
  }

  async deleteCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    if (campaign.organizerId !== user_id) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    // Only allow deletion of draft campaigns or campaigns with no participants
    if (campaign.status !== 'draft' && campaign.participantCount > 1) {
      throw AdvocacyErrors.campaignStatus(campaign.status, 'delete');
    }

    const success = await this.campaignRepository.delete(campaign_id);
    
    if (success) {
      logger.info('Campaign deleted', { campaign_id, component: 'CampaignService' });
    }

    return success;
  }

  async joinCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    return await this.campaignDomainService.joinCampaign(campaign_id, user_id);
  }

  async leaveCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    return await this.campaignDomainService.leaveCampaign(campaign_id, user_id);
  }

  async getCampaignsByBill(bill_id: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return await this.campaignRepository.findByBillId(bill_id, filters);
  }

  async getCampaignsByUser(user_id: string, filters?: CampaignFilters): Promise<{
    organized: Campaign[];
    participating: Campaign[];
  }> {
    const [organized, participating] = await Promise.all([
      this.campaignRepository.findByOrganizer(user_id, filters),
      this.campaignRepository.findByParticipant(user_id, filters)
    ]);

    return { organized, participating };
  }

  async getCampaignMetrics(campaign_id: string, user_id: string): Promise<CampaignMetrics> {
    const campaign = await this.getCampaign(campaign_id, user_id);
    return await this.campaignDomainService.updateCampaignMetrics(campaign_id);
  }

  async getCampaignAnalytics(campaign_id: string, user_id: string): Promise<any> {
    const campaign = await this.getCampaign(campaign_id, user_id);
    
    if (campaign.organizerId !== user_id) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    return await this.campaignDomainService.getCampaignAnalytics(campaign_id);
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

  async getRecommendedCampaigns(user_id: string, limit: number = 10): Promise<Campaign[]> {
    return await this.campaignRepository.findRecommended(user_id, limit);
  }

  async getCampaignParticipants(
    campaign_id: string, 
    user_id: string,
    pagination?: PaginationOptions
  ): Promise<any[]> {
    const campaign = await this.getCampaign(campaign_id, user_id);
    
    // Only organizers can see full participant list
    if (campaign.organizerId !== user_id) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    return await this.campaignRepository.getParticipants(campaign_id, pagination);
  }

  async flagCampaignForReview(
    campaign_id: string, 
    reason: string, 
    reporterId: string
  ): Promise<boolean> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    const success = await this.campaignRepository.flagForReview(campaign_id, reason, reporterId);
    
    if (success) {
      logger.info('Campaign flagged for review', { 
        campaign_id, 
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
