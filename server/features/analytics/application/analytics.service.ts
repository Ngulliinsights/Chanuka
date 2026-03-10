/**
 * Analytics Service (Engagement Metrics)
 * Modernized service following standardized patterns
 */

import { Result, Ok, Err } from '../../../../shared/core/primitives/types/result';
import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { 
  bills, 
  comments, 
  votes, 
  users, 
  bill_engagement 
} from '@server/infrastructure/schema';
import { eq, and, desc, asc, sql, count, gte, lte, inArray } from 'drizzle-orm';
import {
  EngagementMetrics,
  EngagementSummary,
  UserEngagementProfile,
  TrackEngagementRequest,
  AnalyticsQueryParams,
  EngagementQueryParams,
  TimePeriod,
  EngagementEntityType,
  EngagementEventType
} from '../../../../shared/types/api/contracts/analytics.contracts';
import { cacheService } from '@server/infrastructure/cache';

export class AnalyticsService {
  private readonly cachePrefix = 'analytics';
  private readonly cacheTTL = 300; // 5 minutes

  // Engagement Tracking
  async trackEngagement(data: TrackEngagementRequest, userId?: string): Promise<Result<EngagementMetrics, Error>> {
    try {
      return await withTransaction(async (tx) => {
        const engagementData = {
          entityId: data.entityId,
          entityType: data.entityType,
          userId: userId || null,
          sessionId: data.metadata?.sessionId || null,
          eventType: data.eventType,
          metadata: data.metadata || {},
          timestamp: new Date(),
          duration: data.duration || null,
          value: data.value || null
        };

        // Store engagement event
        const result = await tx
          .insert(bill_engagement)
          .values({
            billId: data.entityId,
            userId: userId || null,
            eventType: data.eventType,
            metadata: data.metadata || {},
            createdAt: new Date(),
            viewCount: data.eventType === 'view' ? 1 : 0,
            shareCount: data.eventType === 'share' ? 1 : 0,
            downloadCount: data.eventType === 'download' ? 1 : 0
          })
          .returning();

        // Audit log
        if (userId) {
          logger.info({
            action: 'engagement_tracked',
            userId,
            resourceType: data.entityType,
            resourceId: data.entityId,
            metadata: { eventType: data.eventType }
          }, 'User engagement tracked');
        }

        // Invalidate related caches
        await this.invalidateEngagementCaches(data.entityId, data.entityType);

        const engagement: EngagementMetrics = {
          id: result[0].id,
          entityId: data.entityId,
          entityType: data.entityType,
          userId,
          sessionId: data.metadata?.sessionId,
          eventType: data.eventType,
          metadata: data.metadata || {},
          timestamp: engagementData.timestamp.toISOString(),
          duration: data.duration,
          value: data.value
        };

        return Ok(engagement);
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to track engagement');
      return Err(new Error('Failed to track engagement'));
    }
  }

  async getEngagementSummary(
    entityId: string,
    entityType: EngagementEntityType,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Result<EngagementSummary, Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:summary:${entityType}:${entityId}:${period}:${dateFrom}:${dateTo}`;
      const cached = await cacheService.get<EngagementSummary>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      // Calculate date range based on period
      const endDate = dateTo ? new Date(dateTo) : new Date();
      const startDate = dateFrom ? new Date(dateFrom) : this.getStartDateForPeriod(period, endDate);

      // Get engagement metrics
      const metricsResult = await readDatabase
        .select({
          views: sql<number>`COALESCE(SUM(${bill_engagement.viewCount}), 0)::int`,
          shares: sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`,
          downloads: sql<number>`COALESCE(SUM(${bill_engagement.downloadCount}), 0)::int`,
          comments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          votes: sql<number>`COUNT(DISTINCT ${votes.id})::int`,
          uniqueUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.userId})::int`
        })
        .from(bill_engagement)
        .leftJoin(comments, eq(comments.billId, bill_engagement.billId))
        .leftJoin(votes, and(
          eq(votes.targetId, bill_engagement.billId),
          eq(votes.targetType, 'bill')
        ))
        .where(and(
          eq(bill_engagement.billId, entityId),
          gte(bill_engagement.createdAt, startDate),
          lte(bill_engagement.createdAt, endDate)
        ));

      const metrics = metricsResult[0];

      // Calculate derived metrics
      const totalEngagements = metrics.views + metrics.comments + metrics.votes + metrics.shares;
      const engagementRate = metrics.uniqueUsers > 0 ? totalEngagements / metrics.uniqueUsers : 0;
      const bounceRate = metrics.views > 0 ? (metrics.views - metrics.comments - metrics.votes) / metrics.views : 0;

      // Get previous period for trends
      const prevStartDate = this.getStartDateForPeriod(period, startDate);
      const prevMetricsResult = await readDatabase
        .select({
          views: sql<number>`COALESCE(SUM(${bill_engagement.viewCount}), 0)::int`,
          comments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          shares: sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`,
          votes: sql<number>`COUNT(DISTINCT ${votes.id})::int`
        })
        .from(bill_engagement)
        .leftJoin(comments, eq(comments.billId, bill_engagement.billId))
        .leftJoin(votes, and(
          eq(votes.targetId, bill_engagement.billId),
          eq(votes.targetType, 'bill')
        ))
        .where(and(
          eq(bill_engagement.billId, entityId),
          gte(bill_engagement.createdAt, prevStartDate),
          lte(bill_engagement.createdAt, startDate)
        ));

      const prevMetrics = prevMetricsResult[0];

      // Calculate trends
      const calculateChange = (current: number, previous: number) => 
        previous > 0 ? ((current - previous) / previous) * 100 : 0;

      const summary: EngagementSummary = {
        entityId,
        entityType,
        period,
        metrics: {
          views: metrics.views,
          uniqueViews: metrics.uniqueUsers,
          comments: metrics.comments,
          shares: metrics.shares,
          votes: metrics.votes,
          downloads: metrics.downloads,
          timeSpent: 0, // TODO: Calculate from duration data
          bounceRate,
          engagementRate
        },
        trends: {
          viewsChange: calculateChange(metrics.views, prevMetrics.views),
          commentsChange: calculateChange(metrics.comments, prevMetrics.comments),
          sharesChange: calculateChange(metrics.shares, prevMetrics.shares),
          votesChange: calculateChange(metrics.votes, prevMetrics.votes)
        },
        topSources: [] // TODO: Implement source tracking
      };

      await cacheService.set(cacheKey, summary, this.cacheTTL);
      return Ok(summary);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', entityId }, 'Failed to get engagement summary');
      return Err(new Error('Failed to retrieve engagement summary'));
    }
  }

  async getUserEngagementProfile(
    userId: string,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Result<UserEngagementProfile, Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:user:${userId}:${period}:${dateFrom}:${dateTo}`;
      const cached = await cacheService.get<UserEngagementProfile>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      const endDate = dateTo ? new Date(dateTo) : new Date();
      const startDate = dateFrom ? new Date(dateFrom) : this.getStartDateForPeriod(period, endDate);

      // Get user engagement data
      const engagementResult = await readDatabase
        .select({
          totalSessions: sql<number>`COUNT(DISTINCT ${bill_engagement.sessionId})::int`,
          totalTimeSpent: sql<number>`COALESCE(SUM(${bill_engagement.viewCount}), 0)::int`, // Placeholder
          billsViewed: sql<number>`COUNT(DISTINCT ${bill_engagement.billId})::int`,
          commentsPosted: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          votesGiven: sql<number>`COUNT(DISTINCT ${votes.id})::int`,
          sharesPerformed: sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`
        })
        .from(bill_engagement)
        .leftJoin(comments, eq(comments.userId, userId))
        .leftJoin(votes, eq(votes.userId, userId))
        .where(and(
          eq(bill_engagement.userId, userId),
          gte(bill_engagement.createdAt, startDate),
          lte(bill_engagement.createdAt, endDate)
        ));

      const engagement = engagementResult[0];
      const averageSessionDuration = engagement.totalSessions > 0 ? 
        engagement.totalTimeSpent / engagement.totalSessions : 0;

      // Calculate engagement score (simple algorithm)
      const engagementScore = (
        engagement.commentsPosted * 5 +
        engagement.votesGiven * 2 +
        engagement.sharesPerformed * 3 +
        engagement.billsViewed * 1
      );

      const profile: UserEngagementProfile = {
        userId,
        period,
        totalSessions: engagement.totalSessions,
        totalTimeSpent: engagement.totalTimeSpent,
        averageSessionDuration,
        billsViewed: engagement.billsViewed,
        commentsPosted: engagement.commentsPosted,
        votesGiven: engagement.votesGiven,
        sharesPerformed: engagement.sharesPerformed,
        engagementScore,
        interests: [], // TODO: Implement interest detection
        activityPattern: [] // TODO: Implement activity pattern analysis
      };

      await cacheService.set(cacheKey, profile, this.cacheTTL);
      return Ok(profile);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', userId }, 'Failed to get user engagement profile');
      return Err(new Error('Failed to retrieve user engagement profile'));
    }
  }

  async getTopContent(params: {
    entityType?: EngagementEntityType;
    period: TimePeriod;
    metric?: 'views' | 'engagement' | 'shares' | 'comments';
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Result<Array<{
    entityId: string;
    entityType: EngagementEntityType;
    title: string;
    metrics: {
      views: number;
      engagement: number;
      score: number;
    };
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
  }>, Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:top-content:${JSON.stringify(params)}`;
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      const endDate = params.dateTo ? new Date(params.dateTo) : new Date();
      const startDate = params.dateFrom ? new Date(params.dateFrom) : this.getStartDateForPeriod(params.period, endDate);
      const limit = Math.min(params.limit || 10, 100);

      // Get top content based on engagement metrics
      const topContentResult = await readDatabase
        .select({
          billId: bills.id,
          title: bills.title,
          views: sql<number>`COALESCE(SUM(${bill_engagement.viewCount}), 0)::int`,
          comments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          votes: sql<number>`COUNT(DISTINCT ${votes.id})::int`,
          shares: sql<number>`COALESCE(SUM(${bill_engagement.shareCount}), 0)::int`
        })
        .from(bills)
        .leftJoin(bill_engagement, eq(bill_engagement.billId, bills.id))
        .leftJoin(comments, eq(comments.billId, bills.id))
        .leftJoin(votes, and(
          eq(votes.targetId, bills.id),
          eq(votes.targetType, 'bill')
        ))
        .where(and(
          gte(bill_engagement.createdAt, startDate),
          lte(bill_engagement.createdAt, endDate)
        ))
        .groupBy(bills.id, bills.title)
        .orderBy(desc(sql`COALESCE(SUM(${bill_engagement.viewCount}), 0) + COUNT(DISTINCT ${comments.id}) * 5 + COUNT(DISTINCT ${votes.id}) * 2`))
        .limit(limit);

      const topContent = topContentResult.map(item => ({
        entityId: item.billId,
        entityType: 'bill' as EngagementEntityType,
        title: item.title,
        metrics: {
          views: item.views,
          engagement: item.comments + item.votes + item.shares,
          score: item.views + (item.comments * 5) + (item.votes * 2) + (item.shares * 3)
        },
        trend: 'stable' as const, // TODO: Calculate actual trends
        changePercentage: 0 // TODO: Calculate actual change
      }));

      await cacheService.set(cacheKey, topContent, this.cacheTTL);
      return Ok(topContent);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get top content');
      return Err(new Error('Failed to retrieve top content'));
    }
  }

  async getRealTimeMetrics(): Promise<Result<{
    activeUsers: number;
    currentSessions: number;
    topPages: Array<{
      path: string;
      activeUsers: number;
    }>;
    recentEvents: Array<{
      eventType: EngagementEventType;
      entityId: string;
      timestamp: string;
    }>;
    systemLoad: {
      cpu: number;
      memory: number;
      requests: number;
    };
  }, Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:realtime`;
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      // Get recent activity (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const recentActivityResult = await readDatabase
        .select({
          activeUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.userId})::int`,
          recentEvents: sql<number>`COUNT(*)::int`
        })
        .from(bill_engagement)
        .where(gte(bill_engagement.createdAt, fiveMinutesAgo));

      const activity = recentActivityResult[0];

      // Get recent events
      const recentEventsResult = await readDatabase
        .select({
          eventType: bill_engagement.eventType,
          entityId: bill_engagement.billId,
          timestamp: bill_engagement.createdAt
        })
        .from(bill_engagement)
        .where(gte(bill_engagement.createdAt, fiveMinutesAgo))
        .orderBy(desc(bill_engagement.createdAt))
        .limit(10);

      const metrics = {
        activeUsers: activity.activeUsers,
        currentSessions: Math.floor(activity.activeUsers * 1.2), // Estimate
        topPages: [], // TODO: Implement page tracking
        recentEvents: recentEventsResult.map(event => ({
          eventType: event.eventType as EngagementEventType,
          entityId: event.entityId,
          timestamp: event.timestamp.toISOString()
        })),
        systemLoad: {
          cpu: Math.random() * 100, // TODO: Get actual system metrics
          memory: Math.random() * 100,
          requests: activity.recentEvents
        }
      };

      await cacheService.set(cacheKey, metrics, 30); // 30 second cache
      return Ok(metrics);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get real-time metrics');
      return Err(new Error('Failed to retrieve real-time metrics'));
    }
  }

  // Helper methods
  private getStartDateForPeriod(period: TimePeriod, endDate: Date): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case TimePeriod.HOUR:
        start.setHours(start.getHours() - 1);
        break;
      case TimePeriod.DAY:
        start.setDate(start.getDate() - 1);
        break;
      case TimePeriod.WEEK:
        start.setDate(start.getDate() - 7);
        break;
      case TimePeriod.MONTH:
        start.setMonth(start.getMonth() - 1);
        break;
      case TimePeriod.QUARTER:
        start.setMonth(start.getMonth() - 3);
        break;
      case TimePeriod.YEAR:
        start.setFullYear(start.getFullYear() - 1);
        break;
      case TimePeriod.ALL_TIME:
        start.setFullYear(2020); // Platform start date
        break;
    }
    
    return start;
  }

  private async invalidateEngagementCaches(entityId: string, entityType: string): Promise<void> {
    const patterns = [
      `${this.cachePrefix}:summary:${entityType}:${entityId}:*`,
      `${this.cachePrefix}:top-content:*`,
      `${this.cachePrefix}:realtime`
    ];

    await Promise.all(patterns.map(pattern => cacheService.deletePattern(pattern)));
  }
}

export const analyticsService = new AnalyticsService();