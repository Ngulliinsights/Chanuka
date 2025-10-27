import { Router } from 'express';
import { db } from '../../../shared/database/connection';
import { billComments, users, userProfiles, bills, billEngagement } from '@shared/schema';
import { eq, and, sql, desc, count, sum, avg } from 'drizzle-orm';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys } from '@shared/core/src/caching/key-generator';
import { getDefaultCache } from '@shared/core/src/caching';
import { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper } from '../../utils/api-response';
import { logger } from '@shared/core';
import { AuthenticatedRequest } from '@shared/core/src/types/auth.types';

// Helper function to build time thresholds
const buildTimeThreshold = (timeframe: string): Date => {
  const now = new Date();
  const days = parseInt(timeframe.replace('d', ''));
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

// Simple authentication middleware placeholder
const authenticateToken = (req: any, res: any, next: any) => {
  // This should be replaced with actual authentication logic
  req.user = { id: '1', role: 'user' }; // Mock user for now
  next();
};
import { z } from 'zod';
import type {
  UserEngagementMetrics,
  BillEngagementMetrics,
  CommentEngagementTrends,
  EngagementLeaderboard
} from './types';

// Additional types for new endpoints
interface EngagementOverview {
  totalUsers: number;
  totalBills: number;
  totalComments: number;
  totalEngagement: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  topEngagedBills: Array<{
    billId: number;
    billTitle: string;
    engagementCount: number;
  }>;
  engagementTrends: Array<{
    date: string;
    comments: number;
    users: number;
  }>;
}

interface EngagementEvent {
  userId: string;
  billId?: number;
  eventType: 'view' | 'comment' | 'share' | 'vote_up' | 'vote_down';
  metadata?: Record<string, any>;
}

/**
 * Engagement Analytics Router
 * Provides REST API endpoints for engagement analytics functionality
 */
class EngagementAnalyticsRouter {
  private readonly ANALYTICS_CACHE_TTL = 1800; // 30 minutes
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // GET /api/engagement-analytics/overview - Get engagement overview metrics
    this.router.get('/overview', authenticateToken, this.getEngagementOverview.bind(this));

    // GET /api/engagement-analytics/bills/:id - Get engagement metrics for specific bill
    this.router.get('/bills/:id', authenticateToken, this.getBillEngagementMetrics.bind(this));

    // GET /api/engagement-analytics/users/:id - Get user engagement history
    this.router.get('/users/:id', authenticateToken, this.getUserEngagementHistory.bind(this));

    // GET /api/engagement-analytics/trends - Get engagement trends over time
    this.router.get('/trends', authenticateToken, this.getEngagementTrends.bind(this));

    // POST /api/engagement-analytics/track - Track user engagement events
    this.router.post('/track', authenticateToken, this.trackEngagementEvent.bind(this));
  }

  /**
   * Get comprehensive engagement overview metrics
   */
  private async getEngagementOverview(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const cacheKey = 'engagement:overview';

      // Use enhanced cache utility with error handling and metrics
      const cacheInstance = getDefaultCache();
      const overview = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => {
          return await this.computeEngagementOverview();
        }
      );

      return ApiSuccess(res, overview,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      // Error tracking removed - errorTracker not available

      logger.error('Error fetching engagement overview:', {
        component: 'analytics',
        operation: 'getEngagementOverview'
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, 'Failed to fetch engagement overview', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Get engagement metrics for specific bill
   */
  private async getBillEngagementMetrics(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const { id: billIdParam } = req.params;
      const billId = parseInt(billIdParam);

      if (isNaN(billId)) {
        return ApiValidationError(res, {
          field: 'billId',
          message: 'Bill ID must be a valid number'
        },
          ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      const cacheKey = `${cacheKeys.analytics('bill_engagement', billId.toString())}`;

      // Use enhanced cache utility with error handling and metrics
      const cacheInstance = getDefaultCache();
      const metrics = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => {
          return await this.computeBillEngagementMetrics(billId);
        }
      );

      return ApiSuccess(res, metrics,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof Error && error.message === 'Bill not found') {
        return ApiError(res, 'Bill not found', 404,
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Error tracking removed - errorTracker not available

      logger.error('Error fetching bill engagement metrics:', {
        component: 'analytics',
        operation: 'getBillEngagementMetrics',
        billId: req.params.id
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, 'Failed to fetch bill engagement metrics', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Get user engagement history
   */
  private async getUserEngagementHistory(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const { id: userId } = req.params;
      const querySchema = z.object({
        timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d')
      });

      const query = querySchema.parse(req.query);

      const cacheKey = `${cacheKeys.userProfile(parseInt(userId))}:engagement:${query.timeframe}`;

      // Use enhanced cache utility with error handling and metrics
      const cacheInstance = getDefaultCache();
      const history = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => {
          return await this.computeUserEngagementHistory(userId, query.timeframe);
        }
      );

      return ApiSuccess(res, history,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      if (error instanceof Error && error.message === 'User not found') {
        return ApiError(res, 'User not found', 404,
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Error tracking removed - errorTracker not available

      logger.error('Error fetching user engagement history:', {
        component: 'analytics',
        operation: 'getUserEngagementHistory',
        userId: req.params.id
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, 'Failed to fetch user engagement history', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Get engagement trends over time
   */
  private async getEngagementTrends(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const querySchema = z.object({
        period: z.enum(['hourly', 'daily', 'weekly']).optional().default('daily'),
        days: z.string().optional().default('30').transform(val => Math.min(parseInt(val) || 30, 90))
      });

      const query = querySchema.parse(req.query);

      const cacheKey = `engagement:trends:${query.period}:${query.days}`;

      // Use enhanced cache utility with error handling and metrics
      const cacheInstance = getDefaultCache();
      const trends = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => {
          return await this.computeEngagementTrends(query.period, query.days);
        }
      );

      return ApiSuccess(res, trends,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Error tracking removed - errorTracker not available

      logger.error('Error fetching engagement trends:', {
        component: 'analytics',
        operation: 'getEngagementTrends',
        period: req.query.period
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, 'Failed to fetch engagement trends', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Track user engagement events
   */
  private async trackEngagementEvent(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const eventSchema = z.object({
        billId: z.number().optional(),
        eventType: z.enum(['view', 'comment', 'share', 'vote_up', 'vote_down']),
        metadata: z.record(z.any()).optional()
      });

      const eventData = eventSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return ApiError(res, 'User not authenticated', 401,
          ApiResponseWrapper.createMetadata(startTime, 'auth'));
      }

      await this.processEngagementEvent({
        userId,
        eventType: eventData.eventType,
        billId: eventData.billId,
        metadata: eventData.metadata
      });

      return ApiSuccess(res, { success: true },
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
          ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      // Error tracking removed - errorTracker not available

      logger.error('Error tracking engagement event:', {
        component: 'analytics',
        operation: 'trackEngagementEvent',
        userId: req.user?.id
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, 'Failed to track engagement event', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Compute engagement overview metrics
   */
  private async computeEngagementOverview(): Promise<EngagementOverview> {
    // Get total counts
    const [userStats] = await db
      .select({ count: count(users.id) })
      .from(users);

    const [billStats] = await db
      .select({ count: count(bills.id) })
      .from(bills);

    const [commentStats] = await db
      .select({
        count: count(billComments.id),
        totalVotes: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`)
      })
      .from(billComments);

    // Get active users (engaged in last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeUsersToday] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${billComments.userId})` })
      .from(billComments)
      .where(sql`${billComments.createdAt} >= ${yesterday}`);

    // Get active users (engaged in last 7 days)
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeUsersThisWeek] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${billComments.userId})` })
      .from(billComments)
      .where(sql`${billComments.createdAt} >= ${lastWeek}`);

    // Get top engaged bills
    const topEngagedBills = await db
      .select({
        billId: billComments.billId,
        billTitle: bills.title,
        engagementCount: sum(sql`${billComments.upvotes} + ${billComments.downvotes} + 1`) // +1 for comment itself
      })
      .from(billComments)
      .innerJoin(bills, eq(billComments.billId, bills.id))
      .groupBy(billComments.billId, bills.title)
      .orderBy(desc(sum(sql`${billComments.upvotes} + ${billComments.downvotes} + 1`)))
      .limit(10);

    // Get engagement trends for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const engagementTrends = await db
      .select({
        date: sql<string>`DATE(${billComments.createdAt})`,
        comments: count(billComments.id),
        users: sql<number>`COUNT(DISTINCT ${billComments.userId})`
      })
      .from(billComments)
      .where(sql`${billComments.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${billComments.createdAt})`)
      .orderBy(sql`DATE(${billComments.createdAt})`);

    return {
      totalUsers: Number(userStats?.count || 0),
      totalBills: Number(billStats?.count || 0),
      totalComments: Number(commentStats?.count || 0),
      totalEngagement: Number(commentStats?.totalVotes || 0),
      activeUsersToday: Number(activeUsersToday?.count || 0),
      activeUsersThisWeek: Number(activeUsersThisWeek?.count || 0),
      topEngagedBills: topEngagedBills.map(bill => ({
        billId: bill.billId,
        billTitle: bill.billTitle,
        engagementCount: Number(bill.engagementCount || 0)
      })),
      engagementTrends: engagementTrends.map(trend => ({
        date: trend.date,
        comments: Number(trend.comments),
        users: Number(trend.users)
      }))
    };
  }

  /**
   * Compute bill engagement metrics
   */
  private async computeBillEngagementMetrics(billId: number): Promise<BillEngagementMetrics> {
    // Get bill information
    const [billInfo] = await db
      .select({
        title: bills.title,
        createdAt: bills.createdAt
      })
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!billInfo) {
      throw new Error('Bill not found');
    }

    // Get engagement statistics
    const [engagementStats] = await db
      .select({
        totalComments: count(billComments.id),
        totalVotes: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`),
        uniqueParticipants: sql<number>`COUNT(DISTINCT ${billComments.userId})`,
        expertComments: sql<number>`COUNT(CASE WHEN ${users.role} = 'expert' THEN 1 END)`
      })
      .from(billComments)
      .leftJoin(users, eq(billComments.userId, users.id))
      .where(eq(billComments.billId, billId));

    // Get first comment time
    const [firstComment] = await db
      .select({
        createdAt: billComments.createdAt
      })
      .from(billComments)
      .where(eq(billComments.billId, billId))
      .orderBy(billComments.createdAt)
      .limit(1);

    // Calculate controversy score
    const [controversyData] = await db
      .select({
        totalUpvotes: sum(billComments.upvotes),
        totalDownvotes: sum(billComments.downvotes)
      })
      .from(billComments)
      .where(eq(billComments.billId, billId));

    const totalComments = Number(engagementStats.totalComments || 0);
    const totalVotes = Number(engagementStats.totalVotes || 0);
    const uniqueParticipants = Number(engagementStats.uniqueParticipants || 0);
    const expertComments = Number(engagementStats.expertComments || 0);

    const upvotes = Number(controversyData.totalUpvotes || 0);
    const downvotes = Number(controversyData.totalDownvotes || 0);
    const controversyScore = this.calculateControversyScore(upvotes, downvotes);

    const timeToFirstComment = firstComment ?
      (firstComment.createdAt.getTime() - billInfo.createdAt.getTime()) / (1000 * 60 * 60) : 0;

    // Get peak engagement hour
    const peakHour = await this.getPeakEngagementHour(billId);

    return {
      billId,
      billTitle: billInfo.title,
      totalComments,
      totalVotes,
      uniqueParticipants,
      averageEngagementPerUser: uniqueParticipants > 0 ? totalVotes / uniqueParticipants : 0,
      controversyScore,
      expertParticipation: totalComments > 0 ? (expertComments / totalComments) * 100 : 0,
      timeToFirstComment,
      peakEngagementHour: peakHour
    };
  }

  /**
   * Compute user engagement history
   */
  private async computeUserEngagementHistory(userId: string, timeframe: '7d' | '30d' | '90d'): Promise<UserEngagementMetrics> {
    const timeThreshold = buildTimeThreshold(`${timeframe.slice(0, -1)}d`);

    // Get user information
    const [userInfo] = await db
      .select({
        name: users.name,
        expertise: userProfiles.expertise
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userInfo) {
      throw new Error('User not found');
    }

    // Get comment statistics
    const [commentStats] = await db
      .select({
        totalComments: count(billComments.id),
        totalVotes: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`),
        averageVotes: avg(sql`${billComments.upvotes} + ${billComments.downvotes}`)
      })
      .from(billComments)
      .where(and(
        eq(billComments.userId, userId),
        sql`${billComments.createdAt} >= ${timeThreshold}`
      ));

    // Get top comment
    const [topComment] = await db
      .select({
        id: billComments.id,
        votes: sql<number>`${billComments.upvotes} + ${billComments.downvotes}`
      })
      .from(billComments)
      .where(and(
        eq(billComments.userId, userId),
        sql`${billComments.createdAt} >= ${timeThreshold}`
      ))
      .orderBy(sql`${billComments.upvotes} + ${billComments.downvotes} DESC`)
      .limit(1);

    // Calculate participation days
    const participationDays = await db
      .select({
        uniqueDays: sql<number>`COUNT(DISTINCT DATE(${billComments.createdAt}))`
      })
      .from(billComments)
      .where(and(
        eq(billComments.userId, userId),
        sql`${billComments.createdAt} >= ${timeThreshold}`
      ));

    // Calculate engagement score
    const totalComments = Number(commentStats.totalComments || 0);
    const totalVotes = Number(commentStats.totalVotes || 0);
    const avgVotes = Number(commentStats.averageVotes || 0);
    const days = Number(participationDays[0]?.uniqueDays || 0);

    const engagementScore = this.calculateUserEngagementScore(
      totalComments,
      totalVotes,
      avgVotes,
      days
    );

    return {
      userId,
      userName: userInfo.name,
      totalComments,
      totalVotes,
      averageVotesPerComment: totalComments > 0 ? totalVotes / totalComments : 0,
      engagementScore,
      topCommentId: topComment?.id || null,
      topCommentVotes: Number(topComment?.votes || 0),
      participationDays: days,
      expertiseAreas: userInfo.expertise || []
    };
  }

  /**
   * Compute engagement trends
   */
  private async computeEngagementTrends(period: 'hourly' | 'daily' | 'weekly', days: number): Promise<CommentEngagementTrends[typeof period]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let groupBy: string;
    let selectFormat: string;

    switch (period) {
      case 'hourly':
        groupBy = 'EXTRACT(HOUR FROM created_at)';
        selectFormat = 'EXTRACT(HOUR FROM created_at) as period';
        break;
      case 'daily':
        groupBy = 'DATE(created_at)';
        selectFormat = 'DATE(created_at) as period';
        break;
      case 'weekly':
        groupBy = 'DATE_TRUNC(\'week\', created_at)';
        selectFormat = 'DATE_TRUNC(\'week\', created_at) as period';
        break;
    }

    const trends = await db
      .select({
        period: sql`${selectFormat}`,
        comments: count(billComments.id),
        votes: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`)
      })
      .from(billComments)
      .where(sql`${billComments.createdAt} >= ${startDate}`)
      .groupBy(sql`${groupBy}`)
      .orderBy(sql`${groupBy}`);

    const formattedTrends = trends.map(trend => ({
      [period === 'hourly' ? 'hour' : period === 'daily' ? 'date' : 'week']:
        period === 'hourly' ? Number(trend.period) : String(trend.period),
      comments: Number(trend.comments),
      votes: Number(trend.votes || 0)
    }));

    return formattedTrends as any;
  }

  /**
   * Process engagement event
   */
  private async processEngagementEvent(event: EngagementEvent): Promise<void> {
    const { userId, billId, eventType, metadata } = event;

    // Record the event in engagement tracking
    if (billId) {
      // Direct database operations (transaction wrapper not available)
      try {
        // Update or create bill engagement record
        const [existingEngagement] = await db
          .select()
          .from(billEngagement)
          .where(and(
            eq(billEngagement.userId, userId),
            eq(billEngagement.billId, billId)
          ))
          .limit(1);

        const engagementScoreIncrement = {
          view: 1,
          comment: 5,
          share: 3,
          vote_up: 2,
          vote_down: 2
        }[eventType] || 1;

        if (existingEngagement) {
          // Update existing engagement
          const updates: any = {
            lastEngagedAt: new Date(),
            updatedAt: new Date(),
            engagementScore: sql`${billEngagement.engagementScore} + ${engagementScoreIncrement}`
          };

          if (eventType === 'view') {
            updates.viewCount = sql`${billEngagement.viewCount} + 1`;
          } else if (eventType === 'comment') {
            updates.commentCount = sql`${billEngagement.commentCount} + 1`;
          } else if (eventType === 'share') {
            updates.shareCount = sql`${billEngagement.shareCount} + 1`;
          }

          await db
            .update(billEngagement)
            .set(updates)
            .where(and(
              eq(billEngagement.userId, userId),
              eq(billEngagement.billId, billId)
            ));
        } else {
          // Create new engagement record
          const newEngagement: any = {
            userId,
            billId,
            viewCount: eventType === 'view' ? 1 : 0,
            commentCount: eventType === 'comment' ? 1 : 0,
            shareCount: eventType === 'share' ? 1 : 0,
            engagementScore: engagementScoreIncrement,
            lastEngagedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db
            .insert(billEngagement)
            .values(newEngagement);
        }
      } catch (dbError) {
        logger.error('Database error in processEngagementEvent:', dbError);
        throw dbError;
      }

      // Invalidate related caches
      const cacheInstance = getDefaultCache();
      await cacheInstance.del(`${cacheKeys.userProfile(parseInt(userId))}:engagement`);
      await cacheInstance.del(`${cacheKeys.analytics('bill_engagement', billId.toString())}`);
      await cacheInstance.del('engagement:overview');
    }
  }

  /**
   * Calculate user engagement score
   */
  private calculateUserEngagementScore(
    totalComments: number,
    totalVotes: number,
    avgVotes: number,
    participationDays: number
  ): number {
    // Weighted scoring system
    const commentWeight = 0.3;
    const voteWeight = 0.4;
    const consistencyWeight = 0.2;
    const qualityWeight = 0.1;

    const commentScore = Math.min(totalComments / 10, 1) * commentWeight;
    const voteScore = Math.min(totalVotes / 100, 1) * voteWeight;
    const consistencyScore = Math.min(participationDays / 30, 1) * consistencyWeight;
    const qualityScore = Math.min(avgVotes / 10, 1) * qualityWeight;

    return (commentScore + voteScore + consistencyScore + qualityScore) * 100;
  }

  /**
   * Calculate controversy score
   */
  private calculateControversyScore(upvotes: number, downvotes: number): number {
    if (upvotes + downvotes === 0) return 0;

    const total = upvotes + downvotes;
    const ratio = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
    const magnitude = Math.log(total + 1);

    return ratio * magnitude * 10; // Scale to 0-10
  }

  /**
   * Get peak engagement hour for a bill
   */
  private async getPeakEngagementHour(billId: number): Promise<number> {
    const hourlyData = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${billComments.createdAt})`,
        activity: count(billComments.id)
      })
      .from(billComments)
      .where(eq(billComments.billId, billId))
      .groupBy(sql`EXTRACT(HOUR FROM ${billComments.createdAt})`)
      .orderBy(desc(count(billComments.id)))
      .limit(1);

    return hourlyData[0]?.hour || 12; // Default to noon if no data
  }

  /**
   * Get the Express router instance
   */
  getRouter(): Router {
    return this.router;
  }
}

// Create and export router instance
const engagementAnalyticsRouter = new EngagementAnalyticsRouter();
export default engagementAnalyticsRouter.getRouter();