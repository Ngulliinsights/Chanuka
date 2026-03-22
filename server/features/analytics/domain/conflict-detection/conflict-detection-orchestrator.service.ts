/**
 * Conflict Detection Orchestrator Service
 * 
 * Main coordination service that orchestrates the entire conflict detection workflow.
 * This service acts as the primary interface for conflict detection operations.
 * 
 * MODERNIZED: Uses Repository Pattern (ADR-017), Result-type error handling (ADR-014),
 * Zod validation (ADR-006), and input sanitization.
 */

import { conflictDetectionEngineService } from '@server/features/analytics/domain/conflict-detection/conflict-detection-engine.service';
import { conflictResolutionRecommendationService } from '@server/features/analytics/domain/conflict-detection/conflict-resolution-recommendation.service';
import { conflictSeverityAnalyzerService } from '@server/features/analytics/domain/conflict-detection/conflict-severity-analyzer.service';
import { stakeholderAnalysisService } from '@server/features/analytics/domain/conflict-detection/stakeholder-analysis.service';
import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@server/infrastructure/cache/index';
import {
  safeAsync,
  type AsyncServiceResult,
} from '@server/infrastructure/error-handling/result-types';
import {
  createNotFoundError,
  createValidationError,
} from '@server/infrastructure/error-handling/error-factory';
import { conflictDetectionRepository } from '@server/features/analytics/infrastructure/repositories/conflict-detection.repository';

import {
  ConflictAnalysis,
  Stakeholder,
  AnalyzeSponsorConflictsSchema,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Input Sanitization Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a numeric ID to prevent injection and ensure it's a safe integer.
 */
function sanitizeId(id: unknown): number | null {
  if (typeof id !== 'number') return null;
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) return null;
  if (id > Number.MAX_SAFE_INTEGER) return null;
  return id;
}

const SERVICE_CONTEXT = { service: 'ConflictDetectionOrchestrator' } as const;

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
   * Performs a comprehensive conflict of interest analysis for a sponsor.
   * Uses Zod validation, input sanitization, repository pattern, and typed Result error handling.
   */
  async performComprehensiveAnalysis(
    sponsor_id: number,
    bill_id?: number
  ): AsyncServiceResult<ConflictAnalysis> {
    const ctx = { ...SERVICE_CONTEXT, operation: 'performComprehensiveAnalysis' };

    // 1. Validate and sanitize inputs
    const parsed = AnalyzeSponsorConflictsSchema.safeParse({ sponsor_id, bill_id });
    if (!parsed.success) {
      const fields = parsed.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return safeAsync(
        () => Promise.reject(createValidationError(fields, ctx)),
        ctx,
      );
    }

    const safeSponsorId = sanitizeId(parsed.data.sponsor_id);
    const safeBillId = parsed.data.bill_id ? sanitizeId(parsed.data.bill_id) : undefined;
    if (!safeSponsorId) {
      return safeAsync(
        () => Promise.reject(createValidationError(
          [{ field: 'sponsor_id', message: 'Invalid sponsor ID after sanitization' }],
          ctx,
        )),
        ctx,
      );
    }

    return safeAsync(async () => {
      const cacheKey = `comprehensive_analysis:${safeSponsorId}:${safeBillId || 'all'}`;

      // Clean up expired memoization cache entries
      this.cleanupMemoCache();

      logger.info(
        `📊 Performing comprehensive analysis for sponsor ${safeSponsorId}${safeBillId ? ` and bill ${safeBillId}` : ''}`,
      );

      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached as ConflictAnalysis;

      const computed = await this.executeComprehensiveAnalysis(safeSponsorId, safeBillId ?? undefined);

      try {
        await cache.set(cacheKey, computed, 3600);
      } catch (e) {
        logger.warn({ error: e }, 'Failed to cache analysis result');
      }

      return computed;
    }, ctx);
  }

  /**
   * Analyzes stakeholders for a specific bill.
   */
  async analyzeStakeholders(bill_id: number): AsyncServiceResult<{
    stakeholders: Stakeholder[];
    conflicts: Array<{
      stakeholder1: Stakeholder;
      stakeholder2: Stakeholder;
      conflictType: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }> {
    const ctx = { ...SERVICE_CONTEXT, operation: 'analyzeStakeholders' };

    const safeBillId = sanitizeId(bill_id);
    if (!safeBillId) {
      return safeAsync(
        () => Promise.reject(createValidationError(
          [{ field: 'bill_id', message: 'Invalid bill ID' }],
          ctx,
        )),
        ctx,
      );
    }

    return safeAsync(async () => {
      const billResult = await conflictDetectionRepository.getBill(safeBillId);
      if (billResult.isErr) throw billResult.error;
      const bill = billResult.value;

      if (!bill) {
        throw createNotFoundError('Bill', String(safeBillId), ctx);
      }

      const stakeholders = await stakeholderAnalysisService.identifyStakeholders(bill);
      const conflicts = await stakeholderAnalysisService.identifyStakeholderConflicts(stakeholders);

      return { stakeholders, conflicts };
    }, ctx);
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

      logger.info({ component: 'server' }, `Cache invalidated for sponsor ${sponsor_id}`);
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
  ): AsyncServiceResult<{
    strategies: Array<{
      conflictId: string;
      strategy: string;
      timeline: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      stakeholders: string[];
    }>;
  }> {
    const ctx = { ...SERVICE_CONTEXT, operation: 'generateMitigationStrategies' };

    const safeSponsorId = sanitizeId(sponsor_id);
    if (!safeSponsorId) {
      return safeAsync(
        () => Promise.reject(createValidationError(
          [{ field: 'sponsor_id', message: 'Invalid sponsor ID' }],
          ctx,
        )),
        ctx,
      );
    }

    return safeAsync(async () => {
      const analysisResult = await this.performComprehensiveAnalysis(safeSponsorId, bill_id);
      if (analysisResult.isErr()) throw analysisResult.error;

      const analysis = analysisResult.value;
      const allConflicts = [...analysis.financialConflicts, ...analysis.professionalConflicts];
      
      const strategies = await conflictResolutionRecommendationService.generateMitigationStrategies(
        allConflicts,
        analysis.riskLevel
      );
      
      return { strategies };
    }, ctx);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helper methods
  // ─────────────────────────────────────────────────────────────────────────

  private async executeComprehensiveAnalysis(
    sponsor_id: number,
    bill_id?: number
  ): Promise<ConflictAnalysis> {
    // Fetch all necessary data in parallel via repository for maximum efficiency
    const [sponsorResult, affiliationsResult, disclosuresResult, votingHistory] = await Promise.all([
      conflictDetectionRepository.getSponsor(sponsor_id),
      conflictDetectionRepository.getSponsorAffiliations(sponsor_id),
      conflictDetectionRepository.getSponsorDisclosures(sponsor_id),
      this.getVotingHistory(sponsor_id),
    ]);

    // Unwrap Results — throw on error (caught by outer safeAsync)
    if (sponsorResult.isErr) throw sponsorResult.error;
    if (affiliationsResult.isErr) throw affiliationsResult.error;
    if (disclosuresResult.isErr) throw disclosuresResult.error;

    const sponsor = sponsorResult.value;
    const affiliations = affiliationsResult.value;
    const disclosures = disclosuresResult.value;

    if (!sponsor) {
      throw createNotFoundError('Sponsor', String(sponsor_id), {
        ...SERVICE_CONTEXT,
        operation: 'executeComprehensiveAnalysis',
      });
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
    let billTitle: string | undefined;
    if (bill_id) {
      const billResult = await conflictDetectionRepository.getBill(bill_id);
      if (billResult.isOk && billResult.value) {
        billTitle = billResult.value.title;
      }
    }

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
}

export const conflictDetectionOrchestratorService = ConflictDetectionOrchestratorService.getInstance();
