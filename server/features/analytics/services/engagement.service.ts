// cspell:words upvotes Upvotes downvotes Downvotes commenters Commenters
import { cacheService } from '@server/infrastructure/cache';
// FIXED: Import plural table names and correct type references
import { bills, comment_votes,comments, user_profiles, users } from '@shared/citizen_participation';
import { bill_engagement } from '@shared/citizen_participation';
// FIXED: Import cacheKeys from the correct location
import { cache, cacheKeys   } from '@shared/core';
import { ApiErrorResponse, ApiSuccessResponse, ApiValidationErrorResponse   } from '@shared/core';
import { logger   } from '@shared/core';
import { ApiResponseWrapper  } from '@shared/core/utils/api-utils.js';
import { database as db } from '@shared/database';
import type {
  BillEngagementMetrics,
  CommentEngagementTrends,
  EngagementLeaderboard,
  UserEngagementMetrics} from '@shared/types';
import { and, avg,count, desc, eq, sql, sum } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { errorTracker } from '@/core/errors/error-tracker.js';
import { databaseService } from '@/infrastructure/database/database-service';
import { buildTimeThreshold } from '@/utils/db-helpers';

import { AuthenticatedRequest,authenticateToken } from '../../../../AuthAlert';

/**
 * Engagement Analytics Service
 * Provides detailed analytics on user and content engagement patterns
 */
export class EngagementAnalyticsService { private readonly ANALYTICS_CACHE_TTL = 1800; // 30 minutes

  /**
   * Get comprehensive user engagement metrics
   */
  async getUserEngagementMetrics(user_id: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<UserEngagementMetrics> {
    const result = await databaseService.withFallback(
      async () => {
        // FIXED: Use cacheKeys instead of CACHE_KEYS
        const cacheKey = `${cacheKeys.USER_PROFILE(user_id) }:engagement:${timeframe}`;

        // Use enhanced cache utility with error handling and metrics
        return await cache.getOrSetCache(
          cacheKey,
          this.ANALYTICS_CACHE_TTL,
          async () => {
            // Calculate time threshold using standardized helper
            const timeThreshold = buildTimeThreshold(`${timeframe.slice(0, -1)}d`);

            // Get user information - FIXED: Use plural table names
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

            // Get comment statistics - FIXED: Use comments (plural)
            const [commentStats] = await db
              .select({
                totalComments: count(comments.id),
                // cspell:disable-next-line
                totalVotes: sum(sql`${comments.upvotes} + ${comments.downvotes}`),
                // cspell:disable-next-line
                averageVotes: avg(sql`${comments.upvotes} + ${comments.downvotes}`)
              })
              .from(comments)
              .where(and(
                eq(comments.user_id, user_id),
                sql`${comments.created_at} >= ${timeThreshold}`
              ));

            // Get top comment - FIXED: Use comments (plural)
            const [topComment] = await db
              .select({
                id: comments.id,
                // cspell:disable-next-line
                votes: sql<number>`${comments.upvotes} + ${comments.downvotes}`
              })
              .from(comments)
              .where(and(
                eq(comments.user_id, user_id),
                sql`${comments.created_at} >= ${timeThreshold}`
              ))
              // cspell:disable-next-line
              .orderBy(sql`${comments.upvotes} + ${comments.downvotes} DESC`)
              .limit(1);

            // Calculate participation days - FIXED: Use comments (plural)
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

            const metrics: UserEngagementMetrics = { user_id,
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

            return metrics;
          }
        );
      },
      { user_id,
        userName: 'Unknown User',
        totalComments: 0,
        totalVotes: 0,
        averageVotesPerComment: 0,
        engagement_score: 0,
        topCommentId: null,
        topCommentVotes: 0,
        participationDays: 0,
        expertiseAreas: []
       },
      `getUserEngagementMetrics:${ user_id }:${timeframe}`
    );

    return result.data;
  }

  /**
   * Get comprehensive bill engagement metrics
   */
  async getBillEngagementMetrics(bill_id: number): Promise<BillEngagementMetrics> { const result = await databaseService.withFallback(
      async () => {
        // FIXED: Use cacheKeys instead of CACHE_KEYS
        const cacheKey = `${cacheKeys.BILL_DETAILS(bill_id) }:engagement:metrics`;

        return await cache.getOrSetCache(
          cacheKey,
          this.ANALYTICS_CACHE_TTL,
          async () => {
            // Get bill information - FIXED: Use bills (plural)
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

            // Get engagement statistics - FIXED: Use comments and users (plural)
            const [engagementStats] = await db
              .select({
                totalComments: count(comments.id),
                // cspell:disable-next-line
                totalVotes: sum(sql`${comments.upvotes} + ${comments.downvotes}`),
                uniqueParticipants: sql<number>`COUNT(DISTINCT ${comments.user_id})`,
                expertComments: sql<number>`COUNT(CASE WHEN ${users.role} = 'expert' THEN 1 END)`
              })
              .from(comments)
              .leftJoin(users, eq(comments.user_id, users.id))
              .where(eq(comments.bill_id, bill_id));

            // Get first comment time - FIXED: Use comments (plural)
            const [firstComment] = await db
              .select({
                created_at: comments.created_at
              })
              .from(comments)
              .where(eq(comments.bill_id, bill_id))
              .orderBy(comments.created_at)
              .limit(1);

            // Calculate controversy score - FIXED: Use comments (plural)
            const [controversyData] = await db
              .select({
                // cspell:disable-next-line
                totalUpvotes: sum(comments.upvotes),
                // cspell:disable-next-line
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

            const metrics: BillEngagementMetrics = { bill_id,
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

            return metrics;
          }
        );
      },
      { bill_id,
        billTitle: 'Unknown Bill',
        totalComments: 0,
        totalVotes: 0,
        uniqueParticipants: 0,
        averageEngagementPerUser: 0,
        controversyScore: 0,
        expertParticipation: 0,
        timeToFirstComment: 0,
        peakEngagementHour: 12
       },
      `getBillEngagementMetrics:${ bill_id }`
    );

    return result.data;
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(bill_id: number, period: 'hourly' | 'daily' | 'weekly' = 'daily'): Promise<CommentEngagementTrends[typeof period]> { const result = await databaseService.withFallback(
      async () => {
        // FIXED: Use cacheKeys instead of CACHE_KEYS
        const cacheKey = `${cacheKeys.BILL_DETAILS(bill_id) }:engagement:trends:${period}`;

        return await cache.getOrSetCache(
          cacheKey,
          this.ANALYTICS_CACHE_TTL,
          async () => {
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

            // FIXED: Use comments (plural)
            const trends = await db
              .select({
                period: sql`${selectFormat}`,
                comments: count(comments.id),
                // cspell:disable-next-line
                votes: sum(sql`${comments.upvotes} + ${comments.downvotes}`)
              })
              .from(comments)
              .where(eq(comments.bill_id, bill_id))
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
        );
      },
      [],
      `getEngagementTrends:${ bill_id }:${period}`
    );

    return result.data;
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(timeframe: '7d' | '30d' | '90d' = '30d', limit: number = 10): Promise<EngagementLeaderboard> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `engagement:leaderboard:${timeframe}:${limit}`;

        return await cache.getOrSetCache(
          cacheKey,
          this.ANALYTICS_CACHE_TTL,
          async () => {
            // Calculate time threshold using standardized helper
            const timeThreshold = buildTimeThreshold(`${timeframe.slice(0, -1)}d`);

            // Top commenters - FIXED: Use comments and users (plural)
            // cspell:disable-next-line
            const topCommenters = await db
              .select({ user_id: users.id,
                userName: users.name,
                comment_count: count(comments.id),
                // cspell:disable-next-line
                totalVotes: sum(sql`${comments.upvotes } + ${comments.downvotes}`),
                // cspell:disable-next-line
                averageVotes: avg(sql`${comments.upvotes} + ${comments.downvotes}`)
              })
              .from(comments)
              .innerJoin(users, eq(comments.user_id, users.id))
              .where(sql`${comments.created_at} >= ${timeThreshold}`)
              .groupBy(users.id, users.name)
              .orderBy(desc(count(comments.id)))
              .limit(limit);

            // Top voters - FIXED: Use comment_votes and users (plural)
            // cspell:disable-next-line
            const topVoters = await db
              .select({ user_id: comment_votes.user_id,
                userName: users.name,
                votesGiven: count(comment_votes.id),
                votesReceived: sql<number>`COALESCE((
                  // cspell:disable-next-line
                  SELECT SUM(upvotes + downvotes)
                  FROM comments
                  WHERE user_id = ${comment_votes.user_id }
                ), 0)`
              })
              .from(comment_votes)
              .innerJoin(users, eq(comment_votes.user_id, users.id))
              .where(sql`${comment_votes.created_at} >= ${timeThreshold}`)
              .groupBy(comment_votes.user_id, users.name)
              .orderBy(desc(count(comment_votes.id)))
              .limit(limit);

            // Most engaged bills - FIXED: Use comments and bills (plural)
            const mostEngagedBills = await db
              .select({ bill_id: comments.bill_id,
                billTitle: bills.title,
                // cspell:disable-next-line
                totalEngagement: sum(sql`${comments.upvotes } + ${comments.downvotes}`),
                uniqueUsers: sql<number>`COUNT(DISTINCT ${comments.user_id})`
              })
              .from(comments)
              .innerJoin(bills, eq(comments.bill_id, bills.id))
              .where(sql`${comments.created_at} >= ${timeThreshold}`)
              .groupBy(comments.bill_id, bills.title)
              // cspell:disable-next-line
              .orderBy(desc(sum(sql`${comments.upvotes} + ${comments.downvotes}`)))
              .limit(limit);

            const leaderboard: EngagementLeaderboard = { topCommenters: topCommenters.map(user => ({
                user_id: user.user_id,
                userName: user.userName,
                comment_count: Number(user.comment_count),
                totalVotes: Number(user.totalVotes || 0),
                averageVotes: Number(user.averageVotes || 0)
               })),
              topVoters: topVoters.map(user => ({ user_id: user.user_id,
                userName: user.userName,
                votesGiven: Number(user.votesGiven),
                votesReceived: Number(user.votesReceived),
                engagementRatio: Number(user.votesReceived) > 0 ?
                  Number(user.votesGiven) / Number(user.votesReceived) : 0
               })),
              mostEngagedBills: mostEngagedBills.map(bill => ({ bill_id: bill.bill_id,
                billTitle: bill.billTitle,
                totalEngagement: Number(bill.totalEngagement || 0),
                uniqueUsers: Number(bill.uniqueUsers)
               }))
            };

            return leaderboard;
          }
        );
      },
      {
        topCommenters: [],
        topVoters: [],
        mostEngagedBills: []
      },
      `getEngagementLeaderboard:${timeframe}`
    );

    return result.data;
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
    // FIXED: Use comments (plural)
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
}

export const engagementAnalyticsService = new EngagementAnalyticsService();

// Validation schemas
const userEngagementQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d')
});

const bill_engagementQuerySchema = z.object({ bill_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0)
 });

const trendsQuerySchema = z.object({ bill_id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val) && val > 0),
  period: z.enum(['hourly', 'daily', 'weekly']).optional().default('daily')
 });

const leaderboardQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d'),
  limit: z.string().optional().default('10').transform(val => Math.min(parseInt(val) || 10, 100))
});

// Create router
export const router = Router();

// Get user engagement metrics
router.get('/user/:user_id/metrics', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();

  try {
    const { user_id  } = req.params;
    const query = userEngagementQuerySchema.parse(req.query);

    const metrics = await engagementAnalyticsService.getUserEngagementMetrics(user_id, query.timeframe);

    return ApiSuccessResponse(res, metrics,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationErrorResponse(res, error.errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    errorTracker.trackRequestError(
      error instanceof Error ? error : new Error(String(error)),
      req as any,
      'high',
      'business_logic'
    );

    logger.error('Error fetching user engagement metrics:', { component: 'analytics',
      operation: 'getUserEngagementMetrics',
      user_id: req.params.user_id,
      timeframe: req.query.timeframe
     }, error instanceof Error ? error : { message: String(error) });

    return ApiErrorResponse(res, 'Failed to fetch user engagement metrics', 500,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get bill engagement metrics
router.get('/bill/:bill_id/metrics', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();

  try {
    const { bill_id  } = req.params;
    const query = bill_engagementQuerySchema.parse({ bill_id  });

    const metrics = await engagementAnalyticsService.getBillEngagementMetrics(query.bill_id);

    return ApiSuccessResponse(res, metrics,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationErrorResponse(res, error.errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    errorTracker.trackRequestError(
      error instanceof Error ? error : new Error(String(error)),
      req as any,
      'high',
      'business_logic'
    );

    logger.error('Error fetching bill engagement metrics:', { component: 'analytics',
      operation: 'getBillEngagementMetrics',
      bill_id: req.params.bill_id
     }, error instanceof Error ? error : { message: String(error) });

    return ApiErrorResponse(res, error instanceof Error ? error.message : 'Failed to fetch bill engagement metrics', 500,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get engagement trends
router.get('/bill/:bill_id/trends', authenticateToken, async (req: AuthenticatedRequest, res) => { const startTime = Date.now();

  try {
    const { bill_id  } = req.params;
    const query = trendsQuerySchema.parse({ bill_id, ...req.query  });

    const trends = await engagementAnalyticsService.getEngagementTrends(query.bill_id, query.period);

    return ApiSuccessResponse(res, trends,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationErrorResponse(res, error.errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error fetching engagement trends:', { component: 'analytics',
      operation: 'getEngagementTrends',
      bill_id: req.params.bill_id,
      period: req.query.period
     }, error instanceof Error ? error : { message: String(error) });
    return ApiErrorResponse(res, 'Failed to fetch engagement trends', 500,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get engagement leaderboard
router.get('/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();

  try {
    const query = leaderboardQuerySchema.parse(req.query);

    const leaderboard = await engagementAnalyticsService.getEngagementLeaderboard(query.timeframe, query.limit);

    return ApiSuccessResponse(res, leaderboard,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationErrorResponse(res, error.errors,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    errorTracker.trackRequestError(
      error instanceof Error ? error : new Error(String(error)),
      req as any,
      'high',
      'business_logic'
    );

    logger.error('Error fetching engagement leaderboard:', {
      component: 'analytics',
      operation: 'getEngagementLeaderboard',
      timeframe: req.query.timeframe,
      limit: req.query.limit
    }, error instanceof Error ? error : { message: String(error) });

    return ApiErrorResponse(res, 'Failed to fetch engagement leaderboard', 500,
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

export default router;






