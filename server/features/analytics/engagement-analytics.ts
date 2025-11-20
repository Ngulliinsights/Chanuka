import { Router } from 'express';
import { database, withTransaction, getDatabase } from '@shared/database';
import { comments, users, user_profiles, bills } from '@shared/foundation';
import { comments as comments_cp, bill_engagement } from '@shared/citizen_participation';
import { eq, and, sql, desc, count, sum, avg } from 'drizzle-orm';
import { cacheKeys  } from '@shared/core/caching/key-generator';
import { getDefaultCache  } from '@shared/core/caching';
import { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper  } from '@shared/core/utils/api-utils';
import { logger   } from '@shared/core/src/index.js';
import { AuthenticatedRequest  } from '@shared/core/types/auth.types';
import { z } from 'zod';

// Security Services
import { dataPrivacyService } from '../../infrastructure/security/data-privacy-service.js';
import { inputValidationService } from '../../infrastructure/security/input-validation-service.js';
import type {
  UserEngagementMetrics,
  BillEngagementMetrics,
  CommentEngagementTrends,
} from './types';

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

// Additional types for endpoints
interface EngagementOverview { totalUsers: number;
  totalBills: number;
  totalComments: number;
  totalEngagement: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  topEngagedBills: Array<{
    bill_id: number;
    billTitle: string;
    engagementCount: number;
   }>;
  engagementTrends: Array<{
    date: string;
    comments: number;
    users: number;
  }>;
}

interface EngagementEvent { user_id: string;
  bill_id?: number;
  event_type: 'view' | 'comment' | 'share' | 'vote_up' | 'vote_down';
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
    // Add input sanitization middleware
    this.router.use((req, res, next) => {
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            req.query[key] = inputValidationService.sanitizeHtmlInput(req.query[key] as string);
          }
        });
      }
      next();
    });

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
      // Check data access permissions
      const accessCheck = dataPrivacyService.checkDataAccess(
        req.user?.id || '',
        'engagement_analytics',
        { user: req.user }
      );

      if (!accessCheck.allowed) {
        return ApiError(res, {
          code: 'ACCESS_DENIED',
          message: accessCheck.reason || 'Access denied'
        }, 403, ApiResponseWrapper.createMetadata(startTime, 'auth'));
      }

      const cacheKey = 'engagement:overview';
      const cacheInstance = getDefaultCache();
      
      const overview = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => {
          return await this.computeEngagementOverview();
        }
      );

      // Apply privacy restrictions if required
      let sanitizedOverview = overview;
      if (accessCheck.restrictions?.includes('anonymize_required')) {
        sanitizedOverview = this.anonymizeOverviewData(overview);
      }

      // Audit data access
      await dataPrivacyService.auditDataAccess(
        req.user?.id || '',
        'view_engagement_overview',
        'engagement_analytics',
        { restrictions: accessCheck.restrictions }
      );

      return ApiSuccess(res, sanitizedOverview,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching engagement overview:', {
        component: 'analytics',
        operation: 'getEngagementOverview'
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, { 
        code: 'OVERVIEW_FETCH_ERROR', 
        message: 'Failed to fetch engagement overview' 
      }, 500, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Get engagement metrics for specific bill
   */
  private async getBillEngagementMetrics(req: AuthenticatedRequest, res: any): Promise<any> {
    const startTime = Date.now();

    try {
      const { id: bill_idParam } = req.params;
      const bill_id = parseInt(bill_idParam);

      if (isNaN(bill_id)) { return ApiValidationError(res, {
          field: 'bill_id',
          message: 'Bill ID must be a valid number'
         }, ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      const cacheKey = `${ cacheKeys.analytics('bill_engagement', bill_id.toString()) }`;
      const cacheInstance = getDefaultCache();
      
      const metrics = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => { return await this.computeBillEngagementMetrics(bill_id);
         }
      );

      return ApiSuccess(res, metrics,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof Error && error.message === 'Bill not found') {
        return ApiError(res, { 
          code: 'BILL_NOT_FOUND', 
          message: 'Bill not found' 
        }, 404, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      logger.error('Error fetching bill engagement metrics:', { component: 'analytics',
        operation: 'getBillEngagementMetrics',
        bill_id: req.params.id
       }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, { 
        code: 'BILL_METRICS_ERROR', 
        message: 'Failed to fetch bill engagement metrics' 
      }, 500, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Get user engagement history
   */
  private async getUserEngagementHistory(req: AuthenticatedRequest, res: any): Promise<any> { const startTime = Date.now();

    try {
      const { id: user_id  } = req.params;
      
      // Check data access permissions for user data
      const accessCheck = dataPrivacyService.checkDataAccess(
        req.user?.id || '',
        'user_profile',
        { user: req.user, targetUserId: user_id  }
      );

      if (!accessCheck.allowed) {
        return ApiError(res, {
          code: 'ACCESS_DENIED',
          message: accessCheck.reason || 'Access denied'
        }, 403, ApiResponseWrapper.createMetadata(startTime, 'auth'));
      }

      const querySchema = z.object({
        timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d')
      });

      const query = querySchema.parse(req.query);
      const cacheKey = `${ cacheKeys.user_profiles(parseInt(user_id)) }:engagement:${query.timeframe}`;
      const cacheInstance = getDefaultCache();
      
      const history = await cacheInstance.getOrSetCache(
        cacheKey,
        this.ANALYTICS_CACHE_TTL,
        async () => { return await this.computeUserEngagementHistory(user_id, query.timeframe);
         }
      );

      // Sanitize user data for privacy
      const sanitizedHistory = this.sanitizeUserEngagementData(history, accessCheck.restrictions);

      // Audit data access
      await dataPrivacyService.auditDataAccess(
        req.user?.id || '',
        'view_user_engagement',
        `user_profile:${ user_id }`,
        { timeframe: query.timeframe, restrictions: accessCheck.restrictions }
      );

      return ApiSuccess(res, sanitizedHistory,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })), ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      if (error instanceof Error && error.message === 'User not found') {
        return ApiError(res, { 
          code: 'USER_NOT_FOUND', 
          message: 'User not found' 
        }, 404, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      logger.error('Error fetching user engagement history:', { component: 'analytics',
        operation: 'getUserEngagementHistory',
        user_id: req.params.id
       }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, { 
        code: 'USER_HISTORY_ERROR', 
        message: 'Failed to fetch user engagement history' 
      }, 500, ApiResponseWrapper.createMetadata(startTime, 'database'));
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
        })), ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      logger.error('Error fetching engagement trends:', {
        component: 'analytics',
        operation: 'getEngagementTrends',
        period: req.query.period
      }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, { 
        code: 'TRENDS_ERROR', 
        message: 'Failed to fetch engagement trends' 
      }, 500, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Track user engagement events
   */
  private async trackEngagementEvent(req: AuthenticatedRequest, res: any): Promise<any> { const startTime = Date.now();

    try {
      const eventSchema = z.object({
        bill_id: z.number().optional(),
        event_type: z.enum(['view', 'comment', 'share', 'vote_up', 'vote_down']),
        metadata: z.record(z.any()).optional()
       });

      const event_data = eventSchema.parse(req.body);
      const user_id = req.user?.id;

      if (!user_id) {
        return ApiError(res, { 
          code: 'AUTH_REQUIRED', 
          message: 'User not authenticated' 
        }, 401, ApiResponseWrapper.createMetadata(startTime, 'auth'));
      }

      await this.processEngagementEvent({ user_id: String(user_id),
        event_type: event_data.event_type,
        bill_id: event_data.bill_id,
        metadata: event_data.metadata
        });

      return ApiSuccess(res, { success: true },
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })), ApiResponseWrapper.createMetadata(startTime, 'validation'));
      }

      logger.error('Error tracking engagement event:', { component: 'analytics',
        operation: 'trackEngagementEvent',
        user_id: req.user?.id
       }, error instanceof Error ? error : { message: String(error) });

      return ApiError(res, { 
        code: 'TRACKING_ERROR', 
        message: 'Failed to track engagement event' 
      }, 500, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }

  /**
   * Compute engagement overview metrics
   */
  private async computeEngagementOverview(): Promise<EngagementOverview> {
    const db = getDatabase('read');

    // Get total counts
    const [userStats] = await db
      .select({ count: count(users.id) })
      .from(users);

    const [billStats] = await db
      .select({ count: count(bills.id) })
      .from(bills);

    const [commentStats] = await db
      .select({
        count: count(comments.id),
        totalVotes: sum(sql`${comments.upvotes} + ${comments.downvotes}`)
      })
      .from(comments);

    // Get active users (engaged in last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeUsersToday] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${comments.user_id})` })
      .from(comments)
      .where(sql`${comments.created_at} >= ${yesterday}`);

    // Get active users (engaged in last 7 days)
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeUsersThisWeek] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${comments.user_id})` })
      .from(comments)
      .where(sql`${comments.created_at} >= ${lastWeek}`);

    // Get top engaged bills
    const topEngagedBills = await db
      .select({ bill_id: comments.bill_id,
        billTitle: bills.title,
        engagementCount: sum(sql`${comments.upvotes } + ${comments.downvotes} + 1`)
      })
      .from(comments)
      .innerJoin(bills, eq(comments.bill_id, bills.id))
      .groupBy(comments.bill_id, bills.title)
      .orderBy(desc(sum(sql`${comments.upvotes} + ${comments.downvotes} + 1`)))
      .limit(10);

    // Get engagement trends for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const engagementTrends = await db
      .select({
        date: sql<string>`DATE(${comments.created_at})`,
        comments: count(comments.id),
        users: sql<number>`COUNT(DISTINCT ${comments.user_id})`
      })
      .from(comments)
      .where(sql`${comments.created_at} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${comments.created_at})`)
      .orderBy(sql`DATE(${comments.created_at})`);

    return { totalUsers: Number(userStats?.count || 0),
      totalBills: Number(billStats?.count || 0),
      totalComments: Number(commentStats?.count || 0),
      totalEngagement: Number(commentStats?.totalVotes || 0),
      activeUsersToday: Number(activeUsersToday?.count || 0),
      activeUsersThisWeek: Number(activeUsersThisWeek?.count || 0),
      topEngagedBills: topEngagedBills.map(bill => ({
        bill_id: bills.bill_id,
        billTitle: bills.billTitle,
        engagementCount: Number(bills.engagementCount || 0)
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
  private async computeBillEngagementMetrics(bill_id: number): Promise<BillEngagementMetrics> {
    const db = getDatabase('read');

    // Get bill information
    const [billInfo] = await db
      .select({
        title: bills.title,
        created_at: bills.created_at
      })
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);

    if (!billInfo) {
      throw new Error('Bill not found');
    }

    // Get engagement statistics
    const [engagementStats] = await db
      .select({
        totalComments: count(comments.id),
        totalVotes: sum(sql`${comments.upvotes} + ${comments.downvotes}`),
        uniqueParticipants: sql<number>`COUNT(DISTINCT ${comments.user_id})`,
        expertComments: sql<number>`COUNT(CASE WHEN ${users.role} = 'expert' THEN 1 END)`
      })
      .from(comments)
      .leftJoin(users, eq(comments.user_id, users.id))
      .where(eq(comments.bill_id, bill_id));

    // Get first comment time
    const [firstComment] = await db
      .select({
        created_at: comments.created_at
      })
      .from(comments)
      .where(eq(comments.bill_id, bill_id))
      .orderBy(comments.created_at)
      .limit(1);

    // Calculate controversy score
    const [controversyData] = await db
      .select({
        totalUpvotes: sum(comments.upvotes),
        totalDownvotes: sum(comments.downvotes)
      })
      .from(comments)
      .where(eq(comments.bill_id, bill_id));

    const totalComments = Number(engagementStats.totalComments || 0);
    const totalVotes = Number(engagementStats.totalVotes || 0);
    const uniqueParticipants = Number(engagementStats.uniqueParticipants || 0);
    const expertComments = Number(engagementStats.expertComments || 0);

    const upvotes = Number(controversyData.totalUpvotes || 0);
    const downvotes = Number(controversyData.totalDownvotes || 0);
    const controversyScore = this.calculateControversyScore(upvotes, downvotes);

    const timeToFirstComment = firstComment ?
      (firstComment.created_at.getTime() - billInfo.created_at.getTime()) / (1000 * 60 * 60) : 0;

    // Get peak engagement hour
    const peakHour = await this.getPeakEngagementHour(bill_id);

    return { bill_id,
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
  private async computeUserEngagementHistory(user_id: string, timeframe: '7d' | '30d' | '90d'): Promise<UserEngagementMetrics> {
    const db = getDatabase('read');
    const timeThreshold = buildTimeThreshold(timeframe);

    // Get user information
    const [userInfo] = await db
      .select({
        name: users.name,
        expertise: user_profiles.expertise
      })
      .from(users)
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
      .where(eq(users.id, user_id))
      .limit(1);

    if (!userInfo) {
      throw new Error('User not found');
    }

    // Get comment statistics
    const [commentStats] = await db
      .select({
        totalComments: count(comments.id),
        totalVotes: sum(sql`${comments.upvotes} + ${comments.downvotes}`),
        averageVotes: avg(sql`${comments.upvotes} + ${comments.downvotes}`)
      })
      .from(comments)
      .where(and(
        eq(comments.user_id, user_id),
        sql`${comments.created_at} >= ${timeThreshold}`
      ));

    // Get top comment
    const [topComment] = await db
      .select({
        id: comments.id,
        votes: sql<number>`${comments.upvotes} + ${comments.downvotes}`
      })
      .from(comments)
      .where(and(
        eq(comments.user_id, user_id),
        sql`${comments.created_at} >= ${timeThreshold}`
      ))
      .orderBy(sql`${comments.upvotes} + ${comments.downvotes} DESC`)
      .limit(1);

    // Calculate participation days
    const participationDays = await db
      .select({
        uniqueDays: sql<number>`COUNT(DISTINCT DATE(${comments.created_at}))`
      })
      .from(comments)
      .where(and(
        eq(comments.user_id, user_id),
        sql`${comments.created_at} >= ${timeThreshold}`
      ));

    // Calculate engagement score
    const totalComments = Number(commentStats.totalComments || 0);
    const totalVotes = Number(commentStats.totalVotes || 0);
    const avgVotes = Number(commentStats.averageVotes || 0);
    const days = Number(participationDays[0]?.uniqueDays || 0);

    const engagement_score = this.calculateUserEngagementScore(
      totalComments,
      totalVotes,
      avgVotes,
      days
    );

    return { user_id,
      userName: userInfo.name,
      totalComments,
      totalVotes,
      averageVotesPerComment: totalComments > 0 ? totalVotes / totalComments : 0,
      engagement_score,
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
    const db = getDatabase('read');
    const start_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let groupBy: any;
    let selectFormat: any;

    switch (period) {
      case 'hourly':
        groupBy = sql`EXTRACT(HOUR FROM ${comments.created_at})`;
        selectFormat = sql<number>`EXTRACT(HOUR FROM ${comments.created_at})`;
        break;
      case 'daily':
        groupBy = sql`DATE(${comments.created_at})`;
        selectFormat = sql<string>`DATE(${comments.created_at})`;
        break;
      case 'weekly':
        groupBy = sql`DATE_TRUNC('week', ${comments.created_at})`;
        selectFormat = sql<string>`DATE_TRUNC('week', ${comments.created_at})`;
        break;
    }

    const trends = await db
      .select({
        period: selectFormat.as('period'),
        comments: count(comments.id),
        votes: sum(sql`${comments.upvotes} + ${comments.downvotes}`)
      })
      .from(comments)
      .where(sql`${comments.created_at} >= ${start_date}`)
      .groupBy(groupBy)
      .orderBy(groupBy);

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
  private async processEngagementEvent(event: EngagementEvent): Promise<void> { const { user_id, bill_id, event_type   } = event;

    if (!bill_id) return;

    try { await withTransaction(async (tx) => {
        // Check for existing engagement
        const [existingEngagement] = await tx
          .select()
          .from(bill_engagement)
          .where(and(
            eq(bill_engagement.user_id, user_id),
            eq(bill_engagement.bill_id, bill_id)
          ))
          .limit(1);

        const engagement_scoreIncrement = {
          view: 1,
          comment: 5,
          share: 3,
          vote_up: 2,
          vote_down: 2
          }[event_type] || 1;

        if (existingEngagement) {
          // Update existing engagement
          const updates: any = {
            last_engaged_at: new Date(),
            updated_at: new Date(),
            engagement_score: sql`${bill_engagement.engagement_score} + ${engagement_scoreIncrement}`
          };

          if (event_type === 'view') {
            updates.view_count = sql`${bill_engagement.view_count} + 1`;
          } else if (event_type === 'comment') {
            updates.comment_count = sql`${bill_engagement.comment_count} + 1`;
          } else if (event_type === 'share') {
            updates.share_count = sql`${bill_engagement.share_count} + 1`;
          }

          await tx
            .update(bill_engagement)
            .set(updates)
            .where(and(
              eq(bill_engagement.user_id, user_id),
              eq(bill_engagement.bill_id, bill_id)
            ));
        } else { // Create new engagement record
          const newEngagement: any = {
            user_id,
            bill_id,
            view_count: event_type === 'view' ? 1 : 0,
            comment_count: event_type === 'comment' ? 1 : 0,
            share_count: event_type === 'share' ? 1 : 0,
            engagement_score: engagement_scoreIncrement,
            last_engaged_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
            };

          await tx.insert(bill_engagement).values(newEngagement);
        }
      });

      // Invalidate related caches
      const cacheInstance = getDefaultCache();
      await cacheInstance.del(`${ cacheKeys.user_profiles(parseInt(user_id)) }:engagement`);
      await cacheInstance.del(`${ cacheKeys.analytics('bill_engagement', bill_id.toString()) }`);
      await cacheInstance.del('engagement:overview');
    } catch (dbError) {
      logger.error('Database error in processEngagementEvent:', dbError);
      throw dbError;
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
  private async getPeakEngagementHour(bill_id: number): Promise<number> {
    const db = getDatabase('read');
    
    const hourlyData = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${comments.created_at})`,
        activity: count(comments.id)
      })
      .from(comments)
      .where(eq(comments.bill_id, bill_id))
      .groupBy(sql`EXTRACT(HOUR FROM ${comments.created_at})`)
      .orderBy(desc(count(comments.id)))
      .limit(1);

    return hourlyData[0]?.hour || 12; // Default to noon if no data
  }

  /**
   * Anonymize overview data for privacy compliance
   */
  private anonymizeOverviewData(overview: EngagementOverview): EngagementOverview {
    // Remove or generalize potentially identifying information
    const anonymized = { ...overview };
    
    // Generalize user counts to ranges for small numbers
    if (anonymized.activeUsersToday < 10) {
      anonymized.activeUsersToday = Math.floor(anonymized.activeUsersToday / 5) * 5;
    }
    
    if (anonymized.activeUsersThisWeek < 50) {
      anonymized.activeUsersThisWeek = Math.floor(anonymized.activeUsersThisWeek / 10) * 10;
    }

    // Remove specific bill titles that might be sensitive
    anonymized.topEngagedBills = anonymized.topEngagedBills.map(bill => ({
      ...bill,
      billTitle: bills.billTitle.length > 50 ? 
        bills.billTitle.substring(0, 50) + '...' : 
        bills.billTitle
    }));

    return anonymized;
  }

  /**
   * Sanitize user engagement data for privacy
   */
  private sanitizeUserEngagementData(history: UserEngagementMetrics, restrictions?: string[]): UserEngagementMetrics {
    const sanitized = { ...history };

    if (restrictions?.includes('anonymize_required')) {
      // Remove or hash identifying information
      sanitized.user_id = dataPrivacyService.sanitizeUserData({ id: history.user_id }).id;
      
      // Generalize metrics for small numbers
      if (sanitized.totalComments < 10) {
        sanitized.totalComments = Math.floor(sanitized.totalComments / 5) * 5;
      }
      
      if (sanitized.totalVotes < 20) {
        sanitized.totalVotes = Math.floor(sanitized.totalVotes / 10) * 10;
      }

      // Remove specific comment references
      sanitized.topCommentId = null;
    }

    return sanitized;
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
