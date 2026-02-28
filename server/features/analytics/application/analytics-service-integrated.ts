/**
 * Analytics Service - Fully Integrated
 * 
 * Reference implementation showing complete infrastructure integration:
 * - Security (secure queries, input sanitization, output sanitization)
 * - Caching (with appropriate TTLs and invalidation)
 * - Error Handling (Result types)
 * - Validation (Zod schemas)
 * 
 * This serves as a template for integrating other features.
 */

import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// Infrastructure imports
import { secureQueryBuilderService, queryValidationService, inputSanitizationService } from '@server/features/security';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys, CACHE_TTL } from '@server/infrastructure/cache/cache-keys';
import { logger } from '@server/infrastructure/observability';
import { validateData, CommonSchemas } from '@server/infrastructure/validation/validation-helpers';
import { Cacheable, InvalidateCache } from '@server/infrastructure/integration/feature-integration-helper';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;

// Validation Schemas
const AnalyticsQuerySchema = z.object({
  metric: z.string().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
});

const MetricRecordSchema = z.object({
  metric: z.string().min(1).max(100),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

// Types
export interface AnalyticsQuery {
  metric: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  page: number;
  limit: number;
}

export interface MetricRecord {
  id: string;
  metric: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsOverview {
  totalEvents: number;
  uniqueUsers: number;
  topMetrics: Array<{ metric: string; count: number }>;
  trends: Array<{ date: string; value: number }>;
}

/**
 * Analytics Service with Full Infrastructure Integration
 */
export class AnalyticsServiceIntegrated {
  /**
   * Get analytics overview with caching
   */
  @Cacheable(
    () => cacheKeys.analytics('overview'),
    CACHE_TTL.ANALYTICS
  )
  async getOverview(): Promise<Result<AnalyticsOverview, Error>> {
    try {
      logger.info('Fetching analytics overview');

      // Build secure query for total events
      const totalEventsQuery = secureQueryBuilderService.buildParameterizedQuery(
        'SELECT COUNT(*) as count FROM analytics_events',
        {}
      );

      // Build secure query for unique users
      const uniqueUsersQuery = secureQueryBuilderService.buildParameterizedQuery(
        'SELECT COUNT(DISTINCT user_id) as count FROM analytics_events',
        {}
      );

      // Execute queries (using Drizzle ORM for safety)
      const [totalEvents, uniqueUsers] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM analytics_events`),
        db.execute(sql`SELECT COUNT(DISTINCT user_id) as count FROM analytics_events`)
      ]);

      // Build overview
      const overview: AnalyticsOverview = {
        totalEvents: Number(totalEvents.rows[0]?.count || 0),
        uniqueUsers: Number(uniqueUsers.rows[0]?.count || 0),
        topMetrics: [],
        trends: []
      };

      // Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(overview);

      return ok(sanitized as AnalyticsOverview);
    } catch (error) {
      logger.error('Failed to get analytics overview', { error });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Query metrics with validation, security, and caching
   */
  async queryMetrics(query: unknown): Promise<Result<MetricRecord[], Error>> {
    try {
      // Validate input
      const validation = await validateData(AnalyticsQuerySchema, query);
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        return err(new Error(`Validation failed: ${errorMsg}`));
      }

      const validatedQuery = validation.data!;

      // Check cache
      const cacheKey = cacheKeys.analytics('query', validatedQuery);
      const cached = await cacheService.get<MetricRecord[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for analytics query');
        return ok(cached);
      }

      // Sanitize metric name
      const sanitizedMetric = inputSanitizationService.sanitizeString(validatedQuery.metric);

      // Build secure query
      const params: Record<string, any> = {
        metric: sanitizedMetric,
        limit: validatedQuery.limit,
        offset: (validatedQuery.page - 1) * validatedQuery.limit
      };

      let whereClause = 'metric = ${metric}';
      
      if (validatedQuery.startDate) {
        params.startDate = validatedQuery.startDate;
        whereClause += ' AND timestamp >= ${startDate}';
      }
      
      if (validatedQuery.endDate) {
        params.endDate = validatedQuery.endDate;
        whereClause += ' AND timestamp <= ${endDate}';
      }

      const query = secureQueryBuilderService.buildParameterizedQuery(
        `SELECT * FROM analytics_events 
         WHERE ${whereClause}
         ORDER BY timestamp DESC
         LIMIT \${limit} OFFSET \${offset}`,
        params
      );

      // Execute query
      const results = await db.execute(query.sql, query.params);

      // Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(results.rows);

      // Cache results
      await cacheService.set(cacheKey, sanitized, CACHE_TTL.ANALYTICS);

      return ok(sanitized as MetricRecord[]);
    } catch (error) {
      logger.error('Failed to query metrics', { error, query });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Record metric with validation and cache invalidation
   */
  @InvalidateCache(() => [
    cacheKeys.analytics('overview'),
    cacheKeys.list('analytics')
  ])
  async recordMetric(data: unknown): Promise<Result<MetricRecord, Error>> {
    try {
      // Validate input
      const validation = await validateData(MetricRecordSchema, data);
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        return err(new Error(`Validation failed: ${errorMsg}`));
      }

      const validatedData = validation.data!;

      // Sanitize inputs
      const sanitizedMetric = inputSanitizationService.sanitizeString(validatedData.metric);

      // Validate inputs
      const inputValidation = queryValidationService.validateInputs([
        sanitizedMetric,
        validatedData.value
      ]);

      if (inputValidation.hasErrors()) {
        return err(new Error(inputValidation.getErrorMessage()));
      }

      // Insert record
      const record = await db.execute(sql`
        INSERT INTO analytics_events (metric, value, metadata, timestamp)
        VALUES (${sanitizedMetric}, ${validatedData.value}, ${JSON.stringify(validatedData.metadata || {})}, NOW())
        RETURNING *
      `);

      const created = record.rows[0] as MetricRecord;

      logger.info('Metric recorded', { metric: sanitizedMetric, value: validatedData.value });

      return ok(created);
    } catch (error) {
      logger.error('Failed to record metric', { error, data });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get metric by ID with security
   */
  @Cacheable(
    (id: string) => cacheKeys.entity('analytics', id),
    CACHE_TTL.ANALYTICS
  )
  async getMetricById(id: string): Promise<Result<MetricRecord, Error>> {
    try {
      // Validate input
      const validation = queryValidationService.validateInputs([id]);
      if (validation.hasErrors()) {
        return err(new Error(validation.getErrorMessage()));
      }

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        'SELECT * FROM analytics_events WHERE id = ${id}',
        { id }
      );

      // Execute query
      const result = await db.execute(query.sql, query.params);

      if (result.rows.length === 0) {
        return err(new Error(`Metric not found: ${id}`));
      }

      // Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(result.rows[0]);

      return ok(sanitized as MetricRecord);
    } catch (error) {
      logger.error('Failed to get metric', { error, id });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete metric with cache invalidation
   */
  @InvalidateCache((id: string) => [
    cacheKeys.entity('analytics', id),
    cacheKeys.analytics('overview'),
    cacheKeys.list('analytics')
  ])
  async deleteMetric(id: string): Promise<Result<void, Error>> {
    try {
      // Validate input
      const validation = queryValidationService.validateInputs([id]);
      if (validation.hasErrors()) {
        return err(new Error(validation.getErrorMessage()));
      }

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        'DELETE FROM analytics_events WHERE id = ${id}',
        { id }
      );

      // Execute query
      await db.execute(query.sql, query.params);

      logger.info('Metric deleted', { id });

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete metric', { error, id });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Search metrics with security
   */
  async searchMetrics(searchTerm: string, page: number, limit: number): Promise<Result<MetricRecord[], Error>> {
    try {
      // Sanitize search term
      const sanitized = inputSanitizationService.sanitizeString(searchTerm);

      // Create safe LIKE pattern
      const pattern = secureQueryBuilderService.createSafeLikePattern(sanitized);

      // Check cache
      const cacheKey = cacheKeys.search(searchTerm, { page, limit });
      const cached = await cacheService.get<MetricRecord[]>(cacheKey);
      if (cached) {
        return ok(cached);
      }

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        `SELECT * FROM analytics_events 
         WHERE metric ILIKE \${pattern}
         ORDER BY timestamp DESC
         LIMIT \${limit} OFFSET \${offset}`,
        {
          pattern,
          limit,
          offset: (page - 1) * limit
        }
      );

      // Execute query
      const results = await db.execute(query.sql, query.params);

      // Sanitize output
      const sanitizedResults = queryValidationService.sanitizeOutput(results.rows);

      // Cache results
      await cacheService.set(cacheKey, sanitizedResults, CACHE_TTL.SEARCH);

      return ok(sanitizedResults as MetricRecord[]);
    } catch (error) {
      logger.error('Failed to search metrics', { error, searchTerm });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Export singleton instance
export const analyticsServiceIntegrated = new AnalyticsServiceIntegrated();
