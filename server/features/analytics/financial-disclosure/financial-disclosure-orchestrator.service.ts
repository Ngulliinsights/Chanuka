// Financial Disclosure Orchestrator Service
// Main service that orchestrates the decomposed financial disclosure services
// Maintains backward compatibility with the original API

import { readDatabase } from '@shared/database/connection';
import { sponsors } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { cache, logger, DatabaseError } from '@shared/core';
import { FinancialDisclosureConfig } from './config';

// Import decomposed services
import {
  disclosureProcessingService,
  financialAnalysisService,
  disclosureValidationService,
  anomalyDetectionService
} from './services/index';

import type {
  FinancialDisclosure,
  RelationshipMapping,
  CompletenessReport,
  TransparencyDashboard
} from '../types/index.js';

/**
 * Financial Disclosure Orchestrator Service
 * 
 * This service maintains the original API while delegating work to the
 * decomposed services. It provides:
 * - Backward compatibility with existing code
 * - Orchestration of complex workflows
 * - Dashboard generation combining multiple services
 * - Unified error handling and logging
 */
export class FinancialDisclosureOrchestratorService {
  private readonly config = FinancialDisclosureConfig;

  // ============================================================================
  // Core Data Retrieval Methods (delegated to DisclosureProcessingService)
  // ============================================================================

  /**
   * Retrieves financial disclosure data with enrichment and caching.
   */
  async getDisclosureData(sponsorId?: number): Promise<FinancialDisclosure[]> {
    return disclosureProcessingService.getDisclosureData(sponsorId);
  }

  // ============================================================================
  // Completeness Analysis Methods (delegated to DisclosureValidationService)
  // ============================================================================

  /**
   * Calculates a comprehensive completeness score using multiple dimensions.
   */
  async calculateCompletenessScore(sponsorId: number): Promise<CompletenessReport> {
    return disclosureValidationService.calculateCompletenessScore(sponsorId);
  }

  // ============================================================================
  // Relationship Mapping Methods (delegated to FinancialAnalysisService)
  // ============================================================================

  /**
   * Builds a comprehensive relationship map that reveals networks of financial
   * connections and potential conflicts of interest.
   */
  async buildRelationshipMap(sponsorId: number): Promise<RelationshipMapping> {
    return financialAnalysisService.buildRelationshipMap(sponsorId);
  }

  // ============================================================================
  // Dashboard and Reporting Methods (orchestrates multiple services)
  // ============================================================================

  /**
   * Generates a comprehensive transparency dashboard providing a system-wide
   * view of disclosure compliance, risk distribution, and performance metrics.
   */
  async generateDashboard(): Promise<TransparencyDashboard> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.dashboard();

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.dashboard,
        async () => {
          // Execute all dashboard queries in parallel for efficiency
          const [sponsorStats, disclosureStats, riskDistribution, performanceData, anomalyStats] =
            await Promise.all([
              disclosureProcessingService.getSponsorStatistics(),
              disclosureProcessingService.getDisclosureStatistics(),
              this.getRiskDistribution(),
              this.getPerformanceMetrics(),
              anomalyDetectionService.getSystemAnomalyStats()
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
              averageRiskScore: anomalyStats.averageRiskScore
            }
          };
        }
      );
    } catch (error) {
      logger.error('Error generating dashboard:', undefined, error);
      throw new DatabaseError('Failed to generate transparency dashboard');
    }
  }

  // ============================================================================
  // New Enhanced Methods (utilizing decomposed services)
  // ============================================================================

  /**
   * Performs comprehensive analysis combining completeness, relationships, and anomalies.
   */
  async performComprehensiveAnalysis(sponsorId: number) {
    try {
      // Execute all analyses in parallel
      const [completeness, relationships, anomalies] = await Promise.all([
        disclosureValidationService.calculateCompletenessScore(sponsorId),
        financialAnalysisService.buildRelationshipMap(sponsorId),
        anomalyDetectionService.detectAnomalies(sponsorId)
      ]);

      return {
        sponsorId,
        completenessReport: completeness,
        relationshipMapping: relationships,
        anomalyDetection: anomalies,
        overallRiskAssessment: this.calculateOverallRisk(completeness, relationships, anomalies),
        analysisDate: new Date()
      };
    } catch (error) {
      logger.error('Error performing comprehensive analysis:', { sponsorId }, error);
      throw new DatabaseError('Failed to perform comprehensive financial analysis');
    }
  }

  /**
   * Gets enhanced sponsor insights with anomaly detection.
   */
  async getSponsorInsights(sponsorId: number) {
    const analysis = await this.performComprehensiveAnalysis(sponsorId);
    
    return {
      ...analysis,
      insights: this.generateInsights(analysis),
      actionItems: this.generateActionItems(analysis)
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calculates the distribution of risk levels across all active sponsors.
   */
  private async getRiskDistribution() {
    const activeSponsors = await readDatabase
      .select({ id: sponsors.id })
      .from(sponsors)
      .where(eq(sponsors.isActive, true))
      .limit(100);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    // Calculate risk for each sponsor
    for (const sponsor of activeSponsors) {
      try {
        const report = await disclosureValidationService.calculateCompletenessScore(sponsor.id);
        riskCounts[report.riskAssessment]++;
      } catch {
        // Skip sponsors that error out during calculation
        continue;
      }
    }

    return riskCounts;
  }

  /**
   * Identifies top performers and sponsors needing attention.
   */
  private async getPerformanceMetrics() {
    const activeSponsors = await readDatabase
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .where(eq(sponsors.isActive, true))
      .limit(100);

    // Calculate completeness reports for all sponsors
    const reports = await Promise.all(
      activeSponsors.map(async s => {
        try {
          return await disclosureValidationService.calculateCompletenessScore(s.id);
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

  /**
   * Calculates overall risk assessment combining multiple analysis dimensions.
   */
  private calculateOverallRisk(
    completeness: CompletenessReport,
    relationships: RelationshipMapping,
    anomalies: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Weight different risk factors
    const riskScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const completenessRisk = riskScores[completeness.riskAssessment];
    const relationshipRisk = riskScores[relationships.riskAssessment];
    const anomalyRisk = anomalies.riskScore > 75 ? 4 : anomalies.riskScore > 50 ? 3 : anomalies.riskScore > 25 ? 2 : 1;

    // Calculate weighted average (completeness 40%, relationships 35%, anomalies 25%)
    const overallScore = (completenessRisk * 0.4) + (relationshipRisk * 0.35) + (anomalyRisk * 0.25);

    if (overallScore >= 3.5) return 'critical';
    if (overallScore >= 2.5) return 'high';
    if (overallScore >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Generates insights based on comprehensive analysis.
   */
  private generateInsights(analysis: any): string[] {
    const insights: string[] = [];

    // Completeness insights
    if (analysis.completenessReport.temporalTrend === 'improving') {
      insights.push('Disclosure practices are improving over time - continue current efforts.');
    } else if (analysis.completenessReport.temporalTrend === 'declining') {
      insights.push('Disclosure quality is declining - immediate intervention needed.');
    }

    // Relationship insights
    if (analysis.relationshipMapping.detectedConflicts.length > 0) {
      const criticalConflicts = analysis.relationshipMapping.detectedConflicts.filter(c => c.severity === 'critical').length;
      if (criticalConflicts > 0) {
        insights.push(`${criticalConflicts} critical conflict(s) of interest detected - requires immediate attention.`);
      }
    }

    // Anomaly insights
    if (analysis.anomalyDetection.riskScore > 50) {
      insights.push('Unusual patterns detected in financial disclosures - review recommended.');
    }

    // Network insights
    if (analysis.relationshipMapping.networkMetrics.riskConcentration > 70) {
      insights.push('High risk concentration detected - consider diversifying financial relationships.');
    }

    return insights;
  }

  /**
   * Generates actionable items based on analysis results.
   */
  private generateActionItems(analysis: any): string[] {
    const actions: string[] = [];

    // Add completeness recommendations
    actions.push(...analysis.completenessReport.recommendations);

    // Add conflict resolution actions
    for (const conflict of analysis.relationshipMapping.detectedConflicts) {
      if (conflict.severity === 'critical' || conflict.severity === 'high') {
        actions.push(`Address ${conflict.severity} conflict with ${conflict.entity}: ${conflict.description}`);
      }
    }

    // Add anomaly resolution actions
    for (const anomaly of analysis.anomalyDetection.anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        actions.push(`Resolve ${anomaly.type}: ${anomaly.recommendation}`);
      }
    }

    return actions;
  }
}

// Export singleton instance for backward compatibility
export const financialDisclosureAnalyticsService = new FinancialDisclosureOrchestratorService();