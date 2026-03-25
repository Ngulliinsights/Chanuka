/**
 * POWER BALANCER SERVICE — FINAL DRAFT
 *
 * Ensures minority voices remain visible and prevents coordinated campaigns
 * from drowning out legitimate concerns.
 *
 * CHANGES FROM REFINED DRAFT:
 * - Replace this.logContext pattern with LOG_COMPONENT string constant
 * - Fix calculateRepresentativenessScore operator precedence bug:
 *     `size || 0 > 5`  →  parsed as `(size) || (0 > 5)` — 0>5 is always
 *     false and optional-chain returns undefined when absent, so the
 *     geographic bonus could never fire. Fixed to `(size ?? 0) > 5`.
 * - Fix voiceEquityScore range: max was (50+50)/2 = 50, not 100 as
 *   documented. Removed the erroneous /2 and re-balanced component weights.
 * - Remove shouldAmplifyVoice: private helper never called anywhere, logic
 *   duplicates identifyMinorityVoices. Protected-group amplification check
 *   folded into identifyMinorityVoices instead.
 * - Remove sessionCounts in detectCoordinatedCampaigns: Map was populated
 *   but never read. Added session-based detection to justify its existence,
 *   or removed cleanly if not warranted — here it's wired up.
 * - Remove _coordinatedCampaigns parameter from applyBalancingAdjustments:
 *   campaigns are accessed through balancingActions; the direct parameter
 *   was dead weight.
 * - Extract ageGroup key in calculateEquityMetrics: was computed twice per
 *   argument via repeated optional-chain expression.
 * - Replace marginalizationRisk string-with-parens-parsing: was storing
 *   formatted strings then calling split('(') to recover the group name.
 *   Now stored as structured MarginalizedGroup objects; callers get both
 *   the raw group name and participant count without string surgery.
 * - Replace campaign ID Date.now() → crypto.randomUUID()
 * - Fix amplificationFactor impact scale: * 20 with max factor 3.0 gives
 *   ceiling of 60, not 100 as commented. Changed multiplier to 33 to reach
 *   ~99 at max amplification.
 */

import { logger } from '@server/infrastructure/observability';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PowerBalancingResult {
  balancedPositions: BalancedStakeholderPosition[];
  coordinatedCampaigns: DetectedCampaign[];
  amplifiedMinorityVoices: MinorityVoice[];
  balancingActions: BalancingAction[];
  equityMetrics: EquityMetrics;
}

export interface BalancedStakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
  originalWeight: number;
  adjustedWeight: number;
  balancingReason: string;
  representativenessScore: number;
}

export interface DetectedCampaign {
  id: string;
  campaignType: 'astroturfing' | 'coordinated_messaging' | 'bot_activity' | 'organized_lobbying';
  affectedStakeholders: string[];
  suspiciousPatterns: SuspiciousPattern[];
  confidence: number;
  recommendedAction: 'flag' | 'downweight' | 'investigate' | 'exclude';
  detectedAt: Date;
}

export interface SuspiciousPattern {
  pattern: string;
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface MinorityVoice {
  stakeholderGroup: string;
  originalParticipation: number;
  amplificationFactor: number;
  amplificationReason: string;
  keyUniqueConcerns: string[];
  representedDemographics: string[];
}

export interface BalancingAction {
  action:
    | 'amplify_minority'
    | 'downweight_majority'
    | 'flag_coordination'
    | 'highlight_unique_perspective';
  stakeholderGroup: string;
  justification: string;
  impact: number;
}

/** Structured marginalization risk entry — replaces the previous "Group (N)" string format. */
export interface MarginalizedGroup {
  group: string;
  participantCount: number;
}

export interface EquityMetrics {
  demographicRepresentation: Map<string, number>;
  geographicDistribution: Map<string, number>;
  organizationalBalance: {
    individual_citizens: number;
    civil_society: number;
    private_sector: number;
    government_affiliated: number;
  };
  /** 0–100; 100 = perfect equity. */
  voiceEquityScore: number;
  marginalizationRisk: MarginalizedGroup[];
}

export interface StakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
  demographics?: {
    geographicDistribution: Map<string, number>;
    occupationalBreakdown: Map<string, number>;
    organizationalAffiliations: string[];
  };
}

export interface ArgumentData {
  id: string;
  text: string;
  user_id: string;
  submissionTime: Date;
  userDemographics?: {
    county?: string;
    ageGroup?: string;
    occupation?: string;
    organizationAffiliation?: string;
  };
  submissionContext?: {
    submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api';
    session_id?: string;
    ipAddress?: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_COMPONENT = 'PowerBalancer';

/** IP submission count above which bot activity is suspected. */
const IP_SUBMISSION_THRESHOLD = 10;

/** Session submission count above which coordinated messaging is suspected. */
const SESSION_SUBMISSION_THRESHOLD = 5;

/**
 * Participation ratio below which a stakeholder group qualifies as a
 * minority voice and receives amplification consideration.
 */
const MINORITY_AMPLIFICATION_THRESHOLD = 0.1;

/** Hard ceiling on the amplification factor applied to any single group. */
const MAX_AMPLIFICATION_FACTOR = 3.0;

/** Fixed amplification factor applied to explicitly protected groups. */
const PROTECTED_GROUP_AMPLIFICATION = 1.5;

/**
 * Stakeholder group name substrings that qualify a group as protected /
 * structurally marginalised.
 */
const PROTECTED_GROUP_KEYWORDS = [
  'disabled', 'elderly', 'youth', 'women', 'minority', 'indigenous',
  'refugee', 'informal', 'rural',
] as const;

// ============================================================================
// POWER BALANCER SERVICE
// ============================================================================

export class PowerBalancerService {
  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Balance stakeholder voices to ensure equitable representation.
   */
  async balanceStakeholderVoices(
    stakeholderPositions: StakeholderPosition[],
    argumentData: ArgumentData[],
  ): Promise<PowerBalancingResult> {
    const opContext = { component: LOG_COMPONENT, operation: 'balanceStakeholderVoices' };

    try {
      logger.info(
        { ...opContext, stakeholderCount: stakeholderPositions.length, argumentCount: argumentData.length },
        '⚖️ Balancing stakeholder voices',
      );

      const coordinatedCampaigns = await this.detectCoordinatedCampaigns(argumentData);
      const minorityVoices = this.identifyMinorityVoices(stakeholderPositions);
      const equityMetrics = this.calculateEquityMetrics(stakeholderPositions, argumentData);

      const balancingActions = this.generateBalancingActions(
        coordinatedCampaigns,
        minorityVoices,
        equityMetrics,
      );

      const balancedPositions = this.applyBalancingAdjustments(
        stakeholderPositions,
        balancingActions,
      );

      const result: PowerBalancingResult = {
        balancedPositions,
        coordinatedCampaigns,
        amplifiedMinorityVoices: minorityVoices,
        balancingActions,
        equityMetrics,
      };

      logger.info(
        {
          ...opContext,
          balancedGroupsCount: balancedPositions.length,
          campaignsDetected: coordinatedCampaigns.length,
          minorityVoicesAmplified: minorityVoices.length,
        },
        '✅ Voice balancing completed',
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ component: LOG_COMPONENT, operation: 'balanceStakeholderVoices', error: errorMessage }, 'Voice balancing failed');
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Campaign detection
  // --------------------------------------------------------------------------

  /**
   * Detect coordinated campaigns that artificially amplify certain positions.
   *
   * Currently flags:
   * - High submission volume from a single IP address → bot_activity
   * - High submission volume from a single session → coordinated_messaging
   */
  private async detectCoordinatedCampaigns(
    argumentData: ArgumentData[],
  ): Promise<DetectedCampaign[]> {
    const campaigns: DetectedCampaign[] = [];
    const ipCounts = new Map<string, number>();
    const sessionCounts = new Map<string, number>();

    for (const arg of argumentData) {
      const ip = arg.submissionContext?.ipAddress ?? 'unknown';
      const session = arg.submissionContext?.session_id ?? 'unknown';
      ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1);
      sessionCounts.set(session, (sessionCounts.get(session) ?? 0) + 1);
    }

    for (const [ip, count] of ipCounts) {
      if (count <= IP_SUBMISSION_THRESHOLD) continue;

      campaigns.push({
        id: crypto.randomUUID(),
        campaignType: 'bot_activity',
        affectedStakeholders: [],
        suspiciousPatterns: [
          {
            pattern: 'high_submission_frequency_single_ip',
            description: `${count} arguments submitted from a single IP address`,
            evidence: [ip],
            severity: count > 50 ? 'high' : 'medium',
          },
        ],
        confidence: Math.min(count / 100, 1),
        recommendedAction: count > 50 ? 'exclude' : 'downweight',
        detectedAt: new Date(),
      });
    }

    for (const [sessionId, count] of sessionCounts) {
      if (sessionId === 'unknown' || count <= SESSION_SUBMISSION_THRESHOLD) continue;

      campaigns.push({
        id: crypto.randomUUID(),
        campaignType: 'coordinated_messaging',
        affectedStakeholders: [],
        suspiciousPatterns: [
          {
            pattern: 'high_submission_frequency_single_session',
            description: `${count} arguments submitted within a single session`,
            evidence: [sessionId],
            severity: count > 20 ? 'high' : 'medium',
          },
        ],
        confidence: Math.min(count / 50, 1),
        recommendedAction: count > 20 ? 'investigate' : 'flag',
        detectedAt: new Date(),
      });
    }

    return campaigns;
  }

  // --------------------------------------------------------------------------
  // Minority voice identification
  // --------------------------------------------------------------------------

  /**
   * Identify stakeholder groups below the participation threshold and those
   * that qualify as structurally protected groups.
   *
   * Amplification factors are capped at MAX_AMPLIFICATION_FACTOR.
   */
  private identifyMinorityVoices(
    stakeholderPositions: StakeholderPosition[],
  ): MinorityVoice[] {
    const totalParticipants = stakeholderPositions.reduce(
      (sum, pos) => sum + pos.participantCount,
      0,
    );

    if (totalParticipants === 0) {
      logger.warn(
        { component: LOG_COMPONENT, operation: 'identifyMinorityVoices' },
        'No participation data available for minority voice identification',
      );
      return [];
    }

    const minorityVoices: MinorityVoice[] = [];

    for (const position of stakeholderPositions) {
      const participationRatio = position.participantCount / totalParticipants;
      const groupLower = position.stakeholderGroup.toLowerCase();

      const isProtectedGroup = PROTECTED_GROUP_KEYWORDS.some((kw) =>
        groupLower.includes(kw),
      );

      const belowThreshold = participationRatio < MINORITY_AMPLIFICATION_THRESHOLD;

      if (!belowThreshold && !isProtectedGroup) continue;

      let amplificationFactor: number;
      let amplificationReason: string;

      if (belowThreshold) {
        amplificationFactor = Math.min(
          MAX_AMPLIFICATION_FACTOR,
          MINORITY_AMPLIFICATION_THRESHOLD / participationRatio,
        );
        amplificationReason = `Below threshold participation (${Math.round(participationRatio * 100)}%)`;
      } else {
        // Protected group above the threshold — apply a fixed modest boost.
        amplificationFactor = PROTECTED_GROUP_AMPLIFICATION;
        amplificationReason = 'Protected / structurally marginalised group';
      }

      minorityVoices.push({
        stakeholderGroup: position.stakeholderGroup,
        originalParticipation: position.participantCount,
        amplificationFactor,
        amplificationReason,
        keyUniqueConcerns: position.keyArguments.slice(0, 3),
        representedDemographics: position.demographics
          ? [
              ...new Set([
                ...position.demographics.occupationalBreakdown.keys(),
                ...position.demographics.geographicDistribution.keys(),
              ]),
            ]
          : [],
      });
    }

    return minorityVoices;
  }

  // --------------------------------------------------------------------------
  // Equity metrics
  // --------------------------------------------------------------------------

  /**
   * Calculate equity metrics across demographic and geographic dimensions.
   *
   * voiceEquityScore is in [0, 100]:
   *   - Geographic diversity  (0–50): 5 points per distinct county, capped at 50
   *   - Organisational balance (0–50): full 50 when individual/civil-society
   *     counts are within 20 of each other; 20 otherwise
   */
  private calculateEquityMetrics(
    _stakeholderPositions: StakeholderPosition[],
    argumentData: ArgumentData[],
  ): EquityMetrics {
    const demographicCounts = new Map<string, number>();
    const geographicCounts = new Map<string, number>();
    const organizationalCounts = {
      individual_citizens: 0,
      civil_society: 0,
      private_sector: 0,
      government_affiliated: 0,
    };

    for (const arg of argumentData) {
      // Extract once to avoid repeated optional-chain evaluation.
      const ageGroup = arg.userDemographics?.ageGroup ?? 'unknown';
      const county = arg.userDemographics?.county ?? 'unknown';
      const affiliation = (arg.userDemographics?.organizationAffiliation ?? '').toLowerCase();

      demographicCounts.set(ageGroup, (demographicCounts.get(ageGroup) ?? 0) + 1);
      geographicCounts.set(county, (geographicCounts.get(county) ?? 0) + 1);

      if (affiliation.includes('government')) {
        organizationalCounts.government_affiliated++;
      } else if (affiliation.includes('ngo') || affiliation.includes('civil')) {
        organizationalCounts.civil_society++;
      } else if (affiliation.includes('business') || affiliation.includes('corp')) {
        organizationalCounts.private_sector++;
      } else {
        organizationalCounts.individual_citizens++;
      }
    }

    // Geographic diversity: 5 pts per distinct county, cap at 50.
    const geographicScore = Math.min(geographicCounts.size * 5, 50);

    // Organisational balance: reward near-parity between citizens and civil society.
    const orgBalanceScore =
      Math.abs(
        organizationalCounts.individual_citizens - organizationalCounts.civil_society,
      ) < 20
        ? 50
        : 20;

    // FIX: voiceEquityScore range is 0–100; do not halve the sum.
    const voiceEquityScore = Math.round(geographicScore + orgBalanceScore);

    // FIX: Store as structured objects so callers don't need to parse strings.
    const marginalizationRisk: MarginalizedGroup[] = [];
    for (const [group, count] of demographicCounts) {
      if (count < argumentData.length * 0.05) {
        marginalizationRisk.push({ group, participantCount: count });
      }
    }

    return {
      demographicRepresentation: demographicCounts,
      geographicDistribution: geographicCounts,
      organizationalBalance: organizationalCounts,
      voiceEquityScore,
      marginalizationRisk,
    };
  }

  // --------------------------------------------------------------------------
  // Balancing actions
  // --------------------------------------------------------------------------

  /**
   * Generate balancing actions derived from campaign detection, minority voice
   * identification, and equity metrics.
   */
  private generateBalancingActions(
    coordinatedCampaigns: DetectedCampaign[],
    minorityVoices: MinorityVoice[],
    equityMetrics: EquityMetrics,
  ): BalancingAction[] {
    const actions: BalancingAction[] = [];

    for (const minority of minorityVoices) {
      // FIX: Scale to 0–100 — maxAmplificationFactor (3.0) * 33 ≈ 99.
      actions.push({
        action: 'amplify_minority',
        stakeholderGroup: minority.stakeholderGroup,
        justification: minority.amplificationReason,
        impact: Math.min(Math.round(minority.amplificationFactor * 33), 100),
      });
    }

    for (const campaign of coordinatedCampaigns) {
      actions.push({
        action: 'flag_coordination',
        stakeholderGroup: campaign.affectedStakeholders.join(', '),
        justification: `Detected: ${campaign.campaignType}`,
        impact: Math.round(campaign.confidence * 50),
      });
    }

    // FIX: Use structured MarginalizedGroup — no string parsing needed.
    for (const risk of equityMetrics.marginalizationRisk) {
      actions.push({
        action: 'highlight_unique_perspective',
        stakeholderGroup: risk.group,
        justification: `Marginalization risk: ${risk.group} (${risk.participantCount} participants)`,
        impact: 30,
      });
    }

    return actions;
  }

  // --------------------------------------------------------------------------
  // Balancing application
  // --------------------------------------------------------------------------

  /**
   * Apply balancing adjustments to produce weighted stakeholder positions.
   *
   * Amplification and campaign-downweight actions are applied multiplicatively;
   * a group subject to both is amplified first, then downweighted.
   */
  private applyBalancingAdjustments(
    stakeholderPositions: StakeholderPosition[],
    balancingActions: BalancingAction[],
  ): BalancedStakeholderPosition[] {
    return stakeholderPositions.map((position) => {
      let adjustedWeight = 1.0;
      const reasons: string[] = [];

      const amplificationAction = balancingActions.find(
        (a) =>
          a.action === 'amplify_minority' && a.stakeholderGroup === position.stakeholderGroup,
      );

      if (amplificationAction) {
        adjustedWeight *= 1 + amplificationAction.impact / 100;
        reasons.push(`Minority amplification: ${amplificationAction.justification}`);
      }

      const campaignAction = balancingActions.find(
        (a) =>
          a.action === 'flag_coordination' &&
          a.stakeholderGroup.includes(position.stakeholderGroup),
      );

      if (campaignAction) {
        adjustedWeight *= 0.5;
        reasons.push(`Campaign downweight: ${campaignAction.justification}`);
      }

      return {
        ...position,
        originalWeight: 1.0,
        adjustedWeight,
        balancingReason: reasons.length > 0 ? reasons.join(' | ') : 'Standard weighting',
        representativenessScore: this.calculateRepresentativenessScore(position),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Scoring
  // --------------------------------------------------------------------------

  /**
   * Calculate a representativeness score (0–100) for a stakeholder position.
   *
   * FIX: Previous operator precedence bug:
   *   `size || 0 > 5`  →  `(size) || (0 > 5)` — `0 > 5` is always false,
   *   so the geographic bonus could never fire.
   *   Corrected to `(size ?? 0) > 5`.
   */
  private calculateRepresentativenessScore(position: StakeholderPosition): number {
    let score = 50;

    if (position.evidenceProvided.length > 3) score += 20;
    if (position.keyArguments.length > 5) score += 15;
    if ((position.demographics?.geographicDistribution.size ?? 0) > 5) score += 15;

    return Math.min(score, 100);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const powerBalancerService = new PowerBalancerService();