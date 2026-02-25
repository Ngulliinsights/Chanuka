/**
 * Constitutional Intelligence Service
 * 
 * Service for analyzing bills for constitutional compliance
 */

import { logger } from '@server/infrastructure/observability';
import { constitutionalAnalyzer } from '@server/features/ml/models/constitutional-analyzer';
import type { ConstitutionalInput, ConstitutionalOutput } from '@server/features/ml/models/constitutional-analyzer';
import { cacheService } from '@server/infrastructure/cache';
import { expertReviewWorkflow, type ExpertReviewRequest } from './expert-review-workflow';
import { constitutionalMonitoring } from './monitoring-integration';

export interface ConstitutionalAnalysisRequest {
  billId: string;
  billText: string;
  billTitle: string;
  billType: 'public' | 'private' | 'money' | 'constitutional_amendment';
  affectedInstitutions?: string[];
  proposedChanges?: string[];
}

export interface ConstitutionalAnalysisResult extends ConstitutionalOutput {
  billId: string;
  analyzedAt: string;
  processingTime: number;
}

/**
 * Constitutional Intelligence Service
 */
export class ConstitutionalService {
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Analyze a bill for constitutional compliance
   */
  async analyzeBill(request: ConstitutionalAnalysisRequest): Promise<ConstitutionalAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info({
        message: 'Analyzing bill for constitutional compliance',
        component: 'ConstitutionalService',
        billId: request.billId,
        billType: request.billType,
      });

      // Check cache first
      const cacheKey = `constitutional:${request.billId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info({
          message: 'Returning cached constitutional analysis',
          component: 'ConstitutionalService',
          billId: request.billId,
        });
        return cached as ConstitutionalAnalysisResult;
      }

      // Prepare input for analyzer
      const input: ConstitutionalInput = {
        billText: request.billText,
        billTitle: request.billTitle,
        billType: request.billType,
        affectedInstitutions: request.affectedInstitutions,
        proposedChanges: request.proposedChanges,
      };

      // Run analysis
      const analysis = await constitutionalAnalyzer.analyze(input);

      const processingTime = Date.now() - startTime;

      const result: ConstitutionalAnalysisResult = {
        ...analysis,
        billId: request.billId,
        analyzedAt: new Date().toISOString(),
        processingTime,
      };

      // Cache result
      await cacheService.set(cacheKey, result, this.CACHE_TTL);

      // Record monitoring metrics
      constitutionalMonitoring.recordAnalysis(
        processingTime,
        analysis.alignmentScore,
        analysis.violations,
        false
      );

      logger.info({
        message: 'Constitutional analysis completed',
        component: 'ConstitutionalService',
        billId: request.billId,
        alignmentScore: analysis.alignmentScore,
        violations: analysis.violations.length,
        processingTime,
      });

      return result;
    } catch (error) {
      // Record error in monitoring
      constitutionalMonitoring.recordError(
        error instanceof Error ? error : new Error(String(error)),
        request.billId
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

  /**
   * Get constitutional analysis by bill ID
   */
  async getAnalysis(billId: string): Promise<ConstitutionalAnalysisResult | null> {
    try {
      const cacheKey = `constitutional:${billId}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        // Record cache hit
        constitutionalMonitoring.recordAnalysis(0, 0, [], true);
      }
      
      return cached as ConstitutionalAnalysisResult | null;
    } catch (error) {
      logger.error({
        message: 'Failed to get constitutional analysis',
        component: 'ConstitutionalService',
        billId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get constitutional statistics
   */
  async getStatistics(): Promise<{
    totalAnalyses: number;
    averageAlignmentScore: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
  }> {
    // In a real implementation, this would query from database
    // For now, return default values
    return {
      totalAnalyses: 0,
      averageAlignmentScore: 0,
      violationsByType: {},
      violationsBySeverity: {},
    };
  }

  /**
   * Clear analysis cache for a bill
   */
  async clearCache(billId: string): Promise<void> {
    const cacheKey = `constitutional:${billId}`;
    await cacheService.del(cacheKey);
    logger.info({
      message: 'Cleared constitutional analysis cache',
      component: 'ConstitutionalService',
      billId,
    });
  }

  /**
   * Create expert review request
   */
  async createReviewRequest(
    analysisId: string,
    billId: string,
    expertIds: string[]
  ) {
    return expertReviewWorkflow.createReviewRequest(analysisId, billId, expertIds);
  }

  /**
   * Submit expert review
   */
  async submitReview(request: ExpertReviewRequest) {
    return expertReviewWorkflow.submitReview(request);
  }

  /**
   * Get reviews for analysis
   */
  async getReviewsForAnalysis(analysisId: string) {
    return expertReviewWorkflow.getReviewsForAnalysis(analysisId);
  }

  /**
   * Get pending reviews for expert
   */
  async getPendingReviews(expertId: string) {
    return expertReviewWorkflow.getPendingReviews(expertId);
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics() {
    return expertReviewWorkflow.getReviewStatistics();
  }

  /**
   * Get monitoring metrics
   */
  async getMonitoringMetrics() {
    return constitutionalMonitoring.getMetrics();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return constitutionalMonitoring.healthCheck();
  }
}

// Singleton instance
export const constitutionalService = new ConstitutionalService();
