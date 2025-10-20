import { sponsorService, type SponsorWithRelations } from './sponsor-service.js';
import { logger } from '../../utils/logger';
import type { Sponsor, SponsorAffiliation, SponsorTransparency } from '../../../shared/schema';

/**
 * SponsorConflictAnalysisService - Business Logic Layer
 * 
 * This service is the SINGLE SOURCE OF TRUTH for all conflict detection,
 * risk scoring, and conflict-related analytics. It contains sophisticated
 * algorithms that interpret sponsor data to identify potential conflicts.
 * 
 * This service depends on SponsorService for data access but contains
 * NO database queries of its own. It's pure business logic.
 * 
 * Responsibilities:
 * - Detecting all types of conflicts (financial, organizational, timing, etc.)
 * - Calculating severity and risk scores
 * - Building conflict network visualizations
 * - Analyzing conflict trends and patterns
 * - Generating predictions about potential conflicts
 * 
 * NOT Responsible For:
 * - Database operations (delegates to SponsorService)
 * - Bill-specific analysis (delegates to SponsorshipAnalysisService)
 * - Presentation formatting (that's for the API layer)
 */

// ============================================================================
// TYPE DEFINITIONS
// These define the shape of conflict analysis outputs
// ============================================================================

export interface ConflictDetectionResult {
  conflictId: string;
  sponsorId: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedBills: number[];
  financialImpact: number;
  detectedAt: Date;
  confidence: number;
  evidence: string[];
}

export interface ConflictMapping {
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  clusters: ConflictCluster[];
  metrics: NetworkMetrics;
}

export interface ConflictTrend {
  sponsorId: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  riskScore: number;
  predictions: ConflictPrediction[];
}

export interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflictLevel: ConflictSeverity;
  size: number;
  color: string;
  metadata: Record<string, any>;
}

export interface ConflictEdge {
  source: string;
  target: string;
  type: ConflictType;
  weight: number;
  severity: ConflictSeverity;
  label: string;
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

export interface ConflictPrediction {
  billId: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
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

export type ConflictType = 
  | 'financial_direct'
  | 'financial_indirect' 
  | 'organizational'
  | 'family_business'
  | 'voting_pattern'
  | 'timing_suspicious'
  | 'disclosure_incomplete';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class SponsorConflictAnalysisService {
  
  // Configuration constants that define what constitutes a conflict
  private readonly conflictThresholds = {
    financial: {
      critical: 10000000,    // $10M+
      high: 5000000,         // $5M-$10M
      medium: 1000000,       // $1M-$5M
      low: 100000            // $100K-$1M
    },
    timing: {
      suspicious_days: 30,        // Within 30 days is suspicious
      very_suspicious_days: 7     // Within 7 days is very suspicious
    },
    disclosure: {
      complete_threshold: 0.9,    // 90%+ disclosure is complete
      adequate_threshold: 0.7     // 70%+ disclosure is adequate
    },
    affiliation: {
      high_count: 5,              // 5+ affiliations is high risk
      critical_count: 10          // 10+ affiliations is critical risk
    }
  };

  // Visual styling for conflict severity levels
  private readonly severityColors = {
    low: '#4CAF50',
    medium: '#FF9800', 
    high: '#FF5722',
    critical: '#D32F2F'
  };

  // Risk scoring weights for different conflict types
  private readonly conflictTypeWeights = {
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
  // These are the main entry points for conflict analysis
  // ============================================================================

  /**
   * Comprehensive conflict detection across all types
   * This is the main method that orchestrates all conflict detection algorithms
   * 
   * @param sponsorId - Optional specific sponsor to analyze, otherwise analyzes all active
   * @returns Array of detected conflicts with full details
   */
  async detectConflicts(sponsorId?: number): Promise<ConflictDetectionResult[]> {
    try {
      // Get sponsors to analyze - either one specific or all active
      const sponsorsToAnalyze = sponsorId 
        ? await this.getSponsorsList([sponsorId])
        : await sponsorService.getSponsors({ isActive: true });

      if (!sponsorsToAnalyze.length) {
        return [];
      }

      // Run all conflict detection algorithms in parallel for each sponsor
      // This is efficient because each sponsor's analysis is independent
      const detectionPromises = sponsorsToAnalyze.map(async (sponsor) => {
        const [affiliations, transparency, sponsorships] = await Promise.all([
          sponsorService.getSponsorAffiliations(sponsor.id),
          sponsorService.getSponsorTransparency(sponsor.id),
          sponsorService.getSponsorBillSponsorships(sponsor.id)
        ]);

        // Run all conflict detection types in parallel
        const sponsorConflicts = await Promise.all([
          this.detectFinancialConflicts(sponsor, affiliations, sponsorships),
          this.detectOrganizationalConflicts(sponsor, affiliations, sponsorships),
          this.detectVotingPatternConflicts(sponsor, affiliations),
          this.detectTimingConflicts(sponsor, affiliations, sponsorships),
          this.detectDisclosureConflicts(sponsor, affiliations, transparency)
        ]);

        return sponsorConflicts.flat();
      });

      const allConflicts = await Promise.all(detectionPromises);
      return allConflicts.flat();
    } catch (error) {
      logger.error('Error detecting conflicts', error instanceof Error ? error : new Error(String(error)), { sponsorId });
      throw new Error(`Conflict detection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Creates a visual network graph of conflicts and relationships
   * This is useful for understanding the web of connections between sponsors and organizations
   * 
   * @param billId - Optional bill to focus the analysis on
   * @returns Complete network mapping with nodes, edges, clusters, and metrics
   */
  async createConflictMapping(billId?: number): Promise<ConflictMapping> {
    try {
      const conflicts = await this.detectConflicts();
      
      // If analyzing a specific bill, filter to relevant conflicts
      const relevantConflicts = billId 
        ? conflicts.filter(c => c.affectedBills.includes(billId))
        : conflicts;

      // Build the network graph components
      const nodes = await this.buildConflictNodes(relevantConflicts);
      const edges = await this.buildConflictEdges(relevantConflicts);
      const clusters = await this.identifyConflictClusters(nodes, edges);
      const metrics = this.calculateNetworkMetrics(nodes, edges);

      return { nodes, edges, clusters, metrics };
    } catch (error) {
      logger.error('Error creating conflict mapping', error instanceof Error ? error : new Error(String(error)), { billId });
      throw new Error(`Conflict mapping failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyzes conflict trends over time to identify patterns
   * This helps understand if conflicts are getting better or worse
   * 
   * @param sponsorId - Optional specific sponsor to analyze
   * @param timeframeMonths - How many months of history to analyze
   * @returns Trend analysis with predictions
   */
  async analyzeConflictTrends(
    sponsorId?: number,
    timeframeMonths: number = 12
  ): Promise<ConflictTrend[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - timeframeMonths);

      const sponsors = sponsorId 
        ? await this.getSponsorsList([sponsorId])
        : await sponsorService.getSponsors({ isActive: true });

      const trends: ConflictTrend[] = [];

      for (const sponsor of sponsors) {
        const historicalConflicts = await this.getHistoricalConflicts(sponsor.id, startDate);
        const trend = this.calculateTrendMetrics(historicalConflicts, timeframeMonths);
        const predictions = await this.generateConflictPredictions(sponsor.id);

        trends.push({
          sponsorId: sponsor.id,
          timeframe: `${timeframeMonths} months`,
          conflictCount: historicalConflicts.length,
          severityTrend: trend.severityTrend,
          riskScore: trend.riskScore,
          predictions
        });
      }

      return trends.sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      logger.error('Error analyzing conflict trends', error instanceof Error ? error : new Error(String(error)), { sponsorId, timeframeMonths });
      throw new Error(`Trend analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a comprehensive risk profile for a sponsor
   * This provides a holistic view of all risk factors
   * 
   * @param sponsorId - The sponsor to analyze
   * @returns Complete risk profile with breakdown and recommendations
   */
  async generateRiskProfile(sponsorId: number): Promise<RiskProfile> {
    try {
      const sponsor = await sponsorService.getSponsor(sponsorId);
      if (!sponsor) {
        throw new Error(`Sponsor ${sponsorId} not found`);
      }

      const [affiliations, transparency] = await Promise.all([
        sponsorService.getSponsorAffiliations(sponsorId),
        sponsorService.getSponsorTransparency(sponsorId)
      ]);

      const breakdown = {
        financialRisk: this.calculateFinancialRisk(sponsor),
        affiliationRisk: this.calculateAffiliationRisk(affiliations),
        transparencyRisk: this.calculateTransparencyRisk(transparency, affiliations),
        behavioralRisk: this.calculateBehavioralRisk(sponsor)
      };

      const overallScore = this.calculateWeightedRiskScore(breakdown);
      const level = this.determineRiskLevel(overallScore);
      const recommendations = this.generateRiskRecommendations(level, breakdown);

      return {
        overallScore,
        level,
        breakdown,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating risk profile', error instanceof Error ? error : new Error(String(error)), { sponsorId });
      throw new Error(`Risk profile generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Calculates conflict severity based on type and impact
   * This is the central algorithm for determining how serious a conflict is
   * 
   * @param conflictType - The type of conflict detected
   * @param financialImpact - Dollar amount of potential benefit
   * @param additionalFactors - Context that may increase severity
   * @returns Severity classification
   */
  calculateConflictSeverity(
    conflictType: ConflictType,
    financialImpact: number,
    additionalFactors: Record<string, any> = {}
  ): ConflictSeverity {
    // Start with base score for the conflict type
    let baseScore = this.conflictTypeWeights[conflictType];

    // Add points based on financial impact
    if (financialImpact >= this.conflictThresholds.financial.critical) {
      baseScore += 30;
    } else if (financialImpact >= this.conflictThresholds.financial.high) {
      baseScore += 20;
    } else if (financialImpact >= this.conflictThresholds.financial.medium) {
      baseScore += 10;
    } else if (financialImpact >= this.conflictThresholds.financial.low) {
      baseScore += 5;
    }

    // Apply additional risk factors
    if (additionalFactors.multipleAffiliations) {
      baseScore += 10;
    }
    if (additionalFactors.recentActivity) {
      baseScore += 15;
    }
    if (additionalFactors.publicScrutiny) {
      baseScore += 5;
    }
    if (additionalFactors.leadershipRole) {
      baseScore += 12;
    }
    if (additionalFactors.directBeneficiary) {
      baseScore += 20;
    }

    // Convert score to severity level
    return this.determineRiskLevel(baseScore);
  }

  // ============================================================================
  // CONFLICT DETECTION ALGORITHMS
  // These are the core detection methods for different conflict types
  // ============================================================================

  /**
   * Detects financial conflicts of interest
   * Looks for situations where a sponsor has financial stakes in organizations
   * that would benefit from legislation they're sponsoring
   */
  private async detectFinancialConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: any[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    
    // Get bill IDs to search for organization mentions
    const billIds = sponsorships.map(s => s.billId);
    if (billIds.length === 0) return conflicts;

    // Analyze each financial affiliation
    const financialAffiliations = affiliations.filter(
      a => a.conflictType === 'financial' || a.type === 'economic'
    );

    for (const affiliation of financialAffiliations) {
      // Find bills that mention this organization
      const affectedBills = await sponsorService.findBillsMentioningOrganization(
        affiliation.organization,
        billIds
      );

      if (affectedBills.length > 0) {
        const financialImpact = this.estimateFinancialImpact(
          sponsor,
          affiliation,
          affectedBills.length
        );

        const severity = this.calculateConflictSeverity(
          'financial_direct',
          financialImpact,
          {
            multipleAffiliations: financialAffiliations.length > 2,
            recentActivity: this.isRecentActivity(affiliation),
            directBeneficiary: true
          }
        );

        conflicts.push({
          conflictId: `fin_direct_${sponsor.id}_${affiliation.id}`,
          sponsorId: sponsor.id,
          conflictType: 'financial_direct',
          severity,
          description: `Direct financial interest in ${affiliation.organization} while sponsoring ${affectedBills.length} related bill(s)`,
          affectedBills: affectedBills.map(b => b.id),
          financialImpact,
          detectedAt: new Date(),
          confidence: 0.9,
          evidence: [
            `Financial exposure: ${this.parseNumeric(sponsor.financialExposure).toLocaleString()}`,
            `Organization: ${affiliation.organization}`,
            `Role: ${affiliation.role || 'Undisclosed'}`,
            `Affected bills: ${affectedBills.length}`
          ]
        });
      }
    }

    // Detect indirect financial conflicts through family/business networks
    const indirectAffiliations = affiliations.filter(
      a => a.type === 'economic' || a.type === 'professional'
    );

    for (const affiliation of indirectAffiliations) {
      const affectedBills = await sponsorService.findBillsMentioningOrganization(
        affiliation.organization,
        billIds
      );

      if (affectedBills.length > 0) {
        const financialImpact = this.estimateFinancialImpact(
          sponsor,
          affiliation,
          affectedBills.length
        ) * 0.6; // Reduced impact for indirect connections

        if (financialImpact > this.conflictThresholds.financial.medium) {
          const severity = this.calculateConflictSeverity(
            'financial_indirect',
            financialImpact,
            { multipleAffiliations: indirectAffiliations.length > 3 }
          );

          conflicts.push({
            conflictId: `fin_indirect_${sponsor.id}_${affiliation.id}`,
            sponsorId: sponsor.id,
            conflictType: 'financial_indirect',
            severity,
            description: `Indirect financial interest through ${affiliation.type} connection to ${affiliation.organization}`,
            affectedBills: affectedBills.map(b => b.id),
            financialImpact,
            detectedAt: new Date(),
            confidence: 0.7,
            evidence: [
              `Connection type: ${affiliation.type}`,
              `Organization: ${affiliation.organization}`,
              `Estimated impact: ${Math.round(financialImpact).toLocaleString()}`
            ]
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detects organizational conflicts
   * Identifies cases where sponsors hold leadership positions in organizations
   * that would be affected by their sponsored legislation
   */
  private async detectOrganizationalConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: any[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    const billIds = sponsorships.map(s => s.billId);
    
    if (billIds.length === 0) return conflicts;

    // Identify leadership roles
    const leadershipKeywords = ['director', 'board', 'executive', 'chairman', 'ceo', 'president', 'cfo', 'coo'];
    const leadershipRoles = affiliations.filter(a => 
      a.role && leadershipKeywords.some(keyword => 
        a.role!.toLowerCase().includes(keyword)
      )
    );

    for (const affiliation of leadershipRoles) {
      const affectedBills = await sponsorService.findBillsMentioningOrganization(
        affiliation.organization,
        billIds
      );

      if (affectedBills.length > 0) {
        const severity = this.calculateConflictSeverity(
          'organizational',
          0,
          {
            multipleAffiliations: leadershipRoles.length > 2,
            recentActivity: this.isRecentActivity(affiliation),
            leadershipRole: true,
            publicScrutiny: affectedBills.length > 2
          }
        );

        conflicts.push({
          conflictId: `org_${sponsor.id}_${affiliation.id}`,
          sponsorId: sponsor.id,
          conflictType: 'organizational',
          severity,
          description: `${affiliation.role} at ${affiliation.organization} while sponsoring ${affectedBills.length} related bill(s)`,
          affectedBills: affectedBills.map(b => b.id),
          financialImpact: 0,
          detectedAt: new Date(),
          confidence: 0.85,
          evidence: [
            `Leadership role: ${affiliation.role}`,
            `Organization: ${affiliation.organization}`,
            `Organization type: ${affiliation.type}`,
            `Bills affected: ${affectedBills.length}`
          ]
        });
      }
    }

    return conflicts;
  }

  /**
   * Detects suspicious voting patterns
   * Identifies sponsors whose voting aligns unusually closely with financial interests
   */
  private async detectVotingPatternConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    const votingAlignment = this.parseNumeric(sponsor.votingAlignment);

    // Very high alignment (>90%) combined with multiple affiliations suggests possible undue influence
    if (votingAlignment > 90 && affiliations.length > 3) {
      const financialAffiliations = affiliations.filter(
        a => a.conflictType === 'financial' || a.type === 'economic'
      );

      if (financialAffiliations.length > 0) {
        const severity = this.calculateConflictSeverity(
          'voting_pattern',
          0,
          {
            multipleAffiliations: true,
            publicScrutiny: votingAlignment > 95
          }
        );

        conflicts.push({
          conflictId: `voting_${sponsor.id}`,
          sponsorId: sponsor.id,
          conflictType: 'voting_pattern',
          severity,
          description: `Unusually high voting alignment (${votingAlignment}%) with ${financialAffiliations.length} financial interest(s)`,
          affectedBills: [],
          financialImpact: 0,
          detectedAt: new Date(),
          confidence: 0.75,
          evidence: [
            `Voting alignment: ${votingAlignment}%`,
            `Financial affiliations: ${financialAffiliations.length}`,
            `Organizations: ${financialAffiliations.map(a => a.organization).join(', ')}`
          ]
        });
      }
    }

    return conflicts;
  }

  /**
   * Detects suspicious timing between affiliations and legislative actions
   * Red flag: starting a role right before sponsoring related legislation
   */
  private async detectTimingConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    sponsorships: any[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];

    for (const sponsorship of sponsorships) {
      const bill = await sponsorService.getBill(sponsorship.billId);
      if (!bill || !bill.introducedDate) continue;

      // Check each affiliation for suspicious timing
      const suspiciousAffiliations = affiliations.filter(affiliation => {
        if (!affiliation.startDate) return false;
        
        const daysDiff = Math.abs(
          (new Date(affiliation.startDate).getTime() - new Date(bill.introducedDate!).getTime()) 
          / (1000 * 60 * 60 * 24)
        );

        return daysDiff <= this.conflictThresholds.timing.suspicious_days;
      });

      if (suspiciousAffiliations.length > 0) {
        // Check if any are VERY suspicious (within 7 days)
        const verySuspicious = suspiciousAffiliations.some(a => {
          const daysDiff = Math.abs(
            (new Date(a.startDate!).getTime() - new Date(bill.introducedDate!).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          return daysDiff <= this.conflictThresholds.timing.very_suspicious_days;
        });

        const severity = verySuspicious ? 'high' : 'medium';

        conflicts.push({
          conflictId: `timing_${sponsor.id}_${sponsorship.billId}`,
          sponsorId: sponsor.id,
          conflictType: 'timing_suspicious',
          severity: severity as ConflictSeverity,
          description: `Suspicious timing: ${suspiciousAffiliations.length} affiliation(s) started within ${this.conflictThresholds.timing.suspicious_days} days of bill introduction`,
          affectedBills: [sponsorship.billId],
          financialImpact: 0,
          detectedAt: new Date(),
          confidence: 0.8,
          evidence: suspiciousAffiliations.map(a => 
            `${a.organization} (${a.role || 'role undisclosed'}) - started ${this.formatDate(a.startDate)}`
          )
        });
      }
    }

    return conflicts;
  }

  /**
   * Detects incomplete or inadequate financial disclosures
   * Compares expected disclosures against actual disclosures
   */
  private async detectDisclosureConflicts(
    sponsor: Sponsor,
    affiliations: SponsorAffiliation[],
    transparency: SponsorTransparency[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];

    // Calculate expected vs actual disclosures
    const expectedDisclosures = affiliations.filter(a => 
      a.type === 'economic' || a.conflictType === 'financial'
    ).length;

    const actualDisclosures = transparency.filter(t => 
      t.disclosureType === 'financial' && t.isVerified
    ).length;

    const completeness = expectedDisclosures > 0 
      ? actualDisclosures / expectedDisclosures 
      : 1;

    if (completeness < this.conflictThresholds.disclosure.adequate_threshold) {
      const severity: ConflictSeverity = completeness < 0.5 ? 'high' : 'medium';

      conflicts.push({
        conflictId: `disclosure_${sponsor.id}`,
        sponsorId: sponsor.id,
        conflictType: 'disclosure_incomplete',
        severity,
        description: `Incomplete financial disclosure: ${Math.round(completeness * 100)}% of expected disclosures provided`,
        affectedBills: [],
        financialImpact: 0,
        detectedAt: new Date(),
        confidence: 0.95,
        evidence: [
          `Expected disclosures: ${expectedDisclosures}`,
          `Actual verified disclosures: ${actualDisclosures}`,
          `Completeness: ${Math.round(completeness * 100)}%`,
          `Threshold for adequate disclosure: ${this.conflictThresholds.disclosure.adequate_threshold * 100}%`
        ]
      });
    }

    return conflicts;
  }

  // ============================================================================
  // RISK CALCULATION METHODS
  // These methods calculate specific risk scores for different factors
  // ============================================================================

  private calculateFinancialRisk(sponsor: Sponsor): number {
    const exposure = this.parseNumeric(sponsor.financialExposure);
    
    if (exposure <= 0) return 0;
    if (exposure < this.conflictThresholds.financial.low) return 10;
    if (exposure < this.conflictThresholds.financial.medium) return 25;
    if (exposure < this.conflictThresholds.financial.high) return 50;
    if (exposure < this.conflictThresholds.financial.critical) return 75;
    return 100;
  }

  private calculateAffiliationRisk(affiliations: SponsorAffiliation[]): number {
    if (affiliations.length === 0) return 0;

    const directConflicts = affiliations.filter(a => a.conflictType === 'financial' || a.conflictType === 'ownership').length;
    const indirectConflicts = affiliations.filter(a => a.conflictType === 'influence' || a.conflictType === 'representation').length;

    let risk = 0;
    risk += directConflicts * 20;  // Direct conflicts are high risk
    risk += indirectConflicts * 10; // Indirect conflicts are medium risk

    // Bonus risk for high total count
    if (affiliations.length > this.conflictThresholds.affiliation.critical_count) {
      risk += 30;
    } else if (affiliations.length > this.conflictThresholds.affiliation.high_count) {
      risk += 15;
    }

    return Math.min(risk, 100);
  }

  private calculateTransparencyRisk(
    transparency: SponsorTransparency[],
    affiliations: SponsorAffiliation[]
  ): number {
    const expectedDisclosures = affiliations.filter(a => 
      a.type === 'economic' || a.conflictType === 'financial'
    ).length;

    if (expectedDisclosures === 0) return 0;

    const actualDisclosures = transparency.filter(t => 
      t.disclosureType === 'financial' && t.isVerified
    ).length;

    const completeness = actualDisclosures / expectedDisclosures;
    
    // Invert completeness to get risk (low transparency = high risk)
    return Math.round((1 - completeness) * 100);
  }

  private calculateBehavioralRisk(sponsor: Sponsor): number {
    const votingAlignment = this.parseNumeric(sponsor.votingAlignment);
    
    // Both very high and very low alignment can indicate problems
    if (votingAlignment > 95 || votingAlignment < 5) return 90;
    if (votingAlignment > 90 || votingAlignment < 10) return 70;
    if (votingAlignment > 85 || votingAlignment < 15) return 50;
    if (votingAlignment > 80 || votingAlignment < 20) return 30;
    
    return 10; // Normal range
  }

  private calculateWeightedRiskScore(breakdown: RiskProfile['breakdown']): number {
    const weights = {
      financial: 0.35,
      affiliation: 0.30,
      transparency: 0.20,
      behavioral: 0.15
    };

    return Math.round(
      breakdown.financialRisk * weights.financial +
      breakdown.affiliationRisk * weights.affiliation +
      breakdown.transparencyRisk * weights.transparency +
      breakdown.behavioralRisk * weights.behavioral
    );
  }

  private determineRiskLevel(score: number): ConflictSeverity {
    if (score >= 75) return 'critical';
    if (score >= 55) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(
    level: ConflictSeverity,
    breakdown: RiskProfile['breakdown']
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'critical' || level === 'high') {
      recommendations.push('Immediate ethics review recommended');
    }

    if (breakdown.financialRisk > 70) {
      recommendations.push('Consider divesting from high-value financial interests');
      recommendations.push('Recuse from voting on directly beneficial legislation');
    }

    if (breakdown.affiliationRisk > 60) {
      recommendations.push('Establish clear boundaries between organizational roles and legislative duties');
      recommendations.push('Consider reducing number of concurrent affiliations');
    }

    if (breakdown.transparencyRisk > 50) {
      recommendations.push('Improve financial disclosure completeness');
      recommendations.push('Provide detailed documentation of all economic interests');
    }

    if (breakdown.behavioralRisk > 60) {
      recommendations.push('Review voting patterns for consistency with stated principles');
      recommendations.push('Provide public justification for votes that align with financial interests');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current transparency practices');
      recommendations.push('Maintain regular disclosure updates');
    }

    return recommendations;
  }

  // ============================================================================
  // NETWORK ANALYSIS METHODS
  // These build and analyze conflict networks
  // ============================================================================

  private async buildConflictNodes(
    conflicts: ConflictDetectionResult[]
  ): Promise<ConflictNode[]> {
    const nodes: ConflictNode[] = [];
    const seenSponsors = new Set<number>();
    const seenOrganizations = new Set<string>();

    // Extract unique sponsor IDs from conflicts
    const sponsorIds = Array.from(new Set(conflicts.map(c => c.sponsorId)));
    const sponsors = await this.getSponsorsList(sponsorIds);
    
    // Get all affiliations in one batch
    const affiliationsMap = await sponsorService.getAffiliationsBySponsorIds(sponsorIds);

    for (const conflict of conflicts) {
      // Add sponsor node if not already added
      if (!seenSponsors.has(conflict.sponsorId)) {
        const sponsor = sponsors.find(s => s.id === conflict.sponsorId);
        if (sponsor) {
          nodes.push({
            id: `sponsor_${conflict.sponsorId}`,
            type: 'sponsor',
            name: sponsor.name,
            conflictLevel: conflict.severity,
            size: this.calculateNodeSize(conflict.severity),
            color: this.severityColors[conflict.severity],
            metadata: {
              party: sponsor.party,
              constituency: sponsor.constituency,
              role: sponsor.role,
              financialExposure: this.parseNumeric(sponsor.financialExposure)
            }
          });
          seenSponsors.add(conflict.sponsorId);
        }
      }

      // Add organization nodes from affiliations
      const affiliations = affiliationsMap.get(conflict.sponsorId) || [];
      for (const affiliation of affiliations) {
        const orgKey = affiliation.organization.toLowerCase().replace(/\s+/g, '_');
        if (!seenOrganizations.has(orgKey)) {
          nodes.push({
            id: `org_${orgKey}`,
            type: 'organization',
            name: affiliation.organization,
            conflictLevel: conflict.severity,
            size: this.calculateNodeSize(conflict.severity) * 0.8,
            color: this.severityColors[conflict.severity],
            metadata: {
              type: affiliation.type,
              conflictType: affiliation.conflictType,
              role: affiliation.role
            }
          });
          seenOrganizations.add(orgKey);
        }
      }
    }

    return nodes;
  }

  private async buildConflictEdges(
    conflicts: ConflictDetectionResult[]
  ): Promise<ConflictEdge[]> {
    const edges: ConflictEdge[] = [];
    const seenEdges = new Set<string>();

    const sponsorIds = Array.from(new Set(conflicts.map(c => c.sponsorId)));
    const affiliationsMap = await sponsorService.getAffiliationsBySponsorIds(sponsorIds);

    for (const conflict of conflicts) {
      const affiliations = affiliationsMap.get(conflict.sponsorId) || [];
      
      for (const affiliation of affiliations) {
        const orgKey = affiliation.organization.toLowerCase().replace(/\s+/g, '_');
        const edgeKey = `${conflict.sponsorId}-${orgKey}`;
        
        // Avoid duplicate edges
        if (!seenEdges.has(edgeKey)) {
          edges.push({
            source: `sponsor_${conflict.sponsorId}`,
            target: `org_${orgKey}`,
            type: conflict.conflictType,
            weight: this.calculateEdgeWeight(conflict.severity),
            severity: conflict.severity,
            label: this.getConflictTypeLabel(conflict.conflictType)
          });
          seenEdges.add(edgeKey);
        }
      }
    }

    return edges;
  }

  private async identifyConflictClusters(
    nodes: ConflictNode[],
    edges: ConflictEdge[]
  ): Promise<ConflictCluster[]> {
    const clusters: ConflictCluster[] = [];
    const visited = new Set<string>();

    // Find connected components (clusters)
    for (const node of nodes) {
      if (visited.has(node.id) || node.type !== 'sponsor') continue;

      const cluster = this.findConnectedComponents(node.id, nodes, edges, visited);
      
      // Only create cluster if it has multiple members
      if (cluster.length > 1) {
        const centerNode = this.findCenterNode(cluster, edges);
        const conflictDensity = this.calculateClusterDensity(cluster, edges);
        const riskLevel = this.calculateClusterRiskLevel(cluster, nodes);

        clusters.push({
          id: `cluster_${clusters.length + 1}`,
          members: cluster,
          centerNode,
          conflictDensity,
          riskLevel
        });
      }
    }

    return clusters;
  }

  private calculateNetworkMetrics(
    nodes: ConflictNode[],
    edges: ConflictEdge[]
  ): NetworkMetrics {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    
    // Network density: actual connections / possible connections
    const density = totalNodes > 1 
      ? (2 * totalEdges) / (totalNodes * (totalNodes - 1)) 
      : 0;
    
    // Calculate centrality scores (degree centrality)
    const centralityScores: Record<string, number> = {};
    nodes.forEach(node => {
      const connections = edges.filter(e => 
        e.source === node.id || e.target === node.id
      ).length;
      centralityScores[node.id] = connections;
    });

    // Risk distribution across severity levels
    const riskDistribution: Record<ConflictSeverity, number> = {
      low: nodes.filter(n => n.conflictLevel === 'low').length,
      medium: nodes.filter(n => n.conflictLevel === 'medium').length,
      high: nodes.filter(n => n.conflictLevel === 'high').length,
      critical: nodes.filter(n => n.conflictLevel === 'critical').length
    };

    return {
      totalNodes,
      totalEdges,
      density,
      clustering: this.calculateClusteringCoefficient(nodes, edges),
      centralityScores,
      riskDistribution
    };
  }

  private calculateClusteringCoefficient(
    nodes: ConflictNode[],
    edges: ConflictEdge[]
  ): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of nodes) {
      const neighbors = this.getNeighbors(node.id, edges);
      if (neighbors.length < 2) continue;

      const possibleEdges = (neighbors.length * (neighbors.length - 1)) / 2;
      const actualEdges = edges.filter(e => 
        neighbors.includes(e.source) && neighbors.includes(e.target)
      ).length;

      totalCoefficient += actualEdges / possibleEdges;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private findConnectedComponents(
    startNode: string,
    nodes: ConflictNode[],
    edges: ConflictEdge[],
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const stack = [startNode];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = edges
        .filter(e => e.source === current || e.target === current)
        .map(e => e.source === current ? e.target : e.source)
        .filter(n => !visited.has(n));

      stack.push(...neighbors);
    }

    return component;
  }

  private findCenterNode(cluster: string[], edges: ConflictEdge[]): string {
    let maxConnections = 0;
    let centerNode = cluster[0];

    for (const node of cluster) {
      const connections = edges.filter(e => 
        (e.source === node || e.target === node) && 
        (cluster.includes(e.source) && cluster.includes(e.target))
      ).length;

      if (connections > maxConnections) {
        maxConnections = connections;
        centerNode = node;
      }
    }

    return centerNode;
  }

  private calculateClusterDensity(cluster: string[], edges: ConflictEdge[]): number {
    const clusterEdges = edges.filter(e => 
      cluster.includes(e.source) && cluster.includes(e.target)
    ).length;
    
    const maxPossibleEdges = (cluster.length * (cluster.length - 1)) / 2;
    return maxPossibleEdges > 0 ? clusterEdges / maxPossibleEdges : 0;
  }

  private calculateClusterRiskLevel(
    cluster: string[],
    nodes: ConflictNode[]
  ): ConflictSeverity {
    const clusterNodes = nodes.filter(n => cluster.includes(n.id));
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    
    const avgScore = clusterNodes.reduce((sum, node) => 
      sum + severityScores[node.conflictLevel], 0
    ) / clusterNodes.length;

    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private getNeighbors(nodeId: string, edges: ConflictEdge[]): string[] {
    return edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
  }

  // ============================================================================
  // TREND ANALYSIS METHODS
  // These analyze historical patterns and predict future conflicts
  // ============================================================================

  private async getHistoricalConflicts(
    sponsorId: number,
    startDate: Date
  ): Promise<ConflictDetectionResult[]> {
    // In a real implementation, this would query historical conflict records
    // For now, we simulate by detecting current conflicts
    const currentConflicts = await this.detectConflicts(sponsorId);
    
    // Filter to those that would have been detectable in the timeframe
    return currentConflicts.filter(c => c.detectedAt >= startDate);
  }

  private calculateTrendMetrics(
    historicalConflicts: ConflictDetectionResult[],
    timeframeMonths: number
  ): { severityTrend: 'increasing' | 'decreasing' | 'stable'; riskScore: number } {
    if (historicalConflicts.length === 0) {
      return { severityTrend: 'stable', riskScore: 0 };
    }

    // Split into recent vs older conflicts
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - Math.floor(timeframeMonths / 2));

    const recentConflicts = historicalConflicts.filter(c => c.detectedAt > cutoffDate);
    const olderConflicts = historicalConflicts.filter(c => c.detectedAt <= cutoffDate);

    const recentSeverityAvg = this.calculateAverageSeverity(recentConflicts);
    const olderSeverityAvg = this.calculateAverageSeverity(olderConflicts);

    let severityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentSeverityAvg > olderSeverityAvg + 0.5) {
      severityTrend = 'increasing';
    } else if (recentSeverityAvg < olderSeverityAvg - 0.5) {
      severityTrend = 'decreasing';
    }

    // Calculate overall risk score
    const conflictCount = historicalConflicts.length;
    const avgSeverity = this.calculateAverageSeverity(historicalConflicts);
    const riskScore = Math.min((conflictCount * 10) + (avgSeverity * 20), 100);

    return { severityTrend, riskScore };
  }

  private calculateAverageSeverity(conflicts: ConflictDetectionResult[]): number {
    if (conflicts.length === 0) return 0;
    
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const total = conflicts.reduce((sum, c) => sum + severityScores[c.severity], 0);
    return total / conflicts.length;
  }

  private async generateConflictPredictions(
    sponsorId: number
  ): Promise<ConflictPrediction[]> {
    const predictions: ConflictPrediction[] = [];
    
    // Get sponsor's affiliations to understand their interests
    const affiliations = await sponsorService.getSponsorAffiliations(sponsorId);
    
    // Get upcoming/introduced bills (would be filtered by status in real implementation)
    const allBills = await sponsorService.getBillsByIds([]);
    const upcomingBills = allBills.slice(0, 5); // Simplified - would query properly

    for (const bill of upcomingBills) {
      // Check if bill content relates to any of sponsor's affiliations
      const relevantAffiliations = affiliations.filter(a => {
        const orgLower = a.organization.toLowerCase();
        const billText = `${bill.title} ${bill.content || ''} ${bill.description || ''}`.toLowerCase();
        return billText.includes(orgLower);
      });

      if (relevantAffiliations.length > 0) {
        const probability = Math.min(relevantAffiliations.length * 0.3, 0.9);
        
        predictions.push({
          billId: bill.id,
          billTitle: bill.title,
          predictedConflictType: 'financial_direct',
          probability,
          riskFactors: relevantAffiliations.map(a => 
            `${a.role || 'Position'} at ${a.organization}`
          )
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  // ============================================================================
  // UTILITY METHODS
  // Helper functions used throughout the service
  // ============================================================================

  private async getSponsorsList(sponsorIds: number[]): Promise<Sponsor[]> {
    if (sponsorIds.length === 0) return [];
    return await sponsorService.getSponsorsByIds(sponsorIds);
  }

  private estimateFinancialImpact(
    sponsor: Sponsor,
    affiliation: SponsorAffiliation,
    billCount: number
  ): number {
    // Base impact: sponsor's overall financial exposure
    const baseExposure = this.parseNumeric(sponsor.financialExposure);
    
    // Scale by number of affected bills
    let impact = (baseExposure / 10) * billCount;

    // Multiply based on affiliation type
    if (affiliation.type === 'economic') {
      impact *= 2;
    } else if (affiliation.conflictType === 'financial') {
      impact *= 1.5;
    }

    // Leadership roles have higher impact
    if (affiliation.role && 
        ['director', 'board', 'executive', 'chairman', 'ceo'].some(
          role => affiliation.role!.toLowerCase().includes(role)
        )) {
      impact *= 1.3;
    }

    return Math.round(impact);
  }

  private isRecentActivity(affiliation: SponsorAffiliation): boolean {
    if (!affiliation.startDate) return false;
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return new Date(affiliation.startDate) > sixMonthsAgo;
  }

  private calculateNodeSize(severity: ConflictSeverity): number {
    const sizeMap = { low: 10, medium: 15, high: 20, critical: 25 };
    return sizeMap[severity];
  }

  private calculateEdgeWeight(severity: ConflictSeverity): number {
    const weightMap = { low: 1, medium: 2, high: 3, critical: 4 };
    return weightMap[severity];
  }

  private getConflictTypeLabel(type: ConflictType): string {
    const labelMap: Record<ConflictType, string> = {
      financial_direct: 'Direct Financial',
      financial_indirect: 'Indirect Financial',
      organizational: 'Organizational',
      family_business: 'Family/Business',
      voting_pattern: 'Voting Pattern',
      timing_suspicious: 'Suspicious Timing',
      disclosure_incomplete: 'Incomplete Disclosure'
    };
    return labelMap[type];
  }

  private parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private formatDate(date: any): string {
    if (!date) return 'Unknown';
    if (date instanceof Date) return date.toISOString().split('T')[0];
    if (typeof date === 'string') return new Date(date).toISOString().split('T')[0];
    return 'Unknown';
  }
}

export const sponsorConflictAnalysisService = new SponsorConflictAnalysisService();





































