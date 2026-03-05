/**
 * Engagement Repository
 * 
 * Provides data access operations for user and bill engagement metrics.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { 
  bill_engagement, 
  comments, 
  comment_votes, 
  users,
  bills 
} from '@server/infrastructure/schema';
import { eq, and, gte, desc, sql, count, sum } from 'drizzle-orm';

/**
 * Engagement entity type
 */
export type Engagement = typeof bill_engagement.$inferSelect;

/**
 * New engagement data type
 */
export type InsertEngagement = typeof bill_engagement.$inferInsert;

/**
 * User engagement metrics
 */
export interface UserEngagementMetrics {
  userId: string;
  totalComments: number;
  totalVotes: number;
  billsEngaged: number;
  averageEngagementScore: number;
  lastActivityDate: Date | null;
}

/**
 * Bill engagement metrics
 */
export interface BillEngagementMetrics {
  billId: string;
  viewCount: number;
  commentCount: number;
  shareCount: number;
  uniqueUsers: number;
  averageEngagementScore: number;
  trendingScore: number;
}

/**
 * Engagement repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new EngagementRepository();
 * 
 * // Get user engagement metrics
 * const result = await repository.getUserEngagementMetrics('user-123', '30d');
 * if (result.isOk) {
 *   console.log('User metrics:', result.value);
 * }
 * ```
 */
export class EngagementRepository extends BaseRepository<Engagement> {
  constructor() {
    super({
      entityName: 'Engagement',
      enableCache: true,
      cacheTTL: 1800, // 30 minutes (engagement data changes frequently)
      enableLogging: true,
    });
  }

  /**
   * Get comprehensive user engagement metrics
   */
  async getUserEngagementMetrics(
    userId: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<Result<UserEngagementMetrics, Error>> {
    return this.executeRead(
      async (db) => {
        const timeThreshold = this.buildTimeThreshold(timeframe);

        const metrics = await db
          .select({
            userId: users.id,
            totalComments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
            totalVotes: sql<number>`COUNT(DISTINCT ${comment_votes.id})::int`,
            billsEngaged: sql<number>`COUNT(DISTINCT ${bill_engagement.bill_id})::int`,
            averageEngagementScore: sql<number>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::float`,
            lastActivityDate: sql<Date | null>`MAX(GREATEST(
              ${comments.created_at},
              ${comment_votes.created_at},
              ${bill_engagement.created_at}
            ))`,
          })
          .from(users)
          .leftJoin(comments, and(
            eq(comments.user_id, users.id),
            gte(comments.created_at, timeThreshold)
          ))
          .leftJoin(comment_votes, and(
            eq(comment_votes.user_id, users.id),
            gte(comment_votes.created_at, timeThreshold)
          ))
          .leftJoin(bill_engagement, and(
            eq(bill_engagement.user_id, users.id),
            gte(bill_engagement.created_at, timeThreshold)
          ))
          .where(eq(users.id, userId))
          .groupBy(users.id);

        return metrics[0] || {
          userId,
          totalComments: 0,
          totalVotes: 0,
          billsEngaged: 0,
          averageEngagementScore: 0,
          lastActivityDate: null,
        };
      },
      `engagement:user:${userId}:${timeframe}`
    );
  }

  /**
   * Get bill engagement metrics
   */
  async getBillEngagementMetrics(
    billId: string
  ): Promise<Result<BillEngagementMetrics, Error>> {
    return this.executeRead(
      async (db) => {
        const metrics = await db
          .select({
            billId: bills.id,
            viewCount: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
            commentCount: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
            shareCount: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
            uniqueUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})::int`,
            averageEngagementScore: sql<number>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::float`,
            trendingScore: sql<number>`
              COALESCE(SUM(${bill_engagement.view_count}), 0) * 1.0 +
              COUNT(DISTINCT ${comments.id}) * 5.0 +
              COALESCE(SUM(${bill_engagement.share_count}), 0) * 10.0
            `,
          })
          .from(bills)
          .leftJoin(bill_engagement, eq(bill_engagement.bill_id, bills.id))
          .leftJoin(comments, eq(comments.bill_id, bills.id))
          .where(eq(bills.id, billId))
          .groupBy(bills.id);

        return metrics[0] || {
          billId,
          viewCount: 0,
          commentCount: 0,
          shareCount: 0,
          uniqueUsers: 0,
          averageEngagementScore: 0,
          trendingScore: 0,
        };
      },
      `engagement:bill:${billId}`
    );
  }

  /**
   * Track engagement event
   */
  async trackEngagement(
    data: InsertEngagement
  ): Promise<Result<Engagement, Error>> {
    return this.executeWrite(
      async (tx) => {
        // Upsert engagement record
        const results = await tx
          .insert(bill_engagement)
          .values({
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: [bill_engagement.bill_id, bill_engagement.user_id],
            set: {
              view_count: sql`${bill_engagement.view_count} + ${data.view_count || 0}`,
              share_count: sql`${bill_engagement.share_count} + ${data.share_count || 0}`,
              engagement_score: sql`${bill_engagement.engagement_score} + ${data.engagement_score || 0}`,
              updated_at: new Date(),
            },
          })
          .returning();

        return results[0];
      },
      [
        `engagement:user:${data.user_id}:*`,
        `engagement:bill:${data.bill_id}`,
        'engagement:trending:*'
      ]
    );
  }

  /**
   * Get trending bills
   */
  async getTrendingBills(
    limit: number = 10,
    timeframe: '24h' | '7d' | '30d' = '7d'
  ): Promise<Result<Array<{ billId: string; trendingScore: number }>, Error>> {
    return this.executeRead(
      async (db) => {
        const timeThreshold = this.buildTimeThreshold(timeframe);

        const trending = await db
          .select({
            billId: bills.id,
            trendingScore: sql<number>`
              COALESCE(SUM(${bill_engagement.view_count}), 0) * 1.0 +
              COUNT(DISTINCT ${comments.id}) * 5.0 +
              COALESCE(SUM(${bill_engagement.share_count}), 0) * 10.0
            `,
          })
          .from(bills)
          .leftJoin(bill_engagement, and(
            eq(bill_engagement.bill_id, bills.id),
            gte(bill_engagement.created_at, timeThreshold)
          ))
          .leftJoin(comments, and(
            eq(comments.bill_id, bills.id),
            gte(comments.created_at, timeThreshold)
          ))
          .groupBy(bills.id)
          .orderBy(desc(sql`trending_score`))
          .limit(limit);

        return trending;
      },
      `engagement:trending:${timeframe}:${limit}`
    );
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(
    limit: number = 10,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<Result<Array<{ userId: string; engagementScore: number }>, Error>> {
    return this.executeRead(
      async (db) => {
        const timeThreshold = this.buildTimeThreshold(timeframe);

        const leaderboard = await db
          .select({
            userId: users.id,
            engagementScore: sql<number>`
              COUNT(DISTINCT ${comments.id}) * 5.0 +
              COUNT(DISTINCT ${comment_votes.id}) * 1.0 +
              COALESCE(SUM(${bill_engagement.engagement_score}), 0)
            `,
          })
          .from(users)
          .leftJoin(comments, and(
            eq(comments.user_id, users.id),
            gte(comments.created_at, timeThreshold)
          ))
          .leftJoin(comment_votes, and(
            eq(comment_votes.user_id, users.id),
            gte(comment_votes.created_at, timeThreshold)
          ))
          .leftJoin(bill_engagement, and(
            eq(bill_engagement.user_id, users.id),
            gte(bill_engagement.created_at, timeThreshold)
          ))
          .groupBy(users.id)
          .orderBy(desc(sql`engagement_score`))
          .limit(limit);

        return leaderboard;
      },
      `engagement:leaderboard:${timeframe}:${limit}`
    );
  }

  /**
   * Helper to build time threshold for queries
   */
  private buildTimeThreshold(timeframe: string): Date {
    const now = new Date();
    const days = parseInt(timeframe.replace(/\D/g, ''));
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
}

export const engagementRepository = new EngagementRepository();
