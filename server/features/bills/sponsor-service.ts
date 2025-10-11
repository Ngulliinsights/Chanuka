import { database as db } from '../../../shared/database/connection.js';
import { 
  sponsors, sponsorAffiliations, sponsorTransparency, billSponsorships, bills,
  type Sponsor, type SponsorAffiliation, type SponsorTransparency, type BillSponsorship 
} from '../../../shared/schema.js';
import { eq, and, sql, desc, gte, lte, count, avg, inArray, like, or } from 'drizzle-orm';
import { logger } from '../../utils/logger';

// Enhanced type definitions for sponsor service
export interface SponsorWithDetails extends Sponsor {
  affiliations: SponsorAffiliation[];
  transparency: SponsorTransparency[];
  sponsorships: BillSponsorship[];
  stats: SponsorStats;
}

export interface SponsorStats {
  totalBillsSponsored: number;
  activeBillsSponsored: number;
  billsByStatus: Record<string, number>;
  billsByCategory: Record<string, number>;
  averageEngagement: number;
  transparencyScore: number;
  conflictRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SponsorSearchOptions {
  party?: string;
  role?: string;
  constituency?: string;
  conflictLevel?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'party' | 'transparencyScore' | 'financialExposure';
  sortOrder?: 'asc' | 'desc';
}

export interface SponsorAffiliationData {
  sponsorId: number;
  organization: string;
  role?: string;
  type: string;
  conflictType?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface SponsorTransparencyData {
  sponsorId: number;
  disclosureType: string;
  description: string;
  amount?: number;
  source?: string;
  dateReported?: Date;
  isVerified?: boolean;
}

export interface VotingPatternData {
  sponsorId: number;
  billId: number;
  vote: 'yes' | 'no' | 'abstain';
  voteDate: Date;
  billCategory: string;
  partyPosition?: 'yes' | 'no' | 'abstain';
}

export interface ConflictAnalysisResult {
  sponsorId: number;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  financialConflicts: ConflictItem[];
  organizationalConflicts: ConflictItem[];
  votingAnomalies: ConflictItem[];
  recommendations: string[];
}

export interface ConflictItem {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedBills: number[];
  evidence: string[];
}

export class SponsorService {
  /**
   * Implement sponsor data retrieval from database
   * Enhanced sponsor retrieval with comprehensive filtering and search
   */
  async getSponsors(options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const { 
      limit = 50, 
      offset = 0, 
      sortBy = 'name', 
      sortOrder = 'asc',
      isActive = true 
    } = options;
    
    let query = db.select().from(sponsors);
    
    // Build where conditions
    const conditions: any[] = [];
    
    if (isActive !== undefined) {
      conditions.push(eq(sponsors.isActive, isActive));
    }
    
    if (options.party) {
      conditions.push(eq(sponsors.party, options.party));
    }
    
    if (options.role) {
      conditions.push(eq(sponsors.role, options.role));
    }
    
    if (options.constituency) {
      conditions.push(eq(sponsors.constituency, options.constituency));
    }
    
    if (options.conflictLevel) {
      conditions.push(eq(sponsors.conflictLevel, options.conflictLevel));
    }
    
    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply sorting
    let orderedQuery;
    if (sortBy === 'name') {
      orderedQuery = sortOrder === 'asc' ? query.orderBy(sponsors.name) : query.orderBy(desc(sponsors.name));
    } else if (sortBy === 'party') {
      orderedQuery = sortOrder === 'asc' ? query.orderBy(sponsors.party) : query.orderBy(desc(sponsors.party));
    } else if (sortBy === 'transparencyScore') {
      orderedQuery = sortOrder === 'asc' ? query.orderBy(sponsors.transparencyScore) : query.orderBy(desc(sponsors.transparencyScore));
    } else if (sortBy === 'financialExposure') {
      orderedQuery = sortOrder === 'asc' ? query.orderBy(sponsors.financialExposure) : query.orderBy(desc(sponsors.financialExposure));
    } else {
      orderedQuery = query.orderBy(sponsors.name); // Default sort
    }
    
    return await orderedQuery
      .limit(limit)
      .offset(offset);
  }

  async getSponsor(id: number): Promise<Sponsor | null> {
    const result = await db.select().from(sponsors).where(eq(sponsors.id, id));
    return result[0] || null;
  }

  async getSponsorWithDetails(id: number): Promise<SponsorWithDetails | null> {
    const sponsor = await this.getSponsor(id);
    if (!sponsor) return null;

    const [affiliations, transparency, sponsorships, stats] = await Promise.all([
      this.getSponsorAffiliations(id),
      this.getSponsorTransparency(id),
      this.getSponsorBillSponsorships(id),
      this.calculateSponsorStats(id)
    ]);

    return {
      ...sponsor,
      affiliations,
      transparency,
      sponsorships,
      stats
    };
  }

  async searchSponsors(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const { limit = 50, offset = 0 } = options;
    
    const searchCondition = or(
      like(sponsors.name, `%${query}%`),
      like(sponsors.party, `%${query}%`),
      like(sponsors.constituency, `%${query}%`),
      like(sponsors.role, `%${query}%`)
    );
    
    let dbQuery = db.select().from(sponsors).where(searchCondition);
    
    // Apply additional filters
    const conditions = [searchCondition];
    
    if (options.party) {
      conditions.push(eq(sponsors.party, options.party));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(sponsors.isActive, options.isActive));
    }
    
    if (conditions.length > 1) {
      dbQuery = dbQuery.where(and(...conditions));
    }
    
    return await dbQuery
      .orderBy(sponsors.name)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Add sponsor affiliation and transparency data queries
   * Comprehensive affiliation and transparency data management
   */
  async getSponsorAffiliations(sponsorId: number, activeOnly: boolean = true): Promise<SponsorAffiliation[]> {
    let query = db.select().from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsorId, sponsorId));
    
    if (activeOnly) {
      query = query.where(and(
        eq(sponsorAffiliations.sponsorId, sponsorId),
        eq(sponsorAffiliations.isActive, true)
      ));
    }
    
    return await query.orderBy(desc(sponsorAffiliations.startDate));
  }

  async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  async getSponsorBillSponsorships(sponsorId: number, activeOnly: boolean = true): Promise<BillSponsorship[]> {
    let query = db.select().from(billSponsorships)
      .where(eq(billSponsorships.sponsorId, sponsorId));
    
    if (activeOnly) {
      query = query.where(and(
        eq(billSponsorships.sponsorId, sponsorId),
        eq(billSponsorships.isActive, true)
      ));
    }
    
    return await query.orderBy(desc(billSponsorships.sponsorshipDate));
  }

  async addSponsorAffiliation(affiliationData: SponsorAffiliationData): Promise<SponsorAffiliation> {
    const result = await db.insert(sponsorAffiliations).values({
      ...affiliationData,
      isActive: affiliationData.isActive ?? true,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updateSponsorAffiliation(
    id: number, 
    updateData: Partial<SponsorAffiliationData>
  ): Promise<SponsorAffiliation | null> {
    const result = await db.update(sponsorAffiliations)
      .set(updateData)
      .where(eq(sponsorAffiliations.id, id))
      .returning();
    
    return result[0] || null;
  }

  async addSponsorTransparency(transparencyData: SponsorTransparencyData): Promise<SponsorTransparency> {
    const result = await db.insert(sponsorTransparency).values({
      ...transparencyData,
      isVerified: transparencyData.isVerified ?? false,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updateSponsorTransparency(
    id: number, 
    updateData: Partial<SponsorTransparencyData>
  ): Promise<SponsorTransparency | null> {
    const result = await db.update(sponsorTransparency)
      .set(updateData)
      .where(eq(sponsorTransparency.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Create sponsor conflict analysis data operations
   * Advanced conflict detection and analysis
   */
  async analyzeSponsorConflicts(sponsorId: number): Promise<ConflictAnalysisResult> {
    const [sponsor, affiliations, transparency, sponsorships] = await Promise.all([
      this.getSponsor(sponsorId),
      this.getSponsorAffiliations(sponsorId),
      this.getSponsorTransparency(sponsorId),
      this.getSponsorBillSponsorships(sponsorId)
    ]);

    if (!sponsor) {
      throw new Error(`Sponsor with ID ${sponsorId} not found`);
    }

    const financialConflicts = await this.detectFinancialConflicts(sponsor, affiliations, sponsorships);
    const organizationalConflicts = await this.detectOrganizationalConflicts(sponsor, affiliations, sponsorships);
    const votingAnomalies = await this.detectVotingAnomalies(sponsorId, sponsorships);

    const overallRiskLevel = this.calculateOverallRiskLevel(
      financialConflicts,
      organizationalConflicts,
      votingAnomalies
    );

    const recommendations = this.generateConflictRecommendations(
      overallRiskLevel,
      financialConflicts,
      organizationalConflicts,
      votingAnomalies
    );

    return {
      sponsorId,
      overallRiskLevel,
      financialConflicts,
      organizationalConflicts,
      votingAnomalies,
      recommendations
    };
  }

  async getSponsorConflictHistory(sponsorId: number, timeframeMonths: number = 12): Promise<ConflictAnalysisResult[]> {
    // This would typically query historical conflict analysis data
    // For now, we'll return current analysis as a placeholder
    const currentAnalysis = await this.analyzeSponsorConflicts(sponsorId);
    return [currentAnalysis];
  }

  /**
   * Add sponsor voting pattern data management
   * Comprehensive voting pattern tracking and analysis
   */
  async getSponsorVotingPatterns(sponsorId: number): Promise<VotingPatternData[]> {
    // In a real implementation, this would query actual voting records
    // For now, we'll generate synthetic data based on sponsorships
    const sponsorships = await this.getSponsorBillSponsorships(sponsorId);
    const votingPatterns: VotingPatternData[] = [];

    for (const sponsorship of sponsorships) {
      const bill = await this.getBill(sponsorship.billId);
      if (!bill) continue;

      // Sponsors typically vote 'yes' on their own bills
      votingPatterns.push({
        sponsorId,
        billId: sponsorship.billId,
        vote: 'yes',
        voteDate: sponsorship.sponsorshipDate || new Date(),
        billCategory: bill.category || 'general',
        partyPosition: 'yes' // Assume party supports sponsored bills
      });
    }

    return votingPatterns.sort((a, b) => b.voteDate.getTime() - a.voteDate.getTime());
  }

  async addVotingPattern(votingData: VotingPatternData): Promise<VotingPatternData> {
    // In a real implementation, this would insert into a voting_records table
    // For now, we'll just return the data as confirmation
    return votingData;
  }

  async getSponsorVotingConsistency(sponsorId: number): Promise<{
    overallConsistency: number;
    categoryConsistency: Record<string, number>;
    partyAlignment: number;
    anomalies: number;
  }> {
    const votingPatterns = await this.getSponsorVotingPatterns(sponsorId);
    
    if (votingPatterns.length === 0) {
      return {
        overallConsistency: 0,
        categoryConsistency: {},
        partyAlignment: 0,
        anomalies: 0
      };
    }

    // Calculate category-based consistency
    const categoryGroups: Record<string, VotingPatternData[]> = {};
    votingPatterns.forEach(pattern => {
      if (!categoryGroups[pattern.billCategory]) {
        categoryGroups[pattern.billCategory] = [];
      }
      categoryGroups[pattern.billCategory].push(pattern);
    });

    const categoryConsistency: Record<string, number> = {};
    let totalConsistency = 0;
    let categoryCount = 0;

    for (const [category, patterns] of Object.entries(categoryGroups)) {
      if (patterns.length < 2) continue;

      const yesVotes = patterns.filter(p => p.vote === 'yes').length;
      const noVotes = patterns.filter(p => p.vote === 'no').length;
      const abstainVotes = patterns.filter(p => p.vote === 'abstain').length;

      const maxVotes = Math.max(yesVotes, noVotes, abstainVotes);
      const consistency = maxVotes / patterns.length;

      categoryConsistency[category] = consistency;
      totalConsistency += consistency;
      categoryCount++;
    }

    const overallConsistency = categoryCount > 0 ? totalConsistency / categoryCount : 0;

    // Calculate party alignment
    const patternsWithPartyPosition = votingPatterns.filter(p => p.partyPosition);
    const alignedVotes = patternsWithPartyPosition.filter(p => p.vote === p.partyPosition).length;
    const partyAlignment = patternsWithPartyPosition.length > 0 
      ? alignedVotes / patternsWithPartyPosition.length 
      : 0;

    // Count anomalies (votes against party position)
    const anomalies = patternsWithPartyPosition.length - alignedVotes;

    return {
      overallConsistency,
      categoryConsistency,
      partyAlignment,
      anomalies
    };
  }

  // Private helper methods

  private async calculateSponsorStats(sponsorId: number): Promise<SponsorStats> {
    const sponsorships = await this.getSponsorBillSponsorships(sponsorId, false);
    const activeSponsorships = sponsorships.filter(s => s.isActive);

    // Get bills for status and category analysis
    const billIds = sponsorships.map(s => s.billId);
    const sponsoredBills = billIds.length > 0 
      ? await db.select().from(bills).where(inArray(bills.id, billIds))
      : [];

    const billsByStatus: Record<string, number> = {};
    const billsByCategory: Record<string, number> = {};

    sponsoredBills.forEach(bill => {
      billsByStatus[bill.status] = (billsByStatus[bill.status] || 0) + 1;
      if (bill.category) {
        billsByCategory[bill.category] = (billsByCategory[bill.category] || 0) + 1;
      }
    });

    // Calculate average engagement (simplified)
    const averageEngagement = sponsoredBills.reduce((sum, bill) => sum + (bill.viewCount || 0), 0) / 
      Math.max(sponsoredBills.length, 1);

    // Get sponsor for transparency score and conflict level
    const sponsor = await this.getSponsor(sponsorId);
    const transparencyScore = this.parseNumericValue(sponsor?.transparencyScore) || 0;
    const conflictRiskLevel = sponsor?.conflictLevel as 'low' | 'medium' | 'high' | 'critical' || 'low';

    return {
      totalBillsSponsored: sponsorships.length,
      activeBillsSponsored: activeSponsorships.length,
      billsByStatus,
      billsByCategory,
      averageEngagement,
      transparencyScore,
      conflictRiskLevel
    };
  }

  private async detectFinancialConflicts(
    sponsor: Sponsor, 
    affiliations: SponsorAffiliation[], 
    sponsorships: BillSponsorship[]
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];
    const financialExposure = this.parseNumericValue(sponsor.financialExposure) || 0;

    // Direct financial conflicts
    const financialAffiliations = affiliations.filter(a => 
      a.conflictType === 'financial' || a.type === 'economic'
    );

    for (const affiliation of financialAffiliations) {
      const affectedBills = await this.findBillsAffectingOrganization(
        affiliation.organization, 
        sponsorships.map(s => s.billId)
      );

      if (affectedBills.length > 0) {
        conflicts.push({
          type: 'financial_direct',
          severity: financialExposure > 5000000 ? 'high' : financialExposure > 1000000 ? 'medium' : 'low',
          description: `Direct financial interest in ${affiliation.organization} while sponsoring related legislation`,
          affectedBills,
          evidence: [
            `Financial exposure: $${financialExposure.toLocaleString()}`,
            `Role: ${affiliation.role || 'Unknown'}`,
            `Organization type: ${affiliation.type}`
          ]
        });
      }
    }

    return conflicts;
  }

  private async detectOrganizationalConflicts(
    sponsor: Sponsor, 
    affiliations: SponsorAffiliation[], 
    sponsorships: BillSponsorship[]
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];

    // Leadership role conflicts
    const leadershipAffiliations = affiliations.filter(a => 
      a.role && ['director', 'board', 'executive', 'chairman', 'ceo', 'president'].some(
        role => a.role!.toLowerCase().includes(role)
      )
    );

    for (const affiliation of leadershipAffiliations) {
      const affectedBills = await this.findBillsAffectingOrganization(
        affiliation.organization, 
        sponsorships.map(s => s.billId)
      );

      if (affectedBills.length > 0) {
        conflicts.push({
          type: 'organizational',
          severity: leadershipAffiliations.length > 3 ? 'high' : 'medium',
          description: `Leadership role in ${affiliation.organization} while sponsoring related legislation`,
          affectedBills,
          evidence: [
            `Role: ${affiliation.role}`,
            `Organization: ${affiliation.organization}`,
            `Conflict type: ${affiliation.conflictType || 'Unknown'}`
          ]
        });
      }
    }

    return conflicts;
  }

  private async detectVotingAnomalies(
    sponsorId: number, 
    sponsorships: BillSponsorship[]
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];
    const votingPatterns = await this.getSponsorVotingPatterns(sponsorId);

    // Detect party deviation anomalies
    const partyDeviations = votingPatterns.filter(p => 
      p.partyPosition && p.vote !== p.partyPosition
    );

    if (partyDeviations.length > 0) {
      conflicts.push({
        type: 'voting_anomaly',
        severity: partyDeviations.length > 5 ? 'high' : partyDeviations.length > 2 ? 'medium' : 'low',
        description: `${partyDeviations.length} instances of voting against party position`,
        affectedBills: partyDeviations.map(p => p.billId),
        evidence: partyDeviations.map(p => 
          `Voted ${p.vote} on bill ${p.billId} while party position was ${p.partyPosition}`
        )
      });
    }

    return conflicts;
  }

  private calculateOverallRiskLevel(
    financialConflicts: ConflictItem[],
    organizationalConflicts: ConflictItem[],
    votingAnomalies: ConflictItem[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const allConflicts = [...financialConflicts, ...organizationalConflicts, ...votingAnomalies];
    
    if (allConflicts.length === 0) return 'low';
    
    const criticalCount = allConflicts.filter(c => c.severity === 'critical').length;
    const highCount = allConflicts.filter(c => c.severity === 'high').length;
    const mediumCount = allConflicts.filter(c => c.severity === 'medium').length;

    if (criticalCount > 0 || highCount > 2) return 'critical';
    if (highCount > 0 || mediumCount > 3) return 'high';
    if (mediumCount > 0 || allConflicts.length > 2) return 'medium';
    
    return 'low';
  }

  private generateConflictRecommendations(
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical',
    financialConflicts: ConflictItem[],
    organizationalConflicts: ConflictItem[],
    votingAnomalies: ConflictItem[]
  ): string[] {
    const recommendations: string[] = [];

    if (overallRiskLevel === 'critical') {
      recommendations.push('Immediate ethics review required');
      recommendations.push('Consider recusal from all related legislative activities');
    }

    if (financialConflicts.length > 0) {
      recommendations.push('Improve financial disclosure transparency');
      if (financialConflicts.some(c => c.severity === 'high')) {
        recommendations.push('Consider divesting from conflicting financial interests');
      }
    }

    if (organizationalConflicts.length > 0) {
      recommendations.push('Establish clear boundaries between organizational roles and legislative duties');
    }

    if (votingAnomalies.length > 0) {
      recommendations.push('Review voting patterns for consistency with stated positions');
    }

    if (overallRiskLevel === 'low' && recommendations.length === 0) {
      recommendations.push('Continue current transparency practices');
    }

    return recommendations;
  }

  private async findBillsAffectingOrganization(organization: string, billIds: number[]): Promise<number[]> {
    if (billIds.length === 0) return [];

    const affectedBills = await db.select({ id: bills.id })
      .from(bills)
      .where(and(
        inArray(bills.id, billIds),
        or(
          like(bills.content, `%${organization}%`),
          like(bills.title, `%${organization}%`),
          like(bills.description, `%${organization}%`)
        )
      ));

    return affectedBills.map(b => b.id);
  }

  private async getBill(billId: number) {
    const result = await db.select().from(bills).where(eq(bills.id, billId));
    return result[0];
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export const sponsorService = new SponsorService();








