import { eq, and, desc, asc, sql, count, inArray, or } from 'drizzle-orm';
import { databaseService } from '../../../infrastructure/database/database-service.js';
import { readDatabase } from '../../../db.js';
import { notificationService } from '../../../infrastructure/notifications/notification-service.js';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../../infrastructure/cache/cache-service.js';
import * as schema from '../../../../shared/schema';
import { Bill } from '../../../../shared/schema'; // Ensure Bill type is correctly imported
import { z } from 'zod';
import { logger } from '../../../utils/logger.js';
// Import the status monitor service if it exists at this path
import { billStatusMonitorService } from './bill-status-monitor.js'; // Adjust path if needed

// --- Type Definitions (Ensure these match shared types if defined there) ---
// Define allowed enum values explicitly for validation and clarity
const TrackingTypeEnum = z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule']);
const AlertFrequencyEnum = z.enum(['immediate', 'hourly', 'daily', 'weekly']);
const AlertChannelEnum = z.enum(['in_app', 'email', 'push', 'sms']);
const SortByEnum = z.enum(['date_tracked', 'last_updated', 'engagement']);
const SortOrderEnum = z.enum(['asc', 'desc']);

// --- Zod Schemas for Validation ---
const basePreferenceSchema = z.object({
  trackingTypes: z.array(TrackingTypeEnum).optional(),
  alertFrequency: AlertFrequencyEnum.optional(),
  alertChannels: z.array(AlertChannelEnum).optional(),
  isActive: z.boolean().optional() // Keep isActive optional here
});

const trackBillSchema = z.object({
  preferences: basePreferenceSchema.optional()
});

const updatePreferencesSchema = basePreferenceSchema.omit({ isActive: true }); // Prevent setting isActive via update

const bulkTrackingSchema = z.object({
  billIds: z.array(z.number().int().positive()).min(1).max(100, "Cannot process more than 100 bills at once"),
  operation: z.enum(['track', 'untrack']),
  preferences: basePreferenceSchema.optional() // Only relevant for 'track'
});

// --- Interface Definitions ---
export interface BillTrackingPreference extends schema.UserBillTrackingPreference {} // Use DB type

export interface TrackingAnalytics {
    userId: string;
    totalTrackedBills: number;
    activeTrackedBills: number;
    trackingByCategory: Array<{ category: string | null; count: number }>;
    trackingByStatus: Array<{ status: string; count: number }>;
    recentActivity: Array<{
        billId: number;
        billTitle: string;
        action: 'tracked' | 'untracked' | 'updated_preferences';
        timestamp: Date;
    }>;
    engagementSummary: {
        totalViews: number;
        totalComments: number;
        totalShares: number;
        averageEngagementScore: number;
    };
}

export interface BulkTrackingOperation {
  userId: string;
  billIds: number[];
  operation: 'track' | 'untrack';
  preferences?: Partial<Omit<schema.InsertUserBillTrackingPreference, 'userId' | 'billId'>>;
}

export interface BulkTrackingResult {
  successful: number[];
  failed: Array<{ billId: number; error: string; }>;
  summary: { total: number; successful: number; failed: number; };
}

export interface TrackedBillWithDetails extends schema.Bill {
  trackingPreferences: schema.UserBillTrackingPreference;
  engagement: {
    viewCount: number;
    commentCount: number;
    shareCount: number;
    engagementScore: number;
    lastEngaged: Date;
  };
  recentUpdates: Array<{
    type: 'status_change' | 'new_comment' | 'amendment'; // Extend as needed
    timestamp: Date;
    description: string;
  }>;
}

/**
 * Service for managing user bill tracking preferences and related operations.
 * Uses the database for persistent storage.
 */
export class BillTrackingService {
  private get db() {
    return readDatabase();
  }

  /**
   * Track a bill for a user or update existing preferences if already tracked.
   */
  async trackBill(
    userId: string,
    billId: number,
    preferences?: z.infer<typeof basePreferenceSchema> // Use Zod type for input
  ): Promise<schema.UserBillTrackingPreference> {
    logger.info(`📌 Tracking bill ${billId} for user ${userId}`);
    try {
      const bill = await this.validateBillExists(billId);
      if (!bill) throw new Error(`Bill with ID ${billId} not found`);

      const result = await databaseService.withTransaction(async (tx) => {
        const defaultPrefs = {
          trackingTypes: preferences?.trackingTypes ?? ['status_changes', 'new_comments'],
          alertFrequency: preferences?.alertFrequency ?? 'immediate',
          alertChannels: preferences?.alertChannels ?? ['in_app', 'email'],
          isActive: true, // Always set to active when tracking/re-tracking
        };

        const valuesToInsert: schema.InsertUserBillTrackingPreference = { userId, billId, ...defaultPrefs };
        const valuesToUpdate: Partial<Omit<schema.UserBillTrackingPreference, 'id' | 'userId' | 'billId' | 'createdAt'>> = { ...defaultPrefs, updatedAt: new Date() };

        const [preference] = await tx
          .insert(schema.userBillTrackingPreference)
          .values(valuesToInsert)
          .onConflictDoUpdate({ target: [schema.userBillTrackingPreference.userId, schema.userBillTrackingPreference.billId], set: valuesToUpdate })
          .returning();

        // Ensure billEngagement record exists or update lastEngagedAt
        const [existingEngagement] = await tx
          .select({ id: schema.billEngagement.id })
          .from(schema.billEngagement)
          .where(and(eq(schema.billEngagement.billId, billId), eq(schema.billEngagement.userId, userId)));

        if (!existingEngagement) {
          const engagementToInsert: schema.InsertBillEngagement = {
            billId, userId, viewCount: 1, commentCount: 0, shareCount: 0, engagementScore: "1", lastEngagedAt: new Date(),
          };
          await tx.insert(schema.billEngagement).values(engagementToInsert);
        } else {
          await tx.update(schema.billEngagement).set({ lastEngagedAt: new Date(), updatedAt: new Date() }).where(eq(schema.billEngagement.id, existingEngagement.id));
        }
        return preference;
      }, 'trackBill');

      await this.clearUserTrackingCaches(userId, billId);
      await this.recordTrackingAnalytics(userId, billId, 'tracked', bill.title);
      // Consider sending notification via notificationService if needed
      logger.info(`✅ Successfully tracked bill ${billId} for user ${userId}`);
      return result.data;
    } catch (error) {
      logger.error(`Error tracking bill ${billId} for user ${userId}:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Mark a user's tracking preference for a bill as inactive.
   */
  async untrackBill(userId: string, billId: number): Promise<void> {
    logger.info(`📌 Untracking bill ${billId} for user ${userId}`);
    try {
      const bill = await this.validateBillExists(billId); // Keep validation

      const result = await this.db
        .update(schema.userBillTrackingPreference)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(schema.userBillTrackingPreference.billId, billId), eq(schema.userBillTrackingPreference.userId, userId)))
        .returning({ id: schema.userBillTrackingPreference.id });

      if (result.length === 0) {
        logger.warn(`Attempted to untrack bill ${billId} for user ${userId}, but no active preference found.`);
        return; // Succeed silently if already untracked or never tracked
      }

      await this.clearUserTrackingCaches(userId, billId);
      if (bill) {
        await this.recordTrackingAnalytics(userId, billId, 'untracked', bill.title);
        // Consider sending notification
      }
      logger.info(`✅ Successfully untracked bill ${billId} for user ${userId}`);
    } catch (error) {
      logger.error(`Error untracking bill ${billId} for user ${userId}:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Get a paginated list of bills actively tracked by the user.
   */
  async getUserTrackedBills(
    userId: string,
    options: {
      page?: number; limit?: number; category?: string; status?: string;
      sortBy?: z.infer<typeof SortByEnum>; sortOrder?: z.infer<typeof SortOrderEnum>;
    } = {}
  ): Promise<{ bills: TrackedBillWithDetails[]; pagination: { page: number; limit: number; total: number; pages: number; }; }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy ?? 'date_tracked';
    const sortOrder = options.sortOrder ?? 'desc';

    const filterKey = `${options.category ?? 'all'}:${options.status ?? 'all'}:${sortBy}:${sortOrder}`;
    const cacheKey = `${CACHE_KEYS.USER_TRACKED_BILLS(userId)}:${page}:${limit}:${filterKey}`;

    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for tracked bills: ${cacheKey}`);
      return cachedData;
    }
    logger.debug(`Cache miss for tracked bills: ${cacheKey}`);

    try {
      const baseConditions = [
        eq(schema.userBillTrackingPreference.userId, userId),
        eq(schema.userBillTrackingPreference.isActive, true)
      ];
      if (options.category) baseConditions.push(eq(schema.bills.category, options.category));
      if (options.status) baseConditions.push(eq(schema.bills.status, options.status));

      const [{ count: total }] = await this.db
        .select({ count: count() })
        .from(schema.userBillTrackingPreference)
        .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.billId, schema.bills.id))
        .where(and(...baseConditions));

      if (total === 0) return { bills: [], pagination: { page, limit, total: 0, pages: 0 } };

      let sortColumn;
      switch (sortBy) {
        case 'last_updated': sortColumn = schema.bills.updatedAt; break;
        case 'engagement': sortColumn = schema.billEngagement.engagementScore; break; // Needs join
        case 'date_tracked':
        default: sortColumn = schema.userBillTrackingPreference.updatedAt;
      }
      const orderFunction = sortOrder === 'asc' ? asc : desc;

      const results = await this.db
        .select({
          bill: schema.bills,
          engagement: schema.billEngagement,
          trackingPreferences: schema.userBillTrackingPreference
        })
        .from(schema.userBillTrackingPreference)
        .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.billId, schema.bills.id))
        .leftJoin(schema.billEngagement, and(
          eq(schema.userBillTrackingPreference.billId, schema.billEngagement.billId),
          eq(schema.userBillTrackingPreference.userId, schema.billEngagement.userId)
        ))
        .where(and(...baseConditions))
        .orderBy(orderFunction(sortColumn))
        .limit(limit)
        .offset(offset);

      const enhancedBills: TrackedBillWithDetails[] = await Promise.all(results.map(async (res) => {
        const recentUpdates = await this.getBillRecentUpdates(res.bill.id);
        const engagementData = res.engagement || { viewCount: 0, commentCount: 0, shareCount: 0, engagementScore: "0", lastEngagedAt: res.trackingPreferences.createdAt };
        return {
          ...(res.bill as schema.Bill),
          trackingPreferences: res.trackingPreferences,
          engagement: {
            viewCount: engagementData.viewCount,
            commentCount: engagementData.commentCount,
            shareCount: engagementData.shareCount,
            engagementScore: parseFloat(engagementData.engagementScore || '0'),
            lastEngaged: engagementData.lastEngagedAt || new Date(),
          },
          recentUpdates
        };
      }));

      const response = {
        bills: enhancedBills,
        pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) }
      };
      await cacheService.set(cacheKey, response, CACHE_TTL.USER_DATA);
      return response;
    } catch (error) {
      logger.error(`Error getting tracked bills for user ${userId}:`, { component: 'BillTrackingService' }, error);
      return { bills: [], pagination: { page, limit, total: 0, pages: 0 } }; // Return empty on error
    }
  }

  /**
   * Update specific tracking preferences for a bill a user is already tracking.
   */
  async updateBillTrackingPreferences(
    userId: string,
    billId: number,
    preferences: z.infer<typeof updatePreferencesSchema> // Use Zod type for input
  ): Promise<schema.UserBillTrackingPreference> {
    logger.info(`🔄 Updating tracking preferences for bill ${billId}, user ${userId}`);
    try {
      // Input already validated by Zod in the router
      const updateData: Partial<Omit<schema.UserBillTrackingPreference, 'id' | 'userId' | 'billId' | 'createdAt' | 'isActive'>> = {
          ...preferences,
          updatedAt: new Date()
      };


      const [updatedPreference] = await this.db
        .update(schema.userBillTrackingPreference)
        .set(updateData)
        .where(and(eq(schema.userBillTrackingPreference.userId, userId), eq(schema.userBillTrackingPreference.billId, billId), eq(schema.userBillTrackingPreference.isActive, true))) // Ensure we only update active prefs
        .returning();

      if (!updatedPreference) {
        throw new Error(`No active tracking preference found for bill ${billId} and user ${userId} to update.`);
      }

      await this.clearUserTrackingCaches(userId, billId);
      await this.recordTrackingAnalytics(userId, billId, 'updated_preferences');

      logger.info(`✅ Updated tracking preferences for bill ${billId} and user ${userId}`);
      return updatedPreference;
    } catch (error) {
      logger.error(`Error updating tracking preferences for bill ${billId} and user ${userId}:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Perform bulk track or untrack operations for multiple bills.
   */
  async bulkTrackingOperation(operation: BulkTrackingOperation): Promise<BulkTrackingResult> {
    logger.info(`📦 Performing bulk ${operation.operation} for user ${operation.userId} on ${operation.billIds.length} bills`);
    const result: BulkTrackingResult = { successful: [], failed: [], summary: { total: operation.billIds.length, successful: 0, failed: 0 } };

    // Validate preferences only needed for track operation
    if (operation.operation === 'track' && operation.preferences) {
        const prefValidation = basePreferenceSchema.safeParse(operation.preferences);
        if (!prefValidation.success) {
            throw new Error(`Invalid preferences provided for bulk track: ${prefValidation.error.message}`);
        }
    }


    // Consider running operations in parallel batches for performance
    for (const billId of operation.billIds) {
      try {
        if (operation.operation === 'track') {
          await this.trackBill(operation.userId, billId, operation.preferences);
        } else {
          await this.untrackBill(operation.userId, billId);
        }
        result.successful.push(billId);
        result.summary.successful++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Bulk ${operation.operation} failed for bill ${billId}, user ${operation.userId}: ${message}`);
        result.failed.push({ billId, error: message });
        result.summary.failed++;
      }
    }

    // Clear general user caches after bulk op, specific caches cleared in track/untrack
    await this.clearUserTrackingCaches(operation.userId);

    logger.info(`✅ Bulk ${operation.operation} completed for user ${operation.userId}: ${result.summary.successful}/${result.summary.total} successful`);
    return result;
  }


  /**
   * Get analytics related to a user's bill tracking activities.
   */
  async getUserTrackingAnalytics(userId: string): Promise<TrackingAnalytics> {
     const cacheKey = CACHE_KEYS.USER_TRACKING_ANALYTICS(userId);
     const cachedData = await cacheService.get(cacheKey);
     if (cachedData) {
         logger.debug(`Cache hit for tracking analytics: ${cacheKey}`);
         return cachedData;
     }
     logger.debug(`Cache miss for tracking analytics: ${cacheKey}`);

    try {
        // Use Promise.all for concurrent queries
        const [
            totals,
            categoryData,
            statusData,
            engagementSummaryData,
            recentActivityData // Fetch from cache or dedicated log
        ] = await Promise.all([
            // Query 1: Total and Active Counts
            this.db.select({
                totalTrackedBills: count(schema.userBillTrackingPreference.id),
                activeTrackedBills: count(sql`CASE WHEN ${schema.userBillTrackingPreference.isActive} = true THEN 1 ELSE NULL END`)
            }).from(schema.userBillTrackingPreference).where(eq(schema.userBillTrackingPreference.userId, userId)),

            // Query 2: Tracking by Category (Active Only)
            this.db.select({ category: schema.bills.category, count: count() })
                .from(schema.userBillTrackingPreference)
                .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.billId, schema.bills.id))
                .where(and(eq(schema.userBillTrackingPreference.userId, userId), eq(schema.userBillTrackingPreference.isActive, true)))
                .groupBy(schema.bills.category),

            // Query 3: Tracking by Status (Active Only)
            this.db.select({ status: schema.bills.status, count: count() })
                .from(schema.userBillTrackingPreference)
                .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.billId, schema.bills.id))
                .where(and(eq(schema.userBillTrackingPreference.userId, userId), eq(schema.userBillTrackingPreference.isActive, true)))
                .groupBy(schema.bills.status),

            // Query 4: Engagement Summary (Across all user engagements)
            this.db.select({
                totalViews: sql<number>`COALESCE(SUM(${schema.billEngagement.viewCount}), 0)`,
                totalComments: sql<number>`COALESCE(SUM(${schema.billEngagement.commentCount}), 0)`,
                totalShares: sql<number>`COALESCE(SUM(${schema.billEngagement.shareCount}), 0)`,
                averageEngagementScore: sql<number>`COALESCE(AVG(CAST(${schema.billEngagement.engagementScore} AS DECIMAL)), 0)`
            }).from(schema.billEngagement).where(eq(schema.billEngagement.userId, userId)),

             // Query 5: Recent Activity (Fetch from cache)
             this.getRecentTrackingActivity(userId)
        ]);


        const analyticsData: TrackingAnalytics = {
            userId,
            totalTrackedBills: Number(totals[0]?.totalTrackedBills || 0),
            activeTrackedBills: Number(totals[0]?.activeTrackedBills || 0),
            trackingByCategory: categoryData.map(item => ({ category: item.category || 'Uncategorized', count: Number(item.count) })),
            trackingByStatus: statusData.map(item => ({ status: item.status, count: Number(item.count) })),
            recentActivity: recentActivityData,
            engagementSummary: {
                totalViews: Number(engagementSummaryData[0]?.totalViews || 0),
                totalComments: Number(engagementSummaryData[0]?.totalComments || 0),
                totalShares: Number(engagementSummaryData[0]?.totalShares || 0),
                averageEngagementScore: Number(engagementSummaryData[0]?.averageEngagementScore || 0)
            }
        };

        await cacheService.set(cacheKey, analyticsData, CACHE_TTL.USER_DATA);
        return analyticsData;
    } catch (error) {
      logger.error(`Error getting tracking analytics for user ${userId}:`, { component: 'BillTrackingService' }, error);
      return { // Return default structure on error
          userId, totalTrackedBills: 0, activeTrackedBills: 0, trackingByCategory: [],
          trackingByStatus: [], recentActivity: [],
          engagementSummary: { totalViews: 0, totalComments: 0, totalShares: 0, averageEngagementScore: 0 }
      };
    }
  }

  /**
   * Check if a user is actively tracking a specific bill.
   */
  async isUserTrackingBill(userId: string, billId: number): Promise<boolean> {
     const cacheKey = CACHE_KEYS.IS_USER_TRACKING(userId, billId);
     const cachedValue = await cacheService.get(cacheKey);
     if (cachedValue !== null && cachedValue !== undefined) {
         logger.debug(`Cache hit for isUserTrackingBill: ${cacheKey}`);
         return Boolean(cachedValue);
     }
     logger.debug(`Cache miss for isUserTrackingBill: ${cacheKey}`);

    try {
      // Optimize query to just check for existence and isActive status
      const [preference] = await this.db
        .select({ isActive: schema.userBillTrackingPreference.isActive })
        .from(schema.userBillTrackingPreference)
        .where(and(eq(schema.userBillTrackingPreference.userId, userId), eq(schema.userBillTrackingPreference.billId, billId)))
        .limit(1);

       const isTracking = preference?.isActive ?? false; // Default to false if no record found
       await cacheService.set(cacheKey, isTracking, CACHE_TTL.USER_DATA_SHORT); // Use a shorter TTL for status checks
       return isTracking;
    } catch (error) {
      logger.error(`Error checking if user ${userId} is tracking bill ${billId}:`, { component: 'BillTrackingService' }, error);
      return false; // Return false on error
    }
  }

  /**
   * Recommend bills for tracking based on user interests and untracked popular bills.
   */
  async getRecommendedBillsForTracking(userId: string, limit: number = 10): Promise<schema.Bill[]> {
    const cacheKey = CACHE_KEYS.USER_RECOMMENDED_TRACKING(userId, limit);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for recommended tracking: ${cacheKey}`);
      return cachedData;
    }
    logger.debug(`Cache miss for recommended tracking: ${cacheKey}`);

    try {
      // Find bills user is already tracking (active or inactive)
      const trackedBillIdsResult = await this.db
        .select({ billId: schema.userBillTrackingPreference.billId })
        .from(schema.userBillTrackingPreference)
        .where(eq(schema.userBillTrackingPreference.userId, userId));
      const trackedBillIds = trackedBillIdsResult.map(t => t.billId);

      // Find user interests
      const userInterestsResult = await this.db
        .select({ interest: schema.userInterests.interest })
        .from(schema.userInterests)
        .where(eq(schema.userInterests.userId, userId));
      const interests = userInterestsResult.map(ui => ui.interest.toLowerCase()); // Normalize interests

      let recommendations: schema.Bill[] = [];

      // Strategy 1: Find untracked bills matching user interests (by category or tags)
      if (interests.length > 0) {
        const interestConditions = or(
          // Match category (case-insensitive)
          ...interests.map(interest => sql`LOWER(${schema.bills.category}) = ${interest}`),
          // Match tags (assuming tags are stored appropriately, e.g., in billTags table)
          // This requires a subquery or join depending on your final schema for tags
          // Example using exists subquery on billTags table:
           sql`EXISTS (
               SELECT 1 FROM ${schema.billTags}
               WHERE ${schema.billTags.billId} = ${schema.bills.id}
               AND LOWER(${schema.billTags.tag}) IN ${interests}
           )`
        );

        const interestBasedRecs = await this.db.select()
          .from(schema.bills)
          .where(and(
            interestConditions,
            trackedBillIds.length > 0 ? sql`${schema.bills.id} NOT IN ${trackedBillIds}` : undefined // Exclude tracked
          ))
          .orderBy(desc(schema.bills.viewCount)) // Prioritize popular within interest
          .limit(limit);
        recommendations.push(...interestBasedRecs);
      }

      // Strategy 2: If not enough recommendations, add popular untracked bills
      if (recommendations.length < limit) {
        const remainingLimit = limit - recommendations.length;
        const popularUntracked = await this.db.select()
          .from(schema.bills)
          .where(
              trackedBillIds.length > 0 ? sql`${schema.bills.id} NOT IN ${trackedBillIds}` : undefined // Exclude tracked
          )
          .orderBy(desc(schema.bills.viewCount)) // Order by popularity
          .limit(remainingLimit + recommendations.length); // Fetch slightly more to filter out duplicates

         // Add popular bills ensuring no duplicates from interest-based recs
         const currentRecIds = new Set(recommendations.map(r => r.id));
         popularUntracked.forEach(bill => {
             if (recommendations.length < limit && !currentRecIds.has(bill.id)) {
                 recommendations.push(bill);
             }
         });

      }

      await cacheService.set(cacheKey, recommendations, CACHE_TTL.RECOMMENDATIONS);
      return recommendations;
    } catch (error) {
      logger.error(`Error getting recommended bills for user ${userId}:`, { component: 'BillTrackingService' }, error);
      return []; // Return empty on error
    }
  }


  // --- Helper Methods ---

  private async validateBillExists(billId: number): Promise<Pick<Bill, 'id' | 'title'> | null> {
    if (isNaN(billId) || billId <= 0) throw new Error('Invalid Bill ID provided.');

    const cacheKey = CACHE_KEYS.BILL_EXISTS(billId); // Simple existence cache
    const cachedExists = await cacheService.get(cacheKey);
    // Return minimal info if exists, null otherwise
    if (cachedExists !== null && cachedExists !== undefined) {
        return cachedExists ? ({ id: billId, title: 'Cached Title' } as Pick<Bill, 'id' | 'title'>) : null;
    }


    try {
      const [bill] = await this.db
        .select({ id: schema.bills.id, title: schema.bills.title }) // Only fetch needed fields
        .from(schema.bills)
        .where(eq(schema.bills.id, billId))
        .limit(1);

      await cacheService.set(cacheKey, !!bill, CACHE_TTL.METADATA); // Cache boolean
      return bill || null;
    } catch (error) {
      logger.error(`Error validating bill existence for ID ${billId}:`, { component: 'BillTrackingService' }, error);
      throw new Error(`Database error validating bill existence for ID ${billId}`);
    }
  }

  private async clearUserTrackingCaches(userId: string, billId?: number): Promise<void> {
    // Define patterns/keys more specifically using CACHE_KEYS
    const patternsToDelete = [
      CACHE_KEYS.USER_TRACKED_BILLS(userId, '*'), // Pattern for paginated results
      CACHE_KEYS.USER_TRACKING_ANALYTICS(userId),
      CACHE_KEYS.USER_RECOMMENDED_TRACKING(userId, '*'), // Pattern for different limits
    ];
    if (billId) {
      patternsToDelete.push(CACHE_KEYS.IS_USER_TRACKING(userId, billId));
    }

    logger.debug(`Clearing cache keys/patterns for user ${userId}: ${patternsToDelete.join(', ')}`);
    try {
      // Use Promise.all to clear concurrently
      const clearPromises = patternsToDelete.map(keyOrPattern => {
          // Check if it's a pattern (contains '*') or a specific key
          if (keyOrPattern.includes('*')) {
              return cacheService.deletePattern(keyOrPattern);
          } else {
              return cacheService.delete(keyOrPattern);
          }
      });
      await Promise.all(clearPromises);

      logger.debug(`Successfully cleared caches for user ${userId}`);
    } catch (error) {
      logger.error(`Error clearing cache for user ${userId}:`, { component: 'BillTrackingService' }, error);
      // Log error but don't fail the primary operation
    }
  }

  private async getBillRecentUpdates(billId: number): Promise<TrackedBillWithDetails['recentUpdates']> {
     // Fetch recent status changes from billStatusMonitorService history (if available and reliable)
     // Or query related tables like analysis, billComments, etc., ordered by date, limit 3-5
     // Example: Query last 3 comments + last status change
     try {
         // Placeholder: Get last status update from bill itself
         const [bill] = await this.db.select({ status: schema.bills.status, updatedAt: schema.bills.updatedAt })
             .from(schema.bills)
             .where(eq(schema.bills.id, billId));

         const updates: TrackedBillWithDetails['recentUpdates'] = [];
         if (bill) {
             updates.push({
                 type: 'status_change', // This is simplified, needs better tracking
                 timestamp: bill.updatedAt,
                 description: `Bill status is now "${bill.status}"`
             });
         }

         // Add recent comments if needed
         const comments = await this.db.select({ content: schema.billComments.content, createdAt: schema.billComments.createdAt })
             .from(schema.billComments)
             .where(eq(schema.billComments.billId, billId))
             .orderBy(desc(schema.billComments.createdAt))
             .limit(2);

         comments.forEach(c => {
             updates.push({
                 type: 'new_comment',
                 timestamp: c.createdAt,
                 description: `New comment: "${c.content.substring(0, 50)}..."`
             });
         });

         // Sort combined updates by timestamp
         updates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

         return updates.slice(0, 3); // Return top 3 most recent

     } catch (error) {
         logger.error(`Error getting recent updates for bill ${billId}:`, { component: 'BillTrackingService' }, error);
         return [];
     }
  }


  private async getRecentTrackingActivity(userId: string): Promise<TrackingAnalytics['recentActivity']> {
    // This requires a dedicated activity log table or relying on cache which isn't persistent.
    // For now, return from cache if implemented, otherwise empty.
    const cacheKey = `tracking_activity:${userId}`;
    try {
      const activity = await cacheService.get(cacheKey);
      return activity || [];
    } catch (error) {
      logger.error('Error getting recent tracking activity from cache:', { component: 'BillTrackingService' }, error);
      return [];
    }
  }

  private async recordTrackingAnalytics(userId: string, billId: number, action: 'tracked' | 'untracked' | 'updated_preferences', billTitle?: string): Promise<void> {
    // Persist this to an analytics event log table or use cache for short-term view
    const cacheKey = `tracking_activity:${userId}`;
    try {
        const activityRecord = {
            billId,
            billTitle: billTitle || `Bill ${billId}`, // Fetch title if not provided
            action,
            timestamp: new Date()
        };

        const existingActivity = await cacheService.get(cacheKey) || [];
        const updatedActivity = [activityRecord, ...existingActivity].slice(0, 20); // Keep last 20

        await cacheService.set(cacheKey, updatedActivity, CACHE_TTL.USER_DATA_LONG); // Cache for longer
    } catch (error) {
        logger.error('Error recording tracking analytics (cache):', { component: 'BillTrackingService' }, error);
    }
    // Consider adding a persistent log call here too
}

  // Add notification sending helper if needed, using notificationService
  // private async sendTrackingNotification(...) { ... }

}

// Export singleton instance
export const billTrackingService = new BillTrackingService();