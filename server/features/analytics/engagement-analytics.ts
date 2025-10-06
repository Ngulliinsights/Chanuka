import { databaseService } from '../../services/database-service.js';
import { database as db } from '../../../shared/database/connection.js';
import { billComments, commentVotes, users, userProfiles, bills } from '../../../shared/schema.js';
import { eq, and, sql, desc, count, sum, avg } from 'drizzle-orm';
import { cacheService, CACHE_TTL, CACHE_KEYS } from '../../infrastructure/cache/cache-service.js';

// Engagement analytics types
export interface UserEngagementMetrics {
  userId: string;
  userName: string;
  totalComments: number;
  totalVotes: number;
  averageVotesPerComment: number;
  engagementScore: number;
  topCommentId: number | null;
  topCommentVotes: number;
  participationDays: number;
  expertiseAreas: string[];
}

export interface BillEngagementMetrics {
  billId: number;
  billTitle: string;
  totalComments: number;
  totalVotes: number;
  uniqueParticipants: number;
  averageEngagementPerUser: number;
  controversyScore: number;
  expertParticipation: number;
  timeToFirstComment: number; // hours
  peakEngagementHour: number;
}

export interface CommentEngagementTrends {
  hourly: Array<{ hour: number; comments: number; votes: number }>;
  daily: Array<{ date: string; comments: number; votes: number }>;
  weekly: Array<{ week: string; comments: number; votes: number }>;
}

export interface EngagementLeaderboard {
  topCommenters: Array<{
    userId: string;
    userName: string;
    commentCount: number;
    totalVotes: number;
    averageVotes: number;
  }>;
  topVoters: Array<{
    userId: string;
    userName: string;
    votesGiven: number;
    votesReceived: number;
    engagementRatio: number;
  }>;
  mostEngagedBills: Array<{
    billId: number;
    billTitle: string;
    totalEngagement: number;
    uniqueUsers: number;
  }>;
}

/**
 * Engagement Analytics Service
 * Provides detailed analytics on user and content engagement patterns
 */
export class EngagementAnalyticsService {
  private readonly ANALYTICS_CACHE_TTL = CACHE_TTL.MEDIUM;

  /**
   * Get comprehensive user engagement metrics
   */
  async getUserEngagementMetrics(userId: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<UserEngagementMetrics> {
    return databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:engagement:${timeframe}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Calculate time threshold
        const timeThreshold = new Date();
        switch (timeframe) {
          case '7d':
            timeThreshold.setDate(timeThreshold.getDate() - 7);
            break;
          case '30d':
            timeThreshold.setDate(timeThreshold.getDate() - 30);
            break;
          case '90d':
            timeThreshold.setDate(timeThreshold.getDate() - 90);
            break;
        }

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

        const metrics: UserEngagementMetrics = {
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

        await cacheService.set(cacheKey, metrics, this.ANALYTICS_CACHE_TTL);
        return metrics;
      },
      {
        userId,
        userName: 'Unknown User',
        totalComments: 0,
        totalVotes: 0,
        averageVotesPerComment: 0,
        engagementScore: 0,
        topCommentId: null,
        topCommentVotes: 0,
        participationDays: 0,
        expertiseAreas: []
      },
      `getUserEngagementMetrics:${userId}:${timeframe}`
    );
  }

  /**
   * Get comprehensive bill engagement metrics
   */
  async getBillEngagementMetrics(billId: number): Promise<BillEngagementMetrics> {
    return databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.BILL_ENGAGEMENT(billId)}:metrics`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

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

        // Calculate controversy score (high when votes are split)
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

        const metrics: BillEngagementMetrics = {
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

        await cacheService.set(cacheKey, metrics, this.ANALYTICS_CACHE_TTL);
        return metrics;
      },
      {
        billId,
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
      `getBillEngagementMetrics:${billId}`
    );
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(billId: number, period: 'hourly' | 'daily' | 'weekly' = 'daily'): Promise<CommentEngagementTrends[typeof period]> {
    return databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.BILL_ENGAGEMENT(billId)}:trends:${period}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

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
          .where(eq(billComments.billId, billId))
          .groupBy(sql`${groupBy}`)
          .orderBy(sql`${groupBy}`);

        const formattedTrends = trends.map(trend => ({
          [period === 'hourly' ? 'hour' : period === 'daily' ? 'date' : 'week']: 
            period === 'hourly' ? Number(trend.period) : String(trend.period),
          comments: Number(trend.comments),
          votes: Number(trend.votes || 0)
        }));

        await cacheService.set(cacheKey, formattedTrends, this.ANALYTICS_CACHE_TTL);
        return formattedTrends as any;
      },
      [],
      `getEngagementTrends:${billId}:${period}`
    );
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(timeframe: '7d' | '30d' | '90d' = '30d', limit: number = 10): Promise<EngagementLeaderboard> {
    return databaseService.withFallback(
      async () => {
        const cacheKey = `engagement:leaderboard:${timeframe}:${limit}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Calculate time threshold
        const timeThreshold = new Date();
        switch (timeframe) {
          case '7d':
            timeThreshold.setDate(timeThreshold.getDate() - 7);
            break;
          case '30d':
            timeThreshold.setDate(timeThreshold.getDate() - 30);
            break;
          case '90d':
            timeThreshold.setDate(timeThreshold.getDate() - 90);
            break;
        }

        // Top commenters
        const topCommenters = await db
          .select({
            userId: users.id,
            userName: users.name,
            commentCount: count(billComments.id),
            totalVotes: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`),
            averageVotes: avg(sql`${billComments.upvotes} + ${billComments.downvotes}`)
          })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .where(sql`${billComments.createdAt} >= ${timeThreshold}`)
          .groupBy(users.id, users.name)
          .orderBy(desc(count(billComments.id)))
          .limit(limit);

        // Top voters (users who give the most votes)
        const topVoters = await db
          .select({
            userId: commentVotes.userId,
            userName: users.name,
            votesGiven: count(commentVotes.id),
            votesReceived: sql<number>`COALESCE((
              SELECT SUM(upvotes + downvotes) 
              FROM bill_comments 
              WHERE user_id = ${commentVotes.userId}
            ), 0)`
          })
          .from(commentVotes)
          .innerJoin(users, eq(commentVotes.userId, users.id))
          .where(sql`${commentVotes.createdAt} >= ${timeThreshold}`)
          .groupBy(commentVotes.userId, users.name)
          .orderBy(desc(count(commentVotes.id)))
          .limit(limit);

        // Most engaged bills
        const mostEngagedBills = await db
          .select({
            billId: billComments.billId,
            billTitle: bills.title,
            totalEngagement: sum(sql`${billComments.upvotes} + ${billComments.downvotes}`),
            uniqueUsers: sql<number>`COUNT(DISTINCT ${billComments.userId})`
          })
          .from(billComments)
          .innerJoin(bills, eq(billComments.billId, bills.id))
          .where(sql`${billComments.createdAt} >= ${timeThreshold}`)
          .groupBy(billComments.billId, bills.title)
          .orderBy(desc(sum(sql`${billComments.upvotes} + ${billComments.downvotes}`)))
          .limit(limit);

        const leaderboard: EngagementLeaderboard = {
          topCommenters: topCommenters.map(user => ({
            userId: user.userId,
            userName: user.userName,
            commentCount: Number(user.commentCount),
            totalVotes: Number(user.totalVotes || 0),
            averageVotes: Number(user.averageVotes || 0)
          })),
          topVoters: topVoters.map(user => ({
            userId: user.userId,
            userName: user.userName,
            votesGiven: Number(user.votesGiven),
            votesReceived: Number(user.votesReceived),
            engagementRatio: Number(user.votesReceived) > 0 ? 
              Number(user.votesGiven) / Number(user.votesReceived) : 0
          })),
          mostEngagedBills: mostEngagedBills.map(bill => ({
            billId: bill.billId,
            billTitle: bill.billTitle,
            totalEngagement: Number(bill.totalEngagement || 0),
            uniqueUsers: Number(bill.uniqueUsers)
          }))
        };

        await cacheService.set(cacheKey, leaderboard, this.ANALYTICS_CACHE_TTL);
        return leaderboard;
      },
      {
        topCommenters: [],
        topVoters: [],
        mostEngagedBills: []
      },
      `getEngagementLeaderboard:${timeframe}`
    );
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
}

export const engagementAnalyticsService = new EngagementAnalyticsService();