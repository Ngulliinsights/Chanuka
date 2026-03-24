/**
 * Advocacy Feature — Campaign Domain Service
 *
 * Core business logic for campaign management, status transitions, and analytics.
 * Coordinates domain entities, enforces business rules, and delegates persistence
 * to the repository abstraction.
 */

import { logger } from '@server/infrastructure/observability';

import type { ICampaignRepository } from '../repositories/campaign-repository';
import type {
  Campaign,
  CampaignFilters,
  CampaignMetrics,
  CampaignStatus,
  NewCampaign,
  PaginationOptions,
} from '../types';

/** Milliseconds in one day — used for date-diff calculations. */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Campaign Domain Service
 *
 * Encapsulates campaign aggregate business logic:
 * - Campaign creation with validation
 * - Status transitions and state machine enforcement
 * - Participant lifecycle (join/leave)
 * - Metrics computation and analytics
 * - Discovery queries
 *
 * Depends only on the repository abstraction, not on HTTP or infrastructure concerns.
 */
export class CampaignDomainService {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  // ── Creation ─────────────────────────────────────────────────────────────

  /**
   * Create a new campaign with full validation.
   *
   * Business rules enforced:
   * - Creator must match organizerId
   * - End date must be after start date
   * - Start date must not be in the past
   * - User cannot have multiple active or draft campaigns for the same bill
   *
   * @throws Error if validation fails
   */
  async createCampaign(data: NewCampaign, creatorId: string): Promise<Campaign> {
    if (data.organizerId !== creatorId) {
      throw new Error('User can only create campaigns for themselves');
    }

    if (data.endDate <= data.startDate) {
      throw new Error('End date must be after start date');
    }

    if (data.startDate < new Date()) {
      throw new Error('Start date cannot be in the past');
    }

    if (data.billId) {
      const existingCampaigns = await this.campaignRepository.findByBillId(data.billId, {
        organizerId: data.organizerId,
      });

      const hasActiveCampaign = existingCampaigns.some(
        (c) => c.status === 'active' || c.status === 'draft'
      );

      if (hasActiveCampaign) {
        throw new Error('User already has an active campaign for this bill');
      }
    }

    const campaign = await this.campaignRepository.create(data);

    logger.info(
      { campaign_id: campaign.id, organizerId: data.organizerId, component: 'CampaignDomainService' },
      'Campaign created successfully'
    );

    return campaign;
  }

  // ── Status Transitions ────────────────────────────────────────────────────

  /**
   * Update campaign status with state-machine validation.
   *
   * Valid transitions:
   * - draft     → active, cancelled
   * - active    → paused, completed, cancelled
   * - paused    → active, cancelled
   * - completed → (terminal)
   * - cancelled → (terminal)
   *
   * @throws Error if transition is invalid or user is not the organizer
   */
  async updateCampaignStatus(
    campaignId: string,
    newStatus: CampaignStatus,
    userId: string
  ): Promise<Campaign> {
    const campaign = await this.findCampaignOrThrow(campaignId);

    if (campaign.organizerId !== userId) {
      throw new Error('User not authorized to modify this campaign');
    }

    this.validateStatusTransition(campaign.status, newStatus);

    const updated = await this.campaignRepository.update(campaignId, {
      status: newStatus,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update campaign status');
    }

    logger.info(
      {
        campaign_id: campaignId,
        oldStatus: campaign.status,
        newStatus,
        component: 'CampaignDomainService',
      },
      'Campaign status updated'
    );

    return updated;
  }

  /**
   * Enforce the campaign state machine. Throws on any invalid transition.
   */
  private validateStatusTransition(current: CampaignStatus, next: CampaignStatus): void {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      draft:     ['active', 'cancelled'],
      active:    ['paused', 'completed', 'cancelled'],
      paused:    ['active', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new Error(
        `Invalid status transition: cannot move from '${current}' to '${next}'`
      );
    }
  }

  // ── Participant Lifecycle ─────────────────────────────────────────────────

  /**
   * Add a user as a participant to an active campaign.
   *
   * Business rules:
   * - Campaign must be active
   * - User must not already be a participant
   *
   * NOTE: Duplicate-join prevention currently relies on participantCount only.
   * Implement `ICampaignRepository.hasParticipant(campaignId, userId)` to enforce
   * per-user uniqueness at the data layer.
   *
   * @returns true on success
   * @throws Error if campaign is not active
   */
  async joinCampaign(campaignId: string, userId: string): Promise<boolean> {
    const campaign = await this.findCampaignOrThrow(campaignId);

    if (campaign.status !== 'active') {
      throw new Error('Campaign is not accepting new participants');
    }

    // TODO: Add per-user deduplication once ICampaignRepository exposes
    //   hasParticipant(campaignId, userId): Promise<boolean>
    // e.g.: if (await this.campaignRepository.hasParticipant(campaignId, userId)) {
    //         throw new Error('User is already a participant in this campaign');
    //       }

    await this.campaignRepository.update(campaignId, {
      participantCount: campaign.participantCount + 1,
      updatedAt: new Date(),
    });

    logger.info(
      { campaign_id: campaignId, user_id: userId, component: 'CampaignDomainService' },
      'User joined campaign'
    );

    return true;
  }

  /**
   * Remove a user as a participant from a campaign.
   *
   * @throws Error if campaign has already reached a terminal state
   */
  async leaveCampaign(campaignId: string, userId: string): Promise<boolean> {
    const campaign = await this.findCampaignOrThrow(campaignId);

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      throw new Error(`Cannot leave a ${campaign.status} campaign`);
    }

    await this.campaignRepository.update(campaignId, {
      participantCount: Math.max(0, campaign.participantCount - 1),
      updatedAt: new Date(),
    });

    logger.info(
      { campaign_id: campaignId, user_id: userId, component: 'CampaignDomainService' },
      'User left campaign'
    );

    return true;
  }

  // ── Metrics & Analytics ───────────────────────────────────────────────────

  /**
   * Compute aggregated metrics for a single campaign.
   *
   * Metrics include:
   * - totalParticipants  — current participant count
   * - totalActions       — sum of actions taken (requires action repository; TODO)
   * - participationRate  — participants as a fraction of the campaign's goal (TODO)
   * - reach              — geographic / network spread (TODO)
   * - engagement         — activity density over time (TODO)
   * - conversion         — actions-to-participant ratio (actions / participants)
   * - targetResponse     — legislator / official feedback count (TODO)
   *
   * Accepts an already-fetched campaign to avoid a redundant repository round-trip
   * when called from getCampaignAnalytics.
   */
  async computeCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    const campaign = await this.findCampaignOrThrow(campaignId);
    return this.buildMetrics(campaign);
  }

  /** Pure metrics calculation — separated so analytics can reuse a fetched campaign. */
  private buildMetrics(campaign: Campaign): CampaignMetrics {
    const totalParticipants = campaign.participantCount;
    const totalActions      = 0; // TODO: query action repository

    return {
      totalParticipants,
      totalActions,
      // TODO: replace with (participants / targetParticipants) once Campaign exposes a goal field
      participationRate: 0,
      reach:             0, // TODO: geographic spread calculation
      engagement:        0, // TODO: activity density over time
      // Actions completed per participant; 0 when there are no participants
      conversion:        totalParticipants > 0 ? totalActions / totalParticipants : 0,
      targetResponse:    0, // TODO: legislator / official feedback count
    };
  }

  /**
   * Retrieve detailed campaign analytics including day-count trends.
   *
   * Reuses the already-fetched campaign to avoid a second repository call.
   */
  async getCampaignAnalytics(campaignId: string): Promise<Record<string, unknown>> {
    const campaign = await this.findCampaignOrThrow(campaignId);
    const metrics  = this.buildMetrics(campaign);
    const now      = Date.now();

    return {
      ...metrics,
      campaignId,
      title:  campaign.title,
      status: campaign.status,
      // Clamp to 0 — daysActive is negative if the campaign hasn't started yet
      daysActive:    Math.max(0, Math.floor((now - campaign.startDate.getTime()) / MS_PER_DAY)),
      daysRemaining: Math.max(0, Math.floor((campaign.endDate.getTime() - now) / MS_PER_DAY)),
    };
  }

  /**
   * Retrieve campaigns that need moderation attention.
   * TODO: Implement flagging system with moderation queue.
   */
  async getCampaignsRequiringAttention(): Promise<Campaign[]> {
    logger.info(
      { component: 'CampaignDomainService', operation: 'getCampaignsRequiringAttention' },
      'Moderation queue system not yet implemented'
    );
    return [];
  }

  // ── Discovery ─────────────────────────────────────────────────────────────

  /**
   * Find campaigns by multiple filters with pagination.
   *
   * @param _userId Reserved for future visibility / ACL filtering
   */
  async getCampaigns(
    filters?: CampaignFilters,
    pagination?: PaginationOptions,
    _userId?: string // reserved for visibility / ACL filtering
  ): Promise<Campaign[]> {
    return this.campaignRepository.findAll(filters, pagination);
  }

  /**
   * Get a single campaign by ID.
   *
   * @param _userId Reserved for future visibility / ACL filtering
   */
  async getCampaign(campaignId: string, _userId?: string /* reserved */): Promise<Campaign> {
    return this.findCampaignOrThrow(campaignId);
  }

  /** Find campaigns associated with a specific bill. */
  async getCampaignsByBill(billId: string): Promise<Campaign[]> {
    return this.campaignRepository.findByBillId(billId);
  }

  /** Find campaigns created by a user. */
  async getCampaignsByUser(userId: string): Promise<Campaign[]> {
    return this.campaignRepository.findByOrganizer(userId);
  }

  /** Search campaigns by text query. */
  async searchCampaigns(
    query: string,
    filters?: CampaignFilters,
    pagination?: PaginationOptions
  ): Promise<Campaign[]> {
    return this.campaignRepository.search(query, filters, pagination);
  }

  /** Return the most recently active campaigns, up to `limit`. */
  async getTrendingCampaigns(limit = 10): Promise<Campaign[]> {
    return this.campaignRepository.findAll({ status: 'active' }, { page: 1, limit });
  }

  // ── Update & Delete ───────────────────────────────────────────────────────

  /**
   * Update campaign details (excluding status). Restricted to the organizer.
   *
   * Status changes must go through updateCampaignStatus to enforce the state machine.
   *
   * @throws Error if campaign not found, user is not the organizer, or persistence fails
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Campaign>,
    userId: string
  ): Promise<Campaign> {
    const campaign = await this.findCampaignOrThrow(campaignId);

    if (campaign.organizerId !== userId) {
      throw new Error('User not authorized to modify this campaign');
    }

    // Destructure status out so it is never persisted through this path.
    // Status changes must go through updateCampaignStatus to enforce the state machine.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status, ...safeUpdates } = updates;

    const updated = await this.campaignRepository.update(campaignId, {
      ...safeUpdates,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update campaign');
    }

    logger.info(
      { campaign_id: campaignId, component: 'CampaignDomainService' },
      'Campaign updated'
    );

    return updated;
  }

  /**
   * Delete a campaign. Restricted to the organizer; active campaigns must be
   * paused or completed before deletion.
   */
  async deleteCampaign(campaignId: string, userId: string): Promise<void> {
    const campaign = await this.findCampaignOrThrow(campaignId);

    if (campaign.organizerId !== userId) {
      throw new Error('User not authorized to delete this campaign');
    }

    if (campaign.status === 'active') {
      throw new Error('Cannot delete an active campaign — pause or complete it first');
    }

    const deleted = await this.campaignRepository.delete(campaignId);
    if (!deleted) {
      throw new Error('Failed to delete campaign');
    }

    logger.info(
      { campaign_id: campaignId, component: 'CampaignDomainService' },
      'Campaign deleted'
    );
  }

  // ── Dashboard Statistics ──────────────────────────────────────────────────

  /**
   * Aggregate campaign statistics for the dashboard.
   *
   * Computes all counts in a single pass over the result set to avoid
   * re-iterating for each status bucket.
   *
   * NOTE: This performs a full-table scan via findAll(). Consider adding
   * a dedicated `ICampaignRepository.getStats()` method backed by SQL
   * aggregates (COUNT / SUM grouped by status) for large datasets.
   */
  async getCampaignStats(): Promise<Record<string, unknown>> {
    const allCampaigns = await this.campaignRepository.findAll();

    const counts = allCampaigns.reduce(
      (acc, c) => {
        acc.totalParticipants += c.participantCount;
        if (c.status === 'active')    acc.active    += 1;
        if (c.status === 'draft')     acc.draft     += 1;
        if (c.status === 'completed') acc.completed += 1;
        return acc;
      },
      { active: 0, draft: 0, completed: 0, totalParticipants: 0 }
    );

    const stats = {
      total: allCampaigns.length,
      ...counts,
      avgParticipantsPerCampaign: Math.round(
        counts.totalParticipants / (allCampaigns.length || 1)
      ),
    };

    logger.info({ stats, component: 'CampaignDomainService' }, 'Campaign statistics compiled');

    return stats;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Fetch a campaign by ID or throw a consistent "not found" error.
   * Centralizes the null-check that was duplicated across every method.
   */
  private async findCampaignOrThrow(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    return campaign;
  }
}