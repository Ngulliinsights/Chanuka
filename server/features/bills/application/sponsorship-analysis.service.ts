import { sponsorService } from '../../sponsors/application/sponsor-service-direct.js';
import { sponsorConflictAnalysisService } from '../../sponsors/application/sponsor-conflict-analysis.service.js';
// readDatabase import removed - not used in this service after refactor
import { getSponsorshipsByBill, getSponsorAffiliations, getSectionConflictsForBill } from '../repositories/sponsorship-repository.js';
import { logger  } from '@shared/core/src/index.js';

// ============================================================================
// TYPE DEFINITIONS FOR BILL-CENTRIC ANALYSIS
// ============================================================================

interface SponsorAffiliation {
  id: number;
  sponsor_id: number;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  conflictType?: string;
}

interface SponsorTransparencyData {
  disclosure: string;
  lastUpdated: string | null;
  publicStatements: number;
}

interface SponsorshipData {
  sponsorship: {
    id: number;
    bill_id: number;
    sponsor_id: number;
    type: string;
    joinedDate: string | null;
  };
  sponsor: {
    id: number;
    name: string;
    role: string;
    party: string;
    constituency: string;
    conflictLevel: string;
    financialExposure: number | string;
    votingAlignment: number | string;
  };
  transparency: SponsorTransparencyData | null;
  affiliations: SponsorAffiliation[];
}

interface FormattedSponsor {
  id: number;
  name: string;
  role: string;
  party: string;
  constituency: string;
  conflictLevel: string;
  financialExposure: number;
  affiliations: SponsorAffiliation[];
  votingAlignment: number;
  transparency: {
    disclosure: string;
    lastUpdated: string;
    publicStatements: number;
  };
}

interface ComprehensiveAnalysis {
  bill_id: number;
  title: string;
  number: string;
  introduced: string;
  status: string;
  primarySponsor: FormattedSponsor | null;
  coSponsors: FormattedSponsor[];
  totalFinancialExposure: number;
  industryAlignment: number;
  sections: any[];
  financialBreakdown: {
    primarySponsor: number;
    coSponsorsTotal: number;
    industryContributions: number;
    totalExposure: number;
  };
  timeline: any[];
  methodology: any;
  analysisMetadata: {
    generatedAt: string;
    sponsorCount: number;
    conflictSections: number;
    riskLevel: string;
  };
}

interface NetworkNode {
  id: string;
  type: 'sponsor' | 'organization';
  name: string;
  size: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

/**
 * SponsorshipAnalysisService - Bill-Centric Presentation Layer
 * 
 * Refactored to use Drizzle ORM directly instead of repository pattern.
 * This service focuses on analyzing relationships between bills and sponsors,
 * delegating conflict detection to the conflict analysis service.
 */
export class SponsorshipAnalysisService {

  // Industry categorization for financial analysis
  private readonly industryCategories = new Map([
    ['pharmaceutical', 'Pharmaceutical'],
    ['medicine', 'Pharmaceutical'],
    ['drug', 'Pharmaceutical'],
    ['healthcare', 'Healthcare Services'],
    ['hospital', 'Healthcare Services'],
    ['medical', 'Healthcare Services'],
    ['technology', 'Technology'],
    ['tech', 'Technology'],
    ['software', 'Technology'],
    ['energy', 'Energy'],
    ['oil', 'Energy'],
    ['gas', 'Energy'],
    ['finance', 'Financial Services'],
    ['banking', 'Financial Services'],
    ['insurance', 'Financial Services']
  ]);

  // ============================================================================
  // DATA ACCESS LAYER - Direct Drizzle ORM Queries
  // ============================================================================

  /**
   * Fetches comprehensive sponsorship data for a bill using Drizzle ORM joins
   */
  private async getSponsorshipDataForBill(bill_id: number, sponsorshipType?: 'primary' | 'co-sponsor'): Promise<SponsorshipData[]> {
    // Delegate DB access to the repository which returns normalized DTOs
    try {
      const rows = await getSponsorshipsByBill(bill_id, sponsorshipType);
      return rows as SponsorshipData[];
    } catch (error) {
      logger.error('Error delegating getSponsorshipDataForBill to repository', { bill_id, sponsorshipType }, error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Fetches affiliations for multiple sponsors efficiently
   */
  // Data access moved to repository: getSponsorshipsByBill, getSponsorAffiliations, getSectionConflictsForBill

  /**
   * Fetches affiliations for a single sponsor
   */
  private async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    return await getSponsorAffiliations(sponsor_id);
  }

  /**
   * Fetches section conflicts for a bill
   */
  private async getSectionConflicts(bill_id: number) {
    return await getSectionConflictsForBill(bill_id);
  }

  // ============================================================================
  // PUBLIC API METHODS - BILL-CENTRIC ANALYSIS
  // ============================================================================

  /**
   * Generates comprehensive analysis for a bill's sponsorship
   */
  async getComprehensiveAnalysis(bill_id: number): Promise<ComprehensiveAnalysis> {
    try {
      // Validate input
      if (!bill_id || bill_id <= 0) {
        throw new Error('Invalid bill ID provided');
      }

      // Get bill information
      const billData = await sponsorService.getBillsByIds([bill_id]);
      const bill = billData[0];
      
      if (!bill) {
        throw new Error(`Bill with ID ${bill_id} not found`);
      }

      // Get sponsorship data with all joins
      const sponsorshipData = await this.getSponsorshipDataForBill(bill_id);
      const sectionConflicts = await this.getSectionConflicts(bill_id);

      // Categorize sponsors
      const primarySponsor = sponsorshipData.find(
        s => s.sponsorship?.type === 'primary'
      );
      const coSponsors = sponsorshipData.filter(
        s => s.sponsorship?.type === 'co-sponsor'
      );

      // Calculate financial metrics
      const totalFinancialExposure = this.calculateTotalFinancialExposure(sponsorshipData);
      const industryAlignment = this.calculateIndustryAlignment(sponsorshipData);

      // Generate bill number
      const bill_number = this.generateBillNumber(bill);

      // Determine overall risk level
      const riskLevel = await this.determineOverallRiskLevel(bill_id, sponsorshipData);

      return {
        bill_id,
        title: bill.title,
        number: bill_number,
        introduced: this.formatDate(bill.introduced_date),
        status: bill.status,
        primarySponsor: primarySponsor ? this.formatSponsor(primarySponsor) : null,
        coSponsors: coSponsors.map(s => this.formatSponsor(s)).filter(Boolean) as FormattedSponsor[],
    totalFinancialExposure,
        industryAlignment,
        sections: this.formatSectionConflicts(sectionConflicts),
        financialBreakdown: this.calculateFinancialBreakdown(primarySponsor, coSponsors),
        timeline: this.generateTimeline(bill, sponsorshipData),
        methodology: this.getMethodology(),
        analysisMetadata: {
          generatedAt: new Date().toISOString(),
          sponsorCount: sponsorshipData.length,
          conflictSections: sectionConflicts.length,
          riskLevel
        }
      };
    } catch (error) {
      logger.error('Error in comprehensive analysis', { bill_id }, error as Record<string, any>);
      throw new Error(`Failed to generate analysis for bill ${bill_id}: ${(error as Error).message}`);
    }
  }

  /**
   * Analyzes the primary sponsor in detail for a specific bill
   */
  async getPrimarySponsorAnalysis(bill_id: number) {
    try {
      const sponsorshipData = await this.getSponsorshipDataForBill(bill_id, 'primary');

      if (!sponsorshipData.length) {
        throw new Error(`Primary sponsor not found for bill ${bill_id}`);
      }

  const sponsorData = sponsorshipData[0] as SponsorshipData;

      if (!sponsorData.sponsor) {
        throw new Error(`Sponsor data incomplete for bill ${bill_id}`);
      }

  const sponsor_id = sponsorData.sponsor.id;

      // Use conflict analysis service
      const conflicts = await sponsorConflictAnalysisService.detectConflicts(sponsor_id);
      const billConflicts = conflicts.filter(c => c.affectedBills.includes(bill_id));

      const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(sponsor_id);

      // Calculate bill-specific impact
      const billImpact = await this.calculateBillImpact(bill_id, sponsorData.sponsor);

      // Calculate network position
      const networkAnalysis = await this.calculateNetworkConnections(sponsor_id);

      return {
        sponsor: this.formatSponsor(sponsorData),
        conflictAnalysis: {
          detectedConflicts: billConflicts.length,
          directConflicts: billConflicts.filter(c => c.conflictType === 'financial_direct').length,
          indirectConflicts: billConflicts.filter(c => c.conflictType === 'financial_indirect').length,
    totalExposure: this.parseNumeric(sponsorData.sponsor.financialExposure),
          risk_score: riskProfile.overallScore,
          conflictDetails: billConflicts.map(c => ({
            type: c.conflictType,
            severity: c.severity,
            description: c.description,
            confidence: c.confidence
          }))
        },
        billImpact,
        networkAnalysis,
        riskProfile,
        recommendations: riskProfile.recommendations
      };
    } catch (error) {
      logger.error('Error analyzing primary sponsor', { bill_id }, error as Record<string, any>);
      throw new Error(`Failed to analyze primary sponsor: ${(error as Error).message}`);
    }
  }

  /**
   * Analyzes co-sponsor patterns and relationships for a bill
   */
  async getCoSponsorsAnalysis(bill_id: number) {
    try {
      const coSponsorships = await this.getSponsorshipDataForBill(bill_id, 'co-sponsor');

      // Analyze patterns in parallel
      const [patterns, crossAnalysis] = await Promise.all([
        this.calculateCoSponsorPatterns(coSponsorships),
        this.calculateCrossSponsorsAnalysis(coSponsorships)
      ]);

      const riskDistribution = this.calculateRiskDistribution(coSponsorships);
      const totalExposure = coSponsorships.reduce(
        (sum, s) => sum + this.parseNumeric(s.sponsor?.financialExposure),
        0
      );

      return {
        coSponsors: coSponsorships.map(s => this.formatSponsor(s)),
        patterns,
        crossAnalysis,
        summary: {
          total: coSponsorships.length,
          ...riskDistribution,
          totalExposure
        }
      };
    } catch (error) {
      logger.error('Error analyzing co-sponsors', { bill_id }, error as Record<string, any>);
      throw new Error(`Failed to analyze co-sponsors: ${(error as Error).message}`);
    }
  }

  /**
   * Creates financial network visualization for a bill's sponsors
   */
  async getFinancialNetworkAnalysis(bill_id: number) {
    try {
      const sponsorships = await this.getSponsorshipDataForBill(bill_id);

      // Build network components
      const [networkGraph, industryAnalysis, corporateConnections] = await Promise.all([
        this.buildFinancialNetworkGraph(sponsorships),
        this.calculateIndustryInfluence(sponsorships),
        this.mapCorporateConnections(sponsorships)
      ]);

      const metrics = this.calculateNetworkMetrics(networkGraph);

      return {
        networkGraph,
        industryAnalysis,
        corporateConnections,
        metrics
      };
    } catch (error) {
      logger.error('Error analyzing financial network', { bill_id }, error as Record<string, any>);
      throw new Error(`Failed to analyze financial network: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - DATA FORMATTING AND CALCULATION
  // ============================================================================

  private formatSponsor(sponsorData: SponsorshipData): FormattedSponsor | null {
    if (!sponsorData?.sponsor) return null;

    return {
      id: sponsorData.sponsor.id,
      name: sponsorData.sponsor.name,
      role: sponsorData.sponsor.role,
      party: sponsorData.sponsor.party,
      constituency: sponsorData.sponsor.constituency,
      conflictLevel: sponsorData.sponsor.conflictLevel,
      financialExposure: this.parseNumeric(sponsorData.sponsor.financialExposure),
      affiliations: sponsorData.affiliations || [],
      votingAlignment: this.parseNumeric(sponsorData.sponsor.votingAlignment),
      transparency: {
        disclosure: sponsorData.transparency?.disclosure || 'partial',
        lastUpdated: this.formatDate(sponsorData.transparency?.lastUpdated),
        publicStatements: sponsorData.transparency?.publicStatements || 0
      }
    };
  }

  private calculateTotalFinancialExposure(sponsorships: SponsorshipData[]): number {
    return sponsorships.reduce(
      (total, s) => total + this.parseNumeric(s.sponsor?.financialExposure),
      0
    );
  }

  private calculateIndustryAlignment(sponsorships: SponsorshipData[]): number {
    if (sponsorships.length === 0) return 0;

    const total = sponsorships.reduce(
      (sum, s) => sum + this.parseNumeric(s.sponsor?.votingAlignment),
      0
    );

    return Math.round(total / sponsorships.length);
  }

  private generateBillNumber(bill: any): string {
    const year = new Date(bill.introduced_date || bill.introducedDate || bill.created_at || bill.createdAt).getFullYear();
    const title = bill.title || '';

    if (title.toLowerCase().includes('finance')) return `FB${year}`;
    if (title.toLowerCase().includes('health')) return `NHRA${year}`;
    if (title.toLowerCase().includes('education')) return `EDA${year}`;
    if (title.toLowerCase().includes('environment')) return `EPA${year}`;

    return `BILL${year}/${bill.id}`;
  }

  private formatSectionConflicts(sectionConflicts: any[]) {
    return sectionConflicts.map(section => ({
      number: section.sectionNumber,
      title: section.sectionNumber || section.description || 'Untitled Section',
      conflictLevel: section.severity || 'unknown',
      affectedSponsors: [],
      description: section.description || ''
    }));
  }

  private calculateFinancialBreakdown(primarySponsor: any, coSponsors: any[]) {
    const primaryExposure = primarySponsor
      ? this.parseNumeric(primarySponsor.sponsor?.financialExposure)
      : 0;

    const coSponsorsTotal = coSponsors.reduce(
      (total, s) => total + this.parseNumeric(s.sponsor?.financialExposure),
      0
    );

    const totalExposure = primaryExposure + coSponsorsTotal;

    return {
      primarySponsor: primaryExposure,
      coSponsorsTotal,
      industryContributions: Math.round(totalExposure * 0.6),
      totalExposure
    };
  }

  private async determineOverallRiskLevel(
    bill_id: number,
    sponsorships: SponsorshipData[]
  ): Promise<string> {
    try {
      const sponsor_ids = sponsorships.map(s => s.sponsor?.id).filter(Boolean);
      const allConflicts = await Promise.all(
        sponsor_ids.map(id => sponsorConflictAnalysisService.detectConflicts(id))
      );

      const billConflicts = allConflicts.flat().filter(c =>
        c.affectedBills.includes(bill_id)
      );

      const criticalCount = billConflicts.filter(c => c.severity === 'critical').length;
      const highCount = billConflicts.filter(c => c.severity === 'high').length;

      if (criticalCount > 0) return 'critical';
      if (highCount > 1) return 'high';
      if (highCount > 0 || billConflicts.length > 3) return 'medium';

      return 'low';
    } catch (error) {
      logger.error('Error determining risk level', { bill_id }, error as Record<string, any>);
      return 'unknown';
    }
  }

  private generateTimeline(bill: any, sponsorships: SponsorshipData[]) {
    const timeline: any[] = [];
    const billDate = new Date(bill.introduced_date || bill.created_at);

    const allAffiliations = sponsorships.flatMap(s => s.affiliations || []);

    const earliestAffiliation = allAffiliations
      .filter(a => a.start_date)
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())[0];

    if (earliestAffiliation) {
      timeline.push({
        date: this.formatDate(earliestAffiliation.startDate),
        event: 'Initial organizational affiliations established',
        type: 'affiliation'
      });
    }

    const sixMonthsBefore = new Date(billDate);
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);

    const recentAffiliations = allAffiliations.filter(a => {
      if (!a.startDate) return false;
      const start_date = new Date(a.startDate);
      return start_date > sixMonthsBefore && start_date < billDate;
    });

    if (recentAffiliations.length > 0) {
      timeline.push({
        date: this.formatDate(recentAffiliations[0]?.start_date),
        event: `${recentAffiliations.length} new affiliation(s) established`,
        type: 'governance'
      });
    }

    timeline.push({
      date: this.formatDate(billDate),
      event: 'Bill introduced in Parliament',
      type: 'legislative'
    });

    return timeline.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private getMethodology() {
    return {
      verificationSources: [
        {
          name: 'Parliamentary Records',
          weight: 90,
          reliability: 'high',
          description: 'Official legislative documentation and voting records'
        },
        {
          name: 'Financial Disclosures',
          weight: 85,
          reliability: 'high',
          description: 'Mandatory financial interest declarations'
        },
        {
          name: 'Corporate Registries',
          weight: 80,
          reliability: 'high',
          description: 'Official company registration and directorship records'
        },
        {
          name: 'Media Reports',
          weight: 65,
          reliability: 'medium',
          description: 'Verified journalistic investigations and reports'
        }
      ],
      analysisStages: [
        {
          stage: 'Data Collection',
          description: 'Gathering official records and verified disclosures',
          weight: 0.25
        },
        {
          stage: 'Conflict Detection',
          description: 'Applying automated conflict detection algorithms',
          weight: 0.30
        },
        {
          stage: 'Network Mapping',
          description: 'Identifying relationships and organizational connections',
          weight: 0.20
        },
        {
          stage: 'Risk Assessment',
          description: 'Calculating severity scores and risk profiles',
          weight: 0.15
        },
        {
          stage: 'Validation',
          description: 'Cross-referencing multiple data sources',
          weight: 0.10
        }
      ],
      confidenceMetrics: {
        dataCompleteness: 0.85,
        sourceReliability: 0.82,
        temporalAccuracy: 0.78
      }
    };
  }

  private async calculateBillImpact(bill_id: number, sponsor: any) {
    const exposure = this.parseNumeric(sponsor.financialExposure);
    const alignment = this.parseNumeric(sponsor.votingAlignment);

    const sectionConflicts = await this.getSectionConflicts(bill_id);

    const affectedSections = sectionConflicts.map((s: any) => ({
      section: s.sectionNumber,
      description: s.sectionNumber || s.description || 'Untitled',
      impact: s.severity || 'medium'
    }));

    return {
      affectedSections: affectedSections.length > 0 ? affectedSections : [
        { section: 'Multiple', description: 'Various provisions', impact: 'medium' }
      ],
      benefitEstimate: Math.round(exposure * 0.15),
      alignmentScore: Math.round(alignment),
      potentialInfluence: this.calculatePotentialInfluence(exposure, alignment)
    };
  }

  private calculatePotentialInfluence(exposure: number, alignment: number): string {
    const score = (exposure / 1000000) * (alignment / 100);
    if (score > 50) return 'high';
    if (score > 20) return 'medium';
    return 'low';
  }

  private async calculateNetworkConnections(sponsor_id: number) {
    try {
      const affiliations = await this.getSponsorAffiliations(sponsor_id);

      const directConnections = affiliations.length;
      const leadershipRoles = affiliations.filter(a =>
        a.role && ['director', 'board', 'executive'].some(r =>
          a.role!.toLowerCase().includes(r)
        )
      ).length;

      const influenceScore = Math.min(
        (directConnections * 0.1) + (leadershipRoles * 0.2),
        1.0
      );

      return {
        directConnections,
        indirectConnections: Math.floor(directConnections * 1.5),
        influenceScore: Math.round(influenceScore * 100) / 100,
        centralityRank: Math.max(1, Math.floor(10 - influenceScore * 9))
      };
    } catch (error) {
      logger.error('Error calculating network connections', { sponsor_id }, error as Record<string, any>);
      return {
        directConnections: 0,
        indirectConnections: 0,
        influenceScore: 0,
        centralityRank: 0
      };
    }
  }

  private calculateRiskDistribution(coSponsorships: SponsorshipData[]) {
    const distribution = {
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0
    };

    coSponsorships.forEach(sponsorship => {
      const conflict_level = sponsorship.sponsor?.conflictLevel;
      if (conflict_level === 'high' || conflict_level === 'critical') {
        distribution.highRisk++;
      } else if (conflict_level === 'medium') {
        distribution.mediumRisk++;
      } else {
        distribution.lowRisk++;
      }
    });

    return distribution;
  }

  // ============================================================================
  // CO-SPONSOR PATTERN ANALYSIS
  // ============================================================================

  private async calculateCoSponsorPatterns(coSponsorships: SponsorshipData[]) {
    const sharedConnections = this.calculateSharedConnections(coSponsorships);
    const contributionPatterns = this.calculateContributionPatterns(coSponsorships);
    const voting_alignment = this.calculateVotingAlignment(coSponsorships);

    return {
      sharedConnections,
      contributionPatterns,
      voting_alignment
    };
  }

  private calculateSharedConnections(sponsorships: SponsorshipData[]) {
    const orgMap = new Map<string, number>();

    sponsorships.forEach(sponsorship => {
      const affiliations = sponsorship.affiliations || [];

      affiliations.forEach((affiliation) => {
        const org = affiliation.organization;
        if (org) {
          orgMap.set(org, (orgMap.get(org) || 0) + 1);
        }
      });
    });

    return Array.from(orgMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([org, count]) => ({
        organization: org,
        sponsorCount: count
      }))
      .sort((a, b) => b.sponsorCount - a.sponsorCount);
  }

  private calculateContributionPatterns(sponsorships: SponsorshipData[]) {
    const highExposureSponsors = sponsorships.filter(s =>
      this.parseNumeric(s.sponsor?.financialExposure) > 1000000
    );

    return {
      averageExposure: sponsorships.length > 0
        ? Math.round(
          sponsorships.reduce((sum, s) =>
            sum + this.parseNumeric(s.sponsor?.financialExposure), 0
          ) / sponsorships.length
        )
        : 0,
      highExposureCount: highExposureSponsors.length,
      concentrationIndex: sponsorships.length > 0
        ? highExposureSponsors.length / sponsorships.length
        : 0
    };
  }

  private calculateVotingAlignment(sponsorships: SponsorshipData[]) {
    const alignments = sponsorships.map(s =>
      this.parseNumeric(s.sponsor?.votingAlignment)
    );
    const validAlignments = alignments.filter(a => a > 0);

    if (validAlignments.length === 0) {
      return {
        average: 0,
        highAlignmentCount: 0,
        distribution: { high: 0, medium: 0, low: 0 }
      };
    }

    const average = validAlignments.reduce((sum, val) => sum + val, 0) / validAlignments.length;

    return {
      average: Math.round(average),
      highAlignmentCount: validAlignments.filter(a => a > 80).length,
      distribution: {
        high: validAlignments.filter(a => a > 80).length,
        medium: validAlignments.filter(a => a >= 50 && a <= 80).length,
        low: validAlignments.filter(a => a < 50).length
      }
    };
  }

  private async calculateCrossSponsorsAnalysis(coSponsorships: SponsorshipData[]) {
    const sharedConnections = this.calculateSharedConnections(coSponsorships);

    // Calculate interconnection rate
    const totalPossibleConnections = coSponsorships.length * (coSponsorships.length - 1) / 2;
    const actualSharedOrgs = sharedConnections.length;
    const interconnectionRate = totalPossibleConnections > 0
      ? Math.round((actualSharedOrgs / totalPossibleConnections) * 100)
      : 0;

    return {
      interconnectionRate,
      sharedAffiliations: sharedConnections.length,
      topSharedOrganizations: sharedConnections.slice(0, 5)
    };
  }

  // ============================================================================
  // NETWORK GRAPH BUILDING
  // ============================================================================

  private async buildFinancialNetworkGraph(sponsorships: SponsorshipData[]) {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const seenOrgs = new Set<string>();

    sponsorships.forEach(sponsorship => {
      if (!sponsorship.sponsor?.id) return;

      // Add sponsor node
      nodes.push({
        id: `sponsor_${sponsorship.sponsor.id}`,
        type: 'sponsor',
        name: sponsorship.sponsor.name || 'Unknown',
        size: Math.log(this.parseNumeric(sponsorship.sponsor.financialExposure) + 1) * 2
      });

      // Add organization nodes and edges
      const affiliations = sponsorship.affiliations || [];

      affiliations.forEach((affiliation) => {
        if (!affiliation.organization) return;

        const orgId = `org_${affiliation.organization.replace(/\s+/g, '_').toLowerCase()}`;

        // Add organization node if not already added
        if (!seenOrgs.has(orgId)) {
          seenOrgs.add(orgId);
          nodes.push({
            id: orgId,
            type: 'organization',
            name: affiliation.organization,
            size: 1
          });
        }

        // Add edge between sponsor and organization
        edges.push({
          source: `sponsor_${sponsorship.sponsor.id}`,
          target: orgId,
          type: affiliation.type || 'unknown',
          weight: affiliation.conflictType === 'direct' ? 3 : 1
        });
      });
    });

    return { nodes, edges };
  }

  private calculateNetworkMetrics(networkGraph: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
    const { nodes, edges } = networkGraph;

    const density = this.calculateNetworkDensity(nodes, edges);
    const centralityScores = this.calculateCentralityScores(nodes, edges);
    const interconnectionRate = this.calculateInterconnectionRate(nodes, edges);

    return {
      totalEntities: nodes.length,
      totalConnections: edges.length,
      interconnectionRate,
      centralityScores,
      density
    };
  }

  private calculateNetworkDensity(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length < 2) return 0;

    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    return Math.round((edges.length / maxPossibleEdges) * 100) / 100;
  }

  private calculateCentralityScores(nodes: NetworkNode[], edges: NetworkEdge[]) {
    const scores: Record<string, number> = {};

    nodes.forEach(node => {
      const connections = edges.filter(edge =>
        edge.source === node.id || edge.target === node.id
      ).length;
      scores[node.id] = connections;
    });

    return scores;
  }

  private calculateInterconnectionRate(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length < 2) return 0;

    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    return Math.round((edges.length / maxPossibleEdges) * 100);
  }

  // ============================================================================
  // INDUSTRY ANALYSIS
  // ============================================================================

  private async calculateIndustryInfluence(sponsorships: SponsorshipData[]) {
    const breakdown = this.calculateIndustryBreakdown(sponsorships);

    const dominantSector = breakdown.length > 0
      ? breakdown.reduce((max, sector) =>
        sector.percentage > max.percentage ? sector : max,
        breakdown[0] as any
      )
      : { sector: 'None', percentage: 0, amount: 0 };

    return {
      breakdown,
      dominantSector,
      diversityIndex: this.calculateDiversityIndex(breakdown)
    };
  }

  private calculateIndustryBreakdown(sponsorships: SponsorshipData[]) {
    const industries = new Map<string, number>();

    sponsorships.forEach(sponsorship => {
      const affiliations = sponsorship.affiliations || [];

      affiliations.forEach((affiliation) => {
        if (!affiliation.organization) return;

        const sector = this.categorizeIndustry(affiliation.organization);
  const exposure = this.parseNumeric(sponsorship.sponsor?.financialExposure);

        industries.set(sector, (industries.get(sector) || 0) + exposure);
      });
    });

    const total = Array.from(industries.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(industries.entries())
      .map(([sector, amount]) => ({
        sector,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private categorizeIndustry(organization: string): string {
    if (!organization) return 'Other';

    const orgLower = organization.toLowerCase();

    for (const [keyword, category] of this.industryCategories.entries()) {
      if (orgLower.includes(keyword)) {
        return category;
      }
    }

    return 'Other';
  }

  private calculateDiversityIndex(breakdown: any[]): number {
    if (breakdown.length === 0) return 0;

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    if (total === 0) return 0;

    // Calculate Shannon entropy
    const entropy = breakdown.reduce((sum, item) => {
      const proportion = item.amount / total;
      return sum - (proportion * Math.log2(proportion || 1));
    }, 0);

    const maxEntropy = Math.log2(breakdown.length);
    return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) / 100 : 0;
  }

  private async mapCorporateConnections(sponsorships: SponsorshipData[]) {
    const connections = new Map<string, any>();

    sponsorships.forEach(sponsorship => {
      const affiliations = sponsorship.affiliations || [];

      affiliations.forEach((affiliation) => {
        if (!affiliation.organization) return;

        const key = affiliation.organization;
  const exposure = this.parseNumeric(sponsorship.sponsor?.financialExposure);

        if (connections.has(key)) {
          const existing = connections.get(key);
          existing.sponsors.push(sponsorship.sponsor?.name || 'Unknown');
          existing.totalExposure += exposure;
          existing.connectionCount++;
        } else {
          connections.set(key, {
            organization: key,
            type: affiliation.type || 'unknown',
            sponsors: [sponsorship.sponsor?.name || 'Unknown'],
            totalExposure: exposure,
            connectionCount: 1,
            influenceLevel: affiliation.conflictType === 'direct' ? 'high' : 'medium'
          });
        }
      });
    });

    return Array.from(connections.values())
      .sort((a, b) => b.totalExposure - a.totalExposure)
      .slice(0, 20); // Top 20 connections
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private formatDate(date: any): string {
    // Normalize input and always return a string (guarding against TS indexing string[] -> possibly undefined)
    const toIsoDatePart = (d: Date) => {
      const iso = d.toISOString();
      // split returns string[]; index 0 exists but TS marks it possibly undefined - assert non-null
      return iso.split('T')[0]!;
    };

    if (!date) return toIsoDatePart(new Date());
    if (date instanceof Date) return toIsoDatePart(date);
    if (typeof date === 'string') {
      try {
        return toIsoDatePart(new Date(date));
      } catch {
        return toIsoDatePart(new Date());
      }
    }

    return toIsoDatePart(new Date());
  }
}

export const sponsorshipAnalysisService = new SponsorshipAnalysisService();
