/**
 * Engagement Analytics Service - Modernized
 * 
 * Provides comprehensive analytics on user and content engagement patterns.
 * Uses modern infrastructure: Repository pattern, error handling, validation, caching.
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { bills } from '@server/infrastructure/schema';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { engagementRepository } from '../infrastructure/repositories/engagement.repository';
import type {
  UserEngagementMetrics,
  BillEngagementMetrics,
} from '../infrastructure/repositories/engagement.repository';
import {
  GetUserEngagementMetricsSchema,
  GetBillEngagementMetricsSchema,
  TrackEngagementSchema,
  GetTrendingBillsSchema,
  GetEngagementLeaderboardSchema,
  type GetUserEngagementMetricsInput,
  type GetBillEngagementMetricsInput,
  type TrackEngagementInput,
  type GetTrendingBillsInput,
  type GetEngagementLeaderboardInput,
} from './engagement-validation.schemas';

/**
 * Modernized Engagement Analytics Service
 * 
 * @example
 * ```typescript
 * const service = new EngagementAnalyticsService();
 * 
 * // Get user metrics
 * const result = await service.getUserEngagementMetrics({
 *   user_id: 'user-123',
 *   timeframe: '30d'
 * });
 * 
 * if (result.isOk) {
 *   console.log('Metrics:', result.value);
 * }
 * ```
 */
export class EngagementAnalyticsService {
  private readonly inputSanitizer = new InputSanitizationService();

  /**
   * Get comprehensive user engagement metrics
   */
  async getUserEngagementMetrics(
    input: GetUserEngagementMetricsInput
  ): Promise<AsyncServiceResult<UserEngagementMetrics>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetUserEngagementMetricsSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { user_id, timeframe } = validation.data!;
      const sanitizedUserId = this.inputSanitizer.sanitizeString(user_id);

      logger.info({ user_id: sanitizedUserId, timeframe }, 'Getting user engagement metrics');

      // Use repository
      const metricsResult = await engagementRepository.getUserEngagementMetrics(
        sanitizedUserId,
        timeframe || '30d'
      );

      if (metricsResult.isErr) {
        throw metricsResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'engagement_metrics_accessed',
        severity: 'low',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'engagement-service',
        resource: `engagement:user:${sanitizedUserId}`,
        action: 'read',
        success: true,
        details: { timeframe },
      });

      return metricsResult.value;
    }, { service: 'EngagementAnalyticsService', operation: 'getUserEngagementMetrics' });
  }

  /**
   * Get bill engagement metrics
   */
  async getBillEngagementMetrics(
    input: GetBillEngagementMetricsInput
  ): Promise<AsyncServiceResult<BillEngagementMetrics>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetBillEngagementMetricsSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);

      logger.info({ bill_id: sanitizedBillId }, 'Getting bill engagement metrics');

      // Use repository
      const metricsResult = await engagementRepository.getBillEngagementMetrics(sanitizedBillId);

      if (metricsResult.isErr) {
        throw metricsResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'bill_engagement_accessed',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'engagement-service',
        resource: `engagement:bill:${sanitizedBillId}`,
        action: 'read',
        success: true,
      });

      return metricsResult.value;
    }, { service: 'EngagementAnalyticsService', operation: 'getBillEngagementMetrics' });
  }

  /**
   * Track engagement event
   */
  async trackEngagement(
    input: TrackEngagementInput,
    userId?: string
  ): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(TrackEngagementSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id, user_id, engagement_type, metadata } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(user_id);

      logger.info(
        { bill_id: sanitizedBillId, user_id: sanitizedUserId, type: engagement_type },
        'Tracking engagement'
      );

      // Calculate engagement score based on type
      const engagementScores = {
        view: 1,
        comment: 5,
        share: 10,
        vote: 3,
        bookmark: 2,
      };

      const engagementScore = engagementScores[engagement_type] || 1;

      // Track engagement
      const trackResult = await engagementRepository.trackEngagement({
        bill_id: sanitizedBillId,
        user_id: sanitizedUserId,
        view_count: engagement_type === 'view' ? 1 : 0,
        share_count: engagement_type === 'share' ? 1 : 0,
        engagement_score: engagementScore,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      if (trackResult.isErr) {
        throw trackResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'engagement_tracked',
        severity: 'low',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'engagement-service',
        resource: `engagement:bill:${sanitizedBillId}`,
        action: 'create',
        success: true,
        details: { engagement_type, engagement_score },
      });

      return true;
    }, { service: 'EngagementAnalyticsService', operation: 'trackEngagement' });
  }

  /**
   * Get trending bills
   */
  async getTrendingBills(
    input: GetTrendingBillsInput
  ): Promise<AsyncServiceResult<Array<{ billId: string; trendingScore: number }>>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetTrendingBillsSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { limit, timeframe } = validation.data!;

      logger.info({ limit, timeframe }, 'Getting trending bills');

      // Use repository
      const trendingResult = await engagementRepository.getTrendingBills(
        limit || 10,
        timeframe || '7d'
      );

      if (trendingResult.isErr) {
        throw trendingResult.error;
      }

      return trendingResult.value;
    }, { service: 'EngagementAnalyticsService', operation: 'getTrendingBills' });
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(
    input: GetEngagementLeaderboardInput
  ): Promise<AsyncServiceResult<Array<{ userId: string; engagementScore: number }>>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetEngagementLeaderboardSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { limit, timeframe } = validation.data!;

      logger.info({ limit, timeframe }, 'Getting engagement leaderboard');

      // Use repository
      const leaderboardResult = await engagementRepository.getEngagementLeaderboard(
        limit || 10,
        timeframe || '30d'
      );

      if (leaderboardResult.isErr) {
        throw leaderboardResult.error;
      }

      return leaderboardResult.value;
    }, { service: 'EngagementAnalyticsService', operation: 'getEngagementLeaderboard' });
  }
}

export const engagementAnalyticsService = new EngagementAnalyticsService();
