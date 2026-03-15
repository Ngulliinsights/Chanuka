// Financial Disclosure Orchestrator Service
// Main service that orchestrates the decomposed financial disclosure services.
// Maintains backward compatibility with the original API while adding
// enhanced analysis via anomaly detection.

import { createDatabaseError } from '@server/infrastructure/error-handling';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { readDb as readDatabase } from '@server/infrastructure/database';
import { sponsors } from '@server/infrastructure/schema';
import type {
  CompletenessReport,
  FinancialDisclosure,
  RelationshipMapping,
  RiskLevel,
  TransparencyDashboard,
} from './types';
import { eq } from 'drizzle-orm';

import { FinancialDisclosureConfig } from './config';
import {
  anomalyDetectionService,
  disclosureProcessingService,
  disclosureValidationService,
  financialAnalysisService,
} from './services/index';
import type { AnomalyDetectionResult } from './services/anomaly-detection.service';

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface ComprehensiveAnalysisResult {
  sponsor_id: number;
  completenessReport: CompletenessReport;
  relationshipMapping: RelationshipMapping;
  anomalyDetection: AnomalyDetectionResult;
  overallRiskAssessment: RiskLevel;
  analysisDate: Date;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Financial Disclosure Orchestrator Service
 *
 * Maintains the original public API while delegating work to the decomposed
 * services. Provides:
 * - Backward compatibility with existing callers
 * - Orchestration of complex multi-service workflows
 * - Dashboard generation combining multiple services
 * - Unified error handling and logging
 */
export class FinancialDisclosureOrchestratorService {
  private readonly config = FinancialDisclosureConfig;

  // ============================================================================
  // Core Data Retrieval (delegated to DisclosureProcessingService)
  // ============================================================================

  /** Retrieves financial disclosure data with enrichment and caching. */
  async getDisclosureData(sponsor_id?: number): Promise<FinancialDisclosure[]> {
    return disclosureProcessingService.getDisclosureData(sponsor_id);
  }

  // ============================================================================
  // Completeness Analysis (delegated to DisclosureValidationService)
  // ============================================================================

  /** Calculates a comprehensive completeness score using multiple dimensions. */
  async calculateCompletenessScore(sponsor_id: number): Promise<CompletenessReport> {
    return disclosureValidationService.calculateCompletenessScore(sponsor_id);
  }

  // ============================================================================
  // Relationship Mapping (delegated to FinancialAnalysisService)
  // ============================================================================

  /**
   * Builds a comprehensive relationship map that reveals networks of financial
   * connections and potential conflicts of interest.
   */
  async buildRelationshipMap(sponsor_id: number): Promise<RelationshipMapping> {
    return financialAnalysisService.buildRelationshipMap(sponsor_id);
  }

  // ============================================================================
  // Dashboard & Reporting (orchestrates multiple services)
  // ============================================================================

  /**
   * Generates a comprehensive transparency dashboard providing a system-wide
   * view of disclosure compliance, risk distribution, and performance metrics.
   */
  async generateDashboard(): Promise<TransparencyDashboard> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.dashboard();

      const cached = await cacheService.get<TransparencyDashboard>(cacheKey);
      if (cached) return cached;

      const result = await (async () => {
          const [sponsorStats, disclosureStats, riskDistribution, performanceData, anomalyStats] =
            await Promise.all([
              disclosureProcessingService.getSponsorStatistics(),
              disclosureProcessingService.getDisclosureStatistics(),
              this.getRiskDistribution(),
              this.getPerformanceMetrics(),
              anomalyDetectionService.getSystemAnomalyStats(),
            ]);

          return {
            generatedAt: new Date(),
            totalSponsors: sponsorStats.total,
            averageCompletenessScore: performanceData.averageScore,
            disclosureStatistics: disclosureStats,
            riskDistribution,
            topPerformers: performanceData.topPerformers,
            needsAttention: performanceData.needsAttention,
            // Enhanced with anomaly detection data
            anomalyStatistics: {
              sponsorsWithAnomalies: anomalyStats.totalSponsorsWithAnomalies,
              anomaliesBySeverity: anomalyStats.anomaliesBySeverity,
              anomaliesByType: anomalyStats.anomaliesByType,
              averageRiskScore: anomalyStats.averageRiskScore,
            },
          };
        })();

      await cacheService.set(cacheKey, result, this.config.cache.ttl.dashboard);
      return result;
    } catch (error) {
      logger.error({ error }, 'Error generating dashboard');
      throw createDatabaseError(
        'generateDashboard',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'financial-disclosure-orchestrator', operation: 'generateDashboard' }
      );
    }
  }

  // ============================================================================
  // Enhanced Analysis Methods
  // ============================================================================

  /**
   * Performs comprehensive analysis combining completeness, relationships,
   * and anomalies for a single sponsor.
   */
  async performComprehensiveAnalysis(sponsor_id: number): Promise<ComprehensiveAnalysisResult> {
    try {
      const [completeness, relationships, anomalies] = await Promise.all([
        disclosureValidationService.calculateCompletenessScore(sponsor_id),
        financialAnalysisService.buildRelationshipMap(sponsor_id),
        anomalyDetectionService.detectAnomalies(sponsor_id),
      ]);

      return {
        sponsor_id,
        completenessReport: completeness,
        relationshipMapping: relationships,
        anomalyDetection: anomalies,
        overallRiskAssessment: this.calculateOverallRisk(completeness, relationships, anomalies),
        analysisDate: new Date(),
      };
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error performing comprehensive analysis');
      throw createDatabaseError(
        'performComprehensiveAnalysis',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'financial-disclosure-orchestrator', operation: 'performComprehensiveAnalysis' }
      );
    }
  }

  /** Gets enhanced sponsor insights with anomaly detection. */
  async getSponsorInsights(sponsor_id: number) {
    const analysis = await this.performComprehensiveAnalysis(sponsor_id);

    return {
      ...analysis,
      insights: this.generateInsights(analysis),
      actionItems: this.generateActionItems(analysis),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Calculates the distribution of risk levels across all active sponsors.
   * Errors for individual sponsors are silently skipped.
   */
  private async getRiskDistribution(): Promise<Record<RiskLevel, number>> {
    const activeSponsors = await readDatabase
      .select({ id: sponsors.id })
      .from(sponsors)
      .where(eq(sponsors.is_active, true))
      .limit(100);

    const riskCounts: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const sponsor of activeSponsors) {
      try {
        const report = await disclosureValidationService.calculateCompletenessScore(sponsor.id);
        riskCounts[report.riskAssessment]++;
      } catch {
        // Skip sponsors that error out during calculation.
        continue;
      }
    }

    return riskCounts;
  }

  /**
   * Identifies top performers and sponsors needing immediate attention.
   * Errors for individual sponsors are silently excluded.
   */
  private async getPerformanceMetrics() {
    const activeSponsors = await readDatabase
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .where(eq(sponsors.is_active, true))
      .limit(100);

    const settled = await Promise.allSettled(
      activeSponsors.map((s) => disclosureValidationService.calculateCompletenessScore(s.id)),
    );

    const validReports = settled.reduce<CompletenessReport[]>((acc, result) => {
      if (result.status === 'fulfilled') acc.push(result.value);
      return acc;
    }, []);

    const averageScore =
      validReports.length > 0
        ? Math.round(
            validReports.reduce((sum, r) => sum + r.overallScore, 0) / validReports.length,
          )
        : 0;

    const sorted = [...validReports].sort((a, b) => b.overallScore - a.overallScore);

    const topPerformers = sorted.slice(0, 5).map((r) => ({
      sponsor_id: r.sponsor_id,
      sponsorName: r.sponsorName,
      score: r.overallScore,
    }));

    const needsAttention = sorted
      .filter((r) => r.riskAssessment === 'high' || r.riskAssessment === 'critical')
      .slice(0, 10)
      .map((r) => ({
        sponsor_id: r.sponsor_id,
        sponsorName: r.sponsorName,
        score: r.overallScore,
        riskLevel: r.riskAssessment,
      }));

    return { averageScore, topPerformers, needsAttention };
  }

  /**
   * Calculates an overall risk assessment by combining completeness, relationship,
   * and anomaly dimensions with a weighted average.
   *
   * Weights: completeness 40%, relationships 35%, anomalies 25%.
   */
  private calculateOverallRisk(
    completeness: CompletenessReport,
    relationships: RelationshipMapping,
    anomalies: AnomalyDetectionResult,
  ): RiskLevel {
    const riskScores: Record<RiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const completenessRisk = riskScores[completeness.riskAssessment];
    const relationshipRisk = riskScores[relationships.riskAssessment];
    const anomalyRisk =
      anomalies.risk_score > 75
        ? 4
        : anomalies.risk_score > 50
          ? 3
          : anomalies.risk_score > 25
            ? 2
            : 1;

    const overallScore = completenessRisk * 0.4 + relationshipRisk * 0.35 + anomalyRisk * 0.25;

    if (overallScore >= 3.5) return 'critical';
    if (overallScore >= 2.5) return 'high';
    if (overallScore >= 1.5) return 'medium';
    return 'low';
  }

  /** Generates human-readable insights from a comprehensive analysis result. */
  private generateInsights(analysis: ComprehensiveAnalysisResult): string[] {
    const insights: string[] = [];

    if (analysis.completenessReport.temporalTrend === 'improving') {
      insights.push('Disclosure practices are improving over time — continue current efforts.');
    } else if (analysis.completenessReport.temporalTrend === 'declining') {
      insights.push('Disclosure quality is declining — immediate intervention needed.');
    }

    const criticalConflicts = analysis.relationshipMapping.detectedConflicts.filter(
      (c) => c.severity === 'critical',
    ).length;
    if (criticalConflicts > 0) {
      insights.push(
        `${criticalConflicts} critical conflict(s) of interest detected — requires immediate attention.`,
      );
    }

    if (analysis.anomalyDetection.risk_score > 50) {
      insights.push(
        'Unusual patterns detected in financial disclosures — review recommended.',
      );
    }

    if (analysis.relationshipMapping.networkMetrics.riskConcentration > 70) {
      insights.push(
        'High risk concentration detected — consider diversifying financial relationships.',
      );
    }

    return insights;
  }

  /** Generates prioritised action items from a comprehensive analysis result. */
  private generateActionItems(analysis: ComprehensiveAnalysisResult): string[] {
    const actions: string[] = [...analysis.completenessReport.recommendations];

    for (const conflict of analysis.relationshipMapping.detectedConflicts) {
      if (conflict.severity === 'critical' || conflict.severity === 'high') {
        actions.push(
          `Address ${conflict.severity} conflict with ${conflict.entity}: ${conflict.description}`,
        );
      }
    }

    for (const anomaly of analysis.anomalyDetection.anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        actions.push(`Resolve ${anomaly.type}: ${anomaly.recommendation}`);
      }
    }

    return actions;
  }
}

// Export singleton instance — named distinctly from the leaner analytics service.
export const financialDisclosureOrchestratorService =
  new FinancialDisclosureOrchestratorService();