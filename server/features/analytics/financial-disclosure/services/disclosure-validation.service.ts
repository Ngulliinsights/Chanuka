// Disclosure Validation Service
// Handles completeness scoring, validation logic, and compliance assessment

import { cache, logger, DatabaseError  } from '@shared/core/index.js';
import { FinancialDisclosureConfig } from '@shared/config';
import { disclosureProcessingService } from './disclosure-processing.service';
import type {
  FinancialDisclosure,
  CompletenessReport
} from '@server/types/index.js';

/**
 * Disclosure Validation Service
 * 
 * Responsible for:
 * - Completeness scoring and assessment
 * - Validation logic for disclosure quality
 * - Compliance risk assessment
 * - Recommendation generation
 */
export class DisclosureValidationService {
  private readonly config = FinancialDisclosureConfig;

  /**
   * Calculates a comprehensive completeness score using multiple dimensions.
   */
  async calculateCompletenessScore(sponsor_id: number): Promise<CompletenessReport> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.completeness(sponsor_id);

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.analyticsReport,
        async () => {
          // Gather all necessary data in parallel for efficiency
          const [sponsorInfo, disclosures] = await Promise.all([
            disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
            disclosureProcessingService.getDisclosureData(sponsor_id)
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
          const lastUpdateDate = disclosureProcessingService.getLatestDisclosureDate(disclosures);

          // Assess risk based on both score and data age
          const riskAssessment = this.assessCompletenessRisk(overallScore, lastUpdateDate);

          // Analyze whether disclosure practices are trending positively or negatively
          const temporalTrend = this.analyzeTemporalTrend(disclosures);

          // Generate specific, actionable recommendations based on the data
          const recommendations = this.generateCompletenessRecommendations(
            metrics, disclosures, missingDisclosures
          );

          return {
            sponsor_id,
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
      logger.error('Error calculating completeness score:', { sponsor_id }, error);
      throw new DatabaseError('Failed to calculate disclosure completeness');
    }
  }

  /**
   * Calculates detailed metrics across four dimensions of disclosure quality.
   */
  private calculateDetailedMetrics(disclosures: FinancialDisclosure[]) {
    const totalRequired = this.config.requiredTypes.length;
    const presentTypes = new Set(disclosures.map(d => d.disclosureType));
    const completedRequired = this.config.requiredTypes.filter(
      type => presentTypes.has(type)
    ).length;

    // Metric 1: Required disclosure coverage (0-1)
    const requiredDisclosureScore = totalRequired > 0
      ? completedRequired / totalRequired
      : 0;

    // Metric 2: Verification rate (0-1)
    const verifiedCount = disclosures.filter(d => d.is_verified).length;
    const verificationScore = disclosures.length > 0
      ? verifiedCount / disclosures.length
      : 0;

    // Metric 3: Data recency using exponential decay (0-1)
    const recencyScore = this.calculateExponentialRecencyScore(disclosures);

    // Metric 4: Detail completeness (0-1)
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
   * newer data.
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
   * the first and second halves of the disclosure history.
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
   */
  private applyWeightedScoring(metrics: ReturnType<typeof this.calculateDetailedMetrics>): number {
    const weights = this.config.completenessWeights;

    const weightedScore =
      (metrics.requiredDisclosureScore * weights.requiredDisclosures * 100) +
      (metrics.verificationScore * weights.verification_status * 100) +
      (metrics.recencyScore * weights.dataRecency * 100) +
      (metrics.detailScore * weights.detailCompleteness * 100);

    return Math.round(Math.min(weightedScore, 100));
  }

  /**
   * Assesses overall completeness risk based on both score and data recency.
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
        d => !d.is_verified && (d.riskLevel === 'high' || d.riskLevel === 'critical')
      ).length;

      if (unverifiedHighRisk > 0) {
        recommendations.push(
          `Urgent: Verify ${unverifiedHighRisk} high-risk disclosure(s) immediately to reduce compliance risk.`
        );
      } else {
        const unverifiedCount = disclosures.filter(d => !d.is_verified).length;
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
}

export const disclosureValidationService = new DisclosureValidationService();
