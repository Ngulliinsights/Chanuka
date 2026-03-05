/**
 * Analysis Application Service
 * Modernized wrapper around bill analysis services with validation, caching, and error handling
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { cacheService, CACHE_TTL } from '@server/infrastructure/cache';
import { db } from '@server/infrastructure/database';
import { billComprehensiveAnalysisService } from './bill-comprehensive-analysis.service';
import {
  AnalyzeBillSchema,
  GetAnalysisHistorySchema,
  GetAnalysisSchema,
  TriggerAnalysisSchema,
  CompareAnalysesSchema,
  BatchAnalyzeSchema,
  type AnalyzeBillInput,
  type GetAnalysisHistoryInput,
  type GetAnalysisInput,
  type TriggerAnalysisInput,
  type CompareAnalysesInput,
  type BatchAnalyzeInput,
  type ComprehensiveBillAnalysis,
  type AnalysisHistoryRecord,
  type AnalysisComparison,
  type BatchAnalysisResult,
} from './analysis-validation.schemas';
import * as schema from '@server/infrastructure/schema';
import { eq, and, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a stable string cache key from an arbitrary list of parts. */
function ck(...parts: unknown[]): string {
  return parts
    .map(p => (p !== null && typeof p === 'object' ? JSON.stringify(p) : String(p ?? '')))
    .join(':');
}

/**
 * Silently evict a cache entry.
 *
 * `cacheService` only exposes `.get` / `.set`; there is no `.delete` / `.invalidate`.
 * Setting with TTL = 0 causes an immediate expiry on all common cache adapters.
 * If the adapter adds a dedicated eviction method in future, replace the body here.
 */
async function bust(key: string): Promise<void> {
  try {
    await cacheService.set(key, null, 0);
  } catch {
    // Non-fatal — a stale read is preferable to crashing the write path.
  }
}

/**
 * Unwrap a `validateData` result, throwing on validation failure.
 *
 * `validateData` returns `{ data?: T; error?: ... }`.
 * TypeScript infers `data` as `T | undefined`, so we assert here once
 * rather than scattering `!` or `??` guards throughout every method.
 */
function unwrap<T>(result: { data?: T }): T {
  if (result.data === undefined) {
    throw new Error('Input validation failed');
  }
  return result.data;
}

// ---------------------------------------------------------------------------

export class AnalysisApplicationService {
  // ============================================================================
  // BILL ANALYSIS
  // ============================================================================

  /**
   * Analyse a bill comprehensively.
   * Results are cached for CACHE_TTL.LONG to avoid expensive re-computation.
   */
  async analyzeBill(
    input: AnalyzeBillInput,
  ): Promise<AsyncServiceResult<ComprehensiveBillAnalysis>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(AnalyzeBillSchema, input));

      const billId        = v.bill_id         as string;
      const analysisType  = v.analysis_type   as string | undefined;
      const forceRedo     = v.force_reanalysis as boolean | undefined;

      logger.info(
        { bill_id: billId, type: analysisType, force: forceRedo },
        'Analyzing bill',
      );

      const billCacheKey = ck('bill-analysis', billId, analysisType ?? 'comprehensive');

      if (!forceRedo) {
        const cached = await cacheService.get<ComprehensiveBillAnalysis>(billCacheKey);
        if (cached) {
          logger.info({ bill_id: billId }, 'Returning cached analysis');
          return cached;
        }
      }

      // Run analysis (expensive).
      // Cast: bill-comprehensive-analysis.service.ConstitutionalConcern uses the literal
      // "moderate" for severity, while analysis-validation.schemas uses "info".
      // Both are safe at runtime; the cast reconciles the divergent unions.
      const raw      = await billComprehensiveAnalysisService.analyzeBill(billId);
      const analysis = raw as unknown as ComprehensiveBillAnalysis;

      await Promise.all([
        cacheService.set(billCacheKey, analysis, CACHE_TTL.LONG),
        bust(ck('analysis-history', billId)),
      ]);

      logger.info(
        {
          bill_id:     billId,
          analysis_id: analysis.analysis_id,
          confidence:  analysis.overallConfidence,
        },
        'Bill analysis complete',
      );

      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'analyzeBill' });
  }

  // ============================================================================
  // ANALYSIS HISTORY
  // ============================================================================

  async getAnalysisHistory(
    input: GetAnalysisHistoryInput,
  ): Promise<AsyncServiceResult<AnalysisHistoryRecord[]>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(GetAnalysisHistorySchema, input));

      const billId       = v.bill_id       as string;
      const limit        = v.limit         as number;
      const offset       = v.offset        as number;
      const analysisType = v.analysis_type as string | undefined;

      const historyCacheKey = ck('analysis-history', billId, limit, analysisType ?? 'all');
      const cached = await cacheService.get<AnalysisHistoryRecord[]>(historyCacheKey);
      if (cached) return cached;

      const baseCondition =
        analysisType && analysisType !== 'all'
          ? and(
              eq(schema.analysis.bill_id, billId),
              eq(schema.analysis.analysis_type, analysisType),
            )
          : eq(schema.analysis.bill_id, billId);

      const records = await db
        .select()
        .from(schema.analysis)
        .where(baseCondition)
        .orderBy(desc(schema.analysis.created_at))
        .limit(limit)
        .offset(offset);

      const history: AnalysisHistoryRecord[] = records.map(
        (record: typeof schema.analysis.$inferSelect) => {
          const rd = record.results as Record<string, unknown> | null;
          return {
            dbId:              record.id,
            analysis_id:       (rd?.analysis_id as string) ?? `analysis_${record.id}`,
            bill_id:           record.bill_id,
            analysis_type:     record.analysis_type,
            timestamp:         record.created_at,
            overallConfidence: parseFloat((record.confidence as string) || '0'),
            status:            (rd?.status as string) ?? 'completed',
            scores: {
              publicInterest: (rd?.publicInterestScore as { score?: number })?.score,
              transparency:   (rd?.transparency_score  as { overall?: number })?.overall,
              constitutional: (
                rd?.constitutionalAnalysis as { constitutionalityScore?: number }
              )?.constitutionalityScore,
            },
          };
        },
      );

      await cacheService.set(historyCacheKey, history, CACHE_TTL.SHORT);

      return history;
    }, { service: 'AnalysisApplicationService', operation: 'getAnalysisHistory' });
  }

  // ============================================================================
  // SINGLE ANALYSIS RETRIEVAL
  // ============================================================================

  async getAnalysis(
    input: GetAnalysisInput,
  ): Promise<AsyncServiceResult<ComprehensiveBillAnalysis | null>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(GetAnalysisSchema, input));

      const analysisId     = v.analysis_id as string;
      const entityCacheKey = ck('analysis', analysisId);

      const cached = await cacheService.get<ComprehensiveBillAnalysis>(entityCacheKey);
      if (cached) return cached;

      const numericId = parseInt(analysisId.split('_').pop() ?? '0', 10);

      const [record] = await db
        .select()
        .from(schema.analysis)
        .where(eq(schema.analysis.id, numericId))
        .limit(1);

      if (!record) return null;

      const analysis = record.results as unknown as ComprehensiveBillAnalysis;
      await cacheService.set(entityCacheKey, analysis, CACHE_TTL.LONG);

      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'getAnalysis' });
  }

  // ============================================================================
  // MANUAL / ADMIN TRIGGER
  // ============================================================================

  async triggerAnalysis(
    input: TriggerAnalysisInput,
  ): Promise<AsyncServiceResult<ComprehensiveBillAnalysis>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(TriggerAnalysisSchema, input));

      const billId           = v.bill_id            as string;
      const analysisType     = v.analysis_type      as string | undefined;
      const priority         = v.priority           as string | undefined;
      const notifyOnComplete = v.notify_on_complete as boolean | undefined;

      logger.info(
        { bill_id: billId, type: analysisType, priority },
        'Manual analysis triggered',
      );

      const raw      = await billComprehensiveAnalysisService.analyzeBill(billId);
      const analysis = raw as unknown as ComprehensiveBillAnalysis;

      await Promise.all([
        bust(ck('bill-analysis', billId, analysisType ?? 'comprehensive')),
        bust(ck('analysis-history', billId)),
      ]);

      if (notifyOnComplete) {
        logger.info(
          { bill_id: billId, analysis_id: analysis.analysis_id },
          'Analysis notification requested',
        );
        // TODO: dispatch notification via notification service
      }

      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'triggerAnalysis' });
  }

  // ============================================================================
  // ADVANCED OPERATIONS
  // ============================================================================

  async compareAnalyses(
    input: CompareAnalysesInput,
  ): Promise<AsyncServiceResult<AnalysisComparison>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(CompareAnalysesSchema, input));

      const billId      = v.bill_id            as string;
      const analysisIds = v.analysis_ids        as string[];
      const cmpFields   = v.comparison_fields   as string[] | undefined;

      logger.info(
        { bill_id: billId, count: analysisIds.length },
        'Comparing analyses',
      );

      const fetchResults = await Promise.all(
        analysisIds.map((id: string) =>
          this.getAnalysis({ analysis_id: id, include_details: true }),
        ),
      );

      const validAnalyses = fetchResults
        .filter(r => r.isOk())
        .map(r => r.value)
        .filter((v): v is ComprehensiveBillAnalysis => v !== null);

      if (validAnalyses.length < 2) {
        throw new Error('At least 2 valid analyses are required for comparison');
      }

      const fields: string[] = cmpFields ?? [
        'constitutional_score',
        'transparency_score',
        'public_interest_score',
        'overall_confidence',
      ];

      const changes: AnalysisComparison['changes'] = fields.reduce<
        AnalysisComparison['changes']
      >((acc, field) => {
        const firstAnalysis = validAnalyses[0];
        const lastAnalysis = validAnalyses[validAnalyses.length - 1];
        
        if (!firstAnalysis || !lastAnalysis) return acc;
        
        const first = this.extractFieldValue(firstAnalysis, field);
        const last  = this.extractFieldValue(lastAnalysis, field);

        if (first !== null && last !== null && first !== 0) {
          acc.push({
            field,
            from:           first,
            to:             last,
            change_percent: Math.round(((last - first) / first) * 1000) / 10,
          });
        }
        return acc;
      }, []);

      const avgChange =
        changes.length > 0
          ? changes.reduce((sum, c) => sum + c.change_percent, 0) / changes.length
          : 0;

      const trend: AnalysisComparison['trend'] =
        avgChange > 5 ? 'improving' : avgChange < -5 ? 'declining' : 'stable';

      return { bill_id: billId, analyses: validAnalyses, changes, trend };
    }, { service: 'AnalysisApplicationService', operation: 'compareAnalyses' });
  }

  async batchAnalyze(
    input: BatchAnalyzeInput,
  ): Promise<AsyncServiceResult<BatchAnalysisResult>> {
    return safeAsync(async () => {
      const v = unwrap(await validateData(BatchAnalyzeSchema, input));

      const billIds      = v.bill_ids      as string[];
      const analysisType = v.analysis_type as AnalyzeBillInput['analysis_type'] | undefined;
      const parallel     = v.parallel      as boolean | undefined;

      logger.info(
        { count: billIds.length, parallel },
        'Batch analysis started',
      );

      const analyzeOne = (bill_id: string) =>
        this.analyzeBill({ bill_id, analysis_type: analysisType, force_reanalysis: false });

      const results: BatchAnalysisResult['results'] = [];

      if (parallel) {
        const settled = await Promise.allSettled(billIds.map(analyzeOne));

        billIds.forEach((bill_id, index) => {
          const outcome = settled[index];
          if (!outcome) return; // Skip if outcome is undefined (shouldn't happen)
          
          if (outcome.status === 'fulfilled' && outcome.value.isOk()) {
            results.push({ bill_id, success: true, analysis: outcome.value.value });
          } else {
            const err =
              outcome.status === 'rejected'
                ? String(outcome.reason)
                : outcome.value.isErr()
                  ? outcome.value.error.message
                  : 'Unknown error';
            results.push({ bill_id, success: false, error: err });
          }
        });
      } else {
        for (const bill_id of billIds) {
          const result = await analyzeOne(bill_id);
          if (result.isOk()) {
            results.push({ bill_id, success: true, analysis: result.value });
          } else {
            results.push({ bill_id, success: false, error: result.error.message });
          }
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed     = results.length - successful;

      logger.info(
        { total: results.length, successful, failed },
        'Batch analysis complete',
      );

      return { total: results.length, successful, failed, results };
    }, { service: 'AnalysisApplicationService', operation: 'batchAnalyze' });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private extractFieldValue(
    analysis: ComprehensiveBillAnalysis,
    field: string,
  ): number | null {
    const RISK_SCORE: Record<string, number> = {
      low: 25, medium: 50, high: 75, critical: 100,
    };

    switch (field) {
      case 'constitutional_score':
        return analysis.constitutionalAnalysis.constitutionalityScore ?? null;
      case 'transparency_score':
        return analysis.transparency_score.overall ?? null;
      case 'public_interest_score':
        return analysis.publicInterestScore.score ?? null;
      case 'conflict_risk':
        return RISK_SCORE[analysis.conflictAnalysisSummary.overallRisk] ?? null;
      case 'overall_confidence':
        return analysis.overallConfidence ?? null;
      default:
        return null;
    }
  }
}

export const analysisApplicationService = new AnalysisApplicationService();