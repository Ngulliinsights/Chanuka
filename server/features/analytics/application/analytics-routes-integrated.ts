/**
 * Analytics Routes - Fully Integrated
 * 
 * Reference implementation showing how to use the integrated service in routes.
 * Demonstrates proper error handling, validation middleware, and response formatting.
 */

import { Router } from 'express';
import { analyticsServiceIntegrated } from './analytics-service-integrated';
import { sendResult } from '@server/infrastructure/error-handling';
import { validateBody, validateQuery } from '@server/infrastructure/validation';
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';
import { authenticateToken, requireRole } from '@server/middleware/auth';
import { logger } from '@server/infrastructure/observability';

const router = Router();

// Validation schemas for routes
const QueryMetricsSchema = z.object({
  metric: z.string().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
});

const RecordMetricSchema = z.object({
  metric: z.string().min(1).max(100),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

const SearchMetricsSchema = z.object({
  query: CommonSchemas.searchQuery,
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
});

/**
 * GET /analytics/overview
 * Get analytics overview
 * 
 * Features:
 * - Authentication required
 * - Caching enabled (15 minutes)
 * - Result type error handling
 */
router.get(
  '/overview',
  authenticateToken,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await analyticsServiceIntegrated.getOverview();
      
      // Log request
      logger.info({
        userId: req.user?.id,
        duration: Date.now() - startTime
      }, 'Analytics overview requested');
      
      // Send result (handles both success and error cases)
      sendResult(res, result);
    } catch (error) {
      logger.error({ error }, 'Analytics overview request failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch analytics overview'
      });
    }
  }
);

/**
 * GET /analytics/metrics
 * Query metrics with filters
 * 
 * Features:
 * - Authentication required
 * - Query validation
 * - Caching enabled (15 minutes)
 * - Secure query building
 * - Result type error handling
 */
router.get(
  '/metrics',
  authenticateToken,
  validateQuery(QueryMetricsSchema),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await analyticsServiceIntegrated.queryMetrics(req.query);
      
      logger.info({
        userId: req.user?.id,
        metric: req.query.metric,
        duration: Date.now() - startTime
      }, 'Metrics queried');
      
      sendResult(res, result);
    } catch (error) {
      logger.error({ error, query: req.query }, 'Metrics query failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to query metrics'
      });
    }
  }
);

/**
 * POST /analytics/metrics
 * Record a new metric
 * 
 * Features:
 * - Authentication required
 * - Admin role required
 * - Body validation
 * - Input sanitization
 * - Cache invalidation
 * - Result type error handling
 */
router.post(
  '/metrics',
  authenticateToken,
  requireRole(['admin']),
  validateBody(RecordMetricSchema),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await analyticsServiceIntegrated.recordMetric(req.body);
      
      logger.info({
        userId: req.user?.id,
        metric: req.body.metric,
        duration: Date.now() - startTime
      }, 'Metric recorded');
      
      sendResult(res, result);
    } catch (error) {
      logger.error({ error, data: req.body }, 'Metric recording failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to record metric'
      });
    }
  }
);

/**
 * GET /analytics/metrics/:id
 * Get metric by ID
 * 
 * Features:
 * - Authentication required
 * - Input validation
 * - Caching enabled (15 minutes)
 * - Secure query building
 * - Result type error handling
 */
router.get(
  '/metrics/:id',
  authenticateToken,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await analyticsServiceIntegrated.getMetricById(req.params.id);
      
      logger.info({
        userId: req.user?.id,
        metricId: req.params.id,
        duration: Date.now() - startTime
      }, 'Metric retrieved');
      
      sendResult(res, result);
    } catch (error) {
      logger.error({ error, id: req.params.id }, 'Metric retrieval failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve metric'
      });
    }
  }
);

/**
 * DELETE /analytics/metrics/:id
 * Delete metric by ID
 * 
 * Features:
 * - Authentication required
 * - Admin role required
 * - Input validation
 * - Cache invalidation
 * - Result type error handling
 */
router.delete(
  '/metrics/:id',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const result = await analyticsServiceIntegrated.deleteMetric(req.params.id);
      
      logger.info({
        userId: req.user?.id,
        metricId: req.params.id,
        duration: Date.now() - startTime
      }, 'Metric deleted');
      
      sendResult(res, result);
    } catch (error) {
      logger.error({ error, id: req.params.id }, 'Metric deletion failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete metric'
      });
    }
  }
);

/**
 * GET /analytics/search
 * Search metrics
 * 
 * Features:
 * - Authentication required
 * - Query validation
 * - Input sanitization
 * - SQL injection prevention
 * - Caching enabled (5 minutes)
 * - Result type error handling
 */
router.get(
  '/search',
  authenticateToken,
  validateQuery(SearchMetricsSchema),
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { query, page, limit } = req.query;
      
      const result = await analyticsServiceIntegrated.searchMetrics(
        query as string,
        Number(page),
        Number(limit)
      );
      
      logger.info({
        userId: req.user?.id,
        query,
        duration: Date.now() - startTime
      }, 'Metrics searched');
      
      sendResult(res, result);
    } catch (error) {
      logger.error({ error, query: req.query }, 'Metrics search failed');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search metrics'
      });
    }
  }
);

/**
 * Error handling middleware for this router
 */
router.use((error: Error, req: any, res: any, next: any) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  }, 'Analytics route error');

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

export default router;
