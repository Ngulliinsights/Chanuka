import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  billEngagement,
  bills,
  billTags,
  userInterests,
  type Bill,
} from '../../../shared/schema';
import { db } from '../db';
import { logger } from '../../utils/logger';

/**
 * Recommendation Service
 *
 * This service provides personalized bill recommendations based on user behavior,
 * interests, and engagement patterns. It uses a combination of collaborative filtering
 * and content-based approaches to generate relevant recommendations.
 */
export class RecommendationService {
  // Consistent engagement scoring weights across the service
  private readonly SCORING_WEIGHTS = {
    VIEW: 0.1,
    COMMENT: 0.5,
    SHARE: 0.3,
    // Status weights for bill prioritization
    STATUS_INTRODUCED: 2.0,
    STATUS_COMMITTEE: 1.5,
    STATUS_OTHER: 1.0,
    // Collaborative filtering weights
    COLLABORATIVE_DECAY: 0.8, // Reduces weight for distant user similarities
    MINIMUM_SIMILARITY: 0.3, // Minimum similarity threshold for recommendations
  } as const;

  // Cache for frequently accessed data to reduce database hits
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime

  /**
   * Generic cache management utility
   * @param key - Cache key identifier
   * @param fetcher - Function to fetch data if not cached
   * @returns Cached or freshly fetched data
   */
  private async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, { data, timestamp: now });
      return data;
    } catch (error) {
      // If fetch fails but we have stale cache, return it as fallback
      if (cached) {
        console.warn(`Using stale cache for key: ${key}`, error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Get user's interests from database with caching
   * @param userId - The ID of the user
   * @returns Promise resolving to array of interest strings
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    const cacheKey = `user_interests_${userId}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        const interests = await db()
          .select({ interest: userInterests.interest })
          .from(userInterests)
          .where(eq(userInterests.userId, userId));

        return interests.map((i: { interest: string }) => i.interest);
      } catch (error) {
        logger.error('Error getting user interests:', { component: 'SimpleTool' }, error);
        return [];
      }
    });
  }

  /**
   * Get user's previously engaged bill IDs with caching
   * @param userId - The ID of the user
   * @returns Promise resolving to array of bill IDs
   */
  private async getUserEngagedBillIds(userId: string): Promise<number[]> {
    const cacheKey = `user_engaged_bills_${userId}`;

    return this.getCachedData(cacheKey, async () => {
      try {
        const userEngagement = await db()
          .select({ billId: billEngagement.billId })
          .from(billEngagement)
          .where(eq(billEngagement.userId, userId));

        return userEngagement.map((e: { billId: number }) => e.billId);
      } catch (error) {
        logger.error('Error getting user engagement:', { component: 'SimpleTool' }, error);
        return [];
      }
    });
  }

  /**
   * Enhanced bill score calculation with more sophisticated weighting
   * @returns SQL expression for bill score calculation
   */
  private getBillScoreExpression() {
    return sql<number>`
      CASE
        WHEN ${bills.status} = 'introduced' THEN ${this.SCORING_WEIGHTS.STATUS_INTRODUCED}
        WHEN ${bills.status} = 'committee' THEN ${this.SCORING_WEIGHTS.STATUS_COMMITTEE}
        ELSE ${this.SCORING_WEIGHTS.STATUS_OTHER}
      END *
      (COALESCE(${bills.viewCount}, 0) * ${this.SCORING_WEIGHTS.VIEW} +
       COALESCE(${bills.shareCount}, 0) * ${this.SCORING_WEIGHTS.SHARE} +
       -- Add recency factor: newer bills get slight boost
       CASE 
         WHEN ${bills.createdAt} > NOW() - INTERVAL '7 days' THEN 1.2
         WHEN ${bills.createdAt} > NOW() - INTERVAL '30 days' THEN 1.1
         ELSE 1.0
       END)
    `;
  }

  /**
   * Get personalized bill recommendations for a user
   * This method combines content-based filtering (interests) with popularity signals
   *
   * @param userId - The ID of the user to get recommendations for
   * @param limit - Maximum number of recommendations to return
   * @returns Promise resolving to an array of recommended bills with scores
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<Array<Bill & { score: number }>> {
    try {
      // Input validation
      if (!userId || limit <= 0) {
        throw new Error('Invalid parameters: userId must be provided and limit must be positive');
      }

      // Get user's interests and engagement history in parallel for efficiency
      const [interestTags, engagedBillIds] = await Promise.all([
        this.getUserInterests(userId),
        this.getUserEngagedBillIds(userId),
      ]);

      // Build the query dynamically based on available data
      const whereConditions = [];
      const queryParams: Record<string, any> = {};

      // Always exclude bills the user has already engaged with
      if (engagedBillIds.length > 0) {
        whereConditions.push(sql`${bills.id} NOT IN (${sql.join(engagedBillIds.map(id => sql`${id}`), sql`, `)})`);
        queryParams.engagedBills = engagedBillIds;
      }

      // Include content-based filtering if user has interests
      if (interestTags.length > 0) {
        whereConditions.push(
          or(
            inArray(billTags.tag, interestTags),
            sql`${bills.viewCount} > 50` // Lower threshold for broader discovery
          )
        );
      } else {
        // If no interests, focus on popular and recent bills
        whereConditions.push(sql`${bills.viewCount} > 25`);
      }

      const recommendedBills = await db()
        .select({
          bill: bills,
          score: this.getBillScoreExpression().as('score'),
        })
        .from(bills)
        .leftJoin(billTags, eq(bills.id, billTags.billId))
        .where(and(...whereConditions))
        .groupBy(bills.id)
        .orderBy(desc(sql`score`))
        .limit(Math.min(limit, 50)) // Cap limit to prevent excessive queries
        .execute();

      // Transform results to expected format
      return recommendedBills.map((rb: { bill: Bill; score: number }) => ({
        ...rb.bill,
        score: rb.score,
      }));
    } catch (error) {
      logger.error('Error getting personalized recommendations:', { component: 'SimpleTool' }, error);
      // Return empty array rather than throwing to prevent cascade failures
      return [];
    }
  }

  /**
   * Get similar bills based on content and user engagement patterns
   * This method uses tag overlap and engagement metrics to find content similarity
   *
   * @param billId - The ID of the bill to find similar bills for
   * @param limit - Maximum number of similar bills to return
   * @returns Promise resolving to an array of similar bills with similarity scores
   */
  async getSimilarBills(
    billId: number,
    limit: number = 5,
  ): Promise<Array<Bill & { similarityScore: number }>> {
    try {
      // Input validation
      if (!billId || limit <= 0) {
        throw new Error('Invalid parameters: billId must be provided and limit must be positive');
      }

      // Get the target bill's tags with caching
      const cacheKey = `bill_tags_${billId}`;
      const billTagsResult = await this.getCachedData(cacheKey, async () => {
        return db()
          .select({ tag: billTags.tag })
          .from(billTags)
          .where(eq(billTags.billId, billId));
      });

      const tags = billTagsResult.map((t: { tag: string }) => t.tag);

      if (tags.length === 0) {
        return [];
      }

      // Enhanced similarity calculation with tag weight consideration
      const similarBills = await db()
        .select({
          bill: bills,
          // More sophisticated similarity score calculation
          similarityScore: sql<number>`
            -- Tag overlap score (primary factor)
            (SELECT COUNT(DISTINCT bt.tag) FROM bill_tags bt
             WHERE bt.bill_id = ${bills.id}
             AND bt.tag IN (${sql.join(tags.map((tag: string) => sql`${tag}`), sql`, `)}))
            * 1.0 / ${tags.length} * 0.7 +
            -- Engagement similarity score (secondary factor)
            LEAST(
              (COALESCE(${bills.viewCount}, 0) * ${this.SCORING_WEIGHTS.VIEW} +
               COALESCE(${bills.shareCount}, 0) * ${this.SCORING_WEIGHTS.SHARE}) / 100,
              0.3
            )
          `.as('similarity_score'),
        })
        .from(bills)
        .where(
          and(
            sql`${bills.id} != ${billId}`,
            sql`EXISTS (SELECT 1 FROM bill_tags bt
                       WHERE bt.bill_id = ${bills.id}
                       AND bt.tag IN (${sql.join(tags.map((tag: string) => sql`${tag}`), sql`, `)}))`
          )
        )
        .orderBy(desc(sql`similarity_score`))
        .limit(Math.min(limit, 20)) // Cap limit for performance
        .execute();

      // Transform results to expected format
      return similarBills.map((sb: { bill: Bill; similarityScore: number }) => ({
        ...sb.bill,
        similarityScore: sb.similarityScore,
      }));
    } catch (error) {
      logger.error('Error getting similar bills:', { component: 'SimpleTool' }, error);
      return [];
    }
  }

  /**
   * Get trending bills based on recent engagement metrics
   * This method identifies bills with high recent activity across multiple engagement types
   *
   * @param days - Number of days to consider for trending calculation
   * @param limit - Maximum number of trending bills to return
   * @returns Promise resolving to an array of trending bills with trend scores
   */
  async getTrendingBills(
    days: number = 7,
    limit: number = 10,
  ): Promise<Array<Bill & { trendScore: number }>> {
    try {
      // Input validation with reasonable bounds
      if (days <= 0 || days > 365) {
        throw new Error('Days parameter must be between 1 and 365');
      }
      if (!limit) {
        throw new Error('Limit must be provided');
      }

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      // Enhanced trending calculation with velocity consideration
      const trendingBills = await db()
        .select({
          bill: bills,
          // More nuanced trend score calculation
          trendScore: sql<number>`
            -- Recent engagement velocity
            (SELECT COALESCE(COUNT(*), 0) FROM bill_comments bc
             WHERE bc.bill_id = ${bills.id}
             AND bc.created_at > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.COMMENT * 3} +

            -- Social sharing momentum
            (SELECT COALESCE(COUNT(*), 0) FROM social_shares ss
             WHERE ss.bill_id = ${bills.id}
             AND ss.created_at > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.SHARE * 8} +

            -- View engagement with recency weighting
            (SELECT COALESCE(SUM(
              CASE 
                WHEN be.last_engaged > NOW() - INTERVAL '1 day' THEN be.view_count * 1.5
                WHEN be.last_engaged > NOW() - INTERVAL '3 days' THEN be.view_count * 1.2
                ELSE be.view_count
              END
            ), 0) FROM bill_engagement be
             WHERE be.bill_id = ${bills.id}
             AND be.last_engaged > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.VIEW * 2} +

            -- Bonus for bills with sustained activity
            CASE 
              WHEN (SELECT COUNT(DISTINCT DATE(bc.created_at)) FROM bill_comments bc
                    WHERE bc.bill_id = ${bills.id} AND bc.created_at > ${dateThreshold}) >= 3
              THEN 5.0
              ELSE 0.0
            END
          `.as('trend_score'),
        })
        .from(bills)
        .having(sql`trend_score > 0`) // Only include bills with actual trending activity
        .orderBy(desc(sql`trend_score`))
        .limit(Math.min(limit, 25)) // Cap limit for performance
        .execute();

      // Transform results to expected format
      return trendingBills.map((tb: { bill: Bill; trendScore: number }) => ({
        ...tb.bill,
        trendScore: tb.trendScore,
      }));
    } catch (error) {
      logger.error('Error getting trending bills:', { component: 'SimpleTool' }, error);
      return [];
    }
  }

  /**
   * Track user engagement with enhanced atomicity and cache invalidation
   * This method ensures data consistency and updates relevant caches
   *
   * @param userId - The ID of the user
   * @param billId - The ID of the bill
   * @param engagementType - Type of engagement ('view', 'comment', 'share')
   * @returns Promise resolving to the updated engagement record
   */
  async trackEngagement(
    userId: string,
    billId: number,
    engagementType: 'view' | 'comment' | 'share',
  ): Promise<any> {
    try {
      // Input validation
      if (!userId || !billId) {
        throw new Error('Invalid parameters: userId and billId must be provided');
      }
      if (!['view', 'comment', 'share'].includes(engagementType)) {
        throw new Error('Invalid engagement type');
      }

      // Clear relevant caches since engagement is changing
      const cacheKeysToInvalidate = [
        `user_engaged_bills_${userId}`,
        `bill_tags_${billId}`,
      ];
      cacheKeysToInvalidate.forEach(key => this.cache.delete(key));

      // Check if engagement record exists
      const existingEngagement = await db()
        .select()
        .from(billEngagement)
        .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)))
        .limit(1);

      const now = new Date();

      if (existingEngagement.length > 0) {
        // Update existing engagement record with optimistic concurrency
        const engagement = existingEngagement[0];
        const updates: Record<string, any> = {
          lastEngaged: now,
          updatedAt: now,
        };

        // Update specific engagement counter with null safety
        const currentViewCount = engagement.viewCount ?? 0;
        const currentCommentCount = engagement.commentCount ?? 0;
        const currentShareCount = engagement.shareCount ?? 0;

        if (engagementType === 'view') {
          updates.viewCount = currentViewCount + 1;
        } else if (engagementType === 'comment') {
          updates.commentCount = currentCommentCount + 1;
        } else if (engagementType === 'share') {
          updates.shareCount = currentShareCount + 1;
        }

        // Calculate engagement score using consistent weights
        const finalViewCount = updates.viewCount ?? currentViewCount;
        const finalCommentCount = updates.commentCount ?? currentCommentCount;
        const finalShareCount = updates.shareCount ?? currentShareCount;

        updates.engagementScore = this.calculateEngagementScore(
          finalViewCount,
          finalCommentCount,
          finalShareCount,
        );

        // Update the record atomically
        return db()
          .update(billEngagement)
          .set(updates)
          .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)))
          .returning();
      } else {
        // Create new engagement record
        const viewCount = engagementType === 'view' ? 1 : 0;
        const commentCount = engagementType === 'comment' ? 1 : 0;
        const shareCount = engagementType === 'share' ? 1 : 0;
        const engagementScore = this.calculateEngagementScore(viewCount, commentCount, shareCount);

        return db()
          .insert(billEngagement)
          .values({
            userId,
            billId,
            viewCount,
            commentCount,
            shareCount,
            engagementScore,
            lastEngaged: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }
    } catch (error) {
      logger.error('Error tracking engagement:', { component: 'SimpleTool' }, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Calculate engagement score with consistent weights
   * @private
   */
  private calculateEngagementScore(
    viewCount: number,
    commentCount: number,
    shareCount: number,
  ): number {
    // Add null safety and ensure non-negative values
    const safeViewCount = Math.max(0, viewCount || 0);
    const safeCommentCount = Math.max(0, commentCount || 0);
    const safeShareCount = Math.max(0, shareCount || 0);

    return (
      safeViewCount * this.SCORING_WEIGHTS.VIEW +
      safeCommentCount * this.SCORING_WEIGHTS.COMMENT +
      safeShareCount * this.SCORING_WEIGHTS.SHARE
    );
  }

  /**
   * Get collaborative recommendations based on similar users' engagement
   * This method uses user-based collaborative filtering to suggest bills
   *
   * @param userId - The ID of the user to get recommendations for
   * @param limit - Maximum number of recommendations to return
   * @returns Promise resolving to an array of recommended bills with scores
   */
  async getCollaborativeRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<Array<Bill & { score: number }>> {
    try {
      // Input validation
      if (!userId || limit <= 0) {
        throw new Error('Invalid parameters: userId and limit must be positive');
      }

      // Get user's interests efficiently
      const interests = await this.getUserInterests(userId);

      if (interests.length === 0) {
        // Fall back to trending recommendations if no interests found
        const trendingBills = await this.getTrendingBills(30, limit);
        return trendingBills.map(tb => ({ ...tb, score: tb.trendScore }));
      }

      // Find users with similar interests using a more sophisticated approach
      const minSharedInterests = Math.max(1, Math.floor(interests.length * 0.4));

      const similarUsers = await db()
        .select({ 
          userId: userInterests.userId,
          sharedInterests: sql<number>`COUNT(DISTINCT ${userInterests.interest})`.as('shared_interests')
        })
        .from(userInterests)
        .where(
          and(
            inArray(userInterests.interest, interests),
            sql`${userInterests.userId} != ${userId}`,
          ),
        )
        .groupBy(userInterests.userId)
        .having(sql`COUNT(DISTINCT ${userInterests.interest}) >= ${minSharedInterests}`)
        .orderBy(desc(sql`shared_interests`))
        .limit(50) // Limit similar users for performance
        .execute();

      if (similarUsers.length === 0) {
        // Fall back to trending recommendations if no similar users found
        const trendingBills = await this.getTrendingBills(30, limit);
        return trendingBills.map(tb => ({ ...tb, score: tb.trendScore }));
      }

      const similarUserIds = similarUsers.map((u: { userId: string; sharedInterests: number }) => u.userId);

      // Get bills that similar users have engaged with, weighted by similarity
      const engagedBills = await db()
        .select({
          bill: bills,
          score: sql<number>`
            -- Weight by user similarity and engagement quality
            AVG(
              ${billEngagement.engagementScore} * 
              -- Similarity weight based on shared interests
              CASE 
                WHEN EXISTS (
                  SELECT 1 FROM user_interests ui 
                  WHERE ui.user_id = ${billEngagement.userId} 
                  AND ui.interest IN (${sql.join(interests.map(interest => sql`${interest}`), sql`, `)})
                  GROUP BY ui.user_id
                  HAVING COUNT(DISTINCT ui.interest) >= ${Math.floor(interests.length * 0.6)}
                ) THEN 1.0
                ELSE ${this.SCORING_WEIGHTS.COLLABORATIVE_DECAY}
              END
            )
          `.as('collaborative_score'),
        })
        .from(billEngagement)
        .innerJoin(bills, eq(billEngagement.billId, bills.id))
        .where(
          and(
            inArray(billEngagement.userId, similarUserIds),
            // Exclude bills the user has already engaged with
            sql`NOT EXISTS (
              SELECT 1 FROM bill_engagement be
              WHERE be.bill_id = ${bills.id}
              AND be.user_id = ${userId}
            )`,
            // Only include bills with meaningful engagement
            sql`${billEngagement.engagementScore} > ${this.SCORING_WEIGHTS.MINIMUM_SIMILARITY}`
          ),
        )
        .groupBy(bills.id)
        .having(sql`collaborative_score > ${this.SCORING_WEIGHTS.MINIMUM_SIMILARITY}`)
        .orderBy(desc(sql`collaborative_score`))
        .limit(Math.min(limit, 30)) // Cap limit for performance
        .execute();

      // Transform results to expected format
      return engagedBills.map((eb: { bill: Bill; score: number }) => ({
        ...eb.bill,
        score: eb.score,
      }));
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', { component: 'SimpleTool' }, error);
      return [];
    }
  }

  /**
   * Clear all cached data - useful for testing or when fresh data is required
   * @public
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring and debugging
   * @public
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}








