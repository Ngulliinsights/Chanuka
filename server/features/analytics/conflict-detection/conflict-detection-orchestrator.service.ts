/**
 * Conflict Detection Orchestrator Service
 * 
 * Main coordination service that orchestrates the entire conflict detection workflow.
 * This service acts as the primary interface for conflict detection operations.
 */

import { conflictDetectionEngineService } from '@server/features/analytics/conflict-detection/conflict-detection-engine.service';
import { conflictResolutionRecommendationService } from '@server/features/analytics/conflict-detection/conflict-resolution-recommendation.service';
import { conflictSeverityAnalyzerService } from '@server/features/analytics/conflict-detection/conflict-severity-analyzer.service';
import { stakeholderAnalysisService } from '@server/features/analytics/conflict-detection/stakeholder-analysis.service';
import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@server/infrastructure/cache/index';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { eq } from 'drizzle-orm';

import {
type Bill,
bills,
  type Sponsor, type SponsorAffiliation, sponsorAffiliations,   sponsors, type SponsorTransparency, sponsorTransparency} from '@server/infrastructure/schema';

import {
  ConflictAnalysis,
  ConflictDetectionError,
  Stakeholder
} from './types';

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
    sponsor_id: number,
    bill_id?: number
  ): Promise<ConflictAnalysis> {
    const cacheKey = `comprehensive_analysis:${sponsor_id}:${ bill_id || 'all' }`;

    // Clear memoization cache at the start of each new analysis
    this.memoCache.clear();

    try {
      logger.info(`📊 Performing comprehensive analysis for sponsor ${sponsor_id}${ bill_id ? ` and bill ${bill_id }` : ''}`);

      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached;

      const computed = await this.executeComprehensiveAnalysis(sponsor_id, bill_id);
      
      try {
        await cache.set(cacheKey, computed, 3600);
      } catch (e) {
        logger.warn('Failed to cache analysis result', { error: e });
      }
      
      return computed;
    } catch (error) {
      logger.error(`Comprehensive analysis failed for sponsor ${sponsor_id}`, { error,
        bill_id,
        timestamp: new Date().toISOString()
       });
      return this.generateFallbackAnalysis(sponsor_id, bill_id, error);
    }
  }

  /**
   * Analyzes stakeholders for a specific bill
   */
  async analyzeStakeholders(bill_id: number): Promise<{
    stakeholders: Stakeholder[];
    conflicts: Array<{
      stakeholder1: Stakeholder;
      stakeholder2: Stakeholder;
      conflictType: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }> { try {
      const bill = await this.getBill(bill_id);
      if (!bill) {
        throw new ConflictDetectionError(
          `Bill with ID ${bill_id } not found`,
          'BILL_NOT_FOUND',
          undefined,
          bill_id
        );
      }

      const stakeholders = await stakeholderAnalysisService.identifyStakeholders(bill);
      const conflicts = await stakeholderAnalysisService.identifyStakeholderConflicts(stakeholders);

      return { stakeholders, conflicts };
    } catch (error) { logger.error('Error analyzing stakeholders:', {
        component: 'ConflictDetectionOrchestrator',
        bill_id,
        error: error instanceof Error ? error.message : String(error)
       });
      return { stakeholders: [], conflicts: [] };
    }
  }

  /**
   * Invalidates all cached data for a specific sponsor
   */
  async invalidateSponsorCache(sponsor_id: number): Promise<void> {
    try {
      const patterns = [
        `comprehensive_analysis:${sponsor_id}:*`,
        `voting_anomalies:${sponsor_id}`,
        `professional_conflicts:${sponsor_id}:*`,
        `financial_conflicts:${sponsor_id}:*`,
        `stakeholders:*`
      ];

      const cache = getDefaultCache();
      const results = await Promise.allSettled(
        patterns.map(pattern => cache.invalidateByPattern ? cache.invalidateByPattern(pattern) : Promise.resolve())
      );

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.warn(`Some cache invalidations failed for sponsor ${sponsor_id}`, { failures });
      }

      logger.info(`Cache invalidated for sponsor ${sponsor_id}`);
    } catch (error) {
      logger.error(`Failed to invalidate cache for sponsor ${sponsor_id}`, { error });
    }
  }

  /**
   * Generates mitigation strategies for conflicts
   */
  async generateMitigationStrategies(
    sponsor_id: number,
    bill_id?: number
  ): Promise<Array<{
    conflictId: string;
    strategy: string;
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    stakeholders: string[];
  }>> { try {
      const analysis = await this.performComprehensiveAnalysis(sponsor_id, bill_id);
      const allConflicts = [...analysis.financialConflicts, ...analysis.professionalConflicts];
      
      return conflictResolutionRecommendationService.generateMitigationStrategies(
        allConflicts,
        analysis.riskLevel
      );
     } catch (error) { logger.error('Error generating mitigation strategies:', {
        component: 'ConflictDetectionOrchestrator',
        sponsor_id,
        bill_id,
        error: error instanceof Error ? error.message : String(error)
       });
      return [];
    }
  }

  // Private helper methods

  private async executeComprehensiveAnalysis(
    sponsor_id: number,
    bill_id?: number
  ): Promise<ConflictAnalysis> {
    // Fetch all necessary data in parallel for maximum efficiency
    const [sponsor, affiliations, disclosures, votingHistory] = await Promise.all([
      this.getSponsor(sponsor_id),
      this.getSponsorAffiliations(sponsor_id),
      this.getSponsorDisclosures(sponsor_id),
      this.getVotingHistory(sponsor_id),
    ]);

    if (!sponsor) {
      throw new ConflictDetectionError(
        `Sponsor with ID ${sponsor_id} not found`,
        'SPONSOR_NOT_FOUND',
        sponsor_id
      );
    }

    // Calculate transparency score early as it's needed for overall risk calculation
    const transparency_score = conflictSeverityAnalyzerService.calculateTransparencyScore(disclosures);
    const transparencyGrade = conflictSeverityAnalyzerService.calculateTransparencyGrade(transparency_score);

    // Execute all analysis types in parallel for speed
    const [financialConflicts, professionalConflicts, votingAnomalies] = await Promise.all([
      conflictDetectionEngineService.analyzeFinancialConflicts(sponsor, disclosures, affiliations, bill_id),
      conflictDetectionEngineService.analyzeProfessionalConflicts(sponsor, affiliations, bill_id),
      conflictDetectionEngineService.analyzeVotingPatternInconsistencies(sponsor, votingHistory),
    ]);

    // Calculate final metrics
    const overallRiskScore = conflictSeverityAnalyzerService.calculateOverallRiskScore(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparency_score
    );
    const riskLevel = conflictSeverityAnalyzerService.determineRiskLevel(overallRiskScore);

    const confidence = conflictSeverityAnalyzerService.calculateAnalysisConfidence(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparency_score
    );

    const recommendations = conflictResolutionRecommendationService.generateConflictRecommendations(
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparency_score,
      riskLevel
    );

    // Only fetch bill details if we need them (lazy loading optimization)
    const billTitle = bill_id ? (await this.getBill(bill_id))?.title : undefined;

    return { sponsor_id,
      sponsorName: sponsors.name,
      bill_id,
      billTitle,
      overallRiskScore,
      riskLevel,
      financialConflicts,
      professionalConflicts,
      votingAnomalies,
      transparency_score,
      transparencyGrade,
      recommendations,
      lastAnalyzed: new Date(),
      confidence,
     };
  }

  private async getSponsor(sponsor_id: number): Promise<Sponsor | null> {
    try {
      const [sponsor] = await db
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, sponsor_id));
      
      return sponsor || null;
    } catch (error) {
      logger.error('Error fetching sponsor:', { sponsor_id, error });
      return null;
    }
  }

  private async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    try {
      return await db
        .select()
        .from(sponsorAffiliations)
        .where(eq(sponsorAffiliations.sponsor_id, sponsor_id));
    } catch (error) {
      logger.error('Error fetching sponsor affiliations:', { sponsor_id, error });
      return [];
    }
  }

  private async getSponsorDisclosures(sponsor_id: number): Promise<SponsorTransparency[]> {
    try {
      return await db
        .select()
        .from(sponsorTransparency)
        .where(eq(sponsorTransparency.sponsor_id, sponsor_id));
    } catch (error) {
      logger.error('Error fetching sponsor disclosures:', { sponsor_id, error });
      return [];
    }
  }

  private async getVotingHistory(sponsor_id: number): Promise<unknown[]> {
    try {
      // This would be implemented based on your voting history schema
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error fetching voting history:', { sponsor_id, error });
      return [];
    }
  }

  private async getBill(bill_id: number): Promise<Bill | null> { try {
      const [bill] = await db
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id));
      
      return bill || null;
     } catch (error) { logger.error('Error fetching bill:', { bill_id, error  });
      return null;
    }
  }

  private generateFallbackAnalysis(
    sponsor_id: number,
    bill_id?: number,
    error?: any
  ): ConflictAnalysis { logger.warn('Generating fallback analysis due to error', { sponsor_id, bill_id, error  });

    return { sponsor_id,
      sponsorName: 'Unknown Sponsor',
      bill_id,
      billTitle: undefined,
      overallRiskScore: 0.5,
      riskLevel: 'medium',
      financialConflicts: [],
      professionalConflicts: [],
      votingAnomalies: [],
      transparency_score: 0.3,
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


