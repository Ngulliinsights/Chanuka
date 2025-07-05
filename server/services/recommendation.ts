import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  billEngagement,
  bills,
  billTags,
  db,
  userInterests,
  type Bill,
} from '../../../shared/schema.js';

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
    // Status weights
    STATUS_INTRODUCED: 2.0,
    STATUS_COMMITTEE: 1.5,
    STATUS_OTHER: 1.0,
  };

  /**
   * Get user's interests from database
   * @param userId - The ID of the user
   * @returns Promise resolving to array of interest strings
   */
  private async getUserInterests(userId: number): Promise<string[]> {
    try {
      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      return interests.map(i => i.interest);
    } catch (error) {
      console.error('Error getting user interests:', error);
      return [];
    }
  }

  /**
   * Get user's previously engaged bill IDs
   * @param userId - The ID of the user
   * @returns Promise resolving to array of bill IDs
   */
  private async getUserEngagedBillIds(userId: number): Promise<number[]> {
    try {
      const userEngagement = await db
        .select({ billId: billEngagement.billId })
        .from(billEngagement)
        .where(eq(billEngagement.userId, userId));

      return userEngagement.map(e => e.billId);
    } catch (error) {
      console.error('Error getting user engagement:', error);
      return [];
    }
  }

  /**
   * Calculate bill score based on status and engagement metrics
   * @returns SQL expression for bill score calculation
   */
  private getBillScoreExpression() {
    return sql<number>`
      CASE
        WHEN ${bills.status} = 'introduced' THEN ${this.SCORING_WEIGHTS.STATUS_INTRODUCED}
        WHEN ${bills.status} = 'committee' THEN ${this.SCORING_WEIGHTS.STATUS_COMMITTEE}
        ELSE ${this.SCORING_WEIGHTS.STATUS_OTHER}
      END *
      (${bills.viewCount} * ${this.SCORING_WEIGHTS.VIEW} +
       ${bills.shareCount} * ${this.SCORING_WEIGHTS.SHARE})
    `;
  }

  /**
   * Get personalized bill recommendations for a user
   *
   * @param userId - The ID of the user to get recommendations for
   * @param limit - Maximum number of recommendations to return (default: 10)
   * @returns Promise resolving to an array of recommended bills with scores
   */
  async getPersonalizedRecommendations(
    userId: number,
    limit: number = 10,
  ): Promise<Array<Bill & { score: number }>> {
    try {
      // Get user's interests and engagement history in parallel
      const [interestTags, engagedBillIds] = await Promise.all([
        this.getUserInterests(userId),
        this.getUserEngagedBillIds(userId),
      ]);

      // Find bills with matching tags that user hasn't engaged with yet
      const recommendedBills = await db
        .select({
          bill: bills,
          score: this.getBillScoreExpression().as('score'),
        })
        .from(bills)
        .leftJoin(billTags, eq(bills.id, billTags.billId))
        .where(
          and(
            // Exclude bills the user has already engaged with
            engagedBillIds.length > 0
              ? sql`${bills.id} NOT IN (${sql.placeholder('engagedBills')})`
              : sql`1=1`,
            // Include bills with matching tags or popular bills
            or(
              interestTags.length > 0 ? inArray(billTags.tag, interestTags) : sql`1=0`,
              sql`${bills.viewCount} > 100`,
            ),
          ),
        )
        .groupBy(bills.id)
        .orderBy(desc(sql`score`))
        .limit(limit)
        .prepare('get_personalized_recommendations')
        .execute({ engagedBills: engagedBillIds });

      // Transform results to expected format
      return recommendedBills.map(rb => ({
        ...rb.bill,
        score: rb.score,
      }));
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get similar bills based on content and user engagement patterns
   *
   * @param billId - The ID of the bill to find similar bills for
   * @param limit - Maximum number of similar bills to return (default: 5)
   * @returns Promise resolving to an array of similar bills with similarity scores
   */
  async getSimilarBills(
    billId: number,
    limit: number = 5,
  ): Promise<Array<Bill & { similarityScore: number }>> {
    try {
      // Get the target bill's tags
      const billTagsResult = await db
        .select({ tag: billTags.tag })
        .from(billTags)
        .where(eq(billTags.billId, billId));

      const tags = billTagsResult.map(t => t.tag);

      if (tags.length === 0) {
        return [];
      }

      // Find bills with similar tags
      const similarBills = await db
        .select({
          bill: bills,
          // Calculate similarity score based on tag overlap and engagement metrics
          similarityScore: sql<number>`
            (SELECT COUNT(*) FROM bill_tags bt
             WHERE bt.bill_id = ${bills.id}
             AND bt.tag IN (${sql.placeholder('tagList')}))
            * 0.5 +
            (${bills.viewCount} * ${this.SCORING_WEIGHTS.VIEW / 10} +
             ${bills.shareCount} * ${this.SCORING_WEIGHTS.SHARE / 3})
          `.as('similarity_score'),
        })
        .from(bills)
        .where(
          and(
            // Exclude the original bill
            sql`${bills.id} != ${billId}`,
            // Only include bills with at least one matching tag
            sql`EXISTS (SELECT 1 FROM bill_tags bt
                       WHERE bt.bill_id = ${bills.id}
                       AND bt.tag IN (${sql.placeholder('tagList')}))`,
          ),
        )
        .orderBy(desc(sql`similarity_score`))
        .limit(limit)
        .prepare('get_similar_bills')
        .execute({ tagList: tags });

      // Transform results to expected format
      return similarBills.map(sb => ({
        ...sb.bill,
        similarityScore: sb.similarityScore,
      }));
    } catch (error) {
      console.error('Error getting similar bills:', error);
      return [];
    }
  }

  /**
   * Get trending bills based on recent engagement metrics
   *
   * @param days - Number of days to consider for trending calculation (default: 7)
   * @param limit - Maximum number of trending bills to return (default: 10)
   * @returns Promise resolving to an array of trending bills with trend scores
   */
  async getTrendingBills(
    days: number = 7,
    limit: number = 10,
  ): Promise<Array<Bill & { trendScore: number }>> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      // Calculate trending score based on recent comments, shares, and views
      const trendingBills = await db
        .select({
          bill: bills,
          // Calculate trend score based on recent engagement
          trendScore: sql<number>`
            (SELECT COALESCE(COUNT(*), 0) FROM bill_comments bc
             WHERE bc.bill_id = ${bills.id}
             AND bc.created_at > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.COMMENT * 4} +
            (SELECT COALESCE(COUNT(*), 0) FROM social_shares ss
             WHERE ss.bill_id = ${bills.id}
             AND ss.created_at > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.SHARE * 10} +
            (SELECT COALESCE(SUM(be.view_count), 0) FROM bill_engagement be
             WHERE be.bill_id = ${bills.id}
             AND be.last_engaged > ${dateThreshold})
            * ${this.SCORING_WEIGHTS.VIEW}
          `.as('trend_score'),
        })
        .from(bills)
        .orderBy(desc(sql`trend_score`))
        .limit(limit)
        .prepare('get_trending_bills')
        .execute({ days });

      // Transform results to expected format
      return trendingBills.map(tb => ({
        ...tb.bill,
        trendScore: tb.trendScore,
      }));
    } catch (error) {
      console.error('Error getting trending bills:', error);
      return [];
    }
  }

  /**
   * Track user engagement with a bill and update engagement metrics
   *
   * @param userId - The ID of the user
   * @param billId - The ID of the bill
   * @param engagementType - Type of engagement ('view', 'comment', 'share')
   * @returns Promise resolving to the updated engagement record
   */
  async trackEngagement(
    userId: number,
    billId: number,
    engagementType: 'view' | 'comment' | 'share',
  ): Promise<any> {
    try {
      // Check if engagement record exists
      const existingEngagement = await db
        .select()
        .from(billEngagement)
        .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)))
        .limit(1);

      const now = new Date();

      if (existingEngagement.length > 0) {
        // Update existing engagement record
        const engagement = existingEngagement[0];
        const updates: Record<string, any> = {
          lastEngaged: now,
          updatedAt: now,
        };

        // Update specific engagement counter
        if (engagementType === 'view') {
          updates.viewCount = (engagement.viewCount || 0) + 1;
        } else if (engagementType === 'comment') {
          updates.commentCount = (engagement.commentCount || 0) + 1;
        } else if (engagementType === 'share') {
          updates.shareCount = (engagement.shareCount || 0) + 1;
        }

        // Calculate engagement score using consistent weights
        const viewCount = updates.viewCount ?? engagement.viewCount ?? 0;
        const commentCount = updates.commentCount ?? engagement.commentCount ?? 0;
        const shareCount = updates.shareCount ?? engagement.shareCount ?? 0;

        updates.engagementScore = this.calculateEngagementScore(
          viewCount,
          commentCount,
          shareCount,
        );

        // Update the record
        return db
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

        return db
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
      console.error('Error tracking engagement:', error);
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
    return (
      viewCount * this.SCORING_WEIGHTS.VIEW +
      commentCount * this.SCORING_WEIGHTS.COMMENT +
      shareCount * this.SCORING_WEIGHTS.SHARE
    );
  }

  /**
   * Get collaborative recommendations based on similar users' engagement
   *
   * @param userId - The ID of the user to get recommendations for
   * @param limit - Maximum number of recommendations to return (default: 10)
   * @returns Promise resolving to an array of recommended bills with scores
   */
  async getCollaborativeRecommendations(
    userId: number,
    limit: number = 10,
  ): Promise<Array<Bill & { score: number }>> {
    try {
      // Get user's interests
      const interests = await this.getUserInterests(userId);

      if (interests.length === 0) {
        // Fall back to trending recommendations if no interests found
        return this.getTrendingBills(30, limit);
      }

      // Find users with similar interests - using prepared statement for safety
      const similarUsers = await db
        .select({ userId: userInterests.userId })
        .from(userInterests)
        .where(
          and(
            inArray(userInterests.interest, interests),
            sql`${userInterests.userId} != ${userId}`,
          ),
        )
        .groupBy(userInterests.userId)
        .having(
          sql`COUNT(DISTINCT ${userInterests.interest}) >= ${Math.max(1, Math.floor(interests.length * 0.5))}`,
        )
        .prepare('find_similar_users')
        .execute();

      const similarUserIds = similarUsers.map(u => u.userId);

      if (similarUserIds.length === 0) {
        // Fall back to trending recommendations if no similar users found
        return this.getTrendingBills(30, limit);
      }

      // Get bills that similar users have engaged with
      const engagedBills = await db
        .select({
          bill: bills,
          score: sql<number>`
            SUM(${billEngagement.engagementScore}) / COUNT(DISTINCT ${billEngagement.userId})
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
          ),
        )
        .groupBy(bills.id)
        .orderBy(desc(sql`collaborative_score`))
        .limit(limit)
        .prepare('get_collaborative_recommendations')
        .execute();

      // Transform results to expected format
      return engagedBills.map(eb => ({
        ...eb.bill,
        score: eb.score,
      }));

      // Get users with similar engagement patterns
      const similarUsers = await db
        .select({
          userId: userEngagements.userId,
          similarity: sql`COUNT(*)`,
        })
        .from(userEngagements)
        .where(
          and(ne(userEngagements.userId, userId), inArray(userEngagements.billId, userBillIds)),
        )
        .groupBy(userEngagements.userId)
        .having(sql`COUNT(*) >= ${SIMILARITY_THRESHOLD}`)
        .execute();

      const userSimilarities = similarUsers.map(u => ({
        userId: u.userId,
        similarity: Number(u.similarity),
      }));

      // Get bills that similar users have engaged with
      const engagementsByUser = await db
        .select({
          bill: bills,
          userId: userEngagements.userId,
          engagementType: userEngagements.type,
        })
        .from(userEngagements)
        .where(
          inArray(
            userEngagements.userId,
            userSimilarities.map(u => u.userId),
          ),
        )
        .leftJoin(bills, eq(bills.id, userEngagements.billId))
        .execute();

      // Aggregate and score recommendations
      const recommendations = this.aggregateRecommendations(
        engagementsByUser,
        userSimilarities,
        userBillIds,
      );

      // Transform results to expected format
      return engagedBills.map(eb => ({
        ...eb.bill,
        score: eb.score,
      }));
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }
}
