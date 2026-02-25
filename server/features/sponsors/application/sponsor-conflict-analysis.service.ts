/**
 * Sponsor Conflict Analysis Service
 * 
 * Detects and analyzes potential conflicts of interest for legislative sponsors.
 * Uses the SponsorService for data access and contains no direct DB queries.
 */

import { logger } from '@server/infrastructure/observability';
import { sponsorService } from './sponsor-service-direct';
import type { Sponsor } from '@server/infrastructure/schema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ConflictType =
  | 'financial_direct'
  | 'financial_indirect'
  | 'organizational'
  | 'family_business'
  | 'voting_pattern'
  | 'timing_suspicious'
  | 'disclosure_incomplete';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

interface SponsorAffiliation {
  id: number;
  sponsor_id: number;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  conflictType?: string | null;
}

interface SponsorTransparency {
  id: number;
  sponsor_id: number;
  disclosure: string | null;
  disclosureType?: string | null;
  dateReported: string | null;
  amount: number | null;
  is_verified: boolean | null;
}

interface BillSponsorship {
  id?: number;
  bill_id: number;
  role?: string;
}

interface SponsorWithRelations extends Sponsor {
  affiliations?: SponsorAffiliation[];
  transparency?: SponsorTransparency[];
  sponsorships?: BillSponsorship[];
}

export interface ConflictDetectionResult {
  conflictId: string;
  sponsor_id: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedBills: number[];
  financialImpact: number;
  detectedAt: Date;
  confidence: number;
  evidence: string[];
  relatedAffiliationId?: number;
  relatedTransparencyId?: number;
}

export interface RiskProfile {
  overallScore: number;
  level: ConflictSeverity;
  breakdown: {
    financialRisk: number;
    affiliationRisk: number;
    transparencyRisk: number;
    behavioralRisk: number;
  };
  recommendations: string[];
}

export interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflict_level: ConflictSeverity;
  size: number;
  color: string;
  metadata?: Record<string, unknown>;
}

export interface ConflictEdge {
  source: string;
  target: string;
  type: ConflictType;
  weight: number;
  severity: ConflictSeverity;
  label?: string;
}

export interface ConflictCluster {
  id: string;
  members: string[];
  centerNode: string;
  conflictDensity: number;
  riskLevel: ConflictSeverity;
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  clustering: number;
  centralityScores: Record<string, number>;
  riskDistribution: Record<ConflictSeverity, number>;
}

export interface ConflictMapping {
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  clusters: ConflictCluster[];
  metrics: NetworkMetrics;
}

export interface ConflictPrediction {
  bill_id: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
}

export interface ConflictTrend {
  sponsor_id: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  risk_score: number;
  predictions: ConflictPrediction[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SponsorConflictAnalysisService {
  private sponsorService = sponsorService;

  private readonly conflictThresholds = {
    financial: {
      critical: 10000000,
      high: 5000000,
      medium: 1000000,
      low: 100000
    },
    timing: {
      suspicious_days: 30,
      very_suspicious_days: 7
    },
    disclosure: {
      complete_threshold: 0.9,
      adequate_threshold: 0.7
    },
    affiliation: {
      high_count: 5,
      critical_count: 10
    }
  };

  private readonly severityColors: Record<ConflictSeverity, string> = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#FF5722',
    critical: '#D32F2F'
  };

  private readonly conflictTypeWeights: Record<ConflictType, number> = {
    financial_direct: 40,
    financial_indirect: 25,
    organizational: 20,
    family_business: 35,
    voting_pattern: 30,
    timing_suspicious: 45,
    disclosure_incomplete: 15
  };

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async detectConflicts(sponsor_id?: number): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectConflicts', sponsor_id };
    logger.info(logContext, `Starting conflict detection for ${sponsor_id ? `sponsor ${sponsor_id}` : 'all active sponsors'}`);

    try {
      const sponsorsToAnalyze = sponsor_id
        ? await this.getSponsorData([sponsor_id])
        : await this.getAllActiveSponsorData();

      if (sponsorsToAnalyze.length === 0) {
        logger.warn(logContext, 'No sponsors found for conflict detection');
        return [];
      }

      const detectionPromises = sponsorsToAnalyze.map(async (sponsorData) => {
        if (!sponsorData) return [];

        const sponsor = sponsorData as SponsorWithRelations;
        const sponsorConflicts = await Promise.allSettled([
          this.detectFinancialConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          this.detectOrganizationalConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          this.detectTimingConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          this.detectDisclosureConflicts(sponsor, sponsor.affiliations || [], sponsor.transparency || [])
        ]);

        const results: ConflictDetectionResult[] = [];
        sponsorConflicts.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            logger.error({ ...logContext, sponsor_id: sponsor.id, algorithmIndex: index, error: result.reason }, `Conflict detection algorithm ${index} failed`);
          }
        });
        return results;
      });

      const allConflicts = (await Promise.all(detectionPromises)).flat();
      logger.info({ ...logContext, conflictCount: allConflicts.length }, `Conflict detection completed`);
      return allConflicts;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error during conflict detection');
      throw new Error(`Conflict detection failed: ${this.getErrorMessage(error)}`);
    }
  }

  async generateRiskProfile(sponsor_id: number): Promise<RiskProfile> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'generateRiskProfile', sponsor_id };
    logger.info(logContext, 'Generating risk profile');

    try {
      const sponsor = await this.sponsorService.findById(sponsor_id);
      if (!sponsor) throw new Error(`Sponsor ${sponsor_id} not found`);

      const [affiliations, transparency] = await Promise.all([
        this.sponsorService.listAffiliations(sponsor_id),
        this.sponsorService.listTransparencyRecords(sponsor_id)
      ]);

      const breakdown = {
        financialRisk: this.calculateFinancialRisk(sponsor),
        affiliationRisk: this.calculateAffiliationRisk(affiliations as SponsorAffiliation[]),
        transparencyRisk: this.calculateTransparencyRisk(transparency as SponsorTransparency[], affiliations as SponsorAffiliation[]),
        behavioralRisk: this.calculateBehavioralRisk(sponsor)
      };

      const overallScore = this.calculateWeightedRiskScore(breakdown);
      const level = this.determineRiskLevel(overallScore);
      const recommendations = this.generateRiskRecommendations(level, breakdown);

      logger.info(logContext, 'Risk profile generated successfully');
      return { overallScore, level, breakdown, recommendations };
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error generating risk profile');
      throw new Error(`Risk profile generation failed: ${this.getErrorMessage(error)}`);
    }
  }

  async createConflictMapping(bill_id?: number): Promise<ConflictMapping> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'createConflictMapping', bill_id };
    logger.info(logContext, 'Building conflict mapping');

    try {
      const allConflicts = await this.detectConflicts();
      const conflicts = typeof bill_id === 'number'
        ? allConflicts.filter(c => c.affectedBills.includes(bill_id))
        : allConflicts;

      const nodes = await this.buildConflictNodes(conflicts);
      const edges = await this.buildConflictEdges(conflicts);
      const clusters = await this.identifyConflictClusters(nodes, edges);
      const metrics = this.calculateNetworkMetrics(nodes, edges);

      logger.info({ ...logContext, nodeCount: nodes.length, edgeCount: edges.length }, 'Conflict mapping built');
      return { nodes, edges, clusters, metrics };
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error building conflict mapping');
      return {
        nodes: [],
        edges: [],
        clusters: [],
        metrics: {
          totalNodes: 0,
          totalEdges: 0,
          density: 0,
          clustering: 0,
          centralityScores: {},
          riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
        }
      };
    }
  }

  async analyzeConflictTrends(sponsor_id?: number, timeframeMonths: number = 12): Promise<ConflictTrend[]> {
    if (!sponsor_id) return [];

    const start_date = new Date();
    start_date.setMonth(start_date.getMonth() - timeframeMonths);

    const history = await this.getHistoricalConflicts(sponsor_id, start_date);
    const metrics = this.calculateTrendMetrics(history, timeframeMonths);

    return [{
      sponsor_id,
      timeframe: `${timeframeMonths}m`,
      conflictCount: history.length,
      severityTrend: metrics.severityTrend,
      risk_score: metrics.risk_score,
      predictions: await this.generateConflictPredictions(sponsor_id)
    }];
  }

  calculateConflictSeverity(
    conflictType: ConflictType,
    financialImpact: number,
    additionalFactors: Record<string, unknown> = {}
  ): ConflictSeverity {
    let score = this.conflictTypeWeights[conflictType] ?? 10;

    if (financialImpact >= this.conflictThresholds.financial.critical) score += 40;
    else if (financialImpact >= this.conflictThresholds.financial.high) score += 25;
    else if (financialImpact >= this.conflictThresholds.financial.medium) score += 15;
    else if (financialImpact >= this.conflictThresholds.financial.low) score += 5;

    if (additionalFactors.multipleAffiliations && Number(additionalFactors.multipleAffiliations) > 5) score += 10;
    if (additionalFactors.recentActivity) score += 15;
    if (additionalFactors.leadershipRole) score += 12;
    if (additionalFactors.directBeneficiary) score += 20;

    return this.determineRiskLevel(score);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - Data Fetching
  // ============================================================================

  private async getSponsorData(sponsor_ids: number[]): Promise<Array<SponsorWithRelations | null>> {
    if (sponsor_ids.length === 0) return [];

    try {
      const sponsors = await this.sponsorService.findByIds(sponsor_ids);
      const sponsorshipsMap = await Promise.all(
        sponsor_ids.map(id => this.sponsorService.listBillSponsorshipsBySponsor(id))
      ).then(results => new Map(results.map((spons, i) => [sponsor_ids[i], spons])));

      return sponsors.map(sponsor => ({
        ...sponsor,
        affiliations: [],
        transparency: [],
        sponsorships: sponsorshipsMap.get(sponsor.id) || []
      }));
    } catch (error) {
      logger.error({ component: 'SponsorConflictAnalysisService', sponsor_ids, error }, 'Failed to fetch sponsor data');
      return sponsor_ids.map(() => null);
    }
  }

  private async getAllActiveSponsorData(): Promise<SponsorWithRelations[]> {
    try {
      const activeSponsors = await this.sponsorService.list({ is_active: true, limit: 1000 });
      const sponsor_ids = activeSponsors.map(s => s.id);

      const sponsorshipsMap = await Promise.all(
        sponsor_ids.map(id => this.sponsorService.listBillSponsorshipsBySponsor(id))
      ).then(results => new Map(results.map((spons, i) => [sponsor_ids[i], spons])));

      return activeSponsors.map(sponsor => ({
        ...sponsor,
        affiliations: [],
        transparency: [],
        sponsorships: sponsorshipsMap.get(sponsor.id) || []
      }));
    } catch (error) {
      logger.error({ component: 'SponsorConflictAnalysisService', error }, 'Failed to fetch active sponsor data');
      return [];
    }
  }

  // ============================================================================
  // PRIVATE CONFLICT DETECTION ALGORITHMS
  // ============================================================================

  private async detectFinancialConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: BillSponsorship[]
  ): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectFinancialConflicts', sponsor_id: sponsor.id };
    logger.debug(logContext, 'Detecting financial conflicts');

    const conflicts: ConflictDetectionResult[] = [];
    const bill_ids = (sponsorships || []).map(s => s.bill_id);
    if (bill_ids.length === 0) return conflicts;

    const financialAffiliations = (affiliations || []).filter(a =>
      a.type === 'economic' ||
      a.conflictType === 'financial' ||
      a.conflictType === 'financial_direct' ||
      a.conflictType === 'financial_indirect'
    );

    for (const affiliation of financialAffiliations) {
      try {
        const affectedBills: number[] = [];

        if (affectedBills.length > 0) {
          const financialImpact = this.estimateFinancialImpact(sponsor, affiliation, affectedBills.length);
          const conflictType: ConflictType = (affiliation.conflictType === 'financial_direct' || affiliation.type === 'economic')
            ? 'financial_direct'
            : 'financial_indirect';

          const severity = this.calculateConflictSeverity(conflictType, financialImpact, {
            multipleAffiliations: financialAffiliations.length > 2,
            recentActivity: this.isRecentActivity(affiliation),
            directBeneficiary: conflictType === 'financial_direct'
          });

          conflicts.push({
            conflictId: `${sponsor.id}-${conflictType}-${affiliation.id}-${Date.now()}`,
            sponsor_id: sponsor.id,
            conflictType,
            severity,
            description: `Financial affiliation with ${affiliation.organization} mentioned in ${affectedBills.length} bill(s)`,
            affectedBills,
            financialImpact,
            detectedAt: new Date(),
            confidence: Math.min(0.9, 0.5 + (financialImpact / (financialImpact + 1000000))),
            evidence: [`affiliation:${affiliation.id}`, `org:${affiliation.organization}`],
            relatedAffiliationId: affiliation.id
          });
        }
      } catch (error) {
        logger.error({ ...logContext, affiliationId: affiliation.id, error }, 'Error checking affiliation for financial conflicts');
      }
    }

    logger.debug({ ...logContext, conflictCount: conflicts.length }, 'Financial conflicts detected');
    return conflicts;
  }

  private async detectOrganizationalConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: BillSponsorship[]
  ): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectOrganizationalConflicts', sponsor_id: sponsor.id };
    logger.debug(logContext, 'Detecting organizational conflicts');

    const conflicts: ConflictDetectionResult[] = [];
    const bill_ids = (sponsorships || []).map(s => s.bill_id);
    if (bill_ids.length === 0) return conflicts;

    const leadershipKeywords = ['director', 'board', 'executive', 'chairman', 'ceo', 'president', 'cfo', 'coo'];
    const leadershipRoles = (affiliations || []).filter(a =>
      a.role && leadershipKeywords.some(k => a.role!.toLowerCase().includes(k))
    );

    for (const aff of leadershipRoles) {
      try {
        const affectedBills: number[] = [];

        if (affectedBills.length > 0) {
          const financialImpact = this.estimateFinancialImpact(sponsor, aff, affectedBills.length);
          const severity = this.calculateConflictSeverity('organizational', financialImpact, { leadershipRole: true });

          conflicts.push({
            conflictId: `${sponsor.id}-organizational-${aff.id}-${Date.now()}`,
            sponsor_id: sponsor.id,
            conflictType: 'organizational',
            severity,
            description: `Leadership role (${aff.role}) at ${aff.organization} referenced in ${affectedBills.length} bill(s)`,
            affectedBills,
            financialImpact,
            detectedAt: new Date(),
            confidence: 0.7,
            evidence: [`affiliation:${aff.id}`, `role:${aff.role}`],
            relatedAffiliationId: aff.id
          });
        }
      } catch (error) {
        logger.error({ ...logContext, affiliationId: aff.id, error }, 'Error checking leadership affiliation');
      }
    }

    logger.debug({ ...logContext, conflictCount: conflicts.length }, 'Organizational conflicts detected');
    return conflicts;
  }

  private async detectTimingConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: BillSponsorship[]
  ): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectTimingConflicts', sponsor_id: sponsor.id };
    logger.debug(logContext, 'Detecting timing conflicts');

    const conflicts: ConflictDetectionResult[] = [];

    for (const sponsorship of sponsorships) {
      try {
        const suspiciousAffiliations = (affiliations || []).filter(aff => {
          if (!aff.start_date) return false;
          const affStartTime = new Date(aff.start_date).getTime();
          const now = Date.now();
          const daysDiff = Math.abs(now - affStartTime) / (1000 * 60 * 60 * 24);
          return daysDiff <= this.conflictThresholds.timing.suspicious_days;
        });

        if (suspiciousAffiliations.length > 0) {
          const verySuspicious = suspiciousAffiliations.some(aff => {
            const daysDiff = Math.abs(Date.now() - new Date(aff.start_date!).getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= this.conflictThresholds.timing.very_suspicious_days;
          });

          const severity: ConflictSeverity = verySuspicious ? 'high' : 'medium';

          conflicts.push({
            conflictId: `${sponsor.id}-timing-${sponsorship.bill_id}-${Date.now()}`,
            sponsor_id: sponsor.id,
            conflictType: 'timing_suspicious',
            severity,
            description: `Affiliation start date near bill introduction (${sponsorship.bill_id})`,
            affectedBills: [sponsorship.bill_id],
            financialImpact: 0,
            detectedAt: new Date(),
            confidence: verySuspicious ? 0.8 : 0.6,
            evidence: suspiciousAffiliations.map(a => `aff:${a.id}`),
            relatedAffiliationId: suspiciousAffiliations[0]?.id
          });
        }
      } catch (error) {
        logger.error({ ...logContext, sponsorshipId: sponsorship.id, error }, 'Error checking timing conflict');
      }
    }

    logger.debug({ ...logContext, conflictCount: conflicts.length }, 'Timing conflicts detected');
    return conflicts;
  }

  private async detectDisclosureConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    transparency: SponsorTransparency[]
  ): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectDisclosureConflicts', sponsor_id: sponsor.id };
    logger.debug(logContext, 'Detecting disclosure conflicts');

    const conflicts: ConflictDetectionResult[] = [];

    const expectedDisclosures = (affiliations || []).filter(a =>
      a.type === 'economic' || a.conflictType === 'financial'
    ).length;

    const actualDisclosures = (transparency || []).filter(t =>
      t.disclosureType === 'financial' && t.is_verified
    ).length;

    const completeness = expectedDisclosures > 0 ? actualDisclosures / expectedDisclosures : 1;

    if (completeness < this.conflictThresholds.disclosure.adequate_threshold) {
      const severity: ConflictSeverity = completeness < this.conflictThresholds.disclosure.complete_threshold ? 'high' : 'medium';
      const financialImpact = this.calculateAffiliationRisk(affiliations) * 10000;

      conflicts.push({
        conflictId: `${sponsor.id}-disclosure-${Date.now()}`,
        sponsor_id: sponsor.id,
        conflictType: 'disclosure_incomplete',
        severity,
        description: `Disclosure completeness ${Math.round(completeness * 100)}% (${actualDisclosures}/${expectedDisclosures})`,
        affectedBills: [],
        financialImpact,
        detectedAt: new Date(),
        confidence: 0.6,
        evidence: [`expected:${expectedDisclosures}`, `actual:${actualDisclosures}`]
      });
    }

    logger.debug({ ...logContext, conflictCount: conflicts.length }, 'Disclosure conflicts detected');
    return conflicts;
  }

  // ============================================================================
  // PRIVATE RISK CALCULATION METHODS
  // ============================================================================

  private calculateFinancialRisk(sponsor: Sponsor): number {
    const exposure = this.parseNumeric((sponsor as Record<string, unknown>).financial_exposure);
    if (exposure <= 0) return 0;
    if (exposure < this.conflictThresholds.financial.low) return 10;
    if (exposure < this.conflictThresholds.financial.medium) return 30;
    if (exposure < this.conflictThresholds.financial.high) return 60;
    if (exposure < this.conflictThresholds.financial.critical) return 85;
    return 100;
  }

  private calculateAffiliationRisk(affiliations: SponsorAffiliation[]): number {
    if (!affiliations || affiliations.length === 0) return 0;

    const direct = affiliations.filter(a =>
      a.conflictType === 'financial' || a.conflictType === 'ownership'
    ).length;

    const indirect = affiliations.filter(a =>
      a.conflictType === 'influence' || a.conflictType === 'representation'
    ).length;

    let risk = direct * 20 + indirect * 10;

    if (affiliations.length > this.conflictThresholds.affiliation.critical_count) risk += 30;
    else if (affiliations.length > this.conflictThresholds.affiliation.high_count) risk += 15;

    return Math.min(100, risk);
  }

  private calculateTransparencyRisk(transparency: SponsorTransparency[], affiliations: SponsorAffiliation[]): number {
    const expected = (affiliations || []).filter(a =>
      a.type === 'economic' || a.conflictType === 'financial'
    ).length;

    if (expected === 0) return 0;

    const actual = (transparency || []).filter(t =>
      t.disclosureType === 'financial' && t.is_verified
    ).length;

    const completeness = actual / expected;
    return Math.round((1 - completeness) * 100);
  }

  private calculateBehavioralRisk(sponsor: Sponsor): number {
    const voting_alignment = this.parseNumeric((sponsor as Record<string, unknown>).voting_alignment);
    if (voting_alignment <= 0) return 10;
    if (voting_alignment > 95 || voting_alignment < 5) return 90;
    if (voting_alignment > 90 || voting_alignment < 10) return 70;
    if (voting_alignment > 85 || voting_alignment < 15) return 50;
    if (voting_alignment > 80 || voting_alignment < 20) return 30;
    return 10;
  }

  private calculateWeightedRiskScore(breakdown: RiskProfile['breakdown']): number {
    const weights = { financial: 0.35, affiliation: 0.30, transparency: 0.20, behavioral: 0.15 };
    return Math.round(
      (breakdown.financialRisk * weights.financial) +
      (breakdown.affiliationRisk * weights.affiliation) +
      (breakdown.transparencyRisk * weights.transparency) +
      (breakdown.behavioralRisk * weights.behavioral)
    );
  }

  private determineRiskLevel(score: number): ConflictSeverity {
    if (score >= 75) return 'critical';
    if (score >= 55) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(level: ConflictSeverity, breakdown: RiskProfile['breakdown']): string[] {
    const recs: string[] = [];

    if (level === 'critical' || level === 'high') {
      recs.push('Flag for manual review and possible disclosure update.');
    }

    if (breakdown.financialRisk > 70) {
      recs.push('Require detailed financial disclosure and recusal from votes affecting major interests.');
    }

    if (breakdown.affiliationRisk > 60) {
      recs.push('Investigate board/director relationships and conflicts.');
    }

    if (breakdown.transparencyRisk > 50) {
      recs.push('Request missing disclosure records and verify.');
    }

    if (breakdown.behavioralRisk > 60) {
      recs.push('Review voting history and committee assignments.');
    }

    if (recs.length === 0) {
      recs.push('No immediate action; monitor ongoing activity.');
    }

    return recs;
  }

  private estimateFinancialImpact(sponsor: Sponsor, affiliation: SponsorAffiliation, billCount: number): number {
    const base = Math.max(0, this.parseNumeric((sponsor as Record<string, unknown>).financial_exposure));
    let impact = Math.round((base / 10) * Math.max(1, billCount));

    if (affiliation.type === 'economic') impact *= 2;
    if (affiliation.conflictType === 'financial') impact *= 3;
    if (affiliation.role && /director|board|executive|chairman|ceo/i.test(affiliation.role)) {
      impact = Math.round(impact * 1.5);
    }

    return Math.round(impact);
  }

  private isRecentActivity(affiliation: SponsorAffiliation): boolean {
    if (!affiliation.start_date) return false;
    const start = new Date(affiliation.start_date).getTime();
    const now = Date.now();
    const days = (now - start) / (1000 * 60 * 60 * 24);
    return days <= 90;
  }

  private parseNumeric(value: unknown): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const asNum = Number(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(asNum) ? asNum : 0;
  }

  private getErrorMessage(error: unknown): string {
    if (!error) return 'unknown error';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // ============================================================================
  // TREND & PREDICTION HELPERS
  // ============================================================================

  private async getHistoricalConflicts(sponsor_id: number, start_date: Date): Promise<ConflictDetectionResult[]> {
    const current = await this.detectConflicts(sponsor_id);
    return current.filter(c => c.detectedAt >= start_date);
  }

  private calculateTrendMetrics(
    historicalConflicts: ConflictDetectionResult[],
    timeframeMonths: number
  ): { severityTrend: 'increasing' | 'decreasing' | 'stable'; risk_score: number } {
    if (historicalConflicts.length === 0) return { severityTrend: 'stable', risk_score: 0 };

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - Math.floor(timeframeMonths / 2));

    const recent = historicalConflicts.filter(c => c.detectedAt > cutoffDate);
    const older = historicalConflicts.filter(c => c.detectedAt <= cutoffDate);

    const recentAvg = this.calculateAverageSeverity(recent);
    const olderAvg = this.calculateAverageSeverity(older);

    let severityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.5) severityTrend = 'increasing';
    else if (recentAvg < olderAvg - 0.5) severityTrend = 'decreasing';

    const conflictCount = historicalConflicts.length;
    const avgSeverity = this.calculateAverageSeverity(historicalConflicts);
    const risk_score = Math.min((conflictCount * 10) + (avgSeverity * 20), 100);

    return { severityTrend, risk_score };
  }

  private calculateAverageSeverity(conflicts: ConflictDetectionResult[]): number {
    if (conflicts.length === 0) return 0;
    const map: Record<ConflictSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const total = conflicts.reduce((s, c) => s + map[c.severity], 0);
    return total / conflicts.length;
  }

  private async generateConflictPredictions(sponsor_id: number): Promise<ConflictPrediction[]> {
    const affiliations = await this.sponsorService.listAffiliations(sponsor_id);
    const predictions: ConflictPrediction[] = [];

    for (let i = 0; i < Math.min(5, affiliations.length); i++) {
      const aff = affiliations[i] as SponsorAffiliation;
      predictions.push({
        bill_id: i + 1,
        billTitle: `Upcoming Bill ${i + 1}`,
        predictedConflictType: 'financial_indirect',
        probability: 0.2,
        riskFactors: [aff.organization]
      });
    }

    return predictions;
  }

  // ============================================================================
  // NETWORK VISUALIZATION HELPERS
  // ============================================================================

  private async buildConflictNodes(conflicts: ConflictDetectionResult[]): Promise<ConflictNode[]> {
    const nodes: ConflictNode[] = [];
    const sponsor_ids = Array.from(new Set(conflicts.map(c => c.sponsor_id)));
    const sponsorMap = new Map<number, Sponsor>();

    try {
      const sponsors = await this.sponsorService.findByIds(sponsor_ids);
      sponsors.forEach(s => sponsorMap.set(s.id, s));
    } catch (error) {
      logger.error({ component: 'SponsorConflictAnalysisService', error }, 'Failed to fetch sponsors for nodes');
    }

    const orgSet = new Set<string>();
    const billSet = new Set<number>();

    for (const c of conflicts) {
      for (const ev of c.evidence) {
        if (ev.startsWith('org:')) orgSet.add(ev.replace(/^org:/, ''));
      }
      for (const b of c.affectedBills || []) billSet.add(b);
    }

    for (const id of sponsor_ids) {
      const sponsor = sponsorMap.get(id);
      const sponsorRecord = sponsor as Record<string, unknown> | undefined;
      const firstName = sponsorRecord?.first_name ? String(sponsorRecord.first_name) : '';
      const lastName = sponsorRecord?.last_name ? String(sponsorRecord.last_name) : '';
      const fullName = `${firstName} ${lastName}`.trim() || `Sponsor ${id}`;

      nodes.push({
        id: `sponsor:${id}`,
        type: 'sponsor',
        name: fullName,
        conflict_level: 'medium',
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: { sponsor_id: id }
      });
    }

    for (const org of Array.from(orgSet)) {
      nodes.push({
        id: `org:${org}`,
        type: 'organization',
        name: org,
        conflict_level: 'medium',
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: {}
      });
    }

    for (const bill_id of Array.from(billSet)) {
      nodes.push({
        id: `bill:${bill_id}`,
        type: 'bill',
        name: `Bill ${bill_id}`,
        conflict_level: 'low',
        size: this.calculateNodeSize('low'),
        color: this.severityColors.low,
        metadata: { bill_id }
      });
    }

    return nodes;
  }

  private async buildConflictEdges(conflicts: ConflictDetectionResult[]): Promise<ConflictEdge[]> {
    const edges: ConflictEdge[] = [];
    const seen = new Set<string>();

    for (const c of conflicts) {
      const sponsorNode = `sponsor:${c.sponsor_id}`;

      for (const ev of c.evidence) {
        if (ev.startsWith('org:')) {
          const org = ev.replace(/^org:/, '');
          const target = `org:${org}`;
          const key = `${sponsorNode}|${target}|${c.conflictType}`;

          if (!seen.has(key)) {
            seen.add(key);
            edges.push({
              source: sponsorNode,
              target,
              type: c.conflictType,
              weight: this.calculateEdgeWeight(c.severity),
              severity: c.severity,
              label: this.getConflictTypeLabel(c.conflictType)
            });
          }
        }
      }

      for (const bid of c.affectedBills || []) {
        const target = `bill:${bid}`;
        const key = `${sponsorNode}|${target}|${c.conflictType}`;

        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: sponsorNode,
            target,
            type: c.conflictType,
            weight: this.calculateEdgeWeight(c.severity),
            severity: c.severity,
            label: `affects bill ${bid}`
          });
        }
      }
    }

    return edges;
  }

  private async identifyConflictClusters(nodes: ConflictNode[], edges: ConflictEdge[]): Promise<ConflictCluster[]> {
    const clusters: ConflictCluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.id)) continue;

      const component = this.findConnectedComponents(node.id, nodes, edges, visited);
      const center = this.findCenterNode(component, edges);
      const density = this.calculateClusterDensity(component, edges);
      const riskLevel = this.calculateClusterRiskLevel(component, nodes);

      clusters.push({
        id: `cluster:${center}`,
        members: component,
        centerNode: center,
        conflictDensity: density,
        riskLevel
      });
    }

    return clusters;
  }

  private calculateNetworkMetrics(nodes: ConflictNode[], edges: ConflictEdge[]): NetworkMetrics {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const density = totalNodes > 1 ? (2 * totalEdges) / (totalNodes * (totalNodes - 1)) : 0;
    const clustering = this.calculateClusteringCoefficient(nodes, edges);

    const centralityScores: Record<string, number> = {};
    nodes.forEach(n => {
      centralityScores[n.id] = edges.filter(e => e.source === n.id || e.target === n.id).length;
    });

    const riskDistribution: Record<ConflictSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    nodes.forEach(n => {
      riskDistribution[n.conflict_level] = (riskDistribution[n.conflict_level] || 0) + 1;
    });

    return { totalNodes, totalEdges, density, clustering, centralityScores, riskDistribution };
  }

  private calculateClusteringCoefficient(nodes: ConflictNode[], edges: ConflictEdge[]): number {
    let totalCoefficient = 0;
    let count = 0;

    for (const node of nodes) {
      const neighbors = this.getNeighbors(node.id, edges);
      if (neighbors.length < 2) continue;

      let links = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const a = neighbors[i];
          const b = neighbors[j];
          if (edges.some(e => (e.source === a && e.target === b) || (e.source === b && e.target === a))) {
            links++;
          }
        }
      }

      const possible = (neighbors.length * (neighbors.length - 1)) / 2;
      totalCoefficient += possible > 0 ? links / possible : 0;
      count++;
    }

    return count > 0 ? totalCoefficient / count : 0;
  }

  private findConnectedComponents(
    startNode: string,
    _nodes: ConflictNode[],
    edges: ConflictEdge[],
    visited: Set<string>
  ): string[] {
    const stack = [startNode];
    const component: string[] = [];

    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;

      visited.add(cur);
      component.push(cur);

      const neighbors = this.getNeighbors(cur, edges).filter(n => !visited.has(n));
      stack.push(...neighbors);
    }

    return component;
  }

  private findCenterNode(cluster: string[], edges: ConflictEdge[]): string {
    let best = cluster[0] || '';
    let bestConn = -1;

    for (const node of cluster) {
      const conn = edges.filter(e =>
        cluster.includes(e.source) &&
        cluster.includes(e.target) &&
        (e.source === node || e.target === node)
      ).length;

      if (conn > bestConn) {
        bestConn = conn;
        best = node;
      }
    }

    return best;
  }

  private calculateClusterDensity(cluster: string[], edges: ConflictEdge[]): number {
    const clusterEdges = edges.filter(e =>
      cluster.includes(e.source) && cluster.includes(e.target)
    ).length;

    const maxPossible = (cluster.length * (cluster.length - 1)) / 2;
    return maxPossible > 0 ? clusterEdges / maxPossible : 0;
  }

  private calculateClusterRiskLevel(cluster: string[], nodes: ConflictNode[]): ConflictSeverity {
    const clusterNodes = nodes.filter(n => cluster.includes(n.id));
    if (clusterNodes.length === 0) return 'low';

    const map: Record<ConflictSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const avg = clusterNodes.reduce((s, n) => s + map[n.conflict_level], 0) / clusterNodes.length;

    if (avg >= 3.5) return 'critical';
    if (avg >= 2.5) return 'high';
    if (avg >= 1.5) return 'medium';
    return 'low';
  }

  private getNeighbors(nodeId: string, edges: ConflictEdge[]): string[] {
    return edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
  }

  private calculateNodeSize(severity: ConflictSeverity): number {
    switch (severity) {
      case 'critical': return 18;
      case 'high': return 14;
      case 'medium': return 10;
      default: return 6;
    }
  }

  private calculateEdgeWeight(severity: ConflictSeverity): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      default: return 1;
    }
  }

  private getConflictTypeLabel(type: ConflictType): string {
    const labels: Record<ConflictType, string> = {
      financial_direct: 'Direct Financial',
      financial_indirect: 'Indirect Financial',
      organizational: 'Organizational',
      family_business: 'Family Business',
      voting_pattern: 'Voting Pattern',
      timing_suspicious: 'Suspicious Timing',
      disclosure_incomplete: 'Incomplete Disclosure'
    };
    return labels[type] || type;
  }
}

// Export singleton instance
export const sponsorConflictAnalysisService = new SponsorConflictAnalysisService();
