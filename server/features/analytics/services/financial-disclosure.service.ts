// financial-disclosure-analytics.ts
// Advanced Analytics Service for Financial Disclosure System
// Provides sophisticated analysis using exponential decay models, network analysis,
// and multi-dimensional scoring algorithms

import {
  sponsors, sponsorTransparency, sponsorAffiliations
} from "@shared/schema.js";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { readDatabase } from "../../../db.js";
import { cache } from '../../../utils/cache.js';
import { logger } from '../../../utils/logger.js';
import { SponsorNotFoundError, DatabaseError } from '../../../utils/errors.js';
import { FinancialDisclosureConfig } from '../financial-disclosure/config.js';
import type {
  FinancialDisclosure,
  FinancialRelationship,
  ConflictOfInterest,
  RelationshipMapping,
  CompletenessReport,
  TransparencyDashboard,
  SponsorInfo,
  SponsorAffiliation
} from '../types/index.js';

/**
 * Financial Disclosure Analytics Service
 *
 * This service provides comprehensive analysis of financial disclosure data,
 * generating insights about completeness, risk, and relationship networks.
 * It uses advanced analytical techniques including exponential decay models
 * for recency scoring and network analysis for conflict detection.
 *
 * Key capabilities:
 * - Multi-dimensional completeness scoring with temporal trend analysis
 * - Sophisticated relationship mapping with conflict detection
 * - Risk assessment using both quantitative and qualitative factors
 * - Dashboard generation for system-wide transparency metrics
 *
 * All methods utilize intelligent caching to minimize database load while
 * maintaining data freshness appropriate to each analysis type.
 */
export class FinancialDisclosureAnalyticsService {
  // Import configuration constants from centralized config
  private readonly config = FinancialDisclosureConfig;

  // ============================================================================
  // Core Data Retrieval Methods
  // ============================================================================

  /**
   * Retrieves financial disclosure data with enrichment and caching.
   * This method adds calculated fields like completeness scores and risk levels
   * to the raw database records, providing a foundation for further analysis.
   *
   * The optional sponsorId parameter allows filtering to a single sponsor,
   * which is useful for sponsor-specific reports and analysis.
   */
  async getDisclosureData(sponsorId?: number): Promise<FinancialDisclosure[]> {
    try {
      const cacheKey = sponsorId
        ? this.config.cache.keyPrefixes.disclosures(sponsorId)
        : this.config.cache.keyPrefixes.allDisclosures();

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.disclosureData,
        async () => {
          // Build the query with optional sponsor filtering
          let query = readDatabase()
            .select({
              id: sponsorTransparency.id,
              sponsorId: sponsorTransparency.sponsorId,
              disclosureType: sponsorTransparency.disclosureType,
              description: sponsorTransparency.description,
              amount: sponsorTransparency.amount,
              source: sponsorTransparency.source,
              dateReported: sponsorTransparency.dateReported,
              isVerified: sponsorTransparency.isVerified,
              createdAt: sponsorTransparency.createdAt
            })
            .from(sponsorTransparency)
            .innerJoin(sponsors, eq(sponsorTransparency.sponsorId, sponsors.id));

          if (sponsorId) {
            query = query.where(eq(sponsorTransparency.sponsorId, sponsorId));
          }

          const rawData = await query.orderBy(desc(sponsorTransparency.dateReported));

          // Transform each raw record into an enriched disclosure object
          // This adds calculated fields like risk levels and completeness scores
          return rawData.map(disclosure => this.enrichDisclosure(disclosure));
        }
      );
    } catch (error) {
      logger.error('Error retrieving disclosure data:', { sponsorId }, error);
      throw new DatabaseError('Failed to retrieve disclosure data for analysis');
    }
  }

  // ============================================================================
  // Completeness Analysis Methods
  // ============================================================================

  /**
   * Calculates a comprehensive completeness score using multiple dimensions.
   *
   * This method analyzes disclosure quality across four key dimensions:
   * 1. Required disclosure coverage - Are all mandatory types present?
   * 2. Verification rate - What percentage has been officially verified?
   * 3. Data recency - How current is the information using exponential decay?
   * 4. Detail quality - How complete are individual disclosures?
   *
   * The method also performs temporal trend analysis to determine if disclosure
   * practices are improving or declining over time, and generates specific
   * actionable recommendations based on the analysis results.
   */
  async calculateCompletenessScore(sponsorId: number): Promise<CompletenessReport> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.completeness(sponsorId);

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.analyticsReport,
        async () => {
          // Gather all necessary data in parallel for efficiency
          const [sponsorInfo, disclosures] = await Promise.all([
            this.getSponsorBasicInfo(sponsorId),
            this.getDisclosureData(sponsorId)
          ]);

          // Calculate the four component metrics that feed into our scoring
          const metrics = this.calculateDetailedMetrics(disclosures);

          // Combine metrics into a weighted overall score using configured weights
          const overallScore = this.applyWeightedScoring(metrics);

          // Determine which required disclosure types are missing
          const presentTypes = new Set(disclosures.map(d => d.disclosureType));
          const missingDisclosures = this.config.requiredTypes.filter(
            type => !presentTypes.has(type)
          );

          // Find the most recent disclosure date
          const lastUpdateDate = this.getLatestDisclosureDate(disclosures);

          // Assess risk based on both score and data age
          const riskAssessment = this.assessCompletenessRisk(overallScore, lastUpdateDate);

          // Analyze whether disclosure practices are trending positively or negatively
          const temporalTrend = this.analyzeTemporalTrend(disclosures);

          // Generate specific, actionable recommendations based on the data
          const recommendations = this.generateCompletenessRecommendations(
            metrics, disclosures, missingDisclosures
          );

          return {
            sponsorId,
            sponsorName: sponsorInfo.name,
            overallScore,
            requiredDisclosures: this.config.requiredTypes.length,
            completedDisclosures: this.config.requiredTypes.filter(
              t => presentTypes.has(t)
            ).length,
            missingDisclosures,
            lastUpdateDate,
            riskAssessment,
            temporalTrend,
            recommendations,
            detailedMetrics: {
              requiredDisclosureScore: metrics.requiredDisclosureScore,
              verificationScore: metrics.verificationScore,
              recencyScore: metrics.recencyScore,
              detailScore: metrics.detailScore
            }
          };
        }
      );
    } catch (error) {
      logger.error('Error calculating completeness score:', { sponsorId }, error);
      throw new DatabaseError('Failed to calculate disclosure completeness');
    }
  }

  /**
   * Calculates detailed metrics across four dimensions of disclosure quality.
   * Each metric is normalized to a 0-1 scale for consistent weighting.
   *
   * This method implements the core scoring logic that drives our completeness
   * assessment. By breaking quality into these four independent dimensions,
   * we can provide granular feedback about specific areas needing improvement.
   */
  private calculateDetailedMetrics(disclosures: FinancialDisclosure[]) {
    const totalRequired = this.config.requiredTypes.length;
    const presentTypes = new Set(disclosures.map(d => d.disclosureType));
    const completedRequired = this.config.requiredTypes.filter(
      type => presentTypes.has(type)
    ).length;

    // Metric 1: Required disclosure coverage (0-1)
    // This measures whether the sponsor has submitted all mandatory disclosure types
    // A score of 1.0 means all required types are present
    const requiredDisclosureScore = totalRequired > 0
      ? completedRequired / totalRequired
      : 0;

    // Metric 2: Verification rate (0-1)
    // Higher verification rates indicate better data quality and transparency
    // Verified disclosures have been reviewed and confirmed by compliance staff
    const verifiedCount = disclosures.filter(d => d.isVerified).length;
    const verificationScore = disclosures.length > 0
      ? verifiedCount / disclosures.length
      : 0;

    // Metric 3: Data recency using exponential decay (0-1)
    // This favors recent disclosures much more heavily than simple age thresholds
    // The exponential decay creates smooth, continuous penalties for older data
    const recencyScore = this.calculateExponentialRecencyScore(disclosures);

    // Metric 4: Detail completeness (0-1)
    // Disclosures with amounts, sources, and substantial descriptions score higher
    // This incentivizes providing complete, useful information rather than minimal entries
    const detailedDisclosures = disclosures.filter(d =>
      d.amount !== undefined &&
      d.source !== undefined &&
      d.description.length > 50
    ).length;
    const detailScore = disclosures.length > 0
      ? detailedDisclosures / disclosures.length
      : 0;

    return {
      requiredDisclosureScore,
      verificationScore,
      recencyScore,
      detailScore,
      totalDisclosures: disclosures.length,
      completedRequired
    };
  }

  /**
   * Uses exponential decay to calculate a recency score that heavily favors
   * newer data. This is more sophisticated than simple age thresholds because
   * it creates a smooth, continuous penalty for older data rather than
   * arbitrary cutoffs.
   *
   * The decay formula is: score = e^(-decay_rate * age_in_days)
   * With our configured decay rate of 0.002, disclosures lose approximately
   * 50% of their value after one year, creating a natural incentive to keep
   * information current without harsh binary penalties.
   */
  private calculateExponentialRecencyScore(disclosures: FinancialDisclosure[]): number {
    if (disclosures.length === 0) return 0;

    const now = Date.now();
    const totalScore = disclosures.reduce((sum, disclosure) => {
      const ageInDays = (now - disclosure.dateReported.getTime()) / (1000 * 60 * 60 * 24);
      // Apply exponential decay formula
      return sum + Math.exp(-this.config.analytics.recencyDecayRate * ageInDays);
    }, 0);

    // Return the average score across all disclosures
    return totalScore / disclosures.length;
  }

  /**
   * Analyzes temporal trends by comparing disclosure patterns between
   * the first and second halves of the disclosure history. This reveals
   * whether the sponsor's disclosure practices are improving or declining.
   *
   * We need at least 5 disclosures to establish a meaningful trend.
   * The 10% threshold prevents minor fluctuations from triggering
   * trend classifications, focusing on substantial changes.
   */
  private analyzeTemporalTrend(disclosures: FinancialDisclosure[]): CompletenessReport['temporalTrend'] {
    // Need sufficient data to establish a meaningful trend
    if (disclosures.length < 5) return 'stable';

    // Sort disclosures chronologically
    const sorted = [...disclosures].sort(
      (a, b) => a.dateReported.getTime() - b.dateReported.getTime()
    );

    // Split into two time periods
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    // Compare quality metrics between periods
    const firstHalfScore = this.calculateExponentialRecencyScore(firstHalf);
    const secondHalfScore = this.calculateExponentialRecencyScore(secondHalf);

    // Determine trend with a 10% threshold to avoid noise
    if (secondHalfScore > firstHalfScore * 1.1) return 'improving';
    if (firstHalfScore > secondHalfScore * 1.1) return 'declining';
    return 'stable';
  }

  /**
   * Applies weighted scoring to combine the four metric dimensions into
   * a single overall completeness score on a 0-100 scale.
   *
   * The weights are configured in our central configuration and reflect
   * the relative importance of each dimension to overall compliance.
   */
  private applyWeightedScoring(metrics: ReturnType<typeof this.calculateDetailedMetrics>): number {
    const weights = this.config.completenessWeights;

    const weightedScore =
      (metrics.requiredDisclosureScore * weights.requiredDisclosures * 100) +
      (metrics.verificationScore * weights.verificationStatus * 100) +
      (metrics.recencyScore * weights.dataRecency * 100) +
      (metrics.detailScore * weights.detailCompleteness * 100);

    return Math.round(Math.min(weightedScore, 100));
  }

  // ============================================================================
  // Relationship Mapping and Network Analysis
  // ============================================================================

  /**
   * Builds a comprehensive relationship map that reveals networks of financial
   * connections and potential conflicts of interest. This method combines data
   * from both financial disclosures and organizational affiliations to create
   * a complete picture of a sponsor's financial relationships.
   *
   * The relationship mapping process:
   * 1. Extracts relationships from disclosure data (amounts and sources)
   * 2. Incorporates organizational affiliation data
   * 3. Deduplicates entities that appear in multiple sources
   * 4. Calculates network metrics (centrality, clustering, risk propagation)
   * 5. Detects potential conflicts of interest
   * 6. Assesses overall risk considering exposure and conflicts
   */
  async buildRelationshipMap(sponsorId: number): Promise<RelationshipMapping> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.relationships(sponsorId);

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.relationshipMap,
        async () => {
          // Gather all relationship data sources in parallel
          const [sponsorInfo, disclosures, affiliations] = await Promise.all([
            this.getSponsorBasicInfo(sponsorId),
            this.getDisclosureData(sponsorId),
            this.getAffiliations(sponsorId)
          ]);

          // Build relationships from financial disclosures
          const disclosureRelationships = disclosures
            .filter(d => d.source && d.amount)
            .map(d => this.mapDisclosureToRelationship(sponsorId, d));

          // Build relationships from organizational affiliations
          const affiliationRelationships = affiliations
            .map(a => this.mapAffiliationToRelationship(sponsorId, a));

          // Combine and deduplicate to handle entities appearing in both sources
          const allRelationships = [...disclosureRelationships, ...affiliationRelationships];
          const uniqueRelationships = this.deduplicateRelationships(allRelationships);

          // Calculate total financial exposure across all relationships
          const totalFinancialExposure = uniqueRelationships.reduce(
            (sum, r) => sum + (r.financialValue || 0),
            0
          );

          // Detect potential conflicts of interest
          const detectedConflicts = this.detectConflictsOfInterest(uniqueRelationships);

          // Perform network analysis to understand relationship patterns
          const networkMetrics = this.calculateNetworkMetrics(
            uniqueRelationships,
            totalFinancialExposure
          );

          // Assess overall risk considering both exposure and conflicts
          const riskAssessment = this.assessOverallRisk(
            totalFinancialExposure,
            detectedConflicts
          );

          return {
            sponsorId,
            sponsorName: sponsorInfo.name,
            relationships: uniqueRelationships,
            totalFinancialExposure,
            riskAssessment,
            detectedConflicts,
            networkMetrics,
            lastMappingUpdate: new Date()
          };
        }
      );
    } catch (error) {
      logger.error('Error building relationship map:', { sponsorId }, error);
      throw new DatabaseError('Failed to build financial relationship map');
    }
  }

  /**
   * Detects conflicts of interest by analyzing relationship patterns.
   *
   * A conflict exists when the same entity appears in multiple relationship
   * contexts that could create competing interests. Key conflict scenarios:
   *
   * 1. Ownership/Business + Investment: Having both operational control
   *    and financial investment creates dual incentives
   * 2. Employment + Investment: Being employed by and invested in the same
   *    entity can affect objectivity
   *
   * The severity is escalated based on the total financial value involved.
   */
  private detectConflictsOfInterest(
    relationships: FinancialRelationship[]
  ): ConflictOfInterest[] {
    const conflicts: ConflictOfInterest[] = [];

    // Group relationships by entity to find overlapping connections
    const entityMap = new Map<string, FinancialRelationship[]>();
    for (const rel of relationships) {
      const key = rel.relatedEntity.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, []);
      }
      entityMap.get(key)!.push(rel);
    }

    // Analyze each entity for conflicting relationship types
    for (const [entity, rels] of Array.from(entityMap.entries())) {
      if (rels.length < 2) continue;

      // Check for ownership/business + investment conflicts
      const hasOwnership = rels.some(r =>
        r.relationshipType === 'ownership' || r.relationshipType === 'business_partner'
      );
      const hasInvestment = rels.some(r => r.relationshipType === 'investment');

      if (hasOwnership && hasInvestment) {
        const totalValue = rels.reduce((sum, r) => sum + (r.financialValue || 0), 0);
        const minConflictValue = this.config.analytics.conflictDetection.minimumConflictValue;

        conflicts.push({
          entity,
          severity: totalValue > 1_000_000 ? 'critical' : 'high',
          description: `Dual-role conflict: Sponsor has both ownership/business relationship and financial investment with '${entity}', creating potential for competing interests.`,
          relatedRelationships: rels,
          potentialImpact: totalValue > 1_000_000
            ? `High financial exposure (KSh ${totalValue.toLocaleString()}) amplifies conflict risk.`
            : `Moderate financial exposure may influence decision-making.`
        });
      }

      // Check for high-value employment + investment conflicts
      const hasEmployment = rels.some(r => r.relationshipType === 'employment');
      if (hasEmployment && hasInvestment) {
        const totalValue = rels.reduce((sum, r) => sum + (r.financialValue || 0), 0);
        const minConflictValue = this.config.analytics.conflictDetection.minimumConflictValue;

        if (totalValue > minConflictValue) {
          conflicts.push({
            entity,
            severity: 'medium',
            description: `Employment-investment overlap: Sponsor is both employed by and invested in '${entity}'.`,
            relatedRelationships: rels,
            potentialImpact: `Financial interest (KSh ${totalValue.toLocaleString()}) may affect employment decisions or vice versa.`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Calculates network metrics to understand relationship patterns and risk.
   *
   * These metrics help identify highly connected sponsors who may have
   * concentrated risk or unusual relationship structures:
   *
   * - Centrality: Measures how connected this sponsor is to other entities
   * - Clustering: Measures how interconnected the relationships are
   * - Risk Propagation: Potential for risk to spread through the network
   * - Risk Concentration: Whether exposure is concentrated or diversified
   */
  private calculateNetworkMetrics(
    relationships: FinancialRelationship[],
    totalExposure: number
  ) {
    // Centrality: measures how connected this sponsor is to other entities
    const relationshipCount = relationships.length;
    const avgStrength = relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.strength, 0) / relationships.length
      : 0;
    const centralityScore = Math.min((relationshipCount * 10) + avgStrength, 100);

    // Clustering: measures how interconnected the relationships are
    const strongRelationships = relationships.filter(r =>
      r.strength > this.config.analytics.networkMetrics.strongRelationshipThreshold
    ).length;
    const clusteringCoefficient = relationships.length > 0
      ? (strongRelationships / relationships.length) * 100
      : 0;

    // Risk Propagation: measures potential for risk to spread through network
    const criticalCount = relationships.filter(r => r.conflictPotential === 'critical').length;
    const highCount = relationships.filter(r => r.conflictPotential === 'high').length;
    const riskPropagation = Math.min((criticalCount * 30) + (highCount * 15), 100);

    // Risk Concentration: measures if financial exposure is concentrated or diversified
    // Higher concentration means more risk in fewer relationships
    const riskConcentration = this.calculateRiskConcentration(relationships, totalExposure);

    return {
      centralityScore: Math.round(centralityScore),
      clusteringCoefficient: Math.round(clusteringCoefficient),
      riskPropagation: Math.round(riskPropagation),
      riskConcentration: Math.round(riskConcentration)
    };
  }

  /**
   * Calculates risk concentration using a Herfindahl-Hirschman Index (HHI) approach.
   *
   * This reveals whether financial exposure is dangerously concentrated in
   * a few relationships or healthily diversified across many.
   *
   * HHI is the sum of squared proportions. A score of:
   * - 100 indicates complete concentration (all exposure in one relationship)
   * - 0 indicates perfect diversification (exposure evenly spread)
   */
  private calculateRiskConcentration(
    relationships: FinancialRelationship[],
    totalExposure: number
  ): number {
    if (totalExposure === 0 || relationships.length === 0) return 0;

    // Calculate the sum of squared proportions (HHI)
    const hhi = relationships.reduce((sum, rel) => {
      const proportion = (rel.financialValue || 0) / totalExposure;
      return sum + (proportion * proportion);
    }, 0);

    // Convert HHI to a 0-100 scale (1.0 = 100% concentrated, 0 = perfectly diversified)
    return hhi * 100;
  }

  // ============================================================================
  // Dashboard and Reporting Methods
  // ============================================================================

  /**
   * Generates a comprehensive transparency dashboard providing a system-wide
   * view of disclosure compliance, risk distribution, and performance metrics.
   *
   * This dashboard is designed for executive oversight and provides:
   * - Overall system health metrics
   * - Risk distribution across all sponsors
   * - Top performers (for recognition)
   * - Sponsors needing attention (for intervention)
   */
  async generateDashboard(): Promise<TransparencyDashboard> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.dashboard();

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.dashboard,
        async () => {
          // Execute all dashboard queries in parallel for efficiency
          const [sponsorStats, disclosureStats, riskDistribution, performanceData] =
            await Promise.all([
              this.getSponsorStatistics(),
              this.getDisclosureStatistics(),
              this.getRiskDistribution(),
              this.getPerformanceMetrics()
            ]);

          return {
            generatedAt: new Date(),
            totalSponsors: sponsorStats.total,
            averageCompletenessScore: performanceData.averageScore,
            disclosureStatistics: disclosureStats,
            riskDistribution,
            topPerformers: performanceData.topPerformers,
            needsAttention: performanceData.needsAttention
          };
        }
      );
    } catch (error) {
      logger.error('Error generating dashboard:', undefined, error);
      throw new DatabaseError('Failed to generate transparency dashboard');
    }
  }

  /**
   * Retrieves basic statistics about active sponsors in the system.
   */
  private async getSponsorStatistics() {
    const result = await readDatabase()
      .select({ total: count() })
      .from(sponsors)
      .where(eq(sponsors.isActive, true));

    return { total: result[0]?.total || 0 };
  }

  /**
   * Gathers statistics about disclosure submissions, including counts by type
   * and verification status.
   */
  private async getDisclosureStatistics() {
    const stats = await readDatabase()
      .select({
        disclosureType: sponsorTransparency.disclosureType,
        total: count(),
        verified: sql<number>`SUM(CASE WHEN ${sponsorTransparency.isVerified} THEN 1 ELSE 0 END)`
      })
      .from(sponsorTransparency)
      .groupBy(sponsorTransparency.disclosureType);

    const byType: Record<string, number> = {};
    let totalCount = 0;
    let verifiedCount = 0;

    for (const stat of stats) {
      const typeTotal = stat.total || 0;
      const typeVerified = Number(stat.verified) || 0;

      byType[stat.disclosureType] = typeTotal;
      totalCount += typeTotal;
      verifiedCount += typeVerified;
    }

    return {
      total: totalCount,
      verified: verifiedCount,
      pending: totalCount - verifiedCount,
      byType
    };
  }

  /**
   * Calculates the distribution of risk levels across all active sponsors.
   * This provides insight into systemic risk patterns.
   *
   * Note: Limited to 100 sponsors for performance on large datasets.
   * In production, consider implementing pagination or sampling strategies.
   */
  private async getRiskDistribution() {
    const activeSponsors = await readDatabase()
      .select({ id: sponsors.id })
      .from(sponsors)
      .where(eq(sponsors.isActive, true))
      .limit(100);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    // Calculate risk for each sponsor
    for (const sponsor of activeSponsors) {
      try {
        const report = await this.calculateCompletenessScore(sponsor.id);
        riskCounts[report.riskAssessment]++;
      } catch {
        // Skip sponsors that error out during calculation
        continue;
      }
    }

    return riskCounts;
  }

  /**
   * Identifies top performers and sponsors needing attention based on
   * completeness scores and risk assessments.
   */
  private async getPerformanceMetrics() {
    const activeSponsors = await readDatabase()
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .where(eq(sponsors.isActive, true))
      .limit(100);

    // Calculate completeness reports for all sponsors
    const reports = await Promise.all(
      activeSponsors.map(async s => {
        try {
          return await this.calculateCompletenessScore(s.id);
        } catch {
          return null;
        }
      })
    );

    const validReports = reports.filter((r): r is CompletenessReport => r !== null);

    // Calculate average score across all sponsors
    const averageScore = validReports.length > 0
      ? Math.round(validReports.reduce((sum, r) => sum + r.overallScore, 0) / validReports.length)
      : 0;

    // Identify top 5 performers by score
    const topPerformers = validReports
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5)
      .map(r => ({
        sponsorId: r.sponsorId,
        sponsorName: r.sponsorName,
        score: r.overallScore
      }));

    // Identify sponsors with high/critical risk that need attention
    const needsAttention = validReports
      .filter(r => r.riskAssessment === 'high' || r.riskAssessment === 'critical')
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 10)
      .map(r => ({
        sponsorId: r.sponsorId,
        sponsorName: r.sponsorName,
        score: r.overallScore,
        riskLevel: r.riskAssessment
      }));

    return { averageScore, topPerformers, needsAttention };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Enriches raw disclosure data with calculated fields for completeness
   * scoring and risk assessment.
   */
  private enrichDisclosure(raw: any): FinancialDisclosure {
    return {
      id: raw.id,
      sponsorId: raw.sponsorId,
      disclosureType: raw.disclosureType,
      description: raw.description || '',
      amount: raw.amount ? Number(raw.amount) : undefined,
      source: raw.source || undefined,
      dateReported: new Date(raw.dateReported),
      isVerified: Boolean(raw.isVerified),
      completenessScore: this.calculateIndividualCompletenessScore(raw),
      riskLevel: this.assessIndividualRiskLevel(raw),
      lastUpdated: new Date(raw.createdAt || raw.dateReported)
    };
  }

  /**
   * Calculates a simple completeness score for an individual disclosure
   * based on presence of key fields.
   */
  private calculateIndividualCompletenessScore(disclosure: any): number {
    let score = 40; // Base score for having a disclosure
    if (disclosure.isVerified) score += 30;
    if (disclosure.amount) score += 20;
    if (disclosure.source) score += 10;
    return Math.min(score, 100);
  }

  /**
   * Assesses risk level for an individual disclosure based on amount
   * and verification status.
   */
  private assessIndividualRiskLevel(disclosure: any): FinancialDisclosure['riskLevel'] {
    const amount = Number(disclosure.amount) || 0;
    const verified = Boolean(disclosure.isVerified);

    // Unverified high-value disclosures are highest risk
    if (!verified && amount > 1_000_000) return 'critical';
    if (!verified && amount > 500_000) return 'high';
    if (amount > this.config.thresholds.income) return 'medium';
    return 'low';
  }

  /**
   * Assesses overall completeness risk based on both score and data recency.
   * This considers both the quality of disclosures and how current they are.
   */
  private assessCompletenessRisk(
    score: number,
    lastUpdate: Date
  ): CompletenessReport['riskAssessment'] {
    const daysSinceUpdate = Math.floor(
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const thresholds = this.config.riskThresholds.disclosureAge;

    // Critical risk: low score or very stale data
    if (score < 50 || daysSinceUpdate > thresholds.stale) return 'critical';
    // High risk: moderate score or stale data
    if (score < 70 || daysSinceUpdate > thresholds.recent) return 'high';
    // Medium risk: good score but aging data
    if (score < 85 || daysSinceUpdate > thresholds.current) return 'medium';
    // Low risk: excellent score and current data
    return 'low';
  }

  /**
   * Generates specific, actionable recommendations based on the analysis
   * of completeness metrics and disclosure patterns.
   */
  private generateCompletenessRecommendations(
    metrics: ReturnType<typeof this.calculateDetailedMetrics>,
    disclosures: FinancialDisclosure[],
    missingTypes: readonly string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing required disclosures
    if (metrics.requiredDisclosureScore < 0.75) {
      recommendations.push(
        `Priority action required: Complete missing disclosure types including ${missingTypes.join(', ')}`
      );
    }

    // Check verification status
    if (metrics.verificationScore < 0.6) {
      const unverifiedHighRisk = disclosures.filter(
        d => !d.isVerified && (d.riskLevel === 'high' || d.riskLevel === 'critical')
      ).length;

      if (unverifiedHighRisk > 0) {
        recommendations.push(
          `Urgent: Verify ${unverifiedHighRisk} high-risk disclosure(s) immediately to reduce compliance risk.`
        );
      } else {
        const unverifiedCount = disclosures.filter(d => !d.isVerified).length;
        recommendations.push(
          `Verify ${unverifiedCount} pending disclosures to improve transparency rating.`
        );
      }
    }

    // Check data recency
    if (metrics.recencyScore < 0.5) {
      const staleCount = disclosures.filter(d => {
        const ageInDays = (Date.now() - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays > this.config.riskThresholds.disclosureAge.stale;
      }).length;
      recommendations.push(
        `Update ${staleCount} disclosures that are more than one year old to reflect current financial status.`
      );
    }

    // Check detail quality
    if (metrics.detailScore < 0.4) {
      recommendations.push(
        'Enhance disclosure quality by adding amounts, sources, and detailed descriptions to existing entries.'
      );
    }

    // If everything is good, provide positive reinforcement
    if (recommendations.length === 0) {
      recommendations.push(
        'Excellent compliance - disclosure practices meet all benchmarks. Continue maintaining timely and verified reporting.'
      );
    }

    return recommendations;
  }

  /**
   * Converts a financial disclosure into a relationship object for network analysis.
   */
  private mapDisclosureToRelationship(
    sponsorId: number,
    disclosure: FinancialDisclosure
  ): FinancialRelationship {
    // Map disclosure types to relationship types
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      'financial': 'investment',
      'business': 'ownership',
      'investment': 'investment',
      'income': 'employment',
      'family': 'family',
      'debt': 'investment',
      'real_estate': 'ownership',
      'gifts': 'family'
    };

    return {
      sponsorId,
      relatedEntity: disclosure.source!,
      relationshipType: typeMapping[disclosure.disclosureType] || 'investment',
      strength: this.calculateFinancialStrength(disclosure.amount || 0),
      financialValue: disclosure.amount,
      isActive: true,
      conflictPotential: disclosure.riskLevel
    };
  }

  /**
   * Converts an organizational affiliation into a relationship object.
   */
  private mapAffiliationToRelationship(
    sponsorId: number,
    affiliation: SponsorAffiliation
  ): FinancialRelationship {
    const typeMapping: Record<string, FinancialRelationship['relationshipType']> = {
      'economic': 'business_partner',
      'professional': 'employment',
      'ownership': 'ownership',
      'family': 'family'
    };

    return {
      sponsorId,
      relatedEntity: affiliation.organization || 'Unknown Organization',
      relationshipType: typeMapping[affiliation.type] || 'business_partner',
      strength: this.calculateAffiliationStrength(affiliation),
      startDate: affiliation.startDate ? new Date(affiliation.startDate) : undefined,
      endDate: affiliation.endDate ? new Date(affiliation.endDate) : undefined,
      isActive: Boolean(affiliation.isActive),
      conflictPotential: this.assessAffiliationConflict(affiliation)
    };
  }

  /**
   * Calculates relationship strength based on financial value.
   * Higher amounts indicate stronger financial connections.
   */
  private calculateFinancialStrength(amount: number): number {
    if (amount >= 1_000_000) return 100;
    if (amount >= 500_000) return 80;
    if (amount >= 100_000) return 60;
    if (amount >= 50_000) return 40;
    return 20;
  }

  /**
   * Calculates relationship strength for affiliations based on
   * activity status and conflict indicators.
   */
  private calculateAffiliationStrength(affiliation: SponsorAffiliation): number {
    let strength = 50;
    if (affiliation.isActive) strength += 30;
    if (affiliation.conflictType) strength += 20;
    return Math.min(strength, 100);
  }

  /**
   * Assesses conflict potential for an affiliation relationship.
   */
  private assessAffiliationConflict(
    affiliation: SponsorAffiliation
  ): FinancialRelationship['conflictPotential'] {
    if (affiliation.conflictType === 'ownership') return 'critical';
    if (affiliation.conflictType === 'financial') return 'high';
    if (affiliation.type === 'economic') return 'medium';
    return 'low';
  }

  /**
   * Assesses overall relationship risk based on financial exposure and
   * detected conflicts of interest.
   */
  private assessOverallRisk(
    exposure: number,
    conflicts: ConflictOfInterest[]
  ): RelationshipMapping['riskAssessment'] {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const highConflicts = conflicts.filter(c => c.severity === 'high').length;
    const thresholds = this.config.riskThresholds.financialExposure;

    // Critical conditions
    if (exposure > thresholds.high || criticalConflicts > 0) {
      return 'critical';
    }
    // High risk conditions
    if (exposure > thresholds.medium || highConflicts > 2) {
      return 'high';
    }
    // Medium risk conditions
    if (exposure > thresholds.low || highConflicts > 0) {
      return 'medium';
    }
    // Low risk
    return 'low';
  }

  /**
   * Deduplicates relationships that refer to the same entity, merging
   * their financial values and keeping the stronger connection.
   */
  private deduplicateRelationships(
    relationships: FinancialRelationship[]
  ): FinancialRelationship[] {
    const seen = new Map<string, FinancialRelationship>();

    for (const rel of relationships) {
      const key = `${rel.relatedEntity.toLowerCase()}_${rel.relationshipType}`;
      const existing = seen.get(key);

      if (!existing || rel.strength > existing.strength) {
        // If this is a duplicate, merge the financial values
        if (existing && existing.financialValue) {
          rel.financialValue = (rel.financialValue || 0) + existing.financialValue;
        }
        seen.set(key, rel);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Retrieves basic sponsor information from the database.
   */
  private async getSponsorBasicInfo(sponsorId: number): Promise<SponsorInfo> {
    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsorId);

    return await cache.getOrSetCache(
      cacheKey,
      this.config.cache.ttl.sponsorInfo,
      async () => {
        const result = await readDatabase()
          .select({
            id: sponsors.id,
            name: sponsors.name,
            isActive: sponsors.isActive
          })
          .from(sponsors)
          .where(eq(sponsors.id, sponsorId))
          .limit(1);

        if (!result.length) {
          throw new SponsorNotFoundError(`Sponsor with ID ${sponsorId} not found`);
        }

        return result[0];
      }
    );
  }

  /**
   * Retrieves affiliation records for a sponsor from the database.
   */
  private async getAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    try {
      return await readDatabase()
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsorId, sponsorId));
    } catch (error) {
      logger.warn('Failed to fetch affiliations:', { sponsorId, error });
      return [];
    }
  }

  /**
   * Finds the most recent disclosure date from a set of disclosures.
   */
  private getLatestDisclosureDate(disclosures: FinancialDisclosure[]): Date {
    if (disclosures.length === 0) return new Date(0);
    return new Date(Math.max(...disclosures.map(d => d.dateReported.getTime())));
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const financialDisclosureAnalyticsService = new FinancialDisclosureAnalyticsService();
