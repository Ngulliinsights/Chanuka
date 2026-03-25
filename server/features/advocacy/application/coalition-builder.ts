// ============================================================================
// ADVOCACY COORDINATION — Coalition Builder Service
// ============================================================================

import { AdvocacyErrors } from '@server/features/advocacy/domain/errors/advocacy-errors';
import type { ICampaignRepository } from '@server/features/advocacy/domain/repositories/campaign-repository';
import type { Campaign } from '@server/features/advocacy/domain/types';
import { logger } from '@server/infrastructure/observability';
import { CoalitionOpportunity } from '@server/types/index';

// ============================================================================
// Scoring constants
// ============================================================================

const SCORE = {
  SAME_BILL:        0.4,
  SAME_CATEGORY:    0.2,
  TAG_PER_MATCH:    0.1,
  TAG_MAX:          0.3,
  GEO_OVERLAP:      0.1,
  OBJECTIVE_MATCH:  0.2,
  THRESHOLD_OPPORTUNITY: 0.6,
  THRESHOLD_PROPOSAL:    0.5,
} as const;

const IMPACT = {
  PARTICIPANT_DIVISOR: 10,
  PARTICIPANT_MAX:     30,
  ALIGNMENT_WEIGHT:    40,
  STRENGTH_PER_ITEM:   5,
  ACTION_PER_ITEM:     2,
  SAME_BILL_BONUS:     20,
} as const;

// ============================================================================
// Supporting interfaces
// ============================================================================

/**
 * Extends {@link Campaign} with optional fields populated by enriched views
 * (e.g. full-text search results). Keeps the base type lean while allowing
 * coalition logic to consume richer data when available.
 */
interface EnrichedCampaign extends Campaign {
  organizationName?: string;
  category?: string;
  tags?: string[];
  targetCounties?: string[];
  objectives?: string[];
}

/** Minimal action repository contract for coalition action coordination. */
export interface IActionRepository {
  findByCampaign(campaign_id: string): Promise<unknown[]>;
}

/** Contract for the domain event bus used by coalition workflows. */
export interface AdvocacyEventPublisher {
  publish(event: AdvocacyDomainEvent): Promise<void>;
}

/** Base type for all advocacy domain events. */
export interface AdvocacyDomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
}

/**
 * Extends {@link ICampaignRepository} with coalition-specific discovery.
 * Kept separate to avoid coupling the base contract to coalition-only
 * persistence concerns.
 */
export interface ICoalitionCampaignRepository extends ICampaignRepository {
  /**
   * Returns campaigns that share bill, category, or tag overlap with the
   * given campaign — candidates for coalition formation.
   */
  findPotentialCoalitions(campaign_id: string): Promise<Array<{ campaign_id: string }>>;
}

// ============================================================================
// Domain events
// ============================================================================

class CoalitionOpportunityIdentifiedEvent implements AdvocacyDomainEvent {
  readonly eventType  = 'CoalitionOpportunityIdentified';
  readonly occurredAt = new Date();

  constructor(
    public readonly sourceCampaignId: string,
    public readonly targetCampaignId: string,
    public readonly alignmentScore:   number,
    public readonly sharedConcerns:   string[],
  ) {}
}

class CoalitionFormedEvent implements AdvocacyDomainEvent {
  readonly eventType  = 'CoalitionFormed';
  readonly occurredAt = new Date();

  constructor(
    public readonly coalitionId:       string,
    public readonly campaignIds:       string[],
    public readonly sharedObjectives:  string[],
  ) {}
}

// ============================================================================
// Value types
// ============================================================================

export interface CoalitionProposal {
  id:                   string;
  initiatingCampaignId: string;
  targetCampaignIds:    string[];
  proposedObjectives:   string[];
  proposedActions:      string[];
  estimatedImpact:      number;
  status:               'proposed' | 'accepted' | 'rejected' | 'expired';
  created_at:           Date;
  expires_at:           Date;
}

export interface Coalition {
  id:                  string;
  name:                string;
  description:         string;
  campaignIds:         string[];
  sharedObjectives:    string[];
  coordinatedActions:  string[];
  status:              'active' | 'paused' | 'dissolved';
  created_at:          Date;
  updated_at:          Date;
}

interface CompatibilityResult {
  alignmentScore:          number;
  sharedConcerns:          string[];
  complementaryStrengths:  string[];
  suggestedActions:        string[];
}

export interface CoalitionRecommendation {
  id:                    string;
  targetCampaignId:      string;
  targetCampaignName:    string;
  alignmentScore:        number;
  sharedObjectives:      string[];
  sharedConcerns:        string[];
  complementaryStrengths:string[];
  suggestedActions:      string[];
  estimatedImpact:       number;
  recommendedApproach:   string;
}

// ============================================================================
// Service
// ============================================================================

export class CoalitionBuilder {
  constructor(
    private readonly campaignRepository: ICoalitionCampaignRepository,
    private readonly actionRepository:   IActionRepository,
    private readonly eventPublisher:     AdvocacyEventPublisher,
  ) {}

  // ── Public methods ──────────────────────────────────────────────────────

  async identifyCoalitionOpportunities(campaign_id: string): Promise<CoalitionOpportunity[]> {
    return this.withErrorHandling('identifyCoalitionOpportunities', { campaign_id }, async () => {
      const campaign = await this.requireCampaign(campaign_id);
      const candidates = await this.campaignRepository.findPotentialCoalitions(campaign_id);

      const opportunities: CoalitionOpportunity[] = [];

      for (const { campaign_id: partnerId } of candidates) {
        const partner = await this.campaignRepository.findById(partnerId);
        if (!partner) continue;

        const compatibility = await this.analyzeCompatibility(campaign, partner);
        if (compatibility.alignmentScore < SCORE.THRESHOLD_OPPORTUNITY) continue;

        const enriched = partner as EnrichedCampaign;

        opportunities.push({
          id:       `coalition-opp-${campaign_id}-${partnerId}`,
          bill_id:  campaign.billId ?? '',
          sharedConcerns:    compatibility.sharedConcerns,
          suggestedActions:  compatibility.suggestedActions,
          estimatedImpact:   this.calculateEstimatedImpact(campaign, partner, compatibility),
          potentialPartners: [{
            user_id:                enriched.organizerId,
            organizationName:       enriched.organizationName,
            alignmentScore:         compatibility.alignmentScore,
            complementaryStrengths: compatibility.complementaryStrengths,
          }],
        });

        await this.eventPublisher.publish(new CoalitionOpportunityIdentifiedEvent(
          campaign_id, partnerId, compatibility.alignmentScore, compatibility.sharedConcerns,
        ));
      }

      opportunities.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

      logger.info({ campaign_id, opportunityCount: opportunities.length, component: 'CoalitionBuilder' },
        'Coalition opportunities identified');

      return opportunities;
    });
  }

  async proposeCoalition(
    initiatingCampaignId: string,
    targetCampaignIds:    string[],
    proposedObjectives:   string[],
    proposerId:           string,
  ): Promise<CoalitionProposal> {
    return this.withErrorHandling('proposeCoalition', { initiatingCampaignId, targetCampaignIds }, async () => {
      const initiator = await this.requireCampaign(initiatingCampaignId);

      if (initiator.organizerId !== proposerId) {
        throw AdvocacyErrors.campaignAccessDenied(initiatingCampaignId, proposerId);
      }

      const targets = await Promise.all(targetCampaignIds.map(id => this.requireActiveCampaign(id)));

      const scores = await Promise.all(targets.map(t => this.analyzeCompatibility(initiator, t)));
      const averageCompatibility = scores.reduce((sum, s) => sum + s.alignmentScore, 0) / scores.length;

      if (averageCompatibility < SCORE.THRESHOLD_PROPOSAL) {
        throw new Error(
          `Campaigns are insufficiently compatible for coalition formation ` +
          `(score: ${averageCompatibility.toFixed(2)}). ` +
          `Initiating: ${initiatingCampaignId}, targets: ${targetCampaignIds.join(', ')}`,
        );
      }

      const proposal: CoalitionProposal = {
        id:                   `coalition-proposal-${Date.now()}`,
        initiatingCampaignId,
        targetCampaignIds,
        proposedObjectives,
        proposedActions:      await this.generateCoordinatedActions(initiator, targets),
        estimatedImpact:      Math.round(averageCompatibility * 100),
        status:               'proposed',
        created_at:           new Date(),
        expires_at:           new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
      };

      logger.info({ proposalId: proposal.id, initiatingCampaignId, targetCampaignIds, component: 'CoalitionBuilder' },
        'Coalition proposal created');

      return proposal;
    });
  }

  /**
   * Creates a {@link Coalition} from an accepted proposal.
   *
   * @param proposalId       - Proposal to materialize. Full lookup is wired
   *                           once the `coalition_proposals` table is available.
   * @param acceptingUserId  - Reserved for the authorization check on proposal
   *                           acceptance; enforced once persistence is wired.
   */
  async formCoalition(
    proposalId:          string,
    coalitionName:       string,
    coalitionDescription: string,
    acceptingUserId:     string,
  ): Promise<Coalition> {
    return this.withErrorHandling('formCoalition', { proposalId }, async () => {
      // TODO: retrieve proposal from coalition_proposals table, validate
      //       that acceptingUserId is among the target campaign organizers,
      //       and populate campaignIds / sharedObjectives from the proposal.
      void acceptingUserId;

      const coalition: Coalition = {
        id:                  `coalition-${Date.now()}`,
        name:                coalitionName,
        description:         coalitionDescription,
        campaignIds:         [],
        sharedObjectives:    [],
        coordinatedActions:  [],
        status:              'active',
        created_at:          new Date(),
        updated_at:          new Date(),
      };

      await this.eventPublisher.publish(new CoalitionFormedEvent(
        coalition.id, coalition.campaignIds, coalition.sharedObjectives,
      ));

      logger.info({ coalitionId: coalition.id, name: coalitionName, component: 'CoalitionBuilder' },
        'Coalition formed');

      return coalition;
    });
  }

  async getCampaignCoalitions(campaign_id: string): Promise<Coalition[]> {
    return this.withErrorHandling('getCampaignCoalitions', { campaign_id }, async () => {
      // TODO: query coalition_members table once persistence is wired up.
      return [];
    });
  }

  /**
   * Get coalition recommendations for a specific campaign.
   * Identifies compatible campaigns and provides actionable recommendations
   * for forming coalitions to amplify advocacy impact.
   */
  async getCoalitionRecommendations(campaign_id: string): Promise<CoalitionRecommendation[]> {
    return this.withErrorHandling('getCoalitionRecommendations', { campaign_id }, async () => {
      const campaign = await this.requireActiveCampaign(campaign_id);
      const potentialCoalitions = await this.campaignRepository.findPotentialCoalitions(campaign_id);
      
      const recommendations: CoalitionRecommendation[] = [];

      for (const potential of potentialCoalitions) {
        const targetCampaign = await this.campaignRepository.findById(potential.campaign_id);
        if (!targetCampaign || targetCampaign.status !== 'active') continue;

        const compatibility = await this.analyzeCompatibility(campaign, targetCampaign);
        
        // Only recommend campaigns with sufficient alignment
        if (compatibility.alignmentScore >= SCORE.THRESHOLD_OPPORTUNITY) {
          const estimatedImpact = this.calculateEstimatedImpact(campaign, targetCampaign, compatibility);
          
          recommendations.push({
            id: `recommendation-${campaign_id}-${targetCampaign.id}`,
            targetCampaignId: targetCampaign.id,
            targetCampaignName: targetCampaign.title,
            alignmentScore: compatibility.alignmentScore,
            sharedObjectives: (campaign as EnrichedCampaign).objectives?.filter(
              obj => (targetCampaign as EnrichedCampaign).objectives?.includes(obj)
            ) || [],
            sharedConcerns: compatibility.sharedConcerns,
            complementaryStrengths: compatibility.complementaryStrengths,
            suggestedActions: compatibility.suggestedActions,
            estimatedImpact,
            recommendedApproach: `Coalition opportunity with ${targetCampaign.title} - ${compatibility.alignmentScore >= 0.8 ? 'high' : 'moderate'} alignment`,
          });
        }
      }

      // Sort by alignment score (descending)
      recommendations.sort((a, b) => b.alignmentScore - a.alignmentScore);

      logger.info(
        { campaign_id, recommendationCount: recommendations.length, component: 'CoalitionBuilder' },
        'Coalition recommendations generated'
      );

      return recommendations;
    });
  }

  /**
   * @param actionDetails   - Action payload; used once the action schema is finalized.
   * @param coordinatorId   - Validated against coalition membership on full implementation.
   */
  async coordinateCoalitionActions(
    coalitionId:    string,
    actionType:     string,
    actionDetails:  Record<string, unknown>,
    coordinatorId:  string,
  ): Promise<string[]> {
    return this.withErrorHandling('coordinateCoalitionActions', { coalitionId, actionType }, async () => {
      // TODO: validate coalition membership via coordinatorId, persist actions
      //       derived from actionDetails, and notify member campaigns.
      void actionDetails;
      void coordinatorId;

      const actionIds: string[] = [];

      logger.info({ coalitionId, actionType, actionCount: actionIds.length, component: 'CoalitionBuilder' },
        'Coalition actions coordinated');

      return actionIds;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Resolves a campaign or throws a domain-safe not-found error. */
  private async requireCampaign(campaign_id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) throw AdvocacyErrors.campaignNotFound(campaign_id);
    return campaign;
  }

  /** Resolves a campaign and asserts it is active. */
  private async requireActiveCampaign(campaign_id: string): Promise<Campaign> {
    const campaign = await this.requireCampaign(campaign_id);
    if (campaign.status !== 'active') {
      throw AdvocacyErrors.campaignStatus(campaign.status, 'form coalition with');
    }
    return campaign;
  }

  private async analyzeCompatibility(
    campaign1: Campaign,
    campaign2: Campaign,
  ): Promise<CompatibilityResult> {
    const c1 = campaign1 as EnrichedCampaign;
    const c2 = campaign2 as EnrichedCampaign;

    let alignmentScore = 0;
    const sharedConcerns:         string[] = [];
    const complementaryStrengths: string[] = [];
    const suggestedActions:       string[] = [];

    // ── Same bill ────────────────────────────────────────────────────────
    if (c1.billId && c1.billId === c2.billId) {
      alignmentScore += SCORE.SAME_BILL;
      sharedConcerns.push('Same legislation');
      suggestedActions.push('Coordinate messaging', 'Joint committee testimony');
    }

    // ── Same category ────────────────────────────────────────────────────
    if (c1.category && c1.category === c2.category) {
      alignmentScore += SCORE.SAME_CATEGORY;
      sharedConcerns.push(`Both focus on ${c1.category}`);
    }

    // ── Shared tags ──────────────────────────────────────────────────────
    const sharedTags = this.intersection(c1.tags ?? [], c2.tags ?? []);
    if (sharedTags.length > 0) {
      alignmentScore += Math.min(sharedTags.length * SCORE.TAG_PER_MATCH, SCORE.TAG_MAX);
      sharedConcerns.push(...sharedTags);
    }

    // ── Geographic overlap ───────────────────────────────────────────────
    const sharedCounties = this.intersection(c1.targetCounties ?? [], c2.targetCounties ?? []);
    if (sharedCounties.length > 0) {
      alignmentScore += SCORE.GEO_OVERLAP;
      complementaryStrengths.push('Geographic overlap for local coordination');
      suggestedActions.push('Joint local events', 'Coordinated county outreach');
    }

    // ── Shared objectives ────────────────────────────────────────────────
    const objectiveOverlap = this.findObjectiveOverlap(c1.objectives ?? [], c2.objectives ?? []);
    if (objectiveOverlap.length > 0) {
      alignmentScore += SCORE.OBJECTIVE_MATCH;
      sharedConcerns.push(...objectiveOverlap);
      suggestedActions.push('Unified position statement', 'Joint advocacy strategy');
    }

    // ── Cross-org diversity ──────────────────────────────────────────────
    if (c1.organizationName && c2.organizationName && c1.organizationName !== c2.organizationName) {
      complementaryStrengths.push('Different organizational perspectives');
      suggestedActions.push('Cross-sector advocacy', 'Diverse stakeholder representation');
    }

    // ── Scale diversity ──────────────────────────────────────────────────
    if (Math.abs(c1.participantCount - c2.participantCount) > 50) {
      complementaryStrengths.push('Different scale campaigns for broader reach');
    }

    return {
      alignmentScore: Math.min(alignmentScore, 1.0),
      sharedConcerns,
      complementaryStrengths,
      suggestedActions,
    };
  }

  private calculateEstimatedImpact(
    campaign1:     Campaign,
    campaign2:     Campaign,
    compatibility: CompatibilityResult,
  ): number {
    const { participantCount: p1, billId: b1 } = campaign1 as EnrichedCampaign;
    const { participantCount: p2, billId: b2 } = campaign2 as EnrichedCampaign;

    const impact =
      Math.min((p1 + p2) / IMPACT.PARTICIPANT_DIVISOR, IMPACT.PARTICIPANT_MAX) +
      compatibility.alignmentScore              * IMPACT.ALIGNMENT_WEIGHT +
      compatibility.complementaryStrengths.length * IMPACT.STRENGTH_PER_ITEM +
      compatibility.suggestedActions.length     * IMPACT.ACTION_PER_ITEM +
      (b1 && b1 === b2 ? IMPACT.SAME_BILL_BONUS : 0);

    return Math.round(Math.min(impact, 100));
  }

  /**
   * Keyword-based objective overlap detection.
   * Replace with an NLP similarity call once that service is available.
   */
  private findObjectiveOverlap(objectives1: string[], objectives2: string[]): string[] {
    const overlap = new Set<string>();
    const tokenize = (s: string) => s.toLowerCase().split(' ').filter(w => w.length > 3);

    for (const obj1 of objectives1) {
      const words1 = new Set(tokenize(obj1));
      for (const obj2 of objectives2) {
        const common = tokenize(obj2).filter(w => words1.has(w));
        if (common.length >= 2) {
          overlap.add(`Shared focus on ${common.join(', ')}`);
        }
      }
    }

    return [...overlap];
  }

  private async generateCoordinatedActions(
    initiator: Campaign,
    targets:   Campaign[],
  ): Promise<string[]> {
    const ic = initiator as EnrichedCampaign;
    const tc = targets   as EnrichedCampaign[];

    const actions: string[] = [
      'Develop unified messaging framework',
      'Coordinate social media campaigns',
      'Plan joint advocacy events',
    ];

    if (tc.some(c => c.billId && c.billId === ic.billId)) {
      actions.push(
        'Prepare joint committee testimony',
        'Coordinate legislative meetings',
        'Develop shared position paper',
      );
    }

    const allCounties = new Set([
      ...(ic.targetCounties ?? []),
      ...tc.flatMap(c => c.targetCounties ?? []),
    ]);

    if (allCounties.size > 1) {
      actions.push('Coordinate multi-county outreach', 'Plan regional advocacy tour');
    }

    return actions;
  }

  /** Returns items present in both arrays (order-preserving, deduped). */
  private intersection<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return [...new Set(a.filter(v => setB.has(v)))];
  }

  /**
   * Wraps an async operation in uniform error handling.
   * Logs at `error` level and re-throws so callers receive the original error.
   */
  private async withErrorHandling<T>(
    operation: string,
    context:   Record<string, unknown>,
    fn:        () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        component: 'CoalitionBuilder',
        ...context,
      }, `Failed to ${operation}`);
      throw error;
    }
  }
}