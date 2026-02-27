import { sponsorConflictAnalysisService } from '@server/features/sponsors/application/sponsor-conflict-analysis.service';
import { sponsorService } from '@server/features/sponsors/application/sponsor-service-direct';
import { logger } from '@server/infrastructure/observability';
import {
  getSectionConflictsForBill,
  getSponsorAffiliations,
  getSponsorshipsByBill,
} from '../repositories/sponsorship-repository';

// ============================================================================
// TYPE DEFINITIONS FOR BILL-CENTRIC ANALYSIS
// ============================================================================

interface Bill {
  id: number;
  title: string;
  status: string;
  introduced_date?: string | null;
  introducedDate?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface SponsorAffiliation {
  id: number;
  sponsor_id: number;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  /** Nullable to align with the repository DTO */
  conflictType?: string | null;
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

interface SectionConflict {
  sectionNumber?: string | null;
  description?: string | null;
  severity?: string | null;
}

interface IndustryBreakdownItem {
  sector: string;
  amount: number;
  percentage: number;
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

interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
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
  sections: FormattedSection[];
  financialBreakdown: {
    primarySponsor: number;
    coSponsorsTotal: number;
    industryContributions: number;
    totalExposure: number;
  };
  timeline: TimelineEvent[];
  methodology: MethodologyData;
  analysisMetadata: {
    generatedAt: string;
    sponsorCount: number;
    conflictSections: number;
    riskLevel: string;
  };
}

interface FormattedSection {
  number: string | null | undefined;
  title: string;
  conflictLevel: string;
  affectedSponsors: unknown[];
  description: string;
}

interface TimelineEvent {
  date: string;
  event: string;
  type: string;
}

interface MethodologySource {
  name: string;
  weight: number;
  reliability: string;
  description: string;
}

interface MethodologyStage {
  stage: string;
  description: string;
  weight: number;
}

interface MethodologyData {
  verificationSources: MethodologySource[];
  analysisStages: MethodologyStage[];
  confidenceMetrics: {
    dataCompleteness: number;
    sourceReliability: number;
    temporalAccuracy: number;
  };
}

interface CorporateConnection {
  organization: string;
  type: string;
  sponsors: string[];
  totalExposure: number;
  connectionCount: number;
  influenceLevel: string;
}

/**
 * SponsorshipAnalysisService - Bill-Centric Presentation Layer
 *
 * Uses Drizzle ORM via repository functions. Delegates conflict detection
 * to the dedicated conflict analysis service.
 */
export class SponsorshipAnalysisService {

  // Industry categorization for financial analysis
  private readonly industryCategories = new Map<string, string>([
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
    ['insurance', 'Financial Services'],
  ]);

  // ============================================================================
  // DATA ACCESS LAYER
  // ============================================================================

  private async getSponsorshipDataForBill(
    bill_id: number,
    sponsorshipType?: 'primary' | 'co-sponsor',
  ): Promise<SponsorshipData[]> {
    try {
      const rows = await getSponsorshipsByBill(bill_id, sponsorshipType);
      return rows as SponsorshipData[];
    } catch (error) {
      logger.error(
        { bill_id, sponsorshipType, error },
        'Error delegating getSponsorshipDataForBill to repository'
      );
      throw error;
    }
  }

  private async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    const rows = await getSponsorAffiliations(sponsor_id);
    // Normalise null → undefined for conflictType to satisfy local interface
    return (rows as SponsorAffiliation[]).map((a) => ({
      ...a,
      conflictType: a.conflictType ?? undefined,
    }));
  }

  private async getSectionConflicts(bill_id: number): Promise<SectionConflict[]> {
    return (await getSectionConflictsForBill(bill_id)) as SectionConflict[];
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async getComprehensiveAnalysis(bill_id: number): Promise<ComprehensiveAnalysis> {
    try {
      if (!bill_id || bill_id <= 0) throw new Error('Invalid bill ID provided');

      // sponsorService.getBillsByIds → cast to any if the method exists at runtime
      // but is not yet typed; replace with a typed bills-repository call when available.
      const billData = await (sponsorService as unknown as { getBillsByIds(ids: number[]): Promise<Bill[]> })
        .getBillsByIds([bill_id]);
      const bill = billData[0];

      if (!bill) throw new Error(`Bill with ID ${bill_id} not found`);

      const sponsorshipData = await this.getSponsorshipDataForBill(bill_id);
      const sectionConflicts = await this.getSectionConflicts(bill_id);

      const primarySponsor = sponsorshipData.find((s) => s.sponsorship?.type === 'primary');
      const coSponsors = sponsorshipData.filter((s) => s.sponsorship?.type === 'co-sponsor');

      const totalFinancialExposure = this.calculateTotalFinancialExposure(sponsorshipData);
      const industryAlignment = this.calculateIndustryAlignment(sponsorshipData);
      const bill_number = this.generateBillNumber(bill);
      const riskLevel = await this.determineOverallRiskLevel(bill_id, sponsorshipData);

      return {
        bill_id,
        title: bill.title,
        number: bill_number,
        introduced: this.formatDate(bill.introduced_date),
        status: bill.status,
        primarySponsor: primarySponsor ? this.formatSponsor(primarySponsor) : null,
        coSponsors: coSponsors
          .map((s) => this.formatSponsor(s))
          .filter((s): s is FormattedSponsor => s !== null),
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
          riskLevel,
        },
      };
    } catch (error) {
      logger.error({ bill_id, error }, 'Error in comprehensive analysis');
      throw new Error(`Failed to generate analysis for bill ${bill_id}: ${(error as Error).message}`);
    }
  }

  async getPrimarySponsorAnalysis(bill_id: number) {
    try {
      const sponsorshipData = await this.getSponsorshipDataForBill(bill_id, 'primary');

      if (!sponsorshipData.length) throw new Error(`Primary sponsor not found for bill ${bill_id}`);

      const sponsorData = sponsorshipData[0] as SponsorshipData;
      if (!sponsorData.sponsor) throw new Error(`Sponsor data incomplete for bill ${bill_id}`);

      const sponsor_id = sponsorData.sponsor.id;

      const conflicts = await sponsorConflictAnalysisService.detectConflicts(sponsor_id);
      const billConflicts = conflicts.filter((c) => c.affectedBills.includes(bill_id));
      const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(sponsor_id);
      const billImpact = await this.calculateBillImpact(bill_id, sponsorData.sponsor);
      const networkAnalysis = await this.calculateNetworkConnections(sponsor_id);

      return {
        sponsor: this.formatSponsor(sponsorData),
        conflictAnalysis: {
          detectedConflicts: billConflicts.length,
          directConflicts: billConflicts.filter((c) => c.conflictType === 'financial_direct').length,
          indirectConflicts: billConflicts.filter((c) => c.conflictType === 'financial_indirect').length,
          totalExposure: this.parseNumeric(sponsorData.sponsor.financialExposure),
          risk_score: riskProfile.overallScore,
          conflictDetails: billConflicts.map((c) => ({
            type: c.conflictType,
            severity: c.severity,
            description: c.description,
            confidence: c.confidence,
          })),
        },
        billImpact,
        networkAnalysis,
        riskProfile,
        recommendations: riskProfile.recommendations,
      };
    } catch (error) {
      logger.error({ bill_id, error }, 'Error analyzing primary sponsor');
      throw new Error(`Failed to analyze primary sponsor: ${(error as Error).message}`);
    }
  }

  async getCoSponsorsAnalysis(bill_id: number) {
    try {
      const coSponsorships = await this.getSponsorshipDataForBill(bill_id, 'co-sponsor');

      const [patterns, crossAnalysis] = await Promise.all([
        this.calculateCoSponsorPatterns(coSponsorships),
        this.calculateCrossSponsorsAnalysis(coSponsorships),
      ]);

      const riskDistribution = this.calculateRiskDistribution(coSponsorships);
      const totalExposure = coSponsorships.reduce(
        (sum, s) => sum + this.parseNumeric(s.sponsor?.financialExposure),
        0,
      );

      return {
        coSponsors: coSponsorships
          .map((s) => this.formatSponsor(s))
          .filter((s): s is FormattedSponsor => s !== null),
        patterns,
        crossAnalysis,
        summary: { total: coSponsorships.length, ...riskDistribution, totalExposure },
      };
    } catch (error) {
      logger.error({ bill_id, error }, 'Error analyzing co-sponsors');
      throw new Error(`Failed to analyze co-sponsors: ${(error as Error).message}`);
    }
  }

  async getFinancialNetworkAnalysis(bill_id: number) {
    try {
      const sponsorships = await this.getSponsorshipDataForBill(bill_id);

      const [networkGraph, industryAnalysis, corporateConnections] = await Promise.all([
        this.buildFinancialNetworkGraph(sponsorships),
        this.calculateIndustryInfluence(sponsorships),
        this.mapCorporateConnections(sponsorships),
      ]);

      const metrics = this.calculateNetworkMetrics(networkGraph);

      return { networkGraph, industryAnalysis, corporateConnections, metrics };
    } catch (error) {
      logger.error({ bill_id, error }, 'Error analyzing financial network');
      throw new Error(`Failed to analyze financial network: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
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
        publicStatements: sponsorData.transparency?.publicStatements || 0,
      },
    };
  }

  private calculateTotalFinancialExposure(sponsorships: SponsorshipData[]): number {
    return sponsorships.reduce(
      (total, s) => total + this.parseNumeric(s.sponsor?.financialExposure),
      0,
    );
  }

  private calculateIndustryAlignment(sponsorships: SponsorshipData[]): number {
    if (sponsorships.length === 0) return 0;
    const total = sponsorships.reduce(
      (sum, s) => sum + this.parseNumeric(s.sponsor?.votingAlignment),
      0,
    );
    return Math.round(total / sponsorships.length);
  }

  private generateBillNumber(bill: Bill): string {
    const raw = bill.introduced_date ?? bill.introducedDate ?? bill.created_at ?? bill.createdAt;
    const year = raw ? new Date(raw).getFullYear() : new Date().getFullYear();
    const title = bill.title ?? '';
    const t = title.toLowerCase();

    if (t.includes('finance')) return `FB${year}`;
    if (t.includes('health')) return `NHRA${year}`;
    if (t.includes('education')) return `EDA${year}`;
    if (t.includes('environment')) return `EPA${year}`;
    return `BILL${year}/${bill.id}`;
  }

  private formatSectionConflicts(sectionConflicts: SectionConflict[]): FormattedSection[] {
    return sectionConflicts.map((section) => ({
      number: section.sectionNumber,
      title: section.sectionNumber || section.description || 'Untitled Section',
      conflictLevel: section.severity || 'unknown',
      affectedSponsors: [],
      description: section.description || '',
    }));
  }

  private calculateFinancialBreakdown(
    primarySponsor: SponsorshipData | undefined,
    coSponsors: SponsorshipData[],
  ): {
    primarySponsor: number;
    coSponsorsTotal: number;
    industryContributions: number;
    totalExposure: number;
  } {
    const primaryExposure = primarySponsor
      ? this.parseNumeric(primarySponsor.sponsor?.financialExposure)
      : 0;

    const coSponsorsTotal: number = coSponsors.reduce(
      (total: number, s: SponsorshipData) => total + this.parseNumeric(s.sponsor?.financialExposure),
      0,
    );

    const totalExposure = primaryExposure + coSponsorsTotal;

    return {
      primarySponsor: primaryExposure,
      coSponsorsTotal,
      industryContributions: Math.round(totalExposure * 0.6),
      totalExposure,
    };
  }

  private async determineOverallRiskLevel(
    bill_id: number,
    sponsorships: SponsorshipData[],
  ): Promise<string> {
    try {
      const sponsor_ids = sponsorships.map((s) => s.sponsor?.id).filter(Boolean) as number[];
      const allConflicts = await Promise.all(
        sponsor_ids.map((id) => sponsorConflictAnalysisService.detectConflicts(id)),
      );

      const billConflicts = allConflicts.flat().filter((c) => c.affectedBills.includes(bill_id));
      const criticalCount = billConflicts.filter((c) => c.severity === 'critical').length;
      const highCount = billConflicts.filter((c) => c.severity === 'high').length;

      if (criticalCount > 0) return 'critical';
      if (highCount > 1) return 'high';
      if (highCount > 0 || billConflicts.length > 3) return 'medium';
      return 'low';
    } catch (error) {
      logger.error({ bill_id, error }, 'Error determining risk level');
      return 'unknown';
    }
  }

  private generateTimeline(bill: Bill, sponsorships: SponsorshipData[]): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];
    const rawDate = bill.introduced_date ?? bill.introducedDate ?? bill.created_at ?? bill.createdAt;
    const billDate = rawDate ? new Date(rawDate) : new Date();

    const allAffiliations = sponsorships.flatMap((s) => s.affiliations ?? []);

    const earliestAffiliation = allAffiliations
      .filter((a) => a.start_date)
      .sort(
        (a, b) =>
          new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime(),
      )[0];

    if (earliestAffiliation) {
      timeline.push({
        date: this.formatDate(earliestAffiliation.start_date),
        event: 'Initial organizational affiliations established',
        type: 'affiliation',
      });
    }

    const sixMonthsBefore = new Date(billDate);
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);

    const recentAffiliations = allAffiliations.filter((a) => {
      if (!a.start_date) return false;
      const startDate = new Date(a.start_date);
      return startDate > sixMonthsBefore && startDate < billDate;
    });

    if (recentAffiliations.length > 0) {
      timeline.push({
        date: this.formatDate(recentAffiliations[0]?.start_date),
        event: `${recentAffiliations.length} new affiliation(s) established`,
        type: 'governance',
      });
    }

    timeline.push({
      date: this.formatDate(billDate),
      event: 'Bill introduced in Parliament',
      type: 'legislative',
    });

    return timeline.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  private getMethodology(): MethodologyData {
    return {
      verificationSources: [
        {
          name: 'Parliamentary Records',
          weight: 90,
          reliability: 'high',
          description: 'Official legislative documentation and voting records',
        },
        {
          name: 'Financial Disclosures',
          weight: 85,
          reliability: 'high',
          description: 'Mandatory financial interest declarations',
        },
        {
          name: 'Corporate Registries',
          weight: 80,
          reliability: 'high',
          description: 'Official company registration and directorship records',
        },
        {
          name: 'Media Reports',
          weight: 65,
          reliability: 'medium',
          description: 'Verified journalistic investigations and reports',
        },
      ],
      analysisStages: [
        { stage: 'Data Collection', description: 'Gathering official records and verified disclosures', weight: 0.25 },
        { stage: 'Conflict Detection', description: 'Applying automated conflict detection algorithms', weight: 0.30 },
        { stage: 'Network Mapping', description: 'Identifying relationships and organizational connections', weight: 0.20 },
        { stage: 'Risk Assessment', description: 'Calculating severity scores and risk profiles', weight: 0.15 },
        { stage: 'Validation', description: 'Cross-referencing multiple data sources', weight: 0.10 },
      ],
      confidenceMetrics: {
        dataCompleteness: 0.85,
        sourceReliability: 0.82,
        temporalAccuracy: 0.78,
      },
    };
  }

  private async calculateBillImpact(
    bill_id: number,
    sponsor: SponsorshipData['sponsor'],
  ) {
    const exposure = this.parseNumeric(sponsor.financialExposure);
    const alignment = this.parseNumeric(sponsor.votingAlignment);
    const sectionConflicts = await this.getSectionConflicts(bill_id);

    const affectedSections = sectionConflicts.map((s) => ({
      section: s.sectionNumber,
      description: s.sectionNumber || s.description || 'Untitled',
      impact: s.severity || 'medium',
    }));

    return {
      affectedSections:
        affectedSections.length > 0
          ? affectedSections
          : [{ section: 'Multiple', description: 'Various provisions', impact: 'medium' }],
      benefitEstimate: Math.round(exposure * 0.15),
      alignmentScore: Math.round(alignment),
      potentialInfluence: this.calculatePotentialInfluence(exposure, alignment),
    };
  }

  private calculatePotentialInfluence(exposure: number, alignment: number): string {
    const score = (exposure / 1_000_000) * (alignment / 100);
    if (score > 50) return 'high';
    if (score > 20) return 'medium';
    return 'low';
  }

  private async calculateNetworkConnections(sponsor_id: number) {
    try {
      const affiliations = await this.getSponsorAffiliations(sponsor_id);

      const directConnections = affiliations.length;
      const leadershipRoles = affiliations.filter(
        (a) =>
          a.role &&
          ['director', 'board', 'executive'].some((r) => a.role!.toLowerCase().includes(r)),
      ).length;

      const influenceScore = Math.min(directConnections * 0.1 + leadershipRoles * 0.2, 1.0);

      return {
        directConnections,
        indirectConnections: Math.floor(directConnections * 1.5),
        influenceScore: Math.round(influenceScore * 100) / 100,
        centralityRank: Math.max(1, Math.floor(10 - influenceScore * 9)),
      };
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error calculating network connections');
      return { directConnections: 0, indirectConnections: 0, influenceScore: 0, centralityRank: 0 };
    }
  }

  private calculateRiskDistribution(coSponsorships: SponsorshipData[]) {
    return coSponsorships.reduce(
      (dist, sponsorship) => {
        const level = sponsorship.sponsor?.conflictLevel;
        if (level === 'high' || level === 'critical') dist.highRisk++;
        else if (level === 'medium') dist.mediumRisk++;
        else dist.lowRisk++;
        return dist;
      },
      { highRisk: 0, mediumRisk: 0, lowRisk: 0 },
    );
  }

  // ============================================================================
  // CO-SPONSOR PATTERN ANALYSIS
  // ============================================================================

  private async calculateCoSponsorPatterns(coSponsorships: SponsorshipData[]) {
    const sharedConnections = this.calculateSharedConnections(coSponsorships);
    const contributionPatterns = this.calculateContributionPatterns(coSponsorships);
    const voting_alignment = this.calculateVotingAlignment(coSponsorships);
    return { sharedConnections, contributionPatterns, voting_alignment };
  }

  private calculateSharedConnections(sponsorships: SponsorshipData[]) {
    const orgMap = new Map<string, number>();

    for (const sponsorship of sponsorships) {
      for (const affiliation of sponsorship.affiliations ?? []) {
        if (affiliation.organization) {
          orgMap.set(affiliation.organization, (orgMap.get(affiliation.organization) ?? 0) + 1);
        }
      }
    }

    return Array.from(orgMap.entries())
      .filter(([, count]) => count > 1)
      .map(([org, count]) => ({ organization: org, sponsorCount: count }))
      .sort((a, b) => b.sponsorCount - a.sponsorCount);
  }

  private calculateContributionPatterns(sponsorships: SponsorshipData[]) {
    const highExposureSponsors = sponsorships.filter(
      (s) => this.parseNumeric(s.sponsor?.financialExposure) > 1_000_000,
    );

    const averageExposure =
      sponsorships.length > 0
        ? Math.round(
            sponsorships.reduce(
              (sum, s) => sum + this.parseNumeric(s.sponsor?.financialExposure),
              0,
            ) / sponsorships.length,
          )
        : 0;

    return {
      averageExposure,
      highExposureCount: highExposureSponsors.length,
      concentrationIndex:
        sponsorships.length > 0 ? highExposureSponsors.length / sponsorships.length : 0,
    };
  }

  private calculateVotingAlignment(sponsorships: SponsorshipData[]) {
    const validAlignments = sponsorships
      .map((s) => this.parseNumeric(s.sponsor?.votingAlignment))
      .filter((a) => a > 0);

    if (validAlignments.length === 0) {
      return { average: 0, highAlignmentCount: 0, distribution: { high: 0, medium: 0, low: 0 } };
    }

    const average =
      validAlignments.reduce((sum, val) => sum + val, 0) / validAlignments.length;

    return {
      average: Math.round(average),
      highAlignmentCount: validAlignments.filter((a) => a > 80).length,
      distribution: {
        high: validAlignments.filter((a) => a > 80).length,
        medium: validAlignments.filter((a) => a >= 50 && a <= 80).length,
        low: validAlignments.filter((a) => a < 50).length,
      },
    };
  }

  private async calculateCrossSponsorsAnalysis(coSponsorships: SponsorshipData[]) {
    const sharedConnections = this.calculateSharedConnections(coSponsorships);
    const n = coSponsorships.length;
    const totalPossibleConnections = n * (n - 1) / 2;
    const interconnectionRate =
      totalPossibleConnections > 0
        ? Math.round((sharedConnections.length / totalPossibleConnections) * 100)
        : 0;

    return {
      interconnectionRate,
      sharedAffiliations: sharedConnections.length,
      topSharedOrganizations: sharedConnections.slice(0, 5),
    };
  }

  // ============================================================================
  // NETWORK GRAPH BUILDING
  // ============================================================================

  private async buildFinancialNetworkGraph(sponsorships: SponsorshipData[]): Promise<NetworkGraph> {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const seenOrgs = new Set<string>();

    for (const sponsorship of sponsorships) {
      if (!sponsorship.sponsor?.id) continue;

      nodes.push({
        id: `sponsor_${sponsorship.sponsor.id}`,
        type: 'sponsor',
        name: sponsorship.sponsor.name ?? 'Unknown',
        size: Math.log(this.parseNumeric(sponsorship.sponsor.financialExposure) + 1) * 2,
      });

      for (const affiliation of sponsorship.affiliations ?? []) {
        if (!affiliation.organization) continue;

        const orgId = `org_${affiliation.organization.replace(/\s+/g, '_').toLowerCase()}`;

        if (!seenOrgs.has(orgId)) {
          seenOrgs.add(orgId);
          nodes.push({ id: orgId, type: 'organization', name: affiliation.organization, size: 1 });
        }

        edges.push({
          source: `sponsor_${sponsorship.sponsor.id}`,
          target: orgId,
          type: affiliation.type ?? 'unknown',
          weight: affiliation.conflictType === 'direct' ? 3 : 1,
        });
      }
    }

    return { nodes, edges };
  }

  private calculateNetworkMetrics(networkGraph: NetworkGraph) {
    const { nodes, edges } = networkGraph;
    return {
      totalEntities: nodes.length,
      totalConnections: edges.length,
      interconnectionRate: this.calculateInterconnectionRate(nodes, edges),
      centralityScores: this.calculateCentralityScores(nodes, edges),
      density: this.calculateNetworkDensity(nodes, edges),
    };
  }

  private calculateNetworkDensity(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length < 2) return 0;
    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    return Math.round((edges.length / maxPossibleEdges) * 100) / 100;
  }

  private calculateCentralityScores(nodes: NetworkNode[], edges: NetworkEdge[]): Record<string, number> {
    return Object.fromEntries(
      nodes.map((node) => [
        node.id,
        edges.filter((e) => e.source === node.id || e.target === node.id).length,
      ]),
    );
  }

  private calculateInterconnectionRate(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length < 2) return 0;
    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    return Math.round((edges.length / maxPossibleEdges) * 100);
  }

  // ============================================================================
  // INDUSTRY ANALYSIS
  // ============================================================================

  private async calculateIndustryInfluence(sponsorships: SponsorshipData[]) {
    const breakdown = this.calculateIndustryBreakdown(sponsorships);

    const dominantSector: IndustryBreakdownItem =
      breakdown.length > 0
        ? breakdown.reduce(
            (max: IndustryBreakdownItem, sector: IndustryBreakdownItem) =>
              sector.percentage > max.percentage ? sector : max,
            breakdown[0]!,
          )
        : { sector: 'None', percentage: 0, amount: 0 };

    return { breakdown, dominantSector, diversityIndex: this.calculateDiversityIndex(breakdown) };
  }

  private calculateIndustryBreakdown(sponsorships: SponsorshipData[]): IndustryBreakdownItem[] {
    const industries = new Map<string, number>();

    for (const sponsorship of sponsorships) {
      for (const affiliation of sponsorship.affiliations ?? []) {
        if (!affiliation.organization) continue;
        const sector = this.categorizeIndustry(affiliation.organization);
        const exposure = this.parseNumeric(sponsorship.sponsor?.financialExposure);
        industries.set(sector, (industries.get(sector) ?? 0) + exposure);
      }
    }

    const total = Array.from(industries.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(industries.entries())
      .map(([sector, amount]) => ({
        sector,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private categorizeIndustry(organization: string): string {
    if (!organization) return 'Other';
    const orgLower = organization.toLowerCase();
    for (const [keyword, category] of this.industryCategories.entries()) {
      if (orgLower.includes(keyword)) return category;
    }
    return 'Other';
  }

  private calculateDiversityIndex(breakdown: IndustryBreakdownItem[]): number {
    if (breakdown.length === 0) return 0;
    const total = breakdown.reduce((sum: number, item: IndustryBreakdownItem) => sum + item.amount, 0);
    if (total === 0) return 0;

    const entropy = breakdown.reduce((sum: number, item: IndustryBreakdownItem) => {
      const proportion = item.amount / total;
      return sum - proportion * Math.log2(proportion || 1);
    }, 0);

    const maxEntropy = Math.log2(breakdown.length);
    return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) / 100 : 0;
  }

  private async mapCorporateConnections(sponsorships: SponsorshipData[]) {
    const connections = new Map<string, CorporateConnection>();

    for (const sponsorship of sponsorships) {
      for (const affiliation of sponsorship.affiliations ?? []) {
        if (!affiliation.organization) continue;

        const key = affiliation.organization;
        const exposure = this.parseNumeric(sponsorship.sponsor?.financialExposure);
        const sponsorName = sponsorship.sponsor?.name ?? 'Unknown';

        const existing = connections.get(key);
        if (existing) {
          existing.sponsors.push(sponsorName);
          existing.totalExposure += exposure;
          existing.connectionCount++;
        } else {
          connections.set(key, {
            organization: key,
            type: affiliation.type ?? 'unknown',
            sponsors: [sponsorName],
            totalExposure: exposure,
            connectionCount: 1,
            influenceLevel: affiliation.conflictType === 'direct' ? 'high' : 'medium',
          });
        }
      }
    }

    return Array.from(connections.values())
      .sort((a, b) => b.totalExposure - a.totalExposure)
      .slice(0, 20);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private parseNumeric(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private formatDate(date: unknown): string {
    const toIsoDatePart = (d: Date): string => d.toISOString().split('T')[0]!;

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