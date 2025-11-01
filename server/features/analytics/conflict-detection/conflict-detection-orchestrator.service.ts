/**
 * Conflict Detection Orchestrator Service
 * 
 * Main coordination service that orchestrates the entire conflict detection workflow.
 * This service acts as the primary interface for conflict detection operations.
 */

import { database as db } from '../../../../shared/database/connection';
import {
  sponsors, sponsorAffiliations, sponsorTransparency, bills,
  type Sponsor, type SponsorAffiliation, type SponsorTransparency, type Bill
} from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { getDefaultCache } from '../../../../shared/core/src/caching/index.js';
import { logger } from '../../../../shared/core/index.js';
import {
  ConflictAnalysis,
  ConflictDetectionError,
  Stakeholder
} from './types.js';
import { conflictDetectionEngineService } from './conflict-detection-engine.service.js';
import { stakeholderAnalysisService } from './stakeholder-analysis.service.js';
import { conflictSeverityAnalyzerService } from './conflict-severity-analyzer.service.js';
import { conflictResolutionRecommendationService } from './conflict-resolution-recommendation.service.js';

export class ConflictDetectionOrchestratorService {
  private static instance: ConflictDetectionOrchestratorService;
  private readonly memoCache = new Map<string, any>();

  public static getInstance(): ConflictDetectionOrchestratorService {
    if (!ConflictDetectionOrchestratorService.instance) {
      ConflictDetectionOrchestratorService.instance = new ConflictDetectionOrchestratorService();
    }
    return ConflictDetectionOrchestratorService.instance;
  }

  /**
   * Performs a comprehensive conflict of interest analysis for a sponsor
   */
  async performComprehensiveAnalysis(
    sponsorId: number,
    billId?: number
  ): Promise<ConflictAnalysis> {
    const cacheKey = `comprehensive_analysis:${sponsorId}:${billId || 'all'}`;

    // Clear memoization cache at the start of each new analysis
    this.memoCache.clear();

    try {
      logger.info(`📊 Performing comprehensive analysis for sponsor ${sponsorId}${billId ? ` and bill ${billId}` : ''}`);

      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached;

      const computed = await this.executeComprehensiveAnalysis(sponsorId, billId);
      
      try {
        await cache.set(cacheKey, computed, 3600);
      } catch (e) {
        logger.warn('Failed to cache analysis result', { error: e });
      }
      
      return computed;
    } catch (error) {
      logger.error(`Comprehensive analysis failed for sponsor ${sponsorId}`, {
        error,
        billId,
        timestamp: new Date().toISOString()
      });
      return this.generateFallbackAnalysis(sponsorId, billId, error);
    }
  }

  /**
   * Analyzes stakeholders for a specific bill
   */
  async analyzeStakeholders(billId: number): Promise<{
    stakeholders: Stakeholder[];
    conflicts: Array<{
      stakeholder1: Stakeholder;
      stakeholder2: Stakeholder;
      conflictType: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }> {
    try {
      const bill = await this.getBill(billId);
      if (!bill) {
        throw new ConflictDetectionError(
          `Bill with ID ${billId} not found`,
          'BILL_NOT_FOUND',
          undefined,
          billId
        );
      }

      const stakeholders = await stakeholderAnalysisService.identifyStakeholders(bill);
      const conflicts = await stakeholderAnalysisService.identifyStakeholderConflicts(stakeholders);

      return { stakeholders, conflicts };
    } catch (error) {
      logger.error('Error analyzing stakeholders:', {
        component: 'ConflictDetectionOrchestrator',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return { stakeholders: [], conflicts: [] };
    }
  }

  /**
   * Invalidates all cached data for a specific sponsor
   */
  async invalidateSponsorCache(sponsorId: number): Promise<void> {
    try {
      const patterns = [
        `comprehensive_analysis:${sponsorId}:*`,
        `voting_anomalies:${sponsorId}`,
        `professional_conflicts:${sponsorId}:*`,
        `financial_conflicts:${sponsorId}:*`,
        `stakeholders:*`
      ];

      const cache = getDefaultCache();
      const results = await Promise.allSettled(
        patterns.map(pattern => cache.invalidateByPattern ? cache.invalidateByPattern(pattern) : Promise.resolve())
      );

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.warn(`Some cache invalidations failed for sponsor ${sponsorId}`, { failures });
      }

      logger.info(`Cache invalidated for sponsor ${sponsorId}`);
    } catch (error) {
      logger.error(`Failed to invalidate cache for sponsor ${sponsorId}`, { error });
    }
  }

  /**
   * Generates mitigation strategies for conflicts
   */
  async generateMitigationStrategies(
    sponsorId: number,
    billId?: number
  ): Promise<Array<{
    conflictId: string;
    strategy: string;
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    stakeholders: string[];
  }>> {
    try {
      const analysis = await this.performComprehensiveAnalysis(sponsorId, billId);
      const allConflicts = [...analysis.financialConflicts, ...analysis.professionalConflicts];
      
      return conflictResolutionRecommendationService.generateMitigationStrategies(
        allConflicts,
        analysis.riskLevel
      );
    } catch (error) {
      logger.error('Error generating mitigation strategies:', {
        component: 'ConflictDetectionOrchestrator',
        sponsorId,
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Private helper methods

  private async executeComprehensiveAnalysis(
    sponsorId: number,
    billId?: number
  ): Promise<ConflictAnalysis> {
    // Fetch all necessary data in parallel for maximum efficiency
    const [sponsor, affiliations, disclosures, votingHistory] = await Promise.all([
      this.getSponsor(sponsorId),
      this.getSponsorAffiliations(sponsorId),
      this.getSponsorDisclosures(sponsorId),
      this.getVotingHistory(sponsorId),
    ]);

    if (!sponsor) {
      throw new ConflictDetectionError(
        `Sponsor with ID ${sponsorId} not found`,
        'SPONSOR_NOT_FOUND',
        sponsorId
      );
    }

    // Calculate transparency score early as it's needed for overall risk calculation
    const transparencyScore = conflictSeverityAnalyzerService.calculateTransparencyScore(disclosures);
    const transparencyGrade = conflictSeverityAnalyzerService.calculateTransparencyGrade(transparencyScore);

    // Execute all analysis types in parallel for speed
    const [financialConflicts, professionalConflicts, votingAnomalies] = await Promise.all([
      conflictDetectionEngineService.analyzeFinancialConflicts(sponsor, disclosures, affiliations, billId),
      conflictDetectionEngineService.analyzeProfessionalConflicts(sponsor, affiliations, billId),
      conflictDetectionEngineService.analyzeVotingPatternInconsistencies(sponsor, votingHistory),
    ]);

    // Calculate final metrics
    const overallRiskScore = conflictSeverityAnalyzerService.calculateOverallRiskScore(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore
    );
    const riskLevel = conflictSeverityAnalyzerService.determineRiskLevel(overallRiskScore);

    const confidence = conflictSeverityAnalyzerService.calculateAnalysisConfidence(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore
    );

    const recommendations = conflictResolutionRecommendationService.generateConflictRecommendations(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore,
      riskLevel
    );

    // Only fetch bill details if we need them (lazy loading optimization)
    const billTitle = billId ? (await this.getBill(billId))?.title : undefined;

    return {
      sponsorId,
      sponsorName: sponsor.name,
      billId,
      billTitle,
      overallRiskScore,
      riskLevel,
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparencyScore,
      transparencyGrade,
      recommendations,
      lastAnalyzed: new Date(),
      confidence,
    };
  }

  private async getSponsor(sponsorId: number): Promise<Sponsor | null> {
    try {
      const [sponsor] = await db
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, sponsorId));
      
      return sponsor || null;
    } catch (error) {
      logger.error('Error fetching sponsor:', { sponsorId, error });
      return null;
    }
  }

  private async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    try {
      return await db
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsorId, sponsorId));
    } catch (error) {
      logger.error('Error fetching sponsor affiliations:', { sponsorId, error });
      return [];
    }
  }

  private async getSponsorDisclosures(sponsorId: number): Promise<SponsorTransparency[]> {
    try {
      return await db
        .select()
        .from(sponsorTransparency)
        .where(eq(sponsorTransparency.sponsorId, sponsorId));
    } catch (error) {
      logger.error('Error fetching sponsor disclosures:', { sponsorId, error });
      return [];
    }
  }

  private async getVotingHistory(sponsorId: number): Promise<any[]> {
    try {
      // This would be implemented based on your voting history schema
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error fetching voting history:', { sponsorId, error });
      return [];
    }
  }

  private async getBill(billId: number): Promise<Bill | null> {
    try {
      const [bill] = await db
        .select()
        .from(bills)
        .where(eq(bills.id, billId));
      
      return bill || null;
    } catch (error) {
      logger.error('Error fetching bill:', { billId, error });
      return null;
    }
  }

  private generateFallbackAnalysis(
    sponsorId: number,
    billId?: number,
    error?: any
  ): ConflictAnalysis {
    logger.warn('Generating fallback analysis due to error', { sponsorId, billId, error });

    return {
      sponsorId,
      sponsorName: 'Unknown Sponsor',
      billId,
      billTitle: undefined,
      overallRiskScore: 0.5,
      riskLevel: 'medium',
      financialConflicts: [],
      professionalConflicts: [],
      votingAnomalies: [],
      transparencyScore: 0.3,
      transparencyGrade: 'D',
      recommendations: [
        'Unable to complete full analysis due to data issues',
        'Manual review recommended',
        'Verify data availability and try again'
      ],
      lastAnalyzed: new Date(),
      confidence: 0.1,
    };
  }
}

export const conflictDetectionOrchestratorService = ConflictDetectionOrchestratorService.getInstance();