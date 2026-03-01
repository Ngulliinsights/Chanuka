/**
 * Analysis Application Service
 * Modernized wrapper around bill analysis services with validation, caching, and error handling
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { readDatabase } from '@server/infrastructure/database';
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

export class AnalysisApplicationService {
  // ============================================================================
  // BILL ANALYSIS
  // ============================================================================

  /**
   * Analyze a bill comprehensively
   * Includes caching to avoid expensive re-computation
   */
  async analyzeBill(input: AnalyzeBillInput): Promise<AsyncServiceResult<ComprehensiveBillAnalysis>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(AnalyzeBillSchema, input);
      
      logger.info('Analyzing bill', {
        bill_id: validatedInput.bill_id,
        type: validatedInput.analysis_type,
        force: validatedInput.force_reanalysis,
      });
      
      // Check cache unless force reanalysis
      if (!validatedInput.force_reanalysis) {
        const cacheKey = cacheKeys.query('bill-analysis', {
          bill_id: validatedInput.bill_id,
          type: validatedInput.analysis_type,
        });
        const cached = await cacheService.get<ComprehensiveBillAnalysis>(cacheKey);
        if (cached) {
          logger.info('Returning cached analysis', { bill_id: validatedInput.bill_id });
          return cached;
        }
      }
      
      // Run analysis
      const analysis = await billComprehensiveAnalysisService.analyzeBill(validatedInput.bill_id);
      
      // Cache for 30 minutes (expensive operation)
      const cacheKey = cacheKeys.query('bill-analysis', {
        bill_id: validatedInput.bill_id,
        type: validatedInput.analysis_type,
      });
      await cacheService.set(cacheKey, analysis, CACHE_TTL.LONG);
      
      // Invalidate history cache
      await cacheService.delete(cacheKeys.list('analysis-history', { bill_id: validatedInput.bill_id }));
      
      logger.info('Bill analysis complete', {
        bill_id: validatedInput.bill_id,
        analysis_id: analysis.analysis_id,
        confidence: analysis.overallConfidence,
      });
      
      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'analyzeBill' });
  }

  /**
   * Get analysis history for a bill
   */
  async getAnalysisHistory(input: GetAnalysisHistoryInput): Promise<AsyncServiceResult<AnalysisHistoryRecord[]>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetAnalysisHistorySchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.list('analysis-history', {
        bill_id: validatedInput.bill_id,
        limit: validatedInput.limit,
        type: validatedInput.analysis_type,
      });
      const cached = await cacheService.get<AnalysisHistoryRecord[]>(cacheKey);
      if (cached) return cached;
      
      // Query database
      const db = await readDatabase();
      
      let query = db
        .select()
        .from(schema.analysis)
        .where(eq(schema.analysis.bill_id, validatedInput.bill_id))
        .orderBy(desc(schema.analysis.created_at))
        .limit(validatedInput.limit)
        .offset(validatedInput.offset);
      
      // Filter by type if specified
      if (validatedInput.analysis_type !== 'all') {
        query = query.where(
          and(
            eq(schema.analysis.bill_id, validatedInput.bill_id),
            eq(schema.analysis.analysis_type, validatedInput.analysis_type)
          )
        );
      }
      
      const records = await query;
      
      // Transform to history records
      const history: AnalysisHistoryRecord[] = records.map(record => {
        const resultsData = record.results as any;
        return {
          dbId: record.id,
          analysis_id: resultsData?.analysis_id || `analysis_${record.id}`,
          bill_id: record.bill_id,
          analysis_type: record.analysis_type,
          timestamp: record.created_at,
          overallConfidence: parseFloat(record.confidence || '0'),
          status: resultsData?.status || 'completed',
          scores: {
            publicInterest: resultsData?.publicInterestScore?.score,
            transparency: resultsData?.transparency_score?.overall,
            constitutional: resultsData?.constitutionalAnalysis?.constitutionalityScore,
          },
        };
      });
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, history, CACHE_TTL.SHORT);
      
      return history;
    }, { service: 'AnalysisApplicationService', operation: 'getAnalysisHistory' });
  }

  /**
   * Get a specific analysis by ID
   */
  async getAnalysis(input: GetAnalysisInput): Promise<AsyncServiceResult<ComprehensiveBillAnalysis | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetAnalysisSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.entity('analysis', validatedInput.analysis_id);
      const cached = await cacheService.get<ComprehensiveBillAnalysis>(cacheKey);
      if (cached) return cached;
      
      // Query database
      const db = await readDatabase();
      const [record] = await db
        .select()
        .from(schema.analysis)
        .where(eq(schema.analysis.id, parseInt(validatedInput.analysis_id.split('_').pop() || '0', 10)))
        .limit(1);
      
      if (!record) return null;
      
      const analysis = record.results as ComprehensiveBillAnalysis;
      
      // Cache for 30 minutes
      await cacheService.set(cacheKey, analysis, CACHE_TTL.LONG);
      
      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'getAnalysis' });
  }

  /**
   * Trigger manual analysis (admin only)
   */
  async triggerAnalysis(input: TriggerAnalysisInput): Promise<AsyncServiceResult<ComprehensiveBillAnalysis>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(TriggerAnalysisSchema, input);
      
      logger.info('Manual analysis triggered', {
        bill_id: validatedInput.bill_id,
        type: validatedInput.analysis_type,
        priority: validatedInput.priority,
      });
      
      // Force reanalysis
      const analysis = await billComprehensiveAnalysisService.analyzeBill(validatedInput.bill_id);
      
      // Invalidate caches
      await Promise.all([
        cacheService.delete(cacheKeys.query('bill-analysis', {
          bill_id: validatedInput.bill_id,
          type: validatedInput.analysis_type,
        })),
        cacheService.delete(cacheKeys.list('analysis-history', { bill_id: validatedInput.bill_id })),
      ]);
      
      // TODO: Send notification if requested
      if (validatedInput.notify_on_complete) {
        logger.info('Analysis notification requested', {
          bill_id: validatedInput.bill_id,
          analysis_id: analysis.analysis_id,
        });
      }
      
      return analysis;
    }, { service: 'AnalysisApplicationService', operation: 'triggerAnalysis' });
  }

  // ============================================================================
  // ADVANCED OPERATIONS
  // ============================================================================

  /**
   * Compare multiple analyses
   */
  async compareAnalyses(input: CompareAnalysesInput): Promise<AsyncServiceResult<AnalysisComparison>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(CompareAnalysesSchema, input);
      
      logger.info('Comparing analyses', {
        bill_id: validatedInput.bill_id,
        count: validatedInput.analysis_ids.length,
      });
      
      // Fetch all analyses
      const analyses = await Promise.all(
        validatedInput.analysis_ids.map(id => this.getAnalysis({ analysis_id: id, include_details: true }))
      );
      
      const validAnalyses = analyses
        .filter(r => r.success && r.data)
        .map(r => r.data!);
      
      if (validAnalyses.length < 2) {
        throw new Error('At least 2 valid analyses required for comparison');
      }
      
      // Calculate changes
      const changes: AnalysisComparison['changes'] = [];
      const fields = validatedInput.comparison_fields || [
        'constitutional_score',
        'transparency_score',
        'public_interest_score',
        'overall_confidence',
      ];
      
      for (const field of fields) {
        const first = this.extractFieldValue(validAnalyses[0], field);
        const last = this.extractFieldValue(validAnalyses[validAnalyses.length - 1], field);
        
        if (first !== null && last !== null) {
          const change_percent = ((last - first) / first) * 100;
          changes.push({
            field,
            from: first,
            to: last,
            change_percent: Math.round(change_percent * 10) / 10,
          });
        }
      }
      
      // Determine trend
      const avgChange = changes.reduce((sum, c) => sum + c.change_percent, 0) / changes.length;
      const trend = avgChange > 5 ? 'improving' : avgChange < -5 ? 'declining' : 'stable';
      
      return {
        bill_id: validatedInput.bill_id,
        analyses: validAnalyses,
        changes,
        trend,
      };
    }, { service: 'AnalysisApplicationService', operation: 'compareAnalyses' });
  }

  /**
   * Batch analyze multiple bills
   */
  async batchAnalyze(input: BatchAnalyzeInput): Promise<AsyncServiceResult<BatchAnalysisResult>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(BatchAnalyzeSchema, input);
      
      logger.info('Batch analysis started', {
        count: validatedInput.bill_ids.length,
        parallel: validatedInput.parallel,
      });
      
      const results: BatchAnalysisResult['results'] = [];
      
      if (validatedInput.parallel) {
        // Parallel execution
        const promises = validatedInput.bill_ids.map(bill_id =>
          this.analyzeBill({
            bill_id,
            analysis_type: validatedInput.analysis_type,
            force_reanalysis: false,
          })
        );
        
        const settled = await Promise.allSettled(promises);
        
        settled.forEach((result, index) => {
          const bill_id = validatedInput.bill_ids[index];
          if (result.status === 'fulfilled' && result.value.success) {
            results.push({
              bill_id,
              success: true,
              analysis: result.value.data,
            });
          } else {
            results.push({
              bill_id,
              success: false,
              error: result.status === 'rejected' ? result.reason : result.value.error,
            });
          }
        });
      } else {
        // Sequential execution
        for (const bill_id of validatedInput.bill_ids) {
          const result = await this.analyzeBill({
            bill_id,
            analysis_type: validatedInput.analysis_type,
            force_reanalysis: false,
          });
          
          results.push({
            bill_id,
            success: result.success,
            analysis: result.data,
            error: result.error,
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      logger.info('Batch analysis complete', {
        total: results.length,
        successful,
        failed,
      });
      
      return {
        total: results.length,
        successful,
        failed,
        results,
      };
    }, { service: 'AnalysisApplicationService', operation: 'batchAnalyze' });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private extractFieldValue(analysis: ComprehensiveBillAnalysis, field: string): number | null {
    switch (field) {
      case 'constitutional_score':
        return analysis.constitutionalAnalysis.constitutionalityScore;
      case 'transparency_score':
        return analysis.transparency_score.overall;
      case 'public_interest_score':
        return analysis.publicInterestScore.score;
      case 'conflict_risk':
        const riskMap = { low: 25, medium: 50, high: 75, critical: 100 };
        return riskMap[analysis.conflictAnalysisSummary.overallRisk];
      case 'overall_confidence':
        return analysis.overallConfidence;
      default:
        return null;
    }
  }
}

export const analysisApplicationService = new AnalysisApplicationService();
