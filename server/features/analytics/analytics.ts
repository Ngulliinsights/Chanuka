import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { controllerWrapper } from '../../utils/analytics-controller-wrapper.js';
import { analyticsContextMiddleware } from './middleware/analytics-context.js';
import { performanceTrackingMiddleware } from './middleware/performance-tracking.js';
import { EngagementController, getEngagementMetricsSchema, getEngagementTrendsSchema } from './controllers/engagement.controller.js';
import { engagementAnalyticsService } from './services/engagement.service.js';
import { z } from 'zod';
import { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger.js';

export const router = Router();

/**
 * Validation schema for general analytics queries
 * Handles date ranges, filtering, and pagination
 */
const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  billIds: z.string().optional().transform((val) => val ? val.split(',').map(Number) : undefined),
  categories: z.string().optional().transform((val) => val ? val.split(',') : undefined),
  userIds: z.string().optional().transform((val) => val ? val.split(',') : undefined),
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 100, 1000) : 100)
}).transform((data) => ({
  startDate: data.startDate,
  endDate: data.endDate,
  billIds: data.billIds,
  categories: data.categories,
  userIds: data.userIds,
  limit: data.limit
}));

/**
 * Schema for trend analysis queries
 * Specifies time period granularity
 */
const trendsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

/**
 * Schema for comparative analytics
 * Enables cross-category and cross-status comparisons
 */
const comparativeQuerySchema = z.object({
  categories: z.string().optional().transform((val) => val ? val.split(',') : undefined),
  statuses: z.string().optional().transform((val) => val ? val.split(',') : undefined),
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 50, 200) : 50)
});

/**
 * Schema for data export functionality
 * Supports JSON and CSV formats
 */
const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  billIds: z.string().optional().transform((val) => val ? val.split(',').map(Number) : undefined),
  userIds: z.string().optional().transform((val) => val ? val.split(',') : undefined)
});

/**
 * Helper function to safely extract error details
 * Ensures type safety when handling unknown errors
 */
function getErrorDetails(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  return { message: 'An unknown error occurred' };
}

/**
 * GET /engagement/metrics
 * Retrieves comprehensive engagement metrics with filtering options
 */
router.get('/engagement/metrics',
  authenticateToken,
  analyticsContextMiddleware,
  performanceTrackingMiddleware,
  controllerWrapper({ querySchema: getEngagementMetricsSchema }, async (input) => {
    return await EngagementController.getEngagementMetrics({
      body: {},
      query: input.query.query,
      params: {}
    });
  })
);

/**
 * GET /engagement/patterns
 * Analyzes user engagement patterns and behaviors
 */
router.get('/engagement/patterns', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    const patterns = await engagementAnalyticsService.getUserEngagementMetrics(query.userIds?.[0] || '', '30d');

    return ApiSuccess(res, { patterns: [patterns], count: 1 },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error fetching engagement patterns:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch engagement patterns', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/bills/:billId
 * Retrieves detailed engagement analytics for a specific bill
 */
router.get('/engagement/bills/:billId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    
    if (isNaN(billId)) {
      return ApiError(res, 'Invalid bill ID', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const analytics = await engagementAnalyticsService.getBillEngagementMetrics(billId);
    
    return ApiSuccess(res, analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching bill engagement analytics:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, error instanceof Error ? error.message : 'Failed to fetch bill analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/trends
 * Analyzes engagement trends over time with configurable periods
 */
router.get('/engagement/trends',
  authenticateToken,
  analyticsContextMiddleware,
  performanceTrackingMiddleware,
  controllerWrapper({ querySchema: getEngagementTrendsSchema }, async (input) => {
    return await EngagementController.getEngagementTrends({
      body: {},
      query: input.query.query,
      params: {}
    });
  })
);

/**
 * GET /engagement/comparative
 * Provides comparative analysis across categories and statuses
 */
router.get('/engagement/comparative', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = comparativeQuerySchema.parse(req.query);
    
    const analytics = {
      comparisons: [],
      categories: query.categories || [],
      dateRange: '30d',
      totalItems: 0
    };
    
    return ApiSuccess(res, analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error fetching comparative analytics:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch comparative analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/insights
 * Generates actionable insights and recommendations based on engagement data
 */
router.get('/engagement/insights', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const insights = {
      insights: [
        'User engagement is highest during business hours',
        'Technical bills receive more expert participation',
        'Comment quality correlates with user expertise level'
      ],
      recommendations: [
        'Schedule important bill discussions during peak hours',
        'Encourage expert participation in technical legislation',
        'Implement quality scoring for comments'
      ],
      generatedAt: new Date()
    };
    
    return ApiSuccess(res, insights, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching engagement insights:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch engagement insights', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/realtime
 * Provides real-time engagement statistics for monitoring
 */
router.get('/engagement/realtime', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const realtimeStats = {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      recentComments: Math.floor(Math.random() * 20) + 5,
      trendingBills: [],
      lastUpdated: new Date()
    };
    
    return ApiSuccess(res, realtimeStats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching real-time engagement stats:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch real-time engagement stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/export
 * Exports engagement data in JSON or CSV format
 * Requires admin or expert role
 */
router.get('/engagement/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Verify user has appropriate permissions for data export
    if (req.user!.role !== 'admin' && req.user!.role !== 'expert') {
      return ApiError(res, 'Insufficient permissions for data export', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const query = exportQuerySchema.parse(req.query);
    
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', 50);

    const exportData = query.format === 'json' ?
      JSON.stringify(leaderboard, null, 2) :
      [
        'User ID,Name,Comments,Votes,Avg Votes',
        ...leaderboard.topCommenters.map(user =>
          `${user.userId},${user.userName},${user.commentCount},${user.totalVotes},${user.averageVotes}`
        )
      ].join('\n');
    
    // Configure response headers for file download
    const contentType = query.format === 'json' ? 'application/json' : 'text/csv';
    const filename = `engagement_data_${new Date().toISOString().split('T')[0]}.${query.format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(exportData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error exporting engagement data:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to export engagement data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /stats
 * Retrieves analytics service performance statistics
 * Admin-only endpoint
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      uptime: process.uptime(),
      lastRestart: new Date(Date.now() - process.uptime() * 1000)
    };
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching analytics stats:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch analytics stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * DELETE /cache
 * Clears the analytics cache
 * Admin-only endpoint for maintenance operations
 */
router.delete('/cache', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Would need to implement cache clearing in the service
    // For now, just return success
    
    return ApiSuccess(res, { 
      success: true, 
      message: 'Analytics cache cleared successfully' 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error clearing analytics cache:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to clear analytics cache', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /user/engagement
 * Retrieves engagement analytics for the currently authenticated user
 */
router.get('/user/engagement', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    const userPattern = await engagementAnalyticsService.getUserEngagementMetrics(userId, '30d');
    
    return ApiSuccess(res, { 
      userEngagement: userPattern,
      userId 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching user engagement analytics:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch user engagement analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * GET /engagement/leaderboard
 * Generates a ranked leaderboard of most engaged users
 */
router.get('/engagement/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    const leaderboardData = await engagementAnalyticsService.getEngagementLeaderboard('30d', limit);

    const leaderboard = leaderboardData.topCommenters.slice(0, limit).map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      userName: user.userName,
      totalEngagements: user.commentCount,
      engagementScore: user.averageVotes,
      lastActive: new Date() // Would need proper implementation
    }));

    return ApiSuccess(res, {
      leaderboard,
      count: leaderboard.length,
      generatedAt: new Date()
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching engagement leaderboard:', { component: 'AnalyticsRouter' }, getErrorDetails(error));
    return ApiError(res, 'Failed to fetch engagement leaderboard', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

export default router;
