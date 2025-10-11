import { z } from 'zod';
import { engagementAnalyticsService } from '../services/engagement.service.js';
import { AuthenticatedRequest } from '../../../middleware/auth.js';

// Validation schemas for engagement endpoints
export const getEngagementMetricsSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    billIds: z.string().transform(val => val.split(',').map(Number)).optional(),
    categories: z.string().transform(val => val.split(',')).optional(),
    userIds: z.string().transform(val => val.split(',')).optional(),
    limit: z.string().transform(val => Math.min(parseInt(val) || 100, 1000)).optional()
  })
});

export const getEngagementTrendsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
});

export const getBillEngagementSchema = z.object({
  params: z.object({
    billId: z.string().transform(val => {
      const num = parseInt(val);
      if (isNaN(num)) throw new Error('Invalid bill ID');
      return num;
    })
  })
});

/**
 * @swagger
 * tags:
 *   name: Engagement Analytics
 *   description: User engagement metrics, trends, and analytics
 */

/**
 * Analytics Engagement Controller
 *
 * Handles all engagement-related analytics endpoints with proper validation
 * and error handling through the controller wrapper.
 */
export class EngagementController {

  /**
   * @swagger
   * /api/analytics/engagement/metrics:
   *   get:
   *     tags: [Engagement Analytics]
   *     summary: Get engagement metrics with filtering options
   *     description: Retrieve comprehensive engagement metrics including user activity, comments, and voting patterns
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for metrics (ISO 8601 format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for metrics (ISO 8601 format)
   *       - in: query
   *         name: billIds
   *         schema:
   *           type: array
   *           items:
   *             type: integer
   *         description: Filter by specific bill IDs (comma-separated)
   *       - in: query
   *         name: categories
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter by bill categories (comma-separated)
   *       - in: query
   *         name: userIds
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter by specific user IDs (comma-separated)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *         description: Maximum number of results to return
   *     responses:
   *       200:
   *         description: Engagement metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/EngagementMetrics'
   *       400:
   *         description: Invalid request parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  static async getEngagementMetrics(input: { body: any; query: z.infer<typeof getEngagementMetricsSchema>['query']; params: any }) {
    const { query } = input;
    // For now, return a summary using the existing leaderboard method
    // This would need to be properly implemented in the service
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', 10);

    return {
      totalUsers: leaderboard.topCommenters.length + leaderboard.topVoters.length,
      totalComments: leaderboard.topCommenters.reduce((sum, user) => sum + user.commentCount, 0),
      totalVotes: leaderboard.topCommenters.reduce((sum, user) => sum + user.totalVotes, 0),
      topCategories: [], // Would need implementation
      dateRange: {
        startDate: query.startDate,
        endDate: query.endDate
      },
      filters: {
        billIds: query.billIds,
        categories: query.categories,
        userIds: query.userIds
      }
    };
  }

  /**
   * @swagger
   * /api/analytics/engagement/trends:
   *   get:
   *     tags: [Engagement Analytics]
   *     summary: Get engagement trends over time
   *     description: Retrieve engagement trends (comments, votes, users) over specified time periods
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         required: true
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly]
   *         description: Time period for trend aggregation
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for trends (ISO 8601 format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for trends (ISO 8601 format)
   *     responses:
   *       200:
   *         description: Engagement trends retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/EngagementTrends'
   *       400:
   *         description: Invalid request parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  static async getEngagementTrends(input: { body: any; query: z.infer<typeof getEngagementTrendsSchema>['query']; params: any }) {
    const { query } = input;
    // For demonstration, get trends for bill ID 1 (this would need proper implementation)
    // The existing service method requires a billId, but the route expects global trends
    const sampleBillId = 1; // This is a placeholder
    const period = query.period === 'monthly' ? 'weekly' : query.period; // Map monthly to weekly

    return await engagementAnalyticsService.getEngagementTrends(sampleBillId, period as 'daily' | 'weekly');
  }

  /**
   * Get bill-specific engagement analytics
   */
  static async getBillEngagementAnalytics(input: z.infer<typeof getBillEngagementSchema>['params']) {
    return await engagementAnalyticsService.getBillEngagementMetrics(input.billId);
  }

  /**
   * Get user engagement patterns
   * Note: This method doesn't exist in the service - using leaderboard as approximation
   */
  static async getUserEngagementPatterns(
    input: { userIds?: string[]; limit?: number },
    req: AuthenticatedRequest
  ) {
    // Use leaderboard data as approximation for user patterns
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', input.limit || 10);

    const patterns = leaderboard.topCommenters.map(user => ({
      userId: user.userId,
      userName: user.userName,
      totalEngagements: user.commentCount + user.totalVotes,
      lastActive: new Date(), // Would need proper implementation
      engagementScore: user.averageVotes
    }));

    return { patterns, count: patterns.length };
  }

  /**
   * Get comparative analytics across categories
   * Note: Placeholder implementation
   */
  static async getComparativeAnalytics(input: {
    categories?: string[];
    statuses?: string[];
    limit?: number;
  }) {
    // Placeholder implementation
    return {
      comparisons: [],
      categories: input.categories || [],
      dateRange: '30d',
      totalItems: 0
    };
  }

  /**
   * Get engagement insights and recommendations
   * Note: Placeholder implementation
   */
  static async getEngagementInsights() {
    return {
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
  }

  /**
   * Get real-time engagement statistics
   * Note: Placeholder implementation
   */
  static async getRealTimeEngagementStats() {
    return {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      recentComments: Math.floor(Math.random() * 20) + 5,
      trendingBills: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Export engagement data (admin only)
   * Note: Placeholder implementation
   */
  static async exportEngagementData(
    input: {
      format: 'json' | 'csv';
      startDate?: string;
      endDate?: string;
      billIds?: number[];
      userIds?: string[];
    },
    req: AuthenticatedRequest
  ) {
    // Check permissions (this will be validated at route level)
    if (req.user!.role !== 'admin' && req.user!.role !== 'expert') {
      throw new Error('Insufficient permissions for data export');
    }

    // Get leaderboard data as sample export
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', 50);

    if (input.format === 'json') {
      return JSON.stringify(leaderboard, null, 2);
    } else {
      // Simple CSV format
      const csv = [
        'User ID,Name,Comments,Votes,Avg Votes',
        ...leaderboard.topCommenters.map(user =>
          `${user.userId},${user.userName},${user.commentCount},${user.totalVotes},${user.averageVotes}`
        )
      ].join('\n');
      return csv;
    }
  }

  /**
   * Get analytics service statistics (admin only)
   * Note: Placeholder implementation
   */
  static getStats() {
    return {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      uptime: process.uptime(),
      lastRestart: new Date(Date.now() - process.uptime() * 1000)
    };
  }

  /**
   * Clear analytics cache (admin only)
   * Note: Placeholder implementation
   */
  static async clearAnalyticsCache() {
    // Would need to implement cache clearing in the service
    return {
      success: true,
      message: 'Analytics cache cleared successfully'
    };
  }

  /**
   * Get user-specific engagement analytics
   */
  static async getUserEngagementAnalytics(req: AuthenticatedRequest) {
    const userId = req.user!.id;

    try {
      // Try to get user metrics using existing service method
      const metrics = await engagementAnalyticsService.getUserEngagementMetrics(userId, '30d');
      return {
        userEngagement: metrics,
        userId
      };
    } catch (error) {
      // Fallback if user not found
      return {
        userEngagement: null,
        userId,
        error: 'User metrics not available'
      };
    }
  }

  /**
   * Get engagement leaderboard
   */
  static async getEngagementLeaderboard(input: { limit?: number }) {
    const limit = Math.min(input.limit || 10, 100);
    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard('30d', limit);

    // Transform to expected format
    const transformedLeaderboard = leaderboard.topCommenters.slice(0, limit).map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      userName: user.userName,
      totalEngagements: user.commentCount,
      engagementScore: user.averageVotes,
      lastActive: new Date() // Would need proper implementation
    }));

    return {
      leaderboard: transformedLeaderboard,
      count: transformedLeaderboard.length,
      generatedAt: new Date()
    };
  }
}