/**
 * Conflict Detection Engine Service
 * 
 * Core service responsible for detecting various types of conflicts of interest
 * including financial, professional, and voting pattern conflicts.
 */

import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@server/infrastructure/cache/index';
import { database as db } from '@server/infrastructure/database';
import { and, count, desc, eq, gte, inArray, like, lte, or,sql } from 'drizzle-orm';

import {
type Bill,
bill_sponsorships,   bills,   type Sponsor, type SponsorAffiliation, sponsorAffiliations, sponsors, type SponsorTransparency, sponsorTransparency} from '@server/infrastructure/schema';

import {
  ConflictDetectionConfig,
  ConflictDetectionError,
  FinancialConflict,
  isValidVote,
  ProfessionalConflict,
  ValidatedVote,
  VotingAnomaly} from './types';

export class ConflictDetectionEngineService {
  private static instance: ConflictDetectionEngineService;
  private readonly config: ConflictDetectionConfig;
  private readonly memoCache = new Map<string, any>();

  public static getInstance(): ConflictDetectionEngineService {
    if (!ConflictDetectionEngineService.instance) {
      ConflictDetectionEngineService.instance = new ConflictDetectionEngineService();
    }
    return ConflictDetectionEngineService.instance;
  }

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Analyzes financial conflicts for a sponsor
   */
  async analyzeFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    affiliations: SponsorAffiliation[],
    bill_id?: number
  ): Promise<FinancialConflict[]> { try {
      const [directConflicts, indirectConflicts, familyConflicts] = await Promise.all([
        this.analyzeDirectFinancialConflicts(sponsor, disclosures, bill_id),
        this.analyzeIndirectFinancialConflicts(sponsor, affiliations, bill_id),
        this.analyzeFamilyFinancialConflicts(sponsor, disclosures, bill_id),
      ]);

      return [...directConflicts, ...indirectConflicts, ...familyConflicts];
     } catch (error) {
      logger.error('Error analyzing financial conflicts:', {
        component: 'ConflictDetectionEngine',
        sponsor_id: sponsors.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Analyzes professional conflicts for a sponsor
   */
  async analyzeProfessionalConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    bill_id?: number
  ): Promise<ProfessionalConflict[]> { try {
      const conflicts: ProfessionalConflict[] = [];

      for (const affiliation of affiliations) {
        if (!affiliation.organization || !affiliation.role) continue;

        const affectedBills = await this.findAffectedBillsForOrganization(
          affiliation.organization,
          bill_id
        );

        const conflictSeverity = this.calculateProfessionalSeverity(
          affiliation.role,
          affiliation.organization
        );

        conflicts.push({
          id: `professional_${sponsors.id }_${affiliation.id}`,
          type: this.categorizeProfessionalRole(affiliation.role),
          organization: affiliation.organization,
          role: affiliation.role,
          description: `${affiliation.role} at ${affiliation.organization}`,
          conflictSeverity,
          affectedBills,
          relationshipStrength: this.calculateRelationshipStrength(affiliation),
          start_date: affiliation.start_date || undefined,
          end_date: affiliation.end_date || undefined,
          is_active: !affiliation.end_date || affiliation.end_date > new Date(),
          evidenceStrength: 75,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        });
      }

      return conflicts;
    } catch (error) {
      logger.error('Error analyzing professional conflicts:', {
        component: 'ConflictDetectionEngine',
        sponsor_id: sponsors.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Analyzes voting pattern inconsistencies
   */
  async analyzeVotingPatternInconsistencies(
    sponsor: Sponsor,
    votingHistory: unknown[]
  ): Promise<VotingAnomaly[]> {
    try {
      const anomalies: VotingAnomaly[] = [];
      const validVotes = votingHistory.filter(isValidVote);

      if (validVotes.length < 5) {
        logger.warn(`Insufficient voting data for sponsor ${sponsors.id}`);
        return [];
      }

      // Analyze party deviation patterns
      const partyAnomalies = await this.detectPartyDeviationAnomalies(sponsor, validVotes);
      anomalies.push(...partyAnomalies);

      // Analyze pattern inconsistencies
      const patternAnomalies = await this.detectPatternInconsistencies(sponsor, validVotes);
      anomalies.push(...patternAnomalies);

      return anomalies;
    } catch (error) {
      logger.error('Error analyzing voting patterns:', {
        component: 'ConflictDetectionEngine',
        sponsor_id: sponsors.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Private helper methods

  private async analyzeDirectFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    bill_id?: number
  ): Promise<FinancialConflict[]> { const conflicts: FinancialConflict[] = [];

    const financialDisclosures = disclosures.filter(
      d => d.disclosureType === 'financial' &&
        Number(d.amount) >= this.config.financialThresholds.direct
    );

    for (const disclosure of financialDisclosures) {
      const amount = Number(disclosure.amount);
      const organization = disclosure.source || 'Unknown Organization';
      const affectedBills = await this.findAffectedBillsForOrganization(organization, bill_id);

      conflicts.push({
        id: `financial_${sponsors.id }_${disclosure.id}`,
        type: 'direct_investment',
        organization,
        description: `Direct financial interest of KSh ${amount.toLocaleString()} in ${organization}`,
        financialValue: amount,
        conflictSeverity: this.calculateFinancialSeverity(amount),
        affectedBills,
        billSections: [],
        evidenceStrength: disclosure.is_verified ? 90 : 60,
        detectionMethod: 'disclosure_analysis',
        lastUpdated: new Date()
      });
    }

    return conflicts;
  }

  private async analyzeIndirectFinancialConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    bill_id?: number
  ): Promise<FinancialConflict[]> { const conflicts: FinancialConflict[] = [];

    for (const affiliation of affiliations) {
      if (!affiliation.organization) continue;

      // Check if this organization has financial interests that could create conflicts
      const organizationFinancials = await this.getOrganizationFinancialInterests(
        affiliation.organization
      );

      if (organizationFinancials.length > 0) {
        const affectedBills = await this.findAffectedBillsForOrganization(
          affiliation.organization,
          bill_id
        );

        conflicts.push({
          id: `indirect_${sponsors.id }_${affiliation.id}`,
          type: 'indirect_investment',
          organization: affiliation.organization,
          description: `Indirect financial interest through ${affiliation.role} at ${affiliation.organization}`,
          financialValue: 0, // Indirect conflicts don't have direct values
          conflictSeverity: 'medium',
          affectedBills,
          billSections: [],
          evidenceStrength: 60,
          detectionMethod: 'cross_reference',
          lastUpdated: new Date()
        });
      }
    }

    return conflicts;
  }

  private async analyzeFamilyFinancialConflicts(
    sponsor: Sponsor,
    disclosures: SponsorTransparency[],
    bill_id?: number
  ): Promise<FinancialConflict[]> { const conflicts: FinancialConflict[] = [];

    const familyDisclosures = disclosures.filter(
      d => d.disclosureType === 'family' &&
        Number(d.amount) >= this.config.financialThresholds.family
    );

    for (const disclosure of familyDisclosures) {
      const amount = Number(disclosure.amount);
      const organization = disclosure.source || 'Unknown Organization';
      const affectedBills = await this.findAffectedBillsForOrganization(organization, bill_id);

      conflicts.push({
        id: `family_${sponsors.id }_${disclosure.id}`,
        type: 'family_interest',
        organization,
        description: `Family financial interest of KSh ${amount.toLocaleString()} in ${organization}`,
        financialValue: amount,
        conflictSeverity: this.calculateFinancialSeverity(amount * 0.7), // Reduced impact for family
        affectedBills,
        billSections: [],
        evidenceStrength: disclosure.is_verified ? 80 : 50,
        detectionMethod: 'disclosure_analysis',
        lastUpdated: new Date()
      });
    }

    return conflicts;
  }

  private async detectPartyDeviationAnomalies(
    sponsor: Sponsor,
    votes: ValidatedVote[]
  ): Promise<VotingAnomaly[]> {
    const anomalies: VotingAnomaly[] = [];

    for (const vote of votes) {
      if (!vote.partyPosition) continue;

      const isDeviation = vote.vote !== vote.partyPosition;
      if (isDeviation) {
        anomalies.push({
          id: `party_deviation_${sponsors.id}_${vote.bill_id}`,
          type: 'party_deviation',
          bill_id: vote.bill_id,
          billTitle: vote.billTitle,
          expectedBehavior: `Vote ${vote.partyPosition} (party line)`,
          actualBehavior: `Voted ${vote.vote}`,
          description: `Deviated from party position on ${vote.billTitle}`,
          contextFactors: [vote.billCategory],
          anomalyScore: 0.7,
          detectionDate: new Date()
        });
      }
    }

    return anomalies;
  }

  private async detectPatternInconsistencies(
    sponsor: Sponsor,
    votes: ValidatedVote[]
  ): Promise<VotingAnomaly[]> {
    const anomalies: VotingAnomaly[] = [];

    // Group votes by category to detect inconsistencies
    const votesByCategory = votes.reduce((acc, vote) => {
      if (!acc[vote.billCategory]) {
        acc[vote.billCategory] = [];
      }
      acc[vote.billCategory].push(vote);
      return acc;
    }, {} as Record<string, ValidatedVote[]>);

    for (const [category, categoryVotes] of Object.entries(votesByCategory)) {
      if (categoryVotes.length < 3) continue;

      const yesVotes = categoryVotes.filter(v => v.vote === 'yes').length;
      const noVotes = categoryVotes.filter(v => v.vote === 'no').length;
      const total = categoryVotes.length;

      // Detect if voting pattern is inconsistent (neither strongly yes nor no)
      const yesRatio = yesVotes / total;
      const noRatio = noVotes / total;

      if (yesRatio > 0.3 && yesRatio < 0.7 && noRatio > 0.3 && noRatio < 0.7) {
        // This indicates inconsistent voting in this category
        const mostRecentVote = categoryVotes.sort((a, b) => b.bill_id - a.bill_id)[0];

        anomalies.push({
          id: `pattern_inconsistency_${sponsors.id}_${category}`,
          type: 'pattern_inconsistency',
          bill_id: mostRecentVote.bill_id,
          billTitle: mostRecentVote.billTitle,
          expectedBehavior: 'Consistent voting pattern',
          actualBehavior: `Mixed voting (${Math.round(yesRatio * 100)}% yes, ${Math.round(noRatio * 100)}% no)`,
          description: `Inconsistent voting pattern in ${category} category`,
          contextFactors: [category, `${total} votes analyzed`],
          anomalyScore: Math.abs(0.5 - yesRatio) * 2, // Higher score for more balanced (inconsistent) voting
          detectionDate: new Date()
        });
      }
    }

    return anomalies;
  }

  private async findAffectedBillsForOrganization(
    organization: string,
    bill_id?: number
  ): Promise<number[]> {
    try {
      const cacheKey = `affected_bills:${organization}:${ bill_id || 'all' }`;
      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      // Simple implementation - in reality this would be more sophisticated
      const bills = await db
        .select({ id: bills.id })
        .from(bills)
        .where(
          and(
            like(bills.summary, `%${organization}%`),
            bill_id ? eq(bills.id, bill_id) : sql`1=1`
          )
        )
        .limit(10);

      const result = bills.map(b => b.id);
      await cache.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      logger.error('Error finding affected bills:', { organization, error });
      return [];
    }
  }

  private async getOrganizationFinancialInterests(organization: string): Promise<unknown[]> {
    // Simplified implementation - would be more complex in reality
    return [];
  }

  private calculateFinancialSeverity(amount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (amount >= 10000000) return 'critical'; // 10M+
    if (amount >= 5000000) return 'high';      // 5M+
    if (amount >= 1000000) return 'medium';    // 1M+
    return 'low';
  }

  private calculateProfessionalSeverity(
    role: string,
    organization: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const roleUpper = role.toUpperCase();
    
    if (roleUpper.includes('CEO') || roleUpper.includes('PRESIDENT') || roleUpper.includes('CHAIRMAN')) {
      return 'critical';
    }
    if (roleUpper.includes('DIRECTOR') || roleUpper.includes('BOARD')) {
      return 'high';
    }
    if (roleUpper.includes('MANAGER') || roleUpper.includes('ADVISOR')) {
      return 'medium';
    }
    return 'low';
  }

  private categorizeProfessionalRole(role: string): ProfessionalConflict['type'] {
    const roleUpper = role.toUpperCase();
    
    if (roleUpper.includes('CEO') || roleUpper.includes('PRESIDENT') || roleUpper.includes('CHAIRMAN')) {
      return 'leadership_role';
    }
    if (roleUpper.includes('ADVISOR') || roleUpper.includes('CONSULTANT')) {
      return 'advisory_position';
    }
    if (roleUpper.includes('OWNER') || roleUpper.includes('FOUNDER')) {
      return 'ownership_stake';
    }
    return 'leadership_role';
  }

  private calculateRelationshipStrength(affiliation: SponsorAffiliation): number {
    // Simple calculation based on role and duration
    let strength = 0.5;
    
    if (affiliation.role?.toUpperCase().includes('CEO')) strength += 0.3;
    if (affiliation.role?.toUpperCase().includes('DIRECTOR')) strength += 0.2;
    if (affiliation.role?.toUpperCase().includes('BOARD')) strength += 0.2;
    
    return Math.min(strength, 1.0);
  }

  private loadConfiguration(): ConflictDetectionConfig {
    return {
      financialThresholds: {
        direct: 100000,    // KSh 100K
        indirect: 500000,  // KSh 500K
        family: 250000     // KSh 250K
      },
      professionalWeights: {
        leadership: 0.8,
        advisory: 0.6,
        ownership: 0.9
      },
      votingAnomalyThresholds: {
        partyDeviation: 0.3,
        patternInconsistency: 0.4
      },
      confidenceThresholds: {
        high: 0.8,
        medium: 0.6,
        low: 0.4
      }
    };
  }
}

export const conflictDetectionEngineService = ConflictDetectionEngineService.getInstance();


