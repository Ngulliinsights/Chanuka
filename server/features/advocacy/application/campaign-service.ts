// ============================================================================
// ADVOCACY COORDINATION - Campaign Application Service
// ============================================================================

import { AdvocacyErrors } from '@server/features/advocacy/domain/errors/advocacy-errors';
import { ICampaignRepository } from '@server/features/advocacy/domain/repositories/campaign-repository';
import { CampaignDomainService } from '@server/features/advocacy/domain/services/campaign-domain-service';
import {
  Campaign,
  CampaignFilters,
  CampaignMetrics,
  CampaignParticipant,
  NewCampaign,
  PaginationOptions,
} from '@server/features/advocacy/domain/types';
import { logger } from '@server/infrastructure/observability';

export class CampaignService {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly campaignDomainService: CampaignDomainService
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async createCampaign(data: NewCampaign, creatorId: string): Promise<Campaign> {
    try {
      return await this.campaignDomainService.createCampaign(data, creatorId);
    } catch (error) {
      logger.error(
        {
          component: 'CampaignService',
          operation: 'createCampaign',
          title: data.title,
          billId: data.billId,
          organizerId: data.organizerId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to create campaign',
      );
      throw error;
    }
  }

  async getCampaign(campaign_id: string, user_id?: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(campaign_id);

    if (!campaign.isPublic && user_id !== campaign.organizerId) {
      const isParticipant = await this.campaignRepository.isParticipant(campaign_id, user_id ?? '');
      if (!isParticipant) {
        throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id ?? '');
      }
    }

    return campaign;
  }

  async getCampaigns(
    filters?: CampaignFilters,
    pagination?: PaginationOptions,
    _user_id?: string // Public-only enforcement is handled at the repository (SQL) level.
  ): Promise<Campaign[]> {
    return this.campaignRepository.findAll(filters, pagination);
  }

  async updateCampaign(
    campaign_id: string,
    updates: Partial<Campaign>,
    user_id: string
  ): Promise<Campaign> {
    const campaign = await this.findOrThrow(campaign_id);
    this.assertIsOrganizer(campaign, campaign_id, user_id);

    // Status transitions are governed by the domain service.
    if (updates.status && updates.status !== campaign.status) {
      return this.campaignDomainService.updateCampaignStatus(campaign_id, updates.status, user_id);
    }

    const updatedCampaign = await this.campaignRepository.update(campaign_id, {
      ...updates,
      updatedAt: new Date(),
    });

    if (!updatedCampaign) {
      throw new Error(`Failed to persist update for campaign ${campaign_id}`);
    }

    logger.info({ campaign_id, fields: Object.keys(updates), component: 'CampaignService' }, 'Campaign updated');

    return updatedCampaign;
  }

  async deleteCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    const campaign = await this.findOrThrow(campaign_id);
    this.assertIsOrganizer(campaign, campaign_id, user_id);

    if (campaign.status !== 'draft' && campaign.participantCount > 0) {
      throw AdvocacyErrors.campaignStatus(campaign.status, 'delete');
    }

    const success = await this.campaignRepository.delete(campaign_id);

    if (success) {
      logger.info({ campaign_id, component: 'CampaignService' }, 'Campaign deleted');
    }

    return success;
  }

  // ---------------------------------------------------------------------------
  // PARTICIPATION
  // ---------------------------------------------------------------------------

  async joinCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    return this.campaignDomainService.joinCampaign(campaign_id, user_id);
  }

  async leaveCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    return this.campaignDomainService.leaveCampaign(campaign_id, user_id);
  }

  async getCampaignParticipants(
    campaign_id: string,
    user_id: string,
    pagination?: PaginationOptions
  ): Promise<CampaignParticipant[]> {
    const campaign = await this.getCampaign(campaign_id, user_id);
    this.assertIsOrganizer(campaign, campaign_id, user_id);

    return this.campaignRepository.getParticipants(campaign_id, pagination);
  }

  // ---------------------------------------------------------------------------
  // DISCOVERY
  // ---------------------------------------------------------------------------

  async getCampaignsByBill(bill_id: string, filters?: CampaignFilters): Promise<Campaign[]> {
    return this.campaignRepository.findByBillId(bill_id, filters);
  }

  async getCampaignsByUser(
    user_id: string,
    filters?: CampaignFilters
  ): Promise<{ organized: Campaign[]; participating: Campaign[] }> {
    const [organized, participating] = await Promise.all([
      this.campaignRepository.findByOrganizer(user_id, filters),
      this.campaignRepository.findByParticipant(user_id, filters),
    ]);

    return { organized, participating };
  }

  async searchCampaigns(
    query: string,
    filters?: CampaignFilters,
    pagination?: PaginationOptions
  ): Promise<Campaign[]> {
    return this.campaignRepository.search(query, filters, pagination);
  }

  async getTrendingCampaigns(limit = 10): Promise<Campaign[]> {
    return this.campaignRepository.findTrending(limit);
  }

  async getRecommendedCampaigns(user_id: string, limit = 10): Promise<Campaign[]> {
    return this.campaignRepository.findRecommended(user_id, limit);
  }

  // ---------------------------------------------------------------------------
  // ANALYTICS & METRICS
  // ---------------------------------------------------------------------------

  async getCampaignMetrics(campaign_id: string, user_id: string): Promise<CampaignMetrics> {
    await this.getCampaign(campaign_id, user_id); // access guard
    return this.campaignDomainService.computeCampaignMetrics(campaign_id);
  }

  async getCampaignAnalytics(campaign_id: string, user_id: string): Promise<Record<string, unknown>> {
    const campaign = await this.getCampaign(campaign_id, user_id);
    this.assertIsOrganizer(campaign, campaign_id, user_id);

    return this.campaignDomainService.getCampaignAnalytics(campaign_id);
  }

  async getCampaignStats(): Promise<Record<string, unknown>> {
    return this.campaignRepository.getStats();
  }

  // ---------------------------------------------------------------------------
  // MODERATION
  // ---------------------------------------------------------------------------

  async flagCampaignForReview(
    campaign_id: string,
    reason: string,
    reporterId: string
  ): Promise<boolean> {
    await this.findOrThrow(campaign_id);

    const success = await this.campaignRepository.flagForReview(campaign_id, reason, reporterId);

    if (success) {
      logger.info({ campaign_id, reason, reporterId, component: 'CampaignService' }, 'Campaign flagged for review');
    }

    return success;
  }

  async getCampaignsRequiringAttention(): Promise<Campaign[]> {
    return this.campaignDomainService.getCampaignsRequiringAttention();
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /** Fetches a campaign by ID and throws a typed not-found error if absent. */
  private async findOrThrow(campaign_id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }
    return campaign;
  }

  /** Throws an access-denied error if the given user is not the campaign organizer. */
  private assertIsOrganizer(campaign: Campaign, campaign_id: string, user_id: string): void {
    if (campaign.organizerId !== user_id) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }
  }
}