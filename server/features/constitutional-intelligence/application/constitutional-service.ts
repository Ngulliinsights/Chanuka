/**
 * Constitutional Service
 *
 * Execution and orchestration layer. Owns the cache, runs ML analysis,
 * manages expert review and monitoring. Single source of truth for
 * constitutional analysis results.
 */

import type { ConstitutionalAnalysisInput, ConstitutionalAnalysisResult } from '@server/features/ml/models/types';
import { constitutionalAnalyzer } from '@server/features/ml/models/constitutional-analyzer';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';

import { constitutionalMonitoring } from './monitoring-integration';
import { expertReviewWorkflow, type ExpertReviewRequest } from './expert-review-workflow';

export interface ConstitutionalAnalysisRequest {
  billId: string;
  billText: string;
  billTitle: string;
  billType: 'public' | 'private' | 'money' | 'constitutional_amendment';
  affectedInstitutions?: string[];
  proposedChanges?: string[];
}

export interface ConstitutionalServiceResult extends ConstitutionalAnalysisResult {
  billId: string;
  analyzedAt: string;
  processingTime: number;
}

const CACHE_TTL_SECONDS = 3600;

export class ConstitutionalService {
  // ─── Core Analysis ────────────────────────────────────────────────────────

  async analyzeBill(request: ConstitutionalAnalysisRequest): Promise<ConstitutionalServiceResult> {
    const startTime = Date.now();

    logger.info({
      message: 'Analyzing bill for constitutional compliance',
      component: 'ConstitutionalService',
      billId: request.billId,
      billType: request.billType,
    });

    try {
      const cached = await cacheService.get<ConstitutionalServiceResult>(this.cacheKey(request.billId));
      if (cached) {
        logger.info({
          message: 'Returning cached constitutional analysis',
          component: 'ConstitutionalService',
          billId: request.billId,
        });
        return cached;
      }

      const input: ConstitutionalAnalysisInput = {
        billSection: request.billText,
        billTitle: request.billTitle,
        context: request.billType,
      };

      const tierResult = await constitutionalAnalyzer.analyze(input);
      const processingTime = Date.now() - startTime;

      // Unwrap the result from TierResult
      const analysisResult = tierResult.result;

      const result: ConstitutionalServiceResult = {
        ...(analysisResult as ConstitutionalAnalysisResult),
        billId: request.billId,
        analyzedAt: new Date().toISOString(),
        processingTime,
      };

      await Promise.all([
        cacheService.set(this.cacheKey(request.billId), result, CACHE_TTL_SECONDS),
        constitutionalMonitoring.recordAnalysis(
          processingTime,
          analysisResult.riskScore * 100,
          analysisResult.riskLevel ? [{ violationType: 'constitutional_risk', severity: analysisResult.riskLevel }] : [],
          false
        ),
      ]);

      logger.info({
        message: 'Constitutional analysis completed',
        component: 'ConstitutionalService',
        billId: request.billId,
        riskLevel: analysisResult.riskLevel,
        riskScore: analysisResult.riskScore,
        processingTime,
      });

      return result;
    } catch (error) {
      constitutionalMonitoring.recordError(
        error instanceof Error ? error : new Error(String(error)),
        request.billId,
      );
      logger.error({
        message: 'Constitutional analysis failed',
        component: 'ConstitutionalService',
        billId: request.billId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** Returns the cached result for a bill, or null if not yet analyzed. */
  async getAnalysis(billId: string): Promise<ConstitutionalServiceResult | null> {
    try {
      return await cacheService.get<ConstitutionalServiceResult>(this.cacheKey(billId));
    } catch (error) {
      logger.error({
        message: 'Failed to retrieve constitutional analysis',
        component: 'ConstitutionalService',
        billId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async clearCache(billId: string): Promise<void> {
    await cacheService.del(this.cacheKey(billId));
    logger.info({
      message: 'Cleared constitutional analysis cache',
      component: 'ConstitutionalService',
      billId,
    });
  }

  // ─── Expert Review (Delegated) ─────────────────────────────────────────────

  async createReviewRequest(analysisId: string, billId: string, expertIds: string[]) {
    return expertReviewWorkflow.createReviewRequest(analysisId, billId, expertIds);
  }

  async submitReview(request: ExpertReviewRequest) {
    return expertReviewWorkflow.submitReview(request);
  }

  async getReviewsForAnalysis(analysisId: string) {
    return expertReviewWorkflow.getReviewsForAnalysis(analysisId);
  }

  async getPendingReviews(expertId: string) {
    return expertReviewWorkflow.getPendingReviews(expertId);
  }

  async getReviewStatistics() {
    return expertReviewWorkflow.getReviewStatistics();
  }

  // ─── Monitoring ────────────────────────────────────────────────────────────

  async getMonitoringMetrics() {
    return constitutionalMonitoring.getMetrics();
  }

  async healthCheck() {
    return constitutionalMonitoring.healthCheck();
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  cacheKey(billId: string): string {
    return `constitutional:${billId}`;
  }
}

export const constitutionalService = new ConstitutionalService();