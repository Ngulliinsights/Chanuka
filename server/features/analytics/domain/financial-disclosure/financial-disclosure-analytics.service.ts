// Financial Disclosure Analytics Service
// Orchestrates specialised services to provide high-level analytics and
// system-wide visibility.

import type {
  CompletenessReport,
  RelationshipMapping,
  RiskLevel,
  TransparencyDashboard,
} from './types';
import {
  financialAnalysisService,
  disclosureValidationService,
  disclosureProcessingService,
} from './services';
import { logger } from '@server/infrastructure/observability';
import { DatabaseError } from '@server/types';
import { readDb as readDatabase } from '@server/infrastructure/database';
import { sponsors } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const TOP_PERFORMERS_LIMIT = 5;

type SponsorRow = { id: number; name: string };

interface AggregatedMetrics {
  averageScore: number;
  riskDistribution: Record<RiskLevel, number>;
  topPerformers: TransparencyDashboard['topPerformers'];
  needsAttention: TransparencyDashboard['needsAttention'];
}

/**
 * Orchestrates disclosure validation, financial analysis, and processing services
 * to expose high-level analytics, relationship mapping, and executive dashboards.
 */
export class FinancialDisclosureAnalyticsService {
  /**
   * Returns a completeness report for the given sponsor.
   * Delegates scoring logic to DisclosureValidationService.
   */
  async calculateCompletenessScore(sponsorId: number): Promise<CompletenessReport> {
    try {
      return await disclosureValidationService.calculateCompletenessScore(sponsorId);
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to calculate completeness score');
      throw error;
    }
  }

  /**
   * Builds a network relationship map for the given sponsor.
   * Delegates pattern detection to FinancialAnalysisService.
   */
  async buildRelationshipMap(sponsorId: number): Promise<RelationshipMapping> {
    try {
      return await financialAnalysisService.buildRelationshipMap(sponsorId);
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to build relationship map');
      throw error;
    }
  }

  /**
   * Produces a system-wide transparency dashboard aggregated across all active sponsors.
   * Individual scoring failures are isolated — partial results are still returned.
   */
  async generateDashboard(): Promise<TransparencyDashboard> {
    try {
      const activeSponsors = await readDatabase
        .select({ id: sponsors.id, name: sponsors.name })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      // Fan out both I/O-bound calls concurrently.
      const [reports, disclosureStats] = await Promise.all([
        this.fetchCompletenessReports(activeSponsors),
        disclosureProcessingService.getDisclosureStatistics(),
      ]);

      const aggregated = this.aggregateReports(reports);

      return {
        generatedAt: new Date(),
        totalSponsors: activeSponsors.length,
        averageCompletenessScore: aggregated.averageScore,
        disclosureStatistics: {
          total: disclosureStats.total,
          verified: disclosureStats.verified,
          pending: disclosureStats.pending,
          byType: disclosureStats.byType,
        },
        riskDistribution: aggregated.riskDistribution,
        topPerformers: aggregated.topPerformers,
        needsAttention: aggregated.needsAttention,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to generate transparency dashboard');
      throw new DatabaseError('Failed to generate transparency dashboard');
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetches completeness reports in parallel.
   * Failures for individual sponsors are logged and excluded rather than
   * causing the entire dashboard request to fail.
   */
  private async fetchCompletenessReports(
    activeSponsors: SponsorRow[],
  ): Promise<CompletenessReport[]> {
    const settled = await Promise.allSettled(
      activeSponsors.map((s) => this.calculateCompletenessScore(s.id)),
    );

    return settled.reduce<CompletenessReport[]>((acc, result, i) => {
      if (result.status === 'fulfilled') {
        acc.push(result.value);
      } else {
        logger.warn(
          { sponsorId: activeSponsors[i].id, reason: result.reason },
          'Skipping sponsor — completeness report unavailable',
        );
      }
      return acc;
    }, []);
  }

  /** Derives aggregate metrics from a list of completeness reports. */
  private aggregateReports(reports: CompletenessReport[]): AggregatedMetrics {
    // Initialise all risk buckets to zero up front.
    const riskDistribution = Object.fromEntries(
      RISK_LEVELS.map((r) => [r, 0]),
    ) as Record<RiskLevel, number>;

    let totalScore = 0;

    for (const { overallScore, riskAssessment } of reports) {
      totalScore += overallScore;
      // Guard against unexpected riskAssessment values from upstream services.
      if (riskAssessment in riskDistribution) {
        riskDistribution[riskAssessment]++;
      }
    }

    // Single sort; slice for top performers, filter for attention list.
    const sorted = [...reports].sort((a, b) => b.overallScore - a.overallScore);

    return {
      averageScore: reports.length > 0 ? Math.round(totalScore / reports.length) : 0,
      riskDistribution,
      topPerformers: sorted.slice(0, TOP_PERFORMERS_LIMIT).map((r) => ({
        sponsor_id: r.sponsor_id,
        sponsorName: r.sponsorName,
        score: r.overallScore,
      })),
      needsAttention: sorted
        .filter((r) => r.riskAssessment === 'critical' || r.riskAssessment === 'high')
        .map((r) => ({
          sponsor_id: r.sponsor_id,
          sponsorName: r.sponsorName,
          score: r.overallScore,
          riskLevel: r.riskAssessment,
        })),
    };
  }
}

export const financialDisclosureAnalyticsService = new FinancialDisclosureAnalyticsService();