import { database as db } from '@shared/database/connection';
import {
  bills, sponsors, sponsorAffiliations, billSponsorships, sponsorTransparency,
  type Sponsor, type SponsorAffiliation, type SponsorTransparency, type Bill
} from '../../../shared/schema';
import { eq, and, sql, desc, gte, lte, count, inArray, like, or } from 'drizzle-orm';
import { cacheService } from '@server/infrastructure/cache';
import { CacheKeyGenerator } from '@shared/core/src/caching';
import { logger } from '../../../shared/core/index.js';

// ============================================================================
// TYPE DEFINITIONS AND INTERFACES
// ============================================================================

/**
 * Represents a comprehensive conflict of interest analysis for a sponsor.
 * This is the primary output of the conflict detection service.
 */
export interface ConflictAnalysis {
  sponsorId: number;
  sponsorName: string;
  billId?: number;
  billTitle?: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  financialConflicts: FinancialConflict[];
  professionalConflicts: ProfessionalConflict[];
  votingAnomalies: VotingAnomaly[];
  transparencyScore: number;
  transparencyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
  lastAnalyzed: Date;
  confidence: number;
}

/**
 * Represents a financial conflict arising from investments, employment,
 * or family interests.
 */
export interface FinancialConflict {
  id: string;
  type: 'direct_investment' | 'indirect_investment' | 'employment' | 'consulting' | 'board_position' | 'family_interest';
  organization: string;
  description: string;
  financialValue: number;
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedBills: number[];
  billSections: string[];
  evidenceStrength: number;
  detectionMethod: 'disclosure_analysis' | 'pattern_matching' | 'cross_reference' | 'manual_review';
  lastUpdated: Date;
}

/**
 * Represents a professional conflict from roles or affiliations that could
 * influence decision-making.
 */
export interface ProfessionalConflict {
  id: string;
  type: 'leadership_role' | 'advisory_position' | 'ownership_stake' | 'family_business';
  organization: string;
  role: string;
  description: string;
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedBills: number[];
  relationshipStrength: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  evidenceStrength: number;
  detectionMethod: 'affiliation_analysis' | 'pattern_matching' | 'disclosure_analysis';
  lastUpdated: Date;
}

/**
 * Represents a voting behavior anomaly that could indicate a conflict of interest.
 */
export interface VotingAnomaly {
  id: string;
  type: 'party_deviation' | 'pattern_inconsistency' | 'financial_correlation' | 'timing_suspicious';
  billId: number;
  billTitle: string;
  expectedBehavior: string;
  actualBehavior: string;
  description: string;
  contextFactors: string[];
  anomalyScore: number;
  detectionDate: Date;
}

/**
 * Configuration for conflict detection thresholds and weights.
 */
export interface ConflictDetectionConfig {
  financialThresholds: {
    direct: number;
    indirect: number;
    family: number;
  };
  professionalWeights: {
    leadership: number;
    advisory: number;
    ownership: number;
  };
  votingAnomalyThresholds: {
    partyDeviation: number;
    patternInconsistency: number;
  };
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

// Internal types for data validation and processing
interface ValidatedVote {
  vote: 'yes' | 'no';
  billId: number;
  billTitle: string;
  billCategory: string;
  confidence?: number;
  partyPosition?: string;
}

interface CategoryStats {
  yes: number;
  no: number;
  votes: ValidatedVote[];
}

// Type guard for vote validation - ensures runtime type safety
function isValidVote(vote: any): vote is ValidatedVote {
  return vote &&
    typeof vote === 'object' &&
    typeof vote.vote === 'string' &&
    (vote.vote === 'yes' || vote.vote === 'no') &&
    typeof vote.billId === 'number' &&
    typeof vote.billTitle === 'string';
}

/**
 * Custom error class for providing structured error information.
 */
export class ConflictDetectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly sponsorId?: number,
    public readonly billId?: number
  ) {
    super(message);
    this.name = 'ConflictDetectionError';
  }
}

// ============================================================================
// ENHANCED CONFLICT DETECTION SERVICE
// ============================================================================

/**
 * Implements comprehensive conflict of interest analysis using multiple
 * detection algorithms across financial, professional, and voting dimensions.
 *
 * Key Optimizations:
 * - Efficient database queries with proper batching and caching
 * - Parallel processing for independent analysis tasks
 * - Memoization of expensive calculations
 * - Lazy loading of optional data
 * - Smart cache invalidation patterns
 */
export class EnhancedConflictDetectionService {
  private readonly config: ConflictDetectionConfig;

  // Memoization cache for frequently computed values within a single analysis
  private readonly memoCache = new Map<string, any>();

  constructor() {
    this.config = this.loadAndValidateConfiguration();
    logger.info('Conflict Detection Service initialized with valid configuration.');
  }

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

  /**
   * Performs a comprehensive conflict of interest analysis for a sponsor.
   * This is the main entry point, coordinating all detection algorithms,
   * caching, scoring, and result aggregation.
   */
  async performComprehensiveAnalysis(
    sponsorId: number,
    billId?: number
  ): Promise<ConflictAnalysis> {
    const cacheKey = `comprehensive_analysis:${sponsorId}:${billId || 'all'}`;

    // Clear memoization cache at the start of each new analysis
    this.memoCache.clear();

    try {
      logger.info(`📊 Performing comprehensive analysis for sponsor ${sponsorId}${billId ? ` and bill ${billId}` : ''}`);

      const cached = await cacheService.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
      const computed = await this.executeComprehensiveAnalysis(sponsorId, billId);
      try {
        await cacheService.set(cacheKey, computed, 3600);
      } catch (e) {
        /* log but continue */
      }
      return computed;

    } catch (error) {
      logger.error(`Comprehensive analysis failed for sponsor ${sponsorId}`, {
        error,
        billId,
        timestamp: new Date().toISOString()
      });
      return this.generateFallbackAnalysis(sponsorId, billId, error);
    }
  }

  /**
   * Invalidates all cached data for a specific sponsor.
   * Optimized to use Promise.allSettled for resilient cache clearing.
   */
  async invalidateSponsorCache(sponsorId: number): Promise<void> {
    try {
      const patterns = [
        `comprehensive_analysis:${sponsorId}:*`,
        `voting_anomalies:${sponsorId}`,
        `professional_conflicts:${sponsorId}:*`,
        `financial_conflicts:${sponsorId}:*`
      ];

      // Use allSettled to ensure all patterns attempt invalidation
      const results = await Promise.allSettled(
        patterns.map(pattern => cacheService.invalidatePattern(pattern))
      );

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.warn(`Some cache invalidations failed for sponsor ${sponsorId}`, { failures });
      }

      logger.info(`Cache invalidated for sponsor ${sponsorId}`);
    } catch (error) {
      logger.error(`Failed to invalidate cache for sponsor ${sponsorId}`, { error });
    }
  }

  // ==========================================================================
  // CORE ANALYSIS EXECUTION
  // ==========================================================================

  /**
   * Orchestrates the fetching of data and execution of all analysis algorithms.
   * Optimized with efficient parallel data fetching and selective bill loading.
   */
  private async executeComprehensiveAnalysis(
    sponsorId: number,
    billId?: number
  ): Promise<ConflictAnalysis> {
    // Fetch all necessary data in parallel for maximum efficiency
    const [sponsor, affiliations, disclosures, votingHistory] = await Promise.all([
      this.getSponsor(sponsorId),
      this.getSponsorAffiliations(sponsorId),
      this.getSponsorDisclosures(sponsorId),
      this.getVotingHistory(sponsorId),
    ]);

    if (!sponsor) {
      throw new ConflictDetectionError(
        `Sponsor with ID ${sponsorId} not found`,
        'SPONSOR_NOT_FOUND',
        sponsorId
      );
    }

    // Calculate transparency score early as it's needed for overall risk calculation
    const transparencyScore = this.calculateTransparencyScore(disclosures);
    const transparencyGrade = this.calculateTransparencyGrade(transparencyScore);

    // Execute all analysis types in parallel for speed
    const [financialConflicts, professionalConflicts, votingAnomalies] = await Promise.all([
      this.analyzeFinancialConflicts(sponsor, disclosures, affiliations, billId),
      this.analyzeProfessionalConflicts(sponsor, affiliations, billId),
      this.analyzeVotingPatternInconsistencies(sponsor, votingHistory),
    ]);

    // Calculate final metrics
    const overallRiskScore = this.calculateOverallRiskScore(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore
    );
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    const confidence = this.calculateAnalysisConfidence(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore
    );

    const recommendations = this.generateConflictRecommendations(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore,
      riskLevel
    );

    // Only fetch bill details if we need them (lazy loading optimization)
    const billTitle = billId ? (await this.getBill(billId))?.title : undefined;

    return {
      sponsorId,
      sponsorName: sponsor.name,
      billId,
      billTitle,
      overallRiskScore,
      riskLevel,
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore,
      transparencyGrade,
      recommendations,
      lastAnalyzed: new Date(),
      confidence,
    };
  }

  // ==========================================================================
  // FINANCIAL CONFLICT ANALYSIS
  // ==========================================================================

  private async analyzeFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    affiliations: SponsorAffiliation[],
    billId?: number
  ): Promise<FinancialConflict[]> {
    // Execute all financial analysis types in parallel
    const [directConflicts, indirectConflicts, familyConflicts] = await Promise.all([
      this.analyzeDirectFinancialConflicts(sponsor, disclosures, billId),
      this.analyzeIndirectFinancialConflicts(sponsor, affiliations, billId),
      this.analyzeFamilyFinancialConflicts(sponsor, disclosures, billId),
    ]);

    return [...directConflicts, ...indirectConflicts, ...familyConflicts];
  }

  private async analyzeDirectFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    billId?: number
  ): Promise<FinancialConflict[]> {
    const conflicts: FinancialConflict[] = [];

    // Filter and process only relevant disclosures
    const financialDisclosures = disclosures.filter(
      d => d.disclosureType === 'financial' &&
        Number(d.amount) >= this.config.financialThresholds.direct
    );

    // Batch process affected bills lookup to reduce database calls
    const organizationNames = financialDisclosures.map(d => d.source || '').filter(Boolean);
    const affectedBillsMap = await this.batchFindAffectedBills(organizationNames, billId);

    for (const disclosure of financialDisclosures) {
      const amount = Number(disclosure.amount);
      const organization = disclosure.source || 'Unknown Organization';
      const affectedBills = affectedBillsMap.get(organization) || [];

      conflicts.push({
        id: `financial_${sponsor.id}_${disclosure.id}`,
        type: 'direct_investment',
        organization,
        description: `Direct financial interest of KSh ${amount.toLocaleString()} in ${organization}`,
        financialValue: amount,
        conflictSeverity: this.calculateFinancialSeverity(amount),
        affectedBills,
        billSections: [],
        evidenceStrength: disclosure.isVerified ? 90 : 60,
        detectionMethod: 'disclosure_analysis',
        lastUpdated: new Date()
      });
    }

    return conflicts;
  }

  private async analyzeIndirectFinancialConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    billId?: number
  ): Promise<FinancialConflict[]> {
    const conflicts: FinancialConflict[] = [];

    // Filter relevant affiliations upfront
    const economicAffiliations = affiliations.filter(
      a => a.conflictType === 'economic' && a.isActive
    );

    // Batch lookup affected bills
    const organizations = economicAffiliations.map(a => a.organization);
    const affectedBillsMap = await this.batchFindAffectedBills(organizations, billId);

    for (const affiliation of economicAffiliations) {
      const estimatedValue = this.estimateAffiliationValue(affiliation);

      if (estimatedValue >= this.config.financialThresholds.indirect) {
        const affectedBills = affectedBillsMap.get(affiliation.organization) || [];

        conflicts.push({
          id: `indirect_${sponsor.id}_${affiliation.id}`,
          type: 'indirect_investment',
          organization: affiliation.organization,
          description: `Indirect financial interest via ${affiliation.role || 'affiliation'} with ${affiliation.organization}`,
          financialValue: estimatedValue,
          conflictSeverity: this.calculateFinancialSeverity(estimatedValue),
          affectedBills,
          billSections: [],
          evidenceStrength: 70,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  private async analyzeFamilyFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    billId?: number
  ): Promise<FinancialConflict[]> {
    const conflicts: FinancialConflict[] = [];

    // Efficiently filter family-related disclosures
    const familyDisclosures = disclosures.filter(d =>
      d.disclosureType === 'family' ||
      (d.description && d.description.toLowerCase().includes('family'))
    );

    // Batch lookup affected bills
    const organizations = familyDisclosures.map(d => d.source || '').filter(Boolean);
    const affectedBillsMap = await this.batchFindAffectedBills(organizations, billId);

    for (const disclosure of familyDisclosures) {
      const amount = Number(disclosure.amount);

      if (amount && amount >= this.config.financialThresholds.family) {
        const organization = disclosure.source || 'Family Interest';
        const affectedBills = affectedBillsMap.get(organization) || [];

        conflicts.push({
          id: `family_${sponsor.id}_${disclosure.id}`,
          type: 'family_interest',
          organization,
          description: `Family financial interest: ${disclosure.description}. Amount: KSh ${amount.toLocaleString()}`,
          financialValue: amount,
          conflictSeverity: this.calculateFinancialSeverity(amount),
          affectedBills,
          billSections: [],
          evidenceStrength: disclosure.isVerified ? 85 : 55,
          detectionMethod: 'disclosure_analysis',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // PROFESSIONAL CONFLICT ANALYSIS
  // ==========================================================================

  private async analyzeProfessionalConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    billId?: number
  ): Promise<ProfessionalConflict[]> {
    // Pre-filter active affiliations to reduce processing
    const activeAffiliations = affiliations.filter(a => a.isActive);

    // Batch lookup affected bills for all affiliations at once
    const organizations = activeAffiliations.map(a => a.organization);
    const affectedBillsMap = await this.batchFindAffectedBills(organizations, billId);

    // Execute all professional analysis types in parallel
    const [leadership, advisory, ownership] = await Promise.all([
      this.analyzeLeadershipConflicts(sponsor, activeAffiliations, affectedBillsMap),
      this.analyzeAdvisoryConflicts(sponsor, activeAffiliations, affectedBillsMap),
      this.analyzeOwnershipConflicts(sponsor, activeAffiliations, affectedBillsMap)
    ]);

    return [...leadership, ...advisory, ...ownership];
  }

  private async analyzeLeadershipConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    affectedBillsMap: Map<string, number[]>
  ): Promise<ProfessionalConflict[]> {
    const conflicts: ProfessionalConflict[] = [];
    const leadershipRoles = ['director', 'ceo', 'chairman', 'president', 'board'];

    for (const affiliation of affiliations) {
      const role = (affiliation.role || '').toLowerCase();

      if (leadershipRoles.some(lr => role.includes(lr))) {
        const relationshipStrength = this.calculateRelationshipStrength(affiliation);

        conflicts.push({
          id: `leadership_${sponsor.id}_${affiliation.id}`,
          type: 'leadership_role',
          organization: affiliation.organization,
          role: affiliation.role || 'Leadership Position',
          description: `Leadership role as ${affiliation.role} in ${affiliation.organization}`,
          conflictSeverity: this.calculateProfessionalSeverity(relationshipStrength),
          affectedBills: affectedBillsMap.get(affiliation.organization) || [],
          relationshipStrength,
          startDate: affiliation.startDate || undefined,
          endDate: affiliation.endDate || undefined,
          isActive: affiliation.isActive || false,
          evidenceStrength: 80,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  private async analyzeAdvisoryConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    affectedBillsMap: Map<string, number[]>
  ): Promise<ProfessionalConflict[]> {
    const conflicts: ProfessionalConflict[] = [];
    const advisoryRoles = ['advisor', 'consultant', 'advisory', 'counsel'];

    for (const affiliation of affiliations) {
      const role = (affiliation.role || '').toLowerCase();

      if (advisoryRoles.some(ar => role.includes(ar))) {
        const relationshipStrength = this.calculateRelationshipStrength(affiliation);

        conflicts.push({
          id: `advisory_${sponsor.id}_${affiliation.id}`,
          type: 'advisory_position',
          organization: affiliation.organization,
          role: affiliation.role || 'Advisory Position',
          description: `Advisory role as ${affiliation.role} with ${affiliation.organization}`,
          conflictSeverity: this.calculateProfessionalSeverity(relationshipStrength),
          affectedBills: affectedBillsMap.get(affiliation.organization) || [],
          relationshipStrength,
          startDate: affiliation.startDate || undefined,
          endDate: affiliation.endDate || undefined,
          isActive: affiliation.isActive || false,
          evidenceStrength: 70,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  private async analyzeOwnershipConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    affectedBillsMap: Map<string, number[]>
  ): Promise<ProfessionalConflict[]> {
    const conflicts: ProfessionalConflict[] = [];

    for (const affiliation of affiliations) {
      if (affiliation.conflictType === 'ownership') {
        const relationshipStrength = this.calculateRelationshipStrength(affiliation);

        conflicts.push({
          id: `ownership_${sponsor.id}_${affiliation.id}`,
          type: 'ownership_stake',
          organization: affiliation.organization,
          role: affiliation.role || 'Owner',
          description: `Ownership stake in ${affiliation.organization}`,
          conflictSeverity: this.calculateProfessionalSeverity(relationshipStrength),
          affectedBills: affectedBillsMap.get(affiliation.organization) || [],
          relationshipStrength,
          startDate: affiliation.startDate || undefined,
          endDate: affiliation.endDate || undefined,
          isActive: affiliation.isActive || false,
          evidenceStrength: 85,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // VOTING ANOMALY ANALYSIS
  // ==========================================================================

  private async analyzeVotingPatternInconsistencies(
    sponsor: Sponsor,
    votingHistory: any[]
  ): Promise<VotingAnomaly[]> {
    // Filter valid votes once upfront
    const validVotes = votingHistory.filter(isValidVote);

    // Execute both anomaly detection types in parallel
    const [partyDeviations, patternInconsistencies] = await Promise.all([
      this.analyzePartyDeviations(sponsor, validVotes),
      this.analyzePatternInconsistency(sponsor, validVotes)
    ]);

    return [...partyDeviations, ...patternInconsistencies];
  }

  private async analyzePartyDeviations(
    sponsor: Sponsor,
    validVotes: ValidatedVote[]
  ): Promise<VotingAnomaly[]> {
    const anomalies: VotingAnomaly[] = [];
    const threshold = this.config.votingAnomalyThresholds.partyDeviation * 100;

    for (const vote of validVotes) {
      if (vote.partyPosition && vote.vote !== vote.partyPosition) {
        const anomalyScore = this.calculateAnomalyScore('party_deviation', vote);

        if (anomalyScore >= threshold) {
          anomalies.push({
            id: `party_dev_${sponsor.id}_${vote.billId}`,
            type: 'party_deviation',
            billId: vote.billId,
            billTitle: vote.billTitle,
            expectedBehavior: `Vote ${vote.partyPosition} (party position)`,
            actualBehavior: `Voted ${vote.vote}`,
            description: `Voted against party position on ${vote.billTitle}`,
            anomalyScore,
            contextFactors: [`Bill category: ${vote.billCategory}`],
            detectionDate: new Date()
          });
        }
      }
    }

    return anomalies;
  }

  private async analyzePatternInconsistency(
    sponsor: Sponsor,
    validVotes: ValidatedVote[]
  ): Promise<VotingAnomaly[]> {
    if (validVotes.length < 3) return [];

    const anomalies: VotingAnomaly[] = [];

    // Group votes by category efficiently
    const categoryStats = validVotes.reduce<Record<string, CategoryStats>>((acc, vote) => {
      const category = vote.billCategory || 'general';
      if (!acc[category]) {
        acc[category] = { yes: 0, no: 0, votes: [] };
      }
      acc[category][vote.vote]++;
      acc[category].votes.push(vote);
      return acc;
    }, {});

    const inconsistencyThreshold = 1 - this.config.votingAnomalyThresholds.patternInconsistency;

    for (const [category, stats] of Object.entries(categoryStats)) {
      const totalVotes = stats.yes + stats.no;
      if (totalVotes < 3) continue;

      const consistency = Math.max(stats.yes, stats.no) / totalVotes;

      if (consistency < inconsistencyThreshold) {
        // Identify the minority votes as inconsistent
        const majorityVote = stats.yes > stats.no ? 'yes' : 'no';
        const inconsistentVotes = stats.votes.filter(v => v.vote !== majorityVote);

        for (const vote of inconsistentVotes) {
          const anomalyScore = this.calculateAnomalyScore('pattern_inconsistency', vote);

          anomalies.push({
            id: `pattern_inc_${sponsor.id}_${vote.billId}`,
            type: 'pattern_inconsistency',
            billId: vote.billId,
            billTitle: vote.billTitle,
            expectedBehavior: `Consistent voting on ${category} bills`,
            actualBehavior: `Voted '${vote.vote}'`,
            description: `Inconsistent voting pattern on ${category} legislation`,
            anomalyScore,
            contextFactors: [
              `Category consistency: ${Math.round(consistency * 100)}%`,
              `Total ${category} votes: ${totalVotes}`
            ],
            detectionDate: new Date()
          });
        }
      }
    }

    return anomalies;
  }

  // ==========================================================================
  // SCORING, GRADING, AND CALCULATIONS
  // ==========================================================================

  private calculateOverallRiskScore(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparencyScore: number
  ): number {
    // Financial conflicts score with temporal decay and severity weighting
    const financialScore = financialConflicts.reduce((sum, c) => {
      const severityWeight = this.getSeverityWeight(c.conflictSeverity);
      const recencyFactor = this.calculateRecencyFactor(c.lastUpdated);
      return sum + (severityWeight * 25 * recencyFactor);
    }, 0);

    // Professional conflicts score with relationship strength factoring
    const professionalScore = professionalConflicts.reduce((sum, c) => {
      const severityWeight = this.getSeverityWeight(c.conflictSeverity);
      const strengthFactor = c.relationshipStrength / 100;
      return sum + (severityWeight * 15 * strengthFactor);
    }, 0);

    // Voting anomalies score
    const votingScore = votingAnomalies.reduce(
      (sum, a) => sum + (a.anomalyScore / 100) * 10,
      0
    );

    // Calculate base score
    let totalScore = financialScore + professionalScore + votingScore;

    // Apply transparency penalty - low transparency increases overall risk
    const transparencyPenalty = (1 - transparencyScore / 100) * 20;
    totalScore += transparencyPenalty;

    return Math.min(Math.round(totalScore), 100);
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculates transparency score based on disclosure completeness, verification,
   * coverage of required types, and recency. Optimized to avoid async operations
   * since disclosures are already provided.
   */
  private calculateTransparencyScore(disclosures: SponsorTransparency[]): number {
    if (disclosures.length === 0) return 0;

    let score = 0;

    // Base score for having disclosures (max 40 points)
    score += Math.min(disclosures.length * 10, 40);

    // Bonus for verified disclosures (max 15 points)
    const verifiedCount = disclosures.filter(d => d.isVerified).length;
    score += Math.min(verifiedCount * 5, 15);

    // Bonus for covering required disclosure types (max 30 points)
    const requiredTypes = ['financial', 'business', 'investments', 'family'];
    const typesCovered = new Set(disclosures.map(d => d.disclosureType));
    const coverage = requiredTypes.filter(type => typesCovered.has(type)).length;
    score += (coverage / requiredTypes.length) * 30;

    // Recency bonus for disclosures within the last year (max 15 points)
    const now = Date.now();
    const recentDisclosures = disclosures.filter(d => {
      const monthsAgo = (now - new Date(d.dateReported).getTime()) / (1000 * 3600 * 24 * 30);
      return monthsAgo < 12;
    }).length;
    score += Math.min(recentDisclosures * 3, 15);

    return Math.min(Math.round(score), 100);
  }

  private calculateTransparencyGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateAnalysisConfidence(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparencyScore: number
  ): number {
    let totalEvidence = 0;
    let weightedEvidence = 0;

    // Accumulate evidence from all conflict types
    financialConflicts.forEach(c => {
      totalEvidence += 100;
      weightedEvidence += c.evidenceStrength;
    });

    professionalConflicts.forEach(c => {
      totalEvidence += 100;
      weightedEvidence += c.evidenceStrength;
    });

    // Voting anomalies have inherently lower certainty
    votingAnomalies.forEach(a => {
      totalEvidence += 100;
      weightedEvidence += a.anomalyScore / 2;
    });

    // Default confidence when no conflicts are found
    if (totalEvidence === 0) return 0.5;

    const evidenceConfidence = Math.min(weightedEvidence / totalEvidence, 1);

    // Higher transparency increases confidence in findings
    const finalConfidence = evidenceConfidence * (0.7 + (transparencyScore / 100) * 0.3);

    return Math.min(finalConfidence, 1);
  }

  /**
   * Calculates temporal decay factor for conflict scoring.
   * More recent conflicts carry more weight.
   * Uses memoization for frequently calculated dates.
   */
  private calculateRecencyFactor(lastUpdated: Date): number {
    const cacheKey = `recency_${lastUpdated.getTime()}`;

    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey);
    }

    const monthsAgo = (Date.now() - lastUpdated.getTime()) / (1000 * 3600 * 24 * 30);
    // Exponential decay: ~10% weight loss per year, floor at 0.5
    const factor = Math.max(0.5, Math.exp(-monthsAgo / 120));

    this.memoCache.set(cacheKey, factor);
    return factor;
  }

  private calculateFinancialSeverity(amount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (amount >= 5000000) return 'critical'; // KSh 5M+
    if (amount >= 2000000) return 'high';     // KSh 2M+
    if (amount >= 1000000) return 'medium';   // KSh 1M+
    return 'low';
  }

  private calculateProfessionalSeverity(relationshipStrength: number): 'low' | 'medium' | 'high' | 'critical' {
    if (relationshipStrength >= 90) return 'critical';
    if (relationshipStrength >= 75) return 'high';
    if (relationshipStrength >= 50) return 'medium';
    return 'low';
  }

  private calculateRelationshipStrength(affiliation: SponsorAffiliation): number {
    let strength = 50; // Base strength

    if (affiliation.isActive) strength += 30;

    const role = affiliation.role?.toLowerCase() || '';
    if (['director', 'ceo', 'chairman', 'owner'].some(r => role.includes(r))) {
      strength += 20;
    }

    if (affiliation.conflictType === 'ownership') strength += 25;

    return Math.min(strength, 100);
  }

  private calculateAnomalyScore(type: string, vote: ValidatedVote): number {
    let score = 50;

    if (type === 'party_deviation') score += 30;
    if (type === 'pattern_inconsistency') score += 20;

    if (vote.confidence) {
      score *= vote.confidence;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Estimates the financial value of a professional affiliation.
   * Uses role-based heuristics with memoization.
   */
  private estimateAffiliationValue(affiliation: SponsorAffiliation): number {
    const cacheKey = `affiliation_value_${affiliation.id}`;

    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey);
    }

    const baseValues: Record<string, number> = {
      'board_position': 500000,
      'executive': 1000000,
      'ownership': 2000000,
      'advisory': 300000
    };

    const role = (affiliation.role || '').toLowerCase();

    for (const [key, value] of Object.entries(baseValues)) {
      if (affiliation.conflictType?.includes(key) || role.includes(key)) {
        this.memoCache.set(cacheKey, value);
        return value;
      }
    }

    const defaultValue = 100000;
    this.memoCache.set(cacheKey, defaultValue);
    return defaultValue;
  }

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = {
      'low': 0.4,
      'medium': 0.6,
      'high': 0.8,
      'critical': 1.0
    };
    return weights[severity] || 0.4;
  }

  // ==========================================================================
  // RECOMMENDATION AND FALLBACK GENERATION
  // ==========================================================================

  private generateConflictRecommendations(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparencyScore: number,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    // Critical risk requires immediate action
    if (riskLevel === 'critical') {
      recommendations.push('Immediate ethics committee review required');
    }

    // Financial conflict recommendations
    const highFinancialConflicts = financialConflicts.filter(
      c => c.conflictSeverity === 'high' || c.conflictSeverity === 'critical'
    );
    if (highFinancialConflicts.length > 0) {
      recommendations.push('Consider divesting from high-risk financial interests');
    }

    // Professional conflict recommendations
    const highInfluenceRoles = professionalConflicts.filter(c => c.relationshipStrength > 75);
    if (highInfluenceRoles.length > 0) {
      recommendations.push('Consider resigning from high-influence positions that create conflicts');
    }

    // Voting pattern recommendations
    if (votingAnomalies.length > 0) {
      recommendations.push('Review voting patterns for consistency with stated positions');
    }

    // Transparency recommendations
    if (transparencyScore < 70) {
      recommendations.push('Enhance disclosure completeness and verification');
    }

    // Default positive recommendation
    if (recommendations.length === 0) {
      recommendations.push('Maintain current transparency and ethical practices');
    }

    return recommendations;
  }

  private generateFallbackAnalysis(
    sponsorId: number,
    billId: number | undefined,
    error: any
  ): ConflictAnalysis {
    logger.warn(`Generating fallback analysis for sponsor ${sponsorId}`, { error });

    return {
      sponsorId,
      sponsorName: 'Analysis Incomplete',
      billId,
      billTitle: undefined,
      overallRiskScore: 0,
      riskLevel: 'low',
      financialConflicts: [],
      professionalConflicts: [],
      votingAnomalies: [],
      transparencyScore: 0,
      transparencyGrade: 'F',
      recommendations: [
        'Analysis could not be completed due to a system error.',
        'Manual review of this sponsor is strongly recommended.',
        `Error: ${error.message || 'Unknown error'}`
      ],
      lastAnalyzed: new Date(),
      confidence: 0
    };
  }

  // ==========================================================================
  // CONFIGURATION AND UTILITY METHODS
  // ==========================================================================

  private loadAndValidateConfiguration(): ConflictDetectionConfig {
    const config: ConflictDetectionConfig = {
      financialThresholds: {
        direct: Number(process.env.THRESHOLD_DIRECT) || 1000000,
        indirect: Number(process.env.THRESHOLD_INDIRECT) || 500000,
        family: Number(process.env.THRESHOLD_FAMILY) || 250000
      },
      professionalWeights: {
        leadership: Number(process.env.WEIGHT_LEADERSHIP) || 0.8,
        advisory: Number(process.env.WEIGHT_ADVISORY) || 0.6,
        ownership: Number(process.env.WEIGHT_OWNERSHIP) || 0.9
      },
      votingAnomalyThresholds: {
        partyDeviation: Number(process.env.PARTY_DEVIATION) || 0.3,
        patternInconsistency: Number(process.env.VOTING_INCONSISTENCY) || 0.4
      },
      confidenceThresholds: {
        high: Number(process.env.CONFIDENCE_HIGH) || 0.8,
        medium: Number(process.env.CONFIDENCE_MEDIUM) || 0.6,
        low: Number(process.env.CONFIDENCE_LOW) || 0.4
      }
    };

    // Validate configuration values
    const { direct, indirect, family } = config.financialThresholds;
    if (direct <= 0 || indirect <= 0 || family <= 0) {
      throw new ConflictDetectionError(
        'Financial thresholds must be positive',
        'INVALID_CONFIG'
      );
    }

    if (direct < indirect || indirect < family) {
      logger.warn('Financial thresholds should ideally decrease from direct -> indirect -> family');
    }

    if (config.votingAnomalyThresholds.partyDeviation < 0 ||
      config.votingAnomalyThresholds.partyDeviation > 1) {
      throw new ConflictDetectionError(
        'Party deviation threshold must be between 0 and 1',
        'INVALID_CONFIG'
      );
    }

    return config;
  }

  // ==========================================================================
  // DATABASE HELPER METHODS (OPTIMIZED)
  // ==========================================================================

  private async getSponsor(sponsorId: number): Promise<Sponsor | null> {
    const result = await db
      .select()
      .from(sponsors)
      .where(eq(sponsors.id, sponsorId))
      .limit(1);

    return result[0] || null;
  }

  private async getBill(billId: number): Promise<Bill | null> {
    const result = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    return result[0] || null;
  }

  private async getSponsorDisclosures(sponsorId: number): Promise<SponsorTransparency[]> {
    return await db
      .select()
      .from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  private async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    return await db
      .select()
      .from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsorId, sponsorId))
      .orderBy(desc(sponsorAffiliations.startDate));
  }

  private async getSponsorBillSponsorships(sponsorId: number): Promise<any[]> {
    return await db
      .select()
      .from(billSponsorships)
      .where(and(
        eq(billSponsorships.sponsorId, sponsorId),
        eq(billSponsorships.isActive, true)
      ))
      .orderBy(desc(billSponsorships.sponsorshipDate));
  }

  /**
   * Generates synthetic voting history. In a real system, this would
   * query an actual voting records database.
   */
  private async getVotingHistory(sponsorId: number): Promise<any[]> {
    const sponsorships = await this.getSponsorBillSponsorships(sponsorId);
    const votingHistory: any[] = [];

    for (const sponsorship of sponsorships) {
      const bill = await this.getBill(sponsorship.billId);
      if (bill) {
        votingHistory.push({
          billId: bill.id,
          billTitle: bill.title,
          billCategory: bill.category || 'general',
          vote: 'yes',
          voteDate: sponsorship.sponsorshipDate || new Date(),
          partyPosition: 'yes', // Assumed for sponsored bills
          confidence: 0.95
        });
      }
    }

    return votingHistory;
  }

  /**
   * OPTIMIZATION: Batch lookup of affected bills for multiple organizations.
   * This significantly reduces database queries compared to individual lookups.
   * 
   * @param organizations - Array of organization names to search for
   * @param specificBillId - Optional specific bill ID to return for all orgs
   * @returns Map of organization names to affected bill IDs
   */
  private async batchFindAffectedBills(
    organizations: string[],
    specificBillId?: number
  ): Promise<Map<string, number[]>> {
    const resultMap = new Map<string, number[]>();

    // If a specific bill is provided, all organizations map to that bill
    if (specificBillId) {
      organizations.forEach(org => {
        if (org) resultMap.set(org, [specificBillId]);
      });
      return resultMap;
    }

    // Filter out empty organization names
    const validOrgs = organizations.filter(Boolean);
    if (validOrgs.length === 0) return resultMap;

    try {
      // Build a single query to search for all organizations at once
      const conditions = validOrgs.map(org =>
        or(
          like(bills.title, `%${org}%`),
          like(bills.content, `%${org}%`),
          like(bills.description, `%${org}%`)
        )
      );

      // Execute single query for all organizations
      const results = await db
        .select({
          id: bills.id,
          title: bills.title,
          content: bills.content,
          description: bills.description
        })
        .from(bills)
        .where(or(...conditions))
        .limit(200); // Reasonable limit for batch processing

      // Map results back to organizations
      for (const org of validOrgs) {
        const matchingBills = results.filter(bill =>
          bill.title?.includes(org) ||
          bill.content?.includes(org) ||
          bill.description?.includes(org)
        ).map(b => b.id);

        resultMap.set(org, matchingBills);
      }

    } catch (error) {
      logger.error('Error in batch finding affected bills', { error, organizations: validOrgs });
      // Return empty map on error - graceful degradation
    }

    return resultMap;
  }

  /**
   * DEPRECATED: Use batchFindAffectedBills instead for better performance.
   * Kept for backward compatibility.
   */
  private async findAffectedBills(organizationName: string): Promise<number[]> {
    if (!organizationName) return [];

    const resultMap = await this.batchFindAffectedBills([organizationName]);
    return resultMap.get(organizationName) || [];
  }
}

// Export a singleton instance for use throughout the application
export const conflictDetectionService = new EnhancedConflictDetectionService();






































