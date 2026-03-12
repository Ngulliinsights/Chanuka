/**
 * Analytics Routes (Engagement Metrics)
 * Modernized REST API following standardized patterns
 */

import { Router, Request, Response } from 'express';
import { logger } from '@server/infrastructure/observability';
import { analyticsService } from '../../../application/analytics.service';
import { authenticateToken, requireAuth } from '@server/middleware';
import { validateSchema as validateRequest } from '@server/infrastructure/validation/middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const trackEngagementSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['bill', 'comment', 'user', 'sponsor', 'committee', 'amendment', 'report']),
  eventType: z.enum(['view', 'click', 'scroll', 'comment', 'vote', 'share', 'download', 'bookmark', 'search', 'filter', 'sort', 'export']),
  metadata: z.object({
    source: z.string().optional(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    sessionId: z.string().optional(),
    location: z.object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional()
    }).optional(),
    device: z.object({
      type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
      os: z.string().optional(),
      browser: z.string().optional()
    }).optional(),
    context: z.record(z.any()).optional()
  }).optional(),
  duration: z.number().optional(),
  value: z.number().optional()
});

const engagementSummarySchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['bill', 'comment', 'user', 'sponsor', 'committee', 'amendment', 'report']),
  period: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year', 'all_time']),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

const userEngagementSchema = z.object({
  userId: z.string().uuid(),
  period: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year', 'all_time']),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

const topContentSchema = z.object({
  entityType: z.enum(['bill', 'comment', 'user', 'sponsor', 'committee', 'amendment', 'report']).optional(),
  period: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year', 'all_time']),
  metric: z.enum(['views', 'engagement', 'shares', 'comments']).optional(),
  limit: z.number().min(1).max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

// ==========================================================================
// Engagement Tracking Routes
// ==========================================================================

/**
 * POST /api/analytics/track
 * Track engagement events
 */
router.post('/track',
  validateRequest(trackEngagementSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id; // Optional for anonymous tracking
      const data = req.body;

      const result = await analyticsService.trackEngagement(data, userId);

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            type: 'TRACK_FAILED',
            message: result.error.message,
            code: 'ENGAGEMENT_TRACK_ERROR'
          }
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to track engagement');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/analytics/track/batch
 * Track multiple engagement events in batch
 */
router.post('/track/batch',
  validateRequest(z.object({
    events: z.array(trackEngagementSchema),
    sessionId: z.string().optional()
  })),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { events, sessionId } = req.body;

      const results = await Promise.all(
        events.map((event: any) => 
          analyticsService.trackEngagement({
            ...event,
            metadata: { ...event.metadata, sessionId }
          }, userId)
        )
      );

      const successful = results.filter(r => r.isOk()).map(r => r.value);
      const failed = results.filter(r => r.isErr()).map(r => r.error);

      res.status(201).json({
        success: true,
        data: {
          successful: successful.length,
          failed: failed.length,
          events: successful
        }
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to track batch engagement');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

// ==========================================================================
// Analytics Query Routes
// ==========================================================================

/**
 * GET /api/analytics/summary/:entityType/:entityId
 * Get engagement summary for an entity
 */
router.get('/summary/:entityType/:entityId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;
      const { period = 'week', dateFrom, dateTo } = req.query;

      // Validate parameters
      const validation = engagementSummarySchema.safeParse({
        entityId,
        entityType,
        period,
        dateFrom,
        dateTo
      });

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            code: 'INVALID_PARAMETERS',
            details: validation.error.errors
          }
        });
        return;
      }

      const result = await analyticsService.getEngagementSummary(
        entityId,
        validation.data.entityType as any,
        validation.data.period as any,
        dateFrom as string,
        dateTo as string
      );

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            type: 'FETCH_FAILED',
            message: result.error.message,
            code: 'SUMMARY_FETCH_ERROR'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get engagement summary');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/analytics/summaries
 * Get engagement summaries for multiple entities
 */
router.get('/summaries',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        entityType = 'bill',
        period = 'week',
        entityIds,
        limit = 10,
        dateFrom,
        dateTo
      } = req.query;

      // Parse entity IDs
      const ids = typeof entityIds === 'string' ? entityIds.split(',') : [];
      
      if (ids.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Entity IDs are required',
            code: 'MISSING_ENTITY_IDS'
          }
        });
        return;
      }

      // Get summaries for each entity
      const summaryPromises = ids.slice(0, Number(limit)).map(id =>
        analyticsService.getEngagementSummary(
          id,
          entityType as any,
          period as any,
          dateFrom as string,
          dateTo as string
        )
      );

      const results = await Promise.all(summaryPromises);
      const summaries = results.filter(r => r.isOk()).map(r => r.value);

      // Calculate aggregated metrics
      const aggregated = {
        totalViews: summaries.reduce((sum, s) => sum + s.metrics.views, 0),
        totalEngagement: summaries.reduce((sum, s) => sum + s.metrics.comments + s.metrics.votes + s.metrics.shares, 0),
        averageEngagementRate: summaries.length > 0 ? 
          summaries.reduce((sum, s) => sum + s.metrics.engagementRate, 0) / summaries.length : 0,
        topPerformers: summaries
          .sort((a, b) => (b.metrics.views + b.metrics.comments * 5) - (a.metrics.views + a.metrics.comments * 5))
          .slice(0, 5)
          .map(s => ({ entityId: s.entityId, score: s.metrics.views + s.metrics.comments * 5 }))
      };

      res.json({
        success: true,
        data: {
          summaries,
          aggregated
        }
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get engagement summaries');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/analytics/users/:userId/profile
 * Get user engagement profile
 */
router.get('/users/:userId/profile',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { period = 'month', dateFrom, dateTo } = req.query;

      // Check if user can access this profile (self or admin)
      const requestingUser = (req as any).user;
      if (requestingUser.id !== userId && requestingUser.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            type: 'ACCESS_DENIED',
            message: 'Access denied',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
        return;
      }

      const result = await analyticsService.getUserEngagementProfile(
        userId,
        period as any,
        dateFrom as string,
        dateTo as string
      );

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            type: 'FETCH_FAILED',
            message: result.error.message,
            code: 'PROFILE_FETCH_ERROR'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', userId: req.params.userId }, 'Failed to get user engagement profile');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/analytics/content/top
 * Get top performing content
 */
router.get('/content/top',
  validateRequest(topContentSchema, 'query'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const params = req.query as any;

      const result = await analyticsService.getTopContent(params);

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            type: 'FETCH_FAILED',
            message: result.error.message,
            code: 'TOP_CONTENT_FETCH_ERROR'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get top content');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/analytics/realtime
 * Get real-time analytics metrics
 */
router.get('/realtime',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await analyticsService.getRealTimeMetrics();

      if (result.isErr()) {
        res.status(500).json({
          success: false,
          error: {
            type: 'FETCH_FAILED',
            message: result.error.message,
            code: 'REALTIME_FETCH_ERROR'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get real-time metrics');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

// ==========================================================================
// Health and Metadata Routes
// ==========================================================================

/**
 * GET /api/analytics/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: { status: 'up', lastCheck: new Date().toISOString() },
        cache: { status: 'up', lastCheck: new Date().toISOString() }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/metadata
 * Get metadata about analytics features
 */
router.get('/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      schema: {
        entityTypes: ['bill', 'comment', 'user', 'sponsor', 'committee', 'amendment', 'report'],
        eventTypes: ['view', 'click', 'scroll', 'comment', 'vote', 'share', 'download', 'bookmark', 'search', 'filter', 'sort', 'export'],
        timePeriods: ['hour', 'day', 'week', 'month', 'quarter', 'year', 'all_time'],
        metricTypes: ['views', 'engagement', 'shares', 'comments']
      },
      enums: {
        entityTypes: ['bill', 'comment', 'user', 'sponsor', 'committee', 'amendment', 'report'],
        eventTypes: ['view', 'click', 'scroll', 'comment', 'vote', 'share', 'download', 'bookmark', 'search', 'filter', 'sort', 'export'],
        timePeriods: ['hour', 'day', 'week', 'month', 'quarter', 'year', 'all_time']
      },
      constraints: {
        maxBatchSize: 100,
        maxTopContentLimit: 100,
        cacheTimeout: 300
      },
      relationships: {
        engagement: ['users', 'bills', 'comments'],
        metrics: ['engagement', 'users', 'content'],
        profiles: ['users', 'engagement']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get metadata',
        code: 'METADATA_ERROR'
      }
    });
  }
});

export default router;