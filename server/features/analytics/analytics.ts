import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { engagementAnalyticsService } from './engagement-analytics.js';
import { z } from 'zod';
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";

export const router = Router();

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  billIds: z.string().transform(val => val.split(',').map(Number)).optional(),
  categories: z.string().transform(val => val.split(',')).optional(),
  userIds: z.string().transform(val => val.split(',')).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 100, 1000)).optional()
});

const trendsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const comparativeQuerySchema = z.object({
  categories: z.string().transform(val => val.split(',')).optional(),
  statuses: z.string().transform(val => val.split(',')).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 200)).optional()
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  billIds: z.string().transform(val => val.split(',').map(Number)).optional(),
  userIds: z.string().transform(val => val.split(',')).optional()
});

// Get engagement metrics
router.get('/engagement/metrics', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    const metrics = await engagementAnalyticsService.getEngagementMetrics(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
      {
        billIds: query.billIds,
        categories: query.categories,
        userIds: query.userIds
      }
    );
    
    return ApiSuccess(res, metrics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    console.error('Error fetching engagement metrics:', error);
    return ApiError(res, 'Failed to fetch engagement metrics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user engagement patterns
router.get('/engagement/patterns', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    const patterns = await engagementAnalyticsService.getUserEngagementPatterns(
      query.userIds,
      query.limit
    );
    
    return ApiSuccess(res, { patterns, count: patterns.length }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    console.error('Error fetching engagement patterns:', error);
    return ApiError(res, 'Failed to fetch engagement patterns', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get bill-specific engagement analytics
router.get('/engagement/bills/:billId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    
    if (isNaN(billId)) {
      return ApiError(res, 'Invalid bill ID', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const analytics = await engagementAnalyticsService.getBillEngagementAnalytics(billId);
    
    return ApiSuccess(res, analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching bill engagement analytics:', error);
    return ApiError(res, error instanceof Error ? error.message : 'Failed to fetch bill analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get engagement trends
router.get('/engagement/trends', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = trendsQuerySchema.parse(req.query);
    
    const trends = await engagementAnalyticsService.getEngagementTrends(
      query.period,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined
    );
    
    return ApiSuccess(res, trends, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    console.error('Error fetching engagement trends:', error);
    return ApiError(res, 'Failed to fetch engagement trends', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get comparative analytics
router.get('/engagement/comparative', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const query = comparativeQuerySchema.parse(req.query);
    
    const analytics = await engagementAnalyticsService.getComparativeAnalytics({
      categories: query.categories,
      statuses: query.statuses,
      limit: query.limit
    });
    
    return ApiSuccess(res, analytics, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    console.error('Error fetching comparative analytics:', error);
    return ApiError(res, 'Failed to fetch comparative analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get engagement insights and recommendations
router.get('/engagement/insights', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const insights = await engagementAnalyticsService.getEngagementInsights();
    
    return ApiSuccess(res, insights, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching engagement insights:', error);
    return ApiError(res, 'Failed to fetch engagement insights', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get real-time engagement statistics
router.get('/engagement/realtime', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const realtimeStats = await engagementAnalyticsService.getRealTimeEngagementStats();
    
    return ApiSuccess(res, realtimeStats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching real-time engagement stats:', error);
    return ApiError(res, 'Failed to fetch real-time engagement stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Export engagement data
router.get('/engagement/export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Check if user has appropriate permissions for data export
    if (req.user!.role !== 'admin' && req.user!.role !== 'expert') {
      return ApiError(res, 'Insufficient permissions for data export', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const query = exportQuerySchema.parse(req.query);
    
    const exportData = await engagementAnalyticsService.exportEngagementData(
      query.format,
      {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        billIds: query.billIds,
        userIds: query.userIds
      }
    );
    
    // Set appropriate content type and headers
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
    console.error('Error exporting engagement data:', error);
    return ApiError(res, 'Failed to export engagement data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get analytics service statistics (admin only)
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Check if user has admin role
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const stats = engagementAnalyticsService.getStats();
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return ApiError(res, 'Failed to fetch analytics stats', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Clear analytics cache (admin only)
router.delete('/cache', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    // Check if user has admin role
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    await engagementAnalyticsService.clearAnalyticsCache();
    
    return ApiSuccess(res, { 
      success: true, 
      message: 'Analytics cache cleared successfully' 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error clearing analytics cache:', error);
    return ApiError(res, 'Failed to clear analytics cache', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get user-specific engagement analytics (for current user)
router.get('/user/engagement', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    const patterns = await engagementAnalyticsService.getUserEngagementPatterns([userId], 1);
    const userPattern = patterns[0] || null;
    
    return ApiSuccess(res, { 
      userEngagement: userPattern,
      userId 
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching user engagement analytics:', error);
    return ApiError(res, 'Failed to fetch user engagement analytics', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get engagement leaderboard
router.get('/engagement/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    
    const patterns = await engagementAnalyticsService.getUserEngagementPatterns(undefined, limit);
    
    const leaderboard = patterns.map((pattern, index) => ({
      rank: index + 1,
      userId: pattern.userId,
      userName: pattern.userName,
      totalEngagements: pattern.totalEngagements,
      engagementScore: pattern.totalEngagements, // Simplified scoring
      lastActive: pattern.lastActive
    }));
    
    return ApiSuccess(res, { 
      leaderboard,
      count: leaderboard.length,
      generatedAt: new Date()
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching engagement leaderboard:', error);
    return ApiError(res, 'Failed to fetch engagement leaderboard', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

export default router;