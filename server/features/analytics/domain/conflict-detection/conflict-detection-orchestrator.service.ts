/**
 * Conflict Detection Orchestrator Service
 * 
 * Main coordination service that orchestrates the entire conflict detection workflow.
 * This service acts as the primary interface for conflict detection operations.
 */

import { conflictDetectionEngineService } from '@server/features/analytics/domain/conflict-detection/conflict-detection-engine.service';
import { conflictResolutionRecommendationService } from '@server/features/analytics/domain/conflict-detection/conflict-resolution-recommendation.service';
import { conflictSeverityAnalyzerService } from '@server/features/analytics/domain/conflict-detection/conflict-severity-analyzer.service';
import { stakeholderAnalysisService } from '@server/features/analytics/domain/conflict-detection/stakeholder-analysis.service';
import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@server/infrastructure/cache/index';
import { readDatabase } from '@server/infrastructure/database';
import { eq } from 'drizzle-orm';

import {
  type Bill,
  type Sponsor,
} from '@server/infrastructure/schema/foundation';

import {
  type PoliticalAppointment,
  political_appointments,
} from '@server/infrastructure/schema/political_economy';
import { bills, sponsors } from '@server/infrastructure/schema';

import {
  ConflictAnalysis,
  ConflictDetectionError,
  Stakeholder
} from './types';

export class ConflictDetectionOrchestratorService {
  private static instance: ConflictDetectionOrchestratorService;
  private readonly memoCache = new Map<string, { data: any; timestamp: number }>();
  private readonly MEMO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMO_CACHE_SIZE = 100;

  public static getInstance(): ConflictDetectionOrchestratorService {
    if (!ConflictDetectionOrchestratorService.instance) {
      ConflictDetectionOrchestratorService.instance = new ConflictDetectionOrchestratorService();
    }
    return ConflictDetectionOrchestratorService.instance;
  }

  /**
   * Clean up expired entries from memoization cache
   */
  private cleanupMemoCache(): void {
    const now = Date.now();
    const entries = Array.from(this.memoCache.entries());
    
    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.MEMO_CACHE_TTL) {
        this.memoCache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this.memoCache.size > this.MAX_MEMO_CACHE_SIZE) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - this.MAX_MEMO_CACHE_SIZE);
      
      for (const [key] of sortedEntries) {
        this.memoCache.delete(key);
      }
    }
  }

  /**
   * Performs a comprehensive conflict of interest analysis for a sponsor
   */
  async performComprehensiveAnalysis(
    sponsor_id: number,
    bill_id?: number
  ): Promise<ConflictAnalysis> {
    const cacheKey = `comprehensive_analysis:${sponsor_id}:${ bill_id || 'all' }`;

    // Clean up expired memoization cache entries
    this.cleanupMemoCache();

    try {
      logger.info(`📊 Performing comprehensive analysis for sponsor ${sponsor_id}${ bill_id ? ` and bill ${bill_id }` : ''}`);

      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached;

      const computed = await this.executeComprehensiveAnalysis(sponsor_id, bill_id);
      
      try {
        await cache.set(cacheKey, computed, 3600);
      } catch (e) {
        logger.warn({ error: e }, 'Failed to cache analysis result');
      }
      
      return computed;
    } catch (error) {
      logger.error({ error,
        bill_id,
        timestamp: new Date().toISOString()
       }, `Comprehensive analysis failed for sponsor ${sponsor_id}`);
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
    error?: {
      message: string;
      code: string;
      details?: unknown;
    };
  }> {
    try {
      const bill = await this.getBill(bill_id);
      if (!bill) {
        throw new ConflictDetectionError(
          `Bill with ID ${bill_id} not found`,
          'BILL_NOT_FOUND',
          undefined,
          bill_id
        );
      }

      const stakeholders = await stakeholderAnalysisService.identifyStakeholders(bill);
      const conflicts = await stakeholderAnalysisService.identifyStakeholderConflicts(stakeholders);

      return { stakeholders, conflicts };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof ConflictDetectionError ? error.code : 'ANALYSIS_FAILED';
      
      logger.error({
        component: 'ConflictDetectionOrchestrator',
        bill_id,
        error: errorMessage,
        code: errorCode
      }, 'Error analyzing stakeholders');
      
      return {
        stakeholders: [],
        conflicts: [],
        error: {
          message: `Failed to analyze stakeholders for bill ${bill_id}: ${errorMessage}`,
          code: errorCode,
          details: error instanceof Error ? { stack: error.stack } : undefined
        }
      };
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
        logger.warn({ failures }, `Some cache invalidations failed for sponsor ${sponsor_id}`);
      }

      logger.info(`Cache invalidated for sponsor ${sponsor_id}`);
    } catch (error) {
      logger.error({ error }, `Failed to invalidate cache for sponsor ${sponsor_id}`);
    }
  }

  /**
   * Generates mitigation strategies for conflicts
   */
  async generateMitigationStrategies(
    sponsor_id: number,
    bill_id?: number
  ): Promise<{
    strategies: Array<{
      conflictId: string;
      strategy: string;
      timeline: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      stakeholders: string[];
    }>;
    error?: {
      message: string;
      code: string;
      details?: unknown;
    };
  }> {
    try {
      const analysis = await this.performComprehensiveAnalysis(sponsor_id, bill_id);
      const allConflicts = [...analysis.financialConflicts, ...analysis.professionalConflicts];
      
      const strategies = await conflictResolutionRecommendationService.generateMitigationStrategies(
        allConflicts,
        analysis.riskLevel
      );
      
      return { strategies };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof ConflictDetectionError ? error.code : 'MITIGATION_FAILED';
      
      logger.error({
        component: 'ConflictDetectionOrchestrator',
        sponsor_id,
        bill_id,
        error: errorMessage,
        code: errorCode
      }, 'Error generating mitigation strategies');
      
      return {
        strategies: [],
        error: {
          message: `Failed to generate mitigation strategies for sponsor ${sponsor_id}: ${errorMessage}`,
          code: errorCode,
          details: error instanceof Error ? { stack: error.stack } : undefined
        }
      };
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

    return {
      sponsor_id,
      sponsorName: sponsor.name,
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
      const db = readDatabase as any;
      const [sponsor] = await db
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, String(sponsor_id)));
      
      return sponsor || null;
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error fetching sponsor');
      return null;
    }
  }

  private async getSponsorAffiliations(sponsor_id: number): Promise<PoliticalAppointment[]> {
    try {
      const db = readDatabase as any;
      return await db
        .select()
        .from(political_appointments)
        .where(eq(political_appointments.sponsor_id, String(sponsor_id)));
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error fetching sponsor affiliations');
      return [];
    }
  }

  private async getSponsorDisclosures(sponsor_id: number): Promise<PoliticalAppointment[]> {
    try {
      const db = readDatabase as any;
      // Using political_appointments as proxy for transparency disclosures
      // This should be replaced with actual transparency table when available
      return await db
        .select()
        .from(political_appointments)
        .where(eq(political_appointments.sponsor_id, String(sponsor_id)));
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error fetching sponsor disclosures');
      return [];
    }
  }

  private async getVotingHistory(sponsor_id: number): Promise<unknown[]> {
    try {
      // TODO: Implement voting history when schema is available
      // For now, return empty array
      logger.debug({ sponsor_id }, 'Voting history not yet implemented');
      return [];
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error fetching voting history');
      return [];
    }
  }

  private async getBill(bill_id: number): Promise<Bill | null> {
    try {
      const db = readDatabase as any;
      const [bill] = await db
        .select()
        .from(bills)
        .where(eq(bills.id, String(bill_id)));
      
      return bill || null;
    } catch (error) {
      logger.error({ bill_id, error }, 'Error fetching bill');
      return null;
    }
  }

  private generateFallbackAnalysis(
    sponsor_id: number,
    bill_id?: number,
    error?: any
  ): ConflictAnalysis { logger.warn({ sponsor_id, bill_id, error  }, 'Generating fallback analysis due to error');

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


