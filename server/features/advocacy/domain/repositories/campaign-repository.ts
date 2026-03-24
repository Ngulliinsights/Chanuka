// ============================================================================
// ADVOCACY COORDINATION - Campaign Repository Interface
// ============================================================================
// Domain abstraction for campaign persistence operations.
// Concrete implementations (Postgres, in-memory, mock) live in
// infrastructure/repositories/ and must satisfy this contract in full.
// ============================================================================

import {
  Campaign,
  CampaignFilters,
  CampaignParticipant,
  NewCampaign,
  PaginationOptions,
} from '@server/features/advocacy/domain/types';

/**
 * Aggregate statistics returned by getStats.
 * Concrete fields cover the most common dashboard needs; the index
 * signature keeps the type open for future metrics without breaking callers.
 */
export interface CampaignStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  totalParticipants: number;
  [key: string]: unknown;
}

/**
 * ICampaignRepository
 *
 * Defines the persistence contract for Campaign aggregates.
 * The application layer depends only on this abstraction — implementations
 * are responsible for transactional consistency, optimistic locking, and
 * enforcing public/private visibility at the query level.
 */
export interface ICampaignRepository {
  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /**
   * Persist a new campaign record.
   * Called exclusively by CampaignDomainService — the application service
   * delegates creation to the domain layer, which writes via this method.
   * Returns the created campaign with its generated ID and timestamps.
   */
  create(data: NewCampaign): Promise<Campaign>;

  /**
   * Fetch a single campaign by its primary key.
   * Returns `null` when no matching record exists.
   */
  findById(campaign_id: string): Promise<Campaign | null>;

  /**
   * Persist mutations to an existing campaign.
   * Callers must spread `updatedAt: new Date()` into the payload to ensure
   * every write carries a fresh timestamp — implementations may enforce this
   * at the DB level as well.
   * Returns the updated record, or `null` if the campaign no longer exists.
   */
  update(
    campaign_id: string,
    updates: Partial<Campaign> & { updatedAt: Date }
  ): Promise<Campaign | null>;

  /**
   * Hard-delete a campaign record.
   * Returns `true` on success, `false` when the record was not found.
   */
  delete(campaign_id: string): Promise<boolean>;

  // ── Collection queries ────────────────────────────────────────────────────

  /**
   * Return all campaigns matching the supplied filters.
   * Implementations must enforce public/private visibility at the SQL level
   * when no authenticated user context is available in the filters.
   */
  findAll(filters?: CampaignFilters, pagination?: PaginationOptions): Promise<Campaign[]>;

  /**
   * Full-text or keyword search across campaign titles and descriptions.
   * Pagination is forwarded to the implementation — unused args should be
   * prefixed with `_` in concrete classes to satisfy the no-unused-vars rule.
   */
  search(
    query: string,
    filters?: CampaignFilters,
    pagination?: PaginationOptions
  ): Promise<Campaign[]>;

  // ── Discovery ─────────────────────────────────────────────────────────────

  /** Campaigns associated with a specific bill, newest first. */
  findByBillId(bill_id: string, filters?: CampaignFilters): Promise<Campaign[]>;

  /** Campaigns created / organised by a given user. */
  findByOrganizer(user_id: string, filters?: CampaignFilters): Promise<Campaign[]>;

  /** Campaigns the user has joined as a participant (not organiser). */
  findByParticipant(user_id: string, filters?: CampaignFilters): Promise<Campaign[]>;

  /**
   * Campaigns ranked by recent engagement (views, joins, actions).
   * @param limit — Maximum number of results. Defaults to 10 at the service layer.
   */
  findTrending(limit: number): Promise<Campaign[]>;

  /**
   * Personalised campaign suggestions for a user based on interests / history.
   * @param limit — Maximum number of results. Defaults to 10 at the service layer.
   */
  findRecommended(user_id: string, limit: number): Promise<Campaign[]>;

  // ── Participation ─────────────────────────────────────────────────────────

  /**
   * Check whether a user is an active participant of the campaign.
   * Used for access-control on private campaigns.
   */
  isParticipant(campaign_id: string, user_id: string): Promise<boolean>;

  /**
   * Return the paginated participant list for a campaign.
   * Callers that need a narrower shape should cast after fetching.
   */
  getParticipants(
    campaign_id: string,
    pagination?: PaginationOptions
  ): Promise<CampaignParticipant[]>;

  // ── Moderation ────────────────────────────────────────────────────────────

  /**
   * Mark a campaign for moderator review.
   * Returns `true` when the flag was successfully recorded.
   */
  flagForReview(campaign_id: string, reason: string, reporterId: string): Promise<boolean>;

  // ── Analytics / Admin ─────────────────────────────────────────────────────

  /**
   * Platform-wide aggregate statistics (totals by status, participant counts).
   * Typed as CampaignStats — extend the interface as the schema grows rather
   * than widening the return to Record<string, unknown>.
   */
  getStats(): Promise<CampaignStats>;
}