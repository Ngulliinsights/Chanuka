import { and, desc, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import {
  billEngagement,
  bills,
  billTags,
  userInterests,
  type Bill,
} from '@shared/schema';
import { readDatabase } from '@shared/database/connection';
import { logger  } from '../../../../shared/core/src/index.js';
import { RecommendationEngine } from '../domain/RecommendationEngine';
import { RecommendationValidator } from '../domain/RecommendationValidator';
import { RecommendationRepository } from '../infrastructure/RecommendationRepository';
import { RecommendationCache } from '../infrastructure/RecommendationCache';

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
   * This provides a clean abstraction for caching any type of data with automatic
   * expiration and fallback to stale data if fresh data fetching fails.
   * 
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
   * Interests are relatively stable data, making them ideal for caching.
   * 
   * @param userId - The ID of the user
   * @returns Promise resolving to array of interest strings
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    const cacheKey = `user_interests_${userId}`;

    return this.getCachedData(cacheKey, async () => {
  try {
  const database = readDatabase;
  const interests = await database
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

        return interests.map((i: { interest: string }) => i.interest);
      } catch (error) {
        logger.error('Error getting user interests:', { component: 'Chanuka' }, error);
        return [];
      }
    });
  }

  /**
   * Get user's previously engaged bill IDs with caching
   * This helps us avoid recommending bills the user has already seen or interacted with.
   * 
   * @param userId - The ID of the user
   * @returns Promise resolving to array of bill IDs
   */
  private async getUserEngagedBillIds(userId: string): Promise<number[]> {
    const cacheKey = `user_engaged_bills_${userId}`;

    return this.getCachedData(cacheKey, async () => {
      try {
  const database = readDatabase;
        const userEngagement = await database
          .select({ billId: billEngagement.billId })
          .from(billEngagement)
          .where(eq(billEngagement.userId, userId));

        return userEngagement.map((e: { billId: number }) => e.billId);
      } catch (error) {
        logger.error('Error getting user engagement:', { component: 'Chanuka' }, error);
        return [];
      }
    });
  }

  /**
   * Enhanced bill score calculation with more sophisticated weighting
   * This creates a SQL expression that considers bill status, engagement metrics,
   * and recency to compute a composite score for ranking bills.
   * 
   * Note: We don't use type parameters on the sql template tag as Drizzle
   * infers types from usage context automatically.
   * 
   * @returns SQL expression for bill score calculation
   */
  private getBillScoreExpression() {
    return sql`
      CASE
        WHEN ${bills.status} = 'introduced' THEN ${this.SCORING_WEIGHTS.STATUS_INTRODUCED}
        WHEN ${bills.status} = 'committee' THEN ${this.SCORING_WEIGHTS.STATUS_COMMITTEE}
        ELSE ${this.SCORING_WEIGHTS.STATUS_OTHER}
      END *
      (COALESCE(${bills.viewCount}, 0) * ${this.SCORING_WEIGHTS.VIEW} +
       COALESCE(${bills.shareCount}, 0) * ${this.SCORING_WEIGHTS.SHARE} +
       CASE
         WHEN ${bills.createdAt} > NOW() - INTERVAL '7 days' THEN 1.2
         WHEN ${bills.createdAt} > NOW() - INTERVAL '30 days' THEN 1.1
         ELSE 1.0
       END)
    `;
  }

  /**
   * Get personalized bill recommendations for a user
   * Enhanced with domain-driven design and comprehensive validation
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
      // Validate input parameters
      const validation = RecommendationValidator.validatePersonalizedRecommendations(
        userId,
        limit
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedUserId = RecommendationValidator.sanitizeUserId(userId);
      const sanitizedLimit = RecommendationValidator.sanitizeLimit(limit);

      // Get user's context data
      const [userInterests, engagedBillIds, recentActivity] = await Promise.all([
        this.getUserInterests(sanitizedUserId),
        this.getUserEngagedBillIds(sanitizedUserId),
        this.getRecentUserActivity(sanitizedUserId),
      ]);

      // Get available bills for recommendation
      const availableBills = await this.getAvailableBillsForRecommendation();

      // Use domain engine for recommendation logic
      const context: import('../domain/RecommendationEngine').RecommendationContext = {
        userId: sanitizedUserId,
        userInterests,
        engagedBillIds,
        recentActivity,
      };

      const candidates = RecommendationEngine.generateRecommendations(
        context,
        availableBills,
        { limit: sanitizedLimit }
      );

      // Transform to expected format
      return candidates.map(candidate => ({
        ...candidate.bill,
        score: candidate.score,
      }));
    } catch (error) {
      logger.error('Error getting personalized recommendations:', { component: 'Chanuka' }, error);
      // Return empty array rather than throwing to prevent cascade failures
      return [];
    }
  }

  /**
   * Get similar bills based on content and user engagement patterns
   * Enhanced with domain-driven design and validation
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
      // Validate input parameters
      const validation = RecommendationValidator.validateSimilarBills(billId, limit);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedBillId = RecommendationValidator.sanitizeBillId(billId);
      const sanitizedLimit = RecommendationValidator.sanitizeLimit(limit);

      if (!sanitizedBillId) {
        throw new Error('Invalid bill ID');
      }

      // Get available bills for comparison
      const availableBills = await this.getAvailableBillsForRecommendation();

      // Use domain engine for similarity calculation
      const similarBills = RecommendationEngine.findSimilarBills(
        availableBills.find(b => b.id === sanitizedBillId)!,
        availableBills,
        { limit: sanitizedLimit }
      );

      // Transform to expected format
      return similarBills.map(item => ({
        ...item.bill,
        similarityScore: item.similarityScore,
      }));
    } catch (error) {
      logger.error('Error getting similar bills:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get trending bills based on recent engagement metrics
   * Enhanced with domain-driven design and validation
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
      // Validate input parameters
      const validation = RecommendationValidator.validateTrendingBills(days, limit);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedDays = RecommendationValidator.sanitizeDays(days);
      const sanitizedLimit = RecommendationValidator.sanitizeLimit(limit);

      // Get engagement data for trending calculation
      const engagementData = await this.getEngagementDataForTrending(sanitizedDays);

      // Get available bills
      const availableBills = await this.getAvailableBillsForRecommendation();

      // Use domain engine for trending calculation
      const trendingBills = RecommendationEngine.identifyTrendingBills(
        availableBills,
        engagementData,
        { days: sanitizedDays, limit: sanitizedLimit }
      );

      // Transform to expected format
      return trendingBills.map(item => ({
        ...item.bill,
        trendScore: item.trendScore,
      }));
    } catch (error) {
      logger.error('Error getting trending bills:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Track user engagement with enhanced validation and domain logic
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
      // Validate input parameters
      const validation = RecommendationValidator.validateEngagementTracking(
        userId,
        billId,
        engagementType
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedUserId = RecommendationValidator.sanitizeUserId(userId);
      const sanitizedBillId = RecommendationValidator.sanitizeBillId(billId)!;
      const sanitizedEngagementType = RecommendationValidator.sanitizeEngagementType(engagementType)!;

      // Clear relevant caches since engagement is changing
      const cacheKeysToInvalidate = [
        `user_engaged_bills_${sanitizedUserId}`,
        `bill_tags_${sanitizedBillId}`,
      ];
      cacheKeysToInvalidate.forEach(key => this.cache.delete(key));

      // Use repository instance for data operations
      const repo = new RecommendationRepository();
      return await repo.upsertEngagement(
        sanitizedUserId,
        sanitizedBillId,
        sanitizedEngagementType
      );
    } catch (error) {
      logger.error('Error tracking engagement:', { component: 'Chanuka' }, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Calculate engagement score with consistent weights
   * This provides a standardized way to compute how engaged users are with bills.
   * 
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
   * Enhanced with domain-driven design and validation
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
      // Validate input parameters
      const validation = RecommendationValidator.validateCollaborativeRecommendations(userId, limit);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Sanitize inputs
      const sanitizedUserId = RecommendationValidator.sanitizeUserId(userId);
      const sanitizedLimit = RecommendationValidator.sanitizeLimit(limit);

      // Get user's interests and engagement history
      const [userInterests, userEngagedBillIds] = await Promise.all([
        this.getUserInterests(sanitizedUserId),
        this.getUserEngagedBillIds(sanitizedUserId),
      ]);

      // Get similar users and their engagement data
      const similarUsersEngagements = await this.getSimilarUsersEngagements(
        sanitizedUserId,
        userInterests
      );

      // Get available bills
      const availableBills = await this.getAvailableBillsForRecommendation();

      // Use domain engine for collaborative filtering
      const collaborativeRecommendations = RecommendationEngine.generateCollaborativeRecommendations(
        sanitizedUserId,
        [], // User engagement history - could be populated if needed
        similarUsersEngagements,
        availableBills,
        { limit: sanitizedLimit }
      );

      // Transform to expected format
      return collaborativeRecommendations.map(item => ({
        ...item.bill,
        score: item.score,
      }));
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get recent user activity for recommendation context
   * This helps understand what the user has been interested in lately,
   * allowing us to weight recent interests more heavily than older ones.
   * 
   * @private
   */
  private async getRecentUserActivity(userId: string): Promise<Array<{
    billId: number;
    engagementType: 'view' | 'comment' | 'share';
    timestamp: Date;
  }>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const database = readDatabase;
      const activities = await database
        .select({
          billId: billEngagement.billId,
          // Use sql template without type parameter - Drizzle infers types from context
          engagementType: sql`CASE
            WHEN ${billEngagement.viewCount} > 0 THEN 'view'
            WHEN ${billEngagement.commentCount} > 0 THEN 'comment'
            WHEN ${billEngagement.shareCount} > 0 THEN 'share'
            ELSE 'view'
          END`.as('engagement_type'),
          timestamp: billEngagement.lastEngaged,
        })
        .from(billEngagement)
        .where(
          and(
            eq(billEngagement.userId, userId),
            sql`${billEngagement.lastEngaged} > ${thirtyDaysAgo}`
          )
        )
        .orderBy(desc(billEngagement.lastEngaged))
        .limit(50);

      return activities.map(activity => ({
        billId: activity.billId,
        engagementType: activity.engagementType as 'view' | 'comment' | 'share',
        timestamp: activity.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting recent user activity:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get available bills for recommendation (excluding very old or inactive bills)
   * We filter to recent bills in active legislative stages to ensure recommendations
   * are timely and actionable for users.
   * 
   * @private
   */
  private async getAvailableBillsForRecommendation(): Promise<import('../domain/recommendation.dto').PlainBill[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const database = readDatabase;
      const availableBills = await database
        .select()
        .from(bills)
        .where(
          and(
            sql`${bills.createdAt} > ${sixMonthsAgo}`,
            sql`${bills.status} IN ('introduced', 'committee', 'passed')`
          )
        )
        .orderBy(desc(bills.createdAt))
        .limit(1000); // Reasonable limit for recommendation pool

      return availableBills.map(bill => ({ ...bill })); // Ensure plain objects
    } catch (error) {
      logger.error('Error getting available bills for recommendation:', { component: 'Chanuka' }, error);
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
   * Get engagement data for trending calculation
   * This aggregates recent engagement across all users to identify which bills
   * are gaining momentum in the community.
   * 
   * @private
   */
  private async getEngagementDataForTrending(days: number): Promise<Array<{
    billId: number;
    engagementType: 'view' | 'comment' | 'share';
    timestamp: Date;
  }>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fixed: Changed from db() to readDatabase() for consistency
  const database = readDatabase;
      const engagements = await database
        .select({
          billId: billEngagement.billId,
          // Use sql template without type parameter - Drizzle infers the type
          engagementType: sql`CASE
            WHEN ${billEngagement.viewCount} > 0 THEN 'view'
            WHEN ${billEngagement.commentCount} > 0 THEN 'comment'
            WHEN ${billEngagement.shareCount} > 0 THEN 'share'
            ELSE 'view'
          END`.as('engagement_type'),
          timestamp: billEngagement.lastEngaged,
        })
        .from(billEngagement)
        .where(sql`${billEngagement.lastEngaged} > ${cutoffDate}`)
        .orderBy(desc(billEngagement.lastEngaged))
        .limit(5000); // Reasonable limit for trending calculation

      return engagements.map(engagement => ({
        billId: engagement.billId,
        engagementType: engagement.engagementType as 'view' | 'comment' | 'share',
        timestamp: engagement.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting engagement data for trending:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get similar users and their engagement data for collaborative filtering
   * This implements a two-step process: first find users with shared interests,
   * then retrieve their engagement patterns to recommend bills they liked.
   * 
   * The refactored approach computes similarity scores in JavaScript rather than
   * in complex SQL subqueries, which is more maintainable and type-safe.
   * 
   * @private
   */
  private async getSimilarUsersEngagements(
    userId: string,
    interests: string[]
  ): Promise<Array<{
    userId: string;
    billId: number;
    engagementType: 'view' | 'comment' | 'share';
    timestamp: Date;
    similarityScore: number;
  }>> {
    try {
      if (interests.length === 0) return [];

      const minSharedInterests = Math.max(1, Math.floor(interests.length * 0.4));

      // Step 1: Find similar users based on shared interests
  const database = readDatabase;
      const similarUsers = await database
        .select({
          userId: userInterests.userId,
          // Count shared interests without type parameter on sql
          sharedInterests: sql`COUNT(DISTINCT ${userInterests.interest})`.as('shared_interests'),
        })
        .from(userInterests)
        .where(
          and(
            // Use inArray helper instead of manual SQL join
            inArray(userInterests.interest, interests),
            sql`${userInterests.userId} != ${userId}`
          )
        )
        .groupBy(userInterests.userId)
        .having(sql`COUNT(DISTINCT ${userInterests.interest}) >= ${minSharedInterests}`)
        .orderBy(desc(sql`COUNT(DISTINCT ${userInterests.interest})`))
        .limit(50);

      if (similarUsers.length === 0) return [];

      const similarUserIds = similarUsers.map(u => u.userId);
      
      // Step 2: Calculate similarity scores in JavaScript (cleaner than complex SQL)
      // This maps each user ID to a score between 0 and 1 based on interest overlap
      const userSimilarityMap = new Map(
        similarUsers.map(u => [
          u.userId, 
          Math.min(1.0, Number(u.sharedInterests) / interests.length)
        ])
      );

      // Step 3: Get engagement data for similar users
      const engagements = await database
        .select({
          userId: billEngagement.userId,
          billId: billEngagement.billId,
          // Use sql template without type parameter
          engagementType: sql`CASE
            WHEN ${billEngagement.viewCount} > 0 THEN 'view'
            WHEN ${billEngagement.commentCount} > 0 THEN 'comment'
            WHEN ${billEngagement.shareCount} > 0 THEN 'share'
            ELSE 'view'
          END`.as('engagement_type'),
          timestamp: billEngagement.lastEngaged,
        })
        .from(billEngagement)
        .where(inArray(billEngagement.userId, similarUserIds))
        .limit(1000);

      // Step 4: Attach similarity scores to each engagement
      return engagements.map(e => ({
        userId: e.userId,
        billId: e.billId,
        engagementType: e.engagementType as 'view' | 'comment' | 'share',
        timestamp: e.timestamp,
        similarityScore: userSimilarityMap.get(e.userId) || 0.5,
      }));
    } catch (error) {
      logger.error('Error getting similar users engagements:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get cache statistics for monitoring and debugging
   * Useful for understanding cache hit rates and identifying memory usage patterns.
   * 
   * @public
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export functions for backward compatibility
// These maintain the existing API while using the refactored service class internally
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 10,
): Promise<Array<Bill & { score: number }>> {
  const service = new RecommendationService();
  return service.getPersonalizedRecommendations(userId, limit);
}

export async function getSimilarBills(
  billId: number,
  limit: number = 5,
): Promise<Array<Bill & { similarityScore: number }>> {
  const service = new RecommendationService();
  return service.getSimilarBills(billId, limit);
}

export async function getTrendingBills(
  days: number = 7,
  limit: number = 10,
): Promise<Array<Bill & { trendScore: number }>> {
  const service = new RecommendationService();
  return service.getTrendingBills(days, limit);
}

export async function getCollaborativeRecommendations(
  userId: string,
  limit: number = 10,
): Promise<Array<Bill & { score: number }>> {
  const service = new RecommendationService();
  return service.getCollaborativeRecommendations(userId, limit);
}

export async function trackEngagement(
  userId: string,
  billId: number,
  engagementType: 'view' | 'comment' | 'share',
): Promise<any> {
  const service = new RecommendationService();
  return service.trackEngagement(userId, billId, engagementType);
}






































