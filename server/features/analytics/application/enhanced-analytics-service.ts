/**
 * Enhanced Analytics Service - Complete Infrastructure Integration
 * 
 * Integrates ALL infrastructure components with aggressive caching for expensive metrics.
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { withTransaction } from '@server/infrastructure/database';
import {
  GetMetricSchema,
  GetBillAnalyticsSchema,
  GetTrendingBillsSchema,
  TrackEventSchema,
  type GetMetricInput,
  type GetBillAnalyticsInput,
  type GetTrendingBillsInput,
  type TrackEventInput,
} from './analytics-validation.schemas';

interface MetricResult {
  metric: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class EnhancedAnalyticsService {
  private inputSanitizer = new InputSanitizationService();

  async getMetric(input: GetMetricInput): Promise<AsyncServiceResult<MetricResult>> {
    return safeAsync(async () => {
      const validation = await validateData(GetMetricSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      
      // Aggressive caching (15 minutes for expensive metrics)
      const cacheKey = cacheKeys.analytics(validatedInput.metric, {
        entity_type: validatedInput.entity_type,
        entity_id: validatedInput.entity_id,
        timeframe: validatedInput.timeframe,
      });
      const cached = await cacheService.get<MetricResult>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for analytics metric');
        return cached;
      }

      // Query with SecureQueryBuilder
      const result = await secureQueryBuilderService
        .select('metric_type', 'value', 'timestamp')
        .from('analytics_metrics')
        .where('metric_type', '=', validatedInput.metric)
        .limit(1);

      const metric: MetricResult = {
        metric: validatedInput.metric,
        value: result[0]?.value || 0,
        timestamp: new Date(),
      };

      await cacheService.set(cacheKey, metric, CACHE_TTL.ANALYTICS);
      
      await securityAuditService.logSecurityEvent({
        event_type: 'analytics_accessed',
        severity: 'low',
        resource: `analytics:${validatedInput.metric}`,
        action: 'read',
        success: true,
      });

      return metric;
    }, { service: 'EnhancedAnalyticsService', operation: 'getMetric' });
  }

  async getBillAnalytics(input: GetBillAnalyticsInput): Promise<AsyncServiceResult<Record<string, any>>> {
    return safeAsync(async () => {
      const validation = await validateData(GetBillAnalyticsSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(validatedInput.bill_id);

      const cacheKey = cacheKeys.analytics('bill-analytics', { bill_id: sanitizedBillId });
      const cached = await cacheService.get<Record<string, any>>(cacheKey);
      if (cached) return cached;

      const analytics = await secureQueryBuilderService
        .select()
        .from('bill_analytics')
        .where('bill_id', '=', sanitizedBillId);

      await cacheService.set(cacheKey, analytics, CACHE_TTL.ANALYTICS);
      return analytics;
    }, { service: 'EnhancedAnalyticsService', operation: 'getBillAnalytics' });
  }

  async getTrendingBills(input: GetTrendingBillsInput): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const validation = await validateData(GetTrendingBillsSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;

      const cacheKey = cacheKeys.analytics('trending-bills', {
        timeframe: validatedInput.timeframe,
        metric: validatedInput.metric,
      });
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      const trending = await secureQueryBuilderService
        .select()
        .from('bills')
        .orderBy('engagement_score', 'desc')
        .limit(validatedInput.limit ? parseInt(validatedInput.limit) : 10);

      await cacheService.set(cacheKey, trending, CACHE_TTL.ANALYTICS);
      return trending;
    }, { service: 'EnhancedAnalyticsService', operation: 'getTrendingBills' });
  }

  async trackEvent(input: TrackEventInput, userId?: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const validation = await validateData(TrackEventSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedInput = validation.data!;

      await withTransaction(async () => {
        await secureQueryBuilderService
          .insert('analytics_events')
          .values({
            event_type: validatedInput.event_type,
            entity_type: validatedInput.entity_type,
            entity_id: validatedInput.entity_id,
            user_id: userId,
            metadata: validatedInput.metadata ? JSON.stringify(validatedInput.metadata) : null,
            timestamp: validatedInput.timestamp || new Date().toISOString(),
          });
      });

      return true;
    }, { service: 'EnhancedAnalyticsService', operation: 'trackEvent' });
  }
}

export const enhancedAnalyticsService = new EnhancedAnalyticsService();
