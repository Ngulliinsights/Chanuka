// Disclosure Validation Service
// Handles completeness scoring, validation logic, and compliance assessment

import type { CompletenessReport, FinancialDisclosure } from '../types';
import { FinancialDisclosureConfig } from '../config';
import { createDatabaseError, createNotFoundError } from '@server/infrastructure/error-handling';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { disclosureProcessingService } from './disclosure-processing.service';

const MS_PER_DAY = 1_000 * 60 * 60 * 24;
const MIN_DISCLOSURES_FOR_TREND = 5;
const TREND_THRESHOLD = 0.1;

interface DetailedMetrics {
  requiredDisclosureScore: number;
  verificationScore: number;
  recencyScore: number;
  detailScore: number;
  totalDisclosures: number;
  completedRequired: number;
  staleCount: number;
  unverifiedCount: number;
}

export class DisclosureValidationService {
  private readonly config = FinancialDisclosureConfig;

  async calculateCompletenessScore(sponsor_id: number): Promise<CompletenessReport> {
    const cacheKey = this.config.cache.keyPrefixes.completeness(sponsor_id);

    try {
      const cached = await cacheService.get<CompletenessReport>(cacheKey);
      if (cached) return cached;

      const result = await (async () => {
        const [sponsorInfo, disclosures] = await Promise.all([
          disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
          disclosureProcessingService.getDisclosureData(sponsor_id),
        ]);

        if (!sponsorInfo) {
          throw createNotFoundError(
            'Sponsor', String(sponsor_id),
            { service: 'disclosure-validation', operation: 'calculateCompletenessScore' }
          );
        }

        const presentTypes = new Set(disclosures.map((d) => d.disclosureType));
        const missingDisclosures = this.config.requiredTypes.filter((t) => !presentTypes.has(t));

        const metrics = this.calculateDetailedMetrics(disclosures, presentTypes);
        const overallScore = this.applyWeightedScoring(metrics);
        const lastUpdateDate = disclosureProcessingService.getLatestDisclosureDate(disclosures);

        return {
          sponsor_id,
          sponsorName: sponsorInfo.name,
          overallScore,
          requiredDisclosures: this.config.requiredTypes.length,
          completedDisclosures: this.config.requiredTypes.length - missingDisclosures.length,
          missingDisclosures,
          lastUpdateDate,
          riskAssessment: this.assessCompletenessRisk(overallScore, lastUpdateDate),
          temporalTrend: this.analyzeTemporalTrend(disclosures),
          recommendations: this.generateRecommendations(metrics, disclosures, missingDisclosures),
          detailedMetrics: {
            requiredDisclosureScore: metrics.requiredDisclosureScore,
            verificationScore: metrics.verificationScore,
            recencyScore: metrics.recencyScore,
            detailScore: metrics.detailScore,
          },
        };
      })();

      await cacheService.set(cacheKey, result, this.config.cache.ttl.analyticsReport);
      return result;
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error calculating completeness score');
      throw createDatabaseError(
        'calculateCompletenessScore',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'disclosure-validation', operation: 'calculateCompletenessScore' }
      );
    }
  }

  private calculateDetailedMetrics(
    disclosures: FinancialDisclosure[],
    presentTypes: Set<string>
  ): DetailedMetrics {
    const total = disclosures.length;
    const now = Date.now();
    const staleThreshold = this.config.riskThresholds.disclosureAge.stale;

    const completedRequired = this.config.requiredTypes.filter((t) =>
      presentTypes.has(t)
    ).length;

    let verifiedCount = 0;
    let detailedCount = 0;
    let staleCount = 0;
    let recencySum = 0;
    const decayRate = this.config.analytics.recencyDecayRate;

    for (const d of disclosures) {
      if (d.is_verified) verifiedCount++;
      if (d.amount != null && d.source != null && d.description.length > 50) detailedCount++;

      const ageInDays = (now - d.dateReported.getTime()) / MS_PER_DAY;
      if (ageInDays > staleThreshold) staleCount++;
      recencySum += Math.exp(-decayRate * ageInDays);
    }

    return {
      requiredDisclosureScore:
        this.config.requiredTypes.length > 0
          ? completedRequired / this.config.requiredTypes.length
          : 0,
      verificationScore: total > 0 ? verifiedCount / total : 0,
      recencyScore: total > 0 ? recencySum / total : 0,
      detailScore: total > 0 ? detailedCount / total : 0,
      totalDisclosures: total,
      completedRequired,
      staleCount,
      unverifiedCount: total - verifiedCount,
    };
  }

  private applyWeightedScoring(metrics: DetailedMetrics): number {
    const w = this.config.completenessWeights;

    const score =
      metrics.requiredDisclosureScore * w.requiredDisclosures * 100 +
      metrics.verificationScore * w.verification_status * 100 +
      metrics.recencyScore * w.dataRecency * 100 +
      metrics.detailScore * w.detailCompleteness * 100;

    return Math.round(Math.min(score, 100));
  }

  private assessCompletenessRisk(
    score: number,
    lastUpdate: Date
  ): CompletenessReport['riskAssessment'] {
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / MS_PER_DAY);
    const { stale, recent, current } = this.config.riskThresholds.disclosureAge;

    if (score < 50 || daysSinceUpdate > stale) return 'critical';
    if (score < 70 || daysSinceUpdate > recent) return 'high';
    if (score < 85 || daysSinceUpdate > current) return 'medium';
    return 'low';
  }

  private analyzeTemporalTrend(
    disclosures: FinancialDisclosure[]
  ): CompletenessReport['temporalTrend'] {
    if (disclosures.length < MIN_DISCLOSURES_FOR_TREND) return 'stable';

    const sorted = [...disclosures].sort(
      (a, b) => a.dateReported.getTime() - b.dateReported.getTime()
    );
    const mid = Math.floor(sorted.length / 2);

    const verificationRate = (arr: FinancialDisclosure[]) =>
      arr.filter((d) => d.is_verified).length / arr.length;

    const firstRate = verificationRate(sorted.slice(0, mid));
    const secondRate = verificationRate(sorted.slice(mid));

    if (secondRate > firstRate * (1 + TREND_THRESHOLD)) return 'improving';
    if (firstRate > secondRate * (1 + TREND_THRESHOLD)) return 'declining';
    return 'stable';
  }

  private generateRecommendations(
    metrics: DetailedMetrics,
    disclosures: FinancialDisclosure[],
    missingTypes: readonly string[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.requiredDisclosureScore < 0.75) {
      recommendations.push(
        `Priority action required: complete missing disclosure type(s) — ${missingTypes.join(', ')}.`
      );
    }

    if (metrics.verificationScore < 0.6) {
      const highRiskUnverified = disclosures.filter(
        (d) => !d.is_verified && (d.riskLevel === 'high' || d.riskLevel === 'critical')
      ).length;

      recommendations.push(
        highRiskUnverified > 0
          ? `Urgent: verify ${highRiskUnverified} high-risk disclosure(s) immediately to reduce compliance exposure.`
          : `Verify ${metrics.unverifiedCount} pending disclosure(s) to improve transparency rating.`
      );
    }

    if (metrics.recencyScore < 0.5 && metrics.staleCount > 0) {
      recommendations.push(
        `Update ${metrics.staleCount} disclosure(s) older than one year to reflect current financial status.`
      );
    }

    if (metrics.detailScore < 0.4) {
      recommendations.push(
        'Enhance disclosure quality by adding amounts, sources, and detailed descriptions to existing entries.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Excellent compliance — disclosure practices meet all benchmarks. Continue maintaining timely, verified reporting.'
      );
    }

    return recommendations;
  }
}

export const disclosureValidationService = new DisclosureValidationService();