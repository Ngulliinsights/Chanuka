/**
 * ML Analysis Service - Modernized
 * 
 * Provides machine learning analysis capabilities with modern infrastructure.
 * Uses Repository pattern, error handling, validation, and caching.
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { mlAnalysisRepository } from '../infrastructure/repositories/ml-analysis.repository';
import type { AnalysisResult } from '../types';
import {
  AnalyzeBillMLSchema,
  GetMLAnalysisHistorySchema,
  type AnalyzeBillMLInput,
  type GetMLAnalysisHistoryInput,
} from './ml-validation.schemas';

/**
 * Modernized ML Analysis Service
 * 
 * @example
 * ```typescript
 * const service = new MLAnalysisService();
 * 
 * // Analyze stakeholder influence
 * const result = await service.analyzeStakeholderInfluence({
 *   bill_id: 'bill-123',
 *   bill_content: 'Bill text...'
 * });
 * 
 * if (result.isOk) {
 *   console.log('Analysis:', result.value);
 * }
 * ```
 */
export class MLAnalysisService {
  private readonly inputSanitizer = new InputSanitizationService();

  /**
   * Analyze stakeholder influence using ML
   */
  async analyzeStakeholderInfluence(
    input: AnalyzeBillMLInput
  ): Promise<AsyncServiceResult<AnalysisResult>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(AnalyzeBillMLSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id, bill_content } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);

      logger.info({ bill_id: sanitizedBillId }, 'Analyzing stakeholder influence');

      // Check for cached result
      const cachedResult = await mlAnalysisRepository.findLatestByBillIdAndType(
        sanitizedBillId,
        'stakeholder_influence'
      );

      if (cachedResult.isOk && cachedResult.value !== null) {
        const cached = cachedResult.value;
        // Return cached if less than 24 hours old
        const ageHours = (Date.now() - cached.created_at.getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          logger.info({ bill_id: sanitizedBillId }, 'Returning cached ML analysis');
          return cached.result as AnalysisResult;
        }
      }

      // Perform ML analysis
      const analysisResult = await this.performStakeholderAnalysis(bill_content);

      // Store result
      await mlAnalysisRepository.storeAnalysisResult({
        bill_id: sanitizedBillId,
        analysis_type: 'stakeholder_influence',
        result: analysisResult,
        confidence: analysisResult.confidence || 0,
        metadata: { analysis_version: '1.0' },
      });

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'ml_analysis_performed',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'ml-service',
        resource: `ml-analysis:bill:${sanitizedBillId}`,
        action: 'create',
        success: true,
        details: { analysis_type: 'stakeholder_influence' },
      });

      return analysisResult;
    }, { service: 'MLAnalysisService', operation: 'analyzeStakeholderInfluence' });
  }

  /**
   * Detect implementation workarounds using ML
   */
  async detectImplementationWorkarounds(
    input: AnalyzeBillMLInput
  ): Promise<AsyncServiceResult<AnalysisResult>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(AnalyzeBillMLSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id, bill_content } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);

      logger.info({ bill_id: sanitizedBillId }, 'Detecting implementation workarounds');

      // Check for cached result
      const cachedResult = await mlAnalysisRepository.findLatestByBillIdAndType(
        sanitizedBillId,
        'implementation_workaround'
      );

      if (cachedResult.isOk && cachedResult.value !== null) {
        const cached = cachedResult.value;
        const ageHours = (Date.now() - cached.created_at.getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          logger.info({ bill_id: sanitizedBillId }, 'Returning cached workaround detection');
          return cached.result as AnalysisResult;
        }
      }

      // Perform ML analysis
      const analysisResult = await this.performWorkaroundDetection(bill_content);

      // Store result
      await mlAnalysisRepository.storeAnalysisResult({
        bill_id: sanitizedBillId,
        analysis_type: 'implementation_workaround',
        result: analysisResult,
        confidence: analysisResult.confidence || 0,
        metadata: { analysis_version: '1.0' },
      });

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'ml_analysis_performed',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'ml-service',
        resource: `ml-analysis:bill:${sanitizedBillId}`,
        action: 'create',
        success: true,
        details: { analysis_type: 'implementation_workaround' },
      });

      return analysisResult;
    }, { service: 'MLAnalysisService', operation: 'detectImplementationWorkarounds' });
  }

  /**
   * Get ML analysis history for a bill
   */
  async getAnalysisHistory(
    input: GetMLAnalysisHistoryInput
  ): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetMLAnalysisHistorySchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id, limit } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);

      logger.info({ bill_id: sanitizedBillId, limit }, 'Getting ML analysis history');

      // Use repository
      const historyResult = await mlAnalysisRepository.getAnalysisHistory(
        sanitizedBillId,
        limit || 10
      );

      if (historyResult.isErr) {
        throw historyResult.error;
      }

      return historyResult.value;
    }, { service: 'MLAnalysisService', operation: 'getAnalysisHistory' });
  }

  /**
   * Private: Perform stakeholder analysis
   */
  private async performStakeholderAnalysis(billContent: string): Promise<AnalysisResult> {
    try {
      // Validate bill content
      if (!this.validateBillContent(billContent)) {
        throw new Error('Invalid bill content provided');
      }

      // Mock ML analysis (replace with actual ML model)
      const result: AnalysisResult = {
        confidence: 0.85,
        result: {
          primaryInfluencers: [
            { name: 'Technology Industry', influence: 0.9, position: 'support' },
            { name: 'Privacy Advocates', influence: 0.7, position: 'oppose' },
          ],
          secondaryInfluencers: [
            { name: 'Consumer Groups', influence: 0.5, position: 'neutral' },
          ],
          predictedOutcome: 'likely_to_pass',
          keyFactors: ['industry_support', 'public_opinion', 'political_climate'],
        },
        analysis_type: 'stakeholder_influence',
        metadata: {
          model_version: '1.0',
          processing_time_ms: 150,
          timestamp: new Date().toISOString(),
        },
      };

      return result;
    } catch (error) {
      return this.handleAnalysisError(error, 'stakeholder_influence');
    }
  }

  /**
   * Private: Perform workaround detection
   */
  private async performWorkaroundDetection(billContent: string): Promise<AnalysisResult> {
    try {
      // Validate bill content
      if (!this.validateBillContent(billContent)) {
        throw new Error('Invalid bill content provided');
      }

      // Mock ML analysis (replace with actual ML model)
      const result: AnalysisResult = {
        confidence: 0.78,
        result: {
          workaroundsDetected: [
            {
              type: 'regulatory_loophole',
              severity: 'medium',
              description: 'Potential exemption clause that may circumvent intent',
              location: 'Section 3, Paragraph 2',
            },
          ],
          overallRisk: 'medium',
          recommendations: [
            'Review exemption clauses',
            'Clarify implementation requirements',
          ],
        },
        analysis_type: 'implementation_workaround',
        metadata: {
          model_version: '1.0',
          processing_time_ms: 200,
          timestamp: new Date().toISOString(),
        },
      };

      return result;
    } catch (error) {
      return this.handleAnalysisError(error, 'implementation_workaround');
    }
  }

  /**
   * Private: Validate bill content
   */
  private validateBillContent(billContent: string): boolean {
    return (
      typeof billContent === 'string' &&
      billContent.trim().length > 0 &&
      billContent.length < 1_000_000
    );
  }

  /**
   * Private: Handle analysis errors
   */
  private handleAnalysisError(error: unknown, analysisType: string): AnalysisResult {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      `Error in ${analysisType} analysis`
    );

    return {
      confidence: 0.0,
      result: {
        error: true,
        message: `Analysis temporarily unavailable for ${analysisType}`,
        fallbackAvailable: true,
      },
      analysis_type: analysisType,
      metadata: {
        errorOccurred: true,
        errorTime: new Date().toISOString(),
        analysis_type: analysisType,
      },
    };
  }
}

export const mlAnalysisService = new MLAnalysisService();
