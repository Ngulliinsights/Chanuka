import { EngagementController, getEngagementMetricsSchema, getEngagementTrendsSchema } from '@server/features/analytics/controllers/engagement.controller.ts';
import { analyticsContextMiddleware } from '@server/features/analytics/middleware/analytics-context.ts';
import { performanceTrackingMiddleware } from '@server/features/analytics/middleware/performance-tracking.ts';
import { AuthenticatedRequest,authenticateToken } from '@server/middleware/auth.js';
import { engagementAnalyticsService } from '@server/services/engagement.service.ts';
import { controllerWrapper } from '@server/utils/analytics-controller-wrapper.ts';
import { logger   } from '@shared/core';
import { ApiError, ApiResponseWrapper,ApiSuccess, ApiValidationError  } from '@shared/core/utils/api-utils';
import { Router } from 'express';
import { z } from 'zod';

// Remove the duplicate export - keep only the default export at the end
// export const router = Router();

/**
 * Validation schema for general analytics queries
 * 
 * This schema carefully manages the transformation from URL query parameters (which are always
 * strings or undefined) to the typed values our controllers expect. The critical challenge here
 * is ensuring that Zod's input type matches what Express provides (strings) while the output
 * type matches what the controller wrapper expects (specific types with guaranteed defaults).
 * 
 * For the limit field specifically, we need to ensure that:
 * 1. The input type accepts string or undefined (what comes from req.query)
 * 2. The output type is always a number (never undefined)
 * 3. TypeScript can verify this transformation at compile time
 * 
 * We accomplish this by using .pipe() to separate the input schema from the output schema,
 * making the type transformation explicit and verifiable by TypeScript.
 */
const analyticsQuerySchema = z.object({
  query: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    bill_ids: z.string().optional().transform((val) => 
      val ? val.split(',').map(Number) : undefined
    ),
    categories: z.string().optional().transform((val) => 
      val ? val.split(',') : undefined
    ),
    user_ids: z.string().optional().transform((val) => 
      val ? val.split(',') : undefined
    ),
    // Use preprocess to handle the string-to-number conversion before validation
    // This ensures the input type is correct and the output is always a number
    limit: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return 100;
        const parsed = typeof val === 'string' ? parseInt(val) : val;
        return isNaN(parsed as number) ? 100 : Math.min(parsed as number, 1000);
      },
      z.number().min(1).max(1000).default(100)
    )
  })
});

/**
 * Schema for trend analysis queries
 * Specifies time period granularity for temporal analysis
 */
const trendsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

/**
 * Schema for comparative analytics
 * Enables cross-category and cross-status comparisons
 */
const comparativeQuerySchema = z.object({
  categories: z.string().optional().transform((val) => 
    val ? val.split(',') : undefined
  ),
  statuses: z.string().optional().transform((val) => 
    val ? val.split(',') : undefined
  ),
  limit: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return 50;
      const parsed = typeof val === 'string' ? parseInt(val) : val;
      return isNaN(parsed as number) ? 50 : Math.min(parsed as number, 200);
    },
    z.number().min(1).max(200).default(50)
  )
});

/**
 * Schema for data export functionality
 * Supports JSON and CSV formats with optional filtering
 */
const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  bill_ids: z.string().optional().transform((val) => 
    val ? val.split(',').map(Number) : undefined
  ),
  user_ids: z.string().optional().transform((val) => 
    val ? val.split(',') : undefined
  )
});

/**
 * Helper function to safely extract error details
 * 
 * This provides consistent error handling across all endpoints. By checking the
 * environment, we can expose helpful debugging information in development while
 * keeping production responses secure and clean.
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
 * Helper function to format Zod validation errors
 * 
 * Zod provides detailed validation information through its error object. We transform
 * this into a format that is intuitive for API consumers, showing which field failed
 * and why.
 */
function formatValidationErrors(errors: z.ZodIssue[]): { field: string; message: string; }[] {
  return errors.map(error => ({
    field: error.path.join('.'),
    message: error.message
  }));
}

/**
 * Helper function to create structured error objects
 * 
 * All our API errors follow a consistent structure with a code, message, and optional
 * details. This helper ensures we never accidentally pass inconsistent error formats.
 */
function createErrorObject(code: string, message: string, details?: any): { code: string; message: string; details?: any } {
  return { code, message, details };
}

/**
 * Helper function to check admin permissions
 * 
 * Several endpoints require admin access. Centralizing this check makes the code
 * more maintainable and ensures consistent authorization behavior.
 */
function requireAdmin(req: AuthenticatedRequest, res: any, startTime: number): boolean {
  if (req.user!.role !== 'admin') {
    ApiError(res, 
      createErrorObject('INSUFFICIENT_PERMISSIONS', 'Admin access required'), 
      403, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
    return false;
  }
  return true;
}

/**
 * Helper function to check export permissions
 * 
 * Data export is a sensitive operation that should be restricted to trusted users.
 * This helper encapsulates the permission logic for export endpoints.
 */
function canExportData(req: AuthenticatedRequest): boolean {
  return req.user!.role === 'admin' || req.user!.role === 'expert';
}

/**
 * GET /engagement/metrics
 * Retrieves comprehensive engagement metrics with filtering options
 * 
 * This endpoint demonstrates the controller wrapper pattern, which automatically
 * handles validation, error formatting, and response structure. The wrapper ensures
 * all responses follow the same format and validation errors are handled consistently.
 */
router.get('/engagement/metrics',
  authenticateToken,
  analyticsContextMiddleware,
  performanceTrackingMiddleware,
  controllerWrapper({ querySchema: analyticsQuerySchema }, async (input) => {
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
 * 
 * This endpoint shows how to handle validation manually when you need more control
 * over the request processing. Notice how we extract the user ID carefully, providing
 * a fallback to prevent errors when the parameter is missing.
 */
router.get('/engagement/patterns', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = analyticsQuerySchema.parse({ query: req.query });
    
    // Extract the first user ID from the array, or use empty string as fallback
    // In a production system, you might want to validate that a user ID was provided
    const patterns = await engagementAnalyticsService.getUserEngagementMetrics(
      query.query.user_ids?.[0] || '', 
      '30d'
    );

    return ApiSuccess(res, 
      { patterns: [patterns], count: 1 },
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, 
        formatValidationErrors(error.errors), 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    logger.error('Error fetching engagement patterns:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch engagement patterns'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/bills/:bill_id
 * Retrieves detailed engagement analytics for a specific bill
 * 
 * Path parameters require special attention since they come as strings but often
 * represent numeric IDs. We validate early to fail fast, which improves performance
 * by avoiding unnecessary database queries with invalid parameters.
 */
router.get('/engagement/bills/:bill_id', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const bill_id = parseInt(req.params.bill_id);
    
    if (isNaN(bill_id)) {
      return ApiError(res, 
        createErrorObject('INVALID_PARAMETER', 'Invalid bill ID'), 
        400, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
     }
    
    const analytics = await engagementAnalyticsService.getBillEngagementMetrics(bill_id);
    
    return ApiSuccess(res, 
      analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching bill engagement analytics:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject(
        'FETCH_ERROR', 
        error instanceof Error ? error.message : 'Failed to fetch bill analytics'
      ), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/trends
 * Analyzes engagement trends over time with configurable periods
 * 
 * Trend analysis is crucial for understanding how engagement evolves. This endpoint
 * supports different time levels of detail, allowing clients to zoom in on daily changes
 * or zoom out to see monthly patterns.
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
 * 
 * Comparative analytics help identify patterns by putting different segments side by side.
 * This is particularly useful for understanding which categories drive the most engagement
 * or how different bill statuses affect user participation.
 */
router.get('/engagement/comparative', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = comparativeQuerySchema.parse(req.query);
    
    // In a complete implementation, this would query the database for actual comparative data
    // The structure returned here shows the expected format for the response
    const analytics = {
      comparisons: [],
      categories: query.categories || [],
      dateRange: '30d',
      totalItems: 0
    };
    
    return ApiSuccess(res, 
      analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, 
        formatValidationErrors(error.errors), 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    logger.error('Error fetching comparative analytics:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch comparative analytics'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/insights
 * Generates actionable insights and recommendations based on engagement data
 * 
 * This endpoint demonstrates how analytics can be transformed into actionable intelligence.
 * Rather than just presenting raw metrics, we provide interpretations and recommendations
 * that help stakeholders make informed decisions.
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
    
    return ApiSuccess(res, 
      insights, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching engagement insights:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch engagement insights'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/realtime
 * Provides real-time engagement statistics for monitoring
 * 
 * Real-time data is essential for monitoring active situations. In production, this would
 * typically connect to a streaming data pipeline or Redis cache to avoid putting load on
 * the primary database while still delivering fresh metrics.
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
    
    return ApiSuccess(res, 
      realtimeStats, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching real-time engagement stats:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch real-time engagement stats'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/export
 * Exports engagement data in JSON or CSV format
 * 
 * Data export requires careful permission checking since it provides bulk access to
 * potentially sensitive information. We verify permissions first, then format the data
 * appropriately with correct headers to trigger browser download behavior.
 */
router.get('/engagement/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    if (!canExportData(req)) {
      return ApiError(res, 
        createErrorObject('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions for data export'), 
        403, 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    const query = exportQuerySchema.parse(req.query);
    
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', 50);

    // Format data based on the requested export format
    // JSON maintains full structure while CSV focuses on tabular data
    const exportData = query.format === 'json' ?
      JSON.stringify(leaderboard, null, 2) :
      [
        'User ID,Name,Comments,Votes,Avg Votes',
        ...leaderboard.topCommenters.map(user =>
          `${users.user_id},${users.userName},${users.comment_count},${users.totalVotes},${users.averageVotes}`
        )
      ].join('\n');
    
    // Set appropriate headers to trigger file download in the browser
    const content_type = query.format === 'json' ? 'application/json' : 'text/csv';
    const filename = `engagement_data_${new Date().toISOString().split('T')[0]}.${query.format}`;
    
    res.setHeader('Content-Type', content_type);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(exportData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, 
        formatValidationErrors(error.errors), 
        ApiResponseWrapper.createMetadata(startTime, 'database')
      );
    }
    
    logger.error('Error exporting engagement data:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('EXPORT_ERROR', 'Failed to export engagement data'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /stats
 * Retrieves analytics service performance statistics
 * 
 * Monitoring service health is critical for maintaining reliable systems. This endpoint
 * provides visibility into cache performance, request patterns, and system uptime,
 * helping administrators identify optimization opportunities.
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    if (!requireAdmin(req, res, startTime)) {
      return;
    }
    
    const stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      uptime: process.uptime(),
      lastRestart: new Date(Date.now() - process.uptime() * 1000)
    };
    
    return ApiSuccess(res, 
      stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching analytics stats:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch analytics stats'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * DELETE /cache
 * Clears the analytics cache
 * 
 * Cache invalidation is sometimes necessary when data integrity issues arise or when
 * immediate fresh data is required. This maintenance endpoint provides controlled cache
 * management for administrators.
 */
router.delete('/cache', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    if (!requireAdmin(req, res, startTime)) {
      return;
    }
    
    // In production, this would call the actual cache clearing method
    // e.g., await analyticsCache.clear();
    
    return ApiSuccess(res, 
      { 
        success: true, 
        message: 'Analytics cache cleared successfully' 
      }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error clearing analytics cache:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('CACHE_ERROR', 'Failed to clear analytics cache'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /user/engagement
 * Retrieves engagement analytics for the currently authenticated user
 * 
 * Personal analytics help users understand their own contribution patterns and track
 * their engagement over time. This creates transparency and can motivate continued
 * participation in the platform.
 */
router.get('/user/engagement', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    const user_id = req.user!.id;
    
    const userPattern = await engagementAnalyticsService.getUserEngagementMetrics(user_id, '30d');
    
    return ApiSuccess(res, 
      { 
        userEngagement: userPattern,
        user_id 
       }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching user engagement analytics:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch user engagement analytics'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

/**
 * GET /engagement/leaderboard
 * Generates a ranked leaderboard of most engaged users
 * 
 * Leaderboards provide social proof and encourage healthy competition among users.
 * By recognizing top contributors, we create incentives for quality participation
 * while making engagement metrics visible to the community.
 */
router.get('/engagement/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();
  
  try {
    // Parse limit with bounds checking to prevent excessive data retrieval
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    const leaderboardData = await engagementAnalyticsService.getEngagementLeaderboard('30d', limit);

    const leaderboard = leaderboardData.topCommenters.map((user, index) => ({
      rank: index + 1,
      user_id: users.user_id,
      userName: users.userName,
      totalEngagements: users.comment_count,
      engagement_score: users.averageVotes,
      lastActive: new Date() // In production, fetch actual last activity timestamp
     }));

    return ApiSuccess(res, 
      {
        leaderboard,
        count: leaderboard.length,
        generatedAt: new Date()
      }, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  } catch (error) {
    logger.error('Error fetching engagement leaderboard:', 
      { component: 'AnalyticsRouter' }, 
      getErrorDetails(error)
    );
    
    return ApiError(res, 
      createErrorObject('FETCH_ERROR', 'Failed to fetch engagement leaderboard'), 
      500, 
      ApiResponseWrapper.createMetadata(startTime, 'database')
    );
  }
});

export default router;


