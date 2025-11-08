import { eq, and, desc, asc, sql, count, inArray, or } from 'drizzle-orm';
import { databaseService } from '@shared/database';
import { readDatabase } from '@shared/database';
import { notificationService } from '@/infrastructure/notifications/notification-service.js';
import { cacheService } from '@/infrastructure/cache';
import * as schema from '@shared/schema';
import { Bill } from '@shared/schema'; // Ensure Bill type is correctly imported
import { z } from 'zod';
import { logger  } from '../../../../shared/core/src/index.js';
// Import the status monitor service if it exists at this path
import { billStatusMonitorService } from '../bill-status-monitor.js'; // Adjust path if needed

// --- Type Definitions (Ensure these match shared types if defined there) ---
// Define allowed enum values explicitly for validation and clarity
const TrackingTypeEnum = z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule']);
const AlertFrequencyEnum = z.enum(['immediate', 'hourly', 'daily', 'weekly']);
const AlertChannelEnum = z.enum(['in_app', 'email', 'push', 'sms']);
const SortByEnum = z.enum(['date_tracked', 'last_updated', 'engagement']);
const SortOrderEnum = z.enum(['asc', 'desc']);

// --- Zod Schemas for Validation ---
const basePreferenceSchema = z.object({
  tracking_types: z.array(TrackingTypeEnum).optional(),
  alert_frequency: AlertFrequencyEnum.optional(),
  alert_channels: z.array(AlertChannelEnum).optional(),
  is_active: z.boolean().optional() // Keep is_active optional here
});

const trackBillSchema = z.object({
  preferences: basePreferenceSchema.optional()
});

const updatePreferencesSchema = basePreferenceSchema.omit({ is_active: true }); // Prevent setting is_active via update

const bulkTrackingSchema = z.object({
  bill_ids: z.array(z.number().int().positive()).min(1).max(100, "Cannot process more than 100 bills at once"),
  operation: z.enum(['track', 'untrack']),
  preferences: basePreferenceSchema.optional() // Only relevant for 'track'
});

// --- Interface Definitions ---
export interface BillTrackingPreference extends schema.UserBillTrackingPreference {} // Use DB type

export interface TrackingAnalytics { user_id: string;
    totalTrackedBills: number;
    activeTrackedBills: number;
    trackingByCategory: Array<{ category: string | null; count: number  }>;
    trackingByStatus: Array<{ status: string; count: number }>;
    recentActivity: Array<{ bill_id: number;
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

export interface BulkTrackingOperation { user_id: string;
  bill_ids: number[];
  operation: 'track' | 'untrack';
  preferences?: Partial<Omit<schema.InsertUserBillTrackingPreference, 'user_id' | 'bill_id'>>;
  }

export interface BulkTrackingResult { successful: number[];
  failed: Array<{ bill_id: number; error: string;  }>;
  summary: { total: number; successful: number; failed: number; };
}

export interface TrackedBillWithDetails extends schema.Bill {
  trackingPreferences: schema.UserBillTrackingPreference;
  engagement: {
    view_count: number;
    comment_count: number;
    share_count: number;
    engagement_score: number;
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
    return readDatabase;
  }

  /**
   * Track a bill for a user or update existing preferences if already tracked.
   */
  async trackBill(
    user_id: string,
    bill_id: number,
    preferences?: z.infer<typeof basePreferenceSchema> // Use Zod type for input
  ): Promise<schema.UserBillTrackingPreference> { logger.info(`📌 Tracking bill ${bill_id } for user ${ user_id }`);
    try { const bill = await this.validateBillExists(bill_id);
      if (!bill) throw new Error(`Bill with ID ${bill_id } not found`);

      const result = await databaseService.withTransaction(async (tx) => {
        const defaultPrefs = {
          tracking_types: preferences?.tracking_types ?? ['status_changes', 'new_comments'],
          alert_frequency: preferences?.alert_frequency ?? 'immediate',
          alert_channels: preferences?.alert_channels ?? ['in_app', 'email'],
          is_active: true, // Always set to active when tracking/re-tracking
        };

        const valuesToInsert: schema.InsertUserBillTrackingPreference = { user_id, bill_id, ...defaultPrefs   };
        const valuesToUpdate: Partial<Omit<schema.UserBillTrackingPreference, 'id' | 'user_id' | 'bill_id' | 'created_at'>> = { ...defaultPrefs, updated_at: new Date() };

        const [preference] = await tx
          .insert(schema.userBillTrackingPreference)
          .values(valuesToInsert)
          .onConflictDoUpdate({ target: [schema.userBillTrackingPreference.user_id, schema.userBillTrackingPreference.bill_id], set: valuesToUpdate })
          .returning();

        // Ensure bill_engagement record exists or update last_engaged_at
        const [existingEngagement] = await tx
          .select({ id: schema.bill_engagement.id })
          .from(schema.bill_engagement)
          .where(and(eq(schema.bill_engagement.bill_id, bill_id), eq(schema.bill_engagement.user_id, user_id)));

        if (!existingEngagement) { const engagementToInsert: schema.InsertBillEngagement = {
            bill_id, user_id, view_count: 1, comment_count: 0, share_count: 0, engagement_score: "1", last_engaged_at: new Date(),
            };
          await tx.insert(schema.bill_engagement).values(engagementToInsert);
        } else {
          await tx.update(schema.bill_engagement).set({ last_engaged_at: new Date(), updated_at: new Date() }).where(eq(schema.bill_engagement.id, existingEngagement.id));
        }
        return preference;
      }, 'trackBill');

      await this.clearUserTrackingCaches(user_id, bill_id);
      await this.recordTrackingAnalytics(user_id, bill_id, 'tracked', bills.title);
      // Consider sending notification via notificationService if needed
      logger.info(`✅ Successfully tracked bill ${ bill_id } for user ${ user_id }`);
      return result.data;
    } catch (error) { logger.error(`Error tracking bill ${bill_id } for user ${ user_id }:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Mark a user's tracking preference for a bill as inactive.
   */
  async untrackBill(user_id: string, bill_id: number): Promise<void> { logger.info(`📌 Untracking bill ${bill_id } for user ${ user_id }`);
    try { const bill = await this.validateBillExists(bill_id); // Keep validation

      const result = await this.db
        .update(schema.userBillTrackingPreference)
        .set({ is_active: false, updated_at: new Date()  })
        .where(and(eq(schema.userBillTrackingPreference.bill_id, bill_id), eq(schema.userBillTrackingPreference.user_id, user_id)))
        .returning({ id: schema.userBillTrackingPreference.id });

      if (result.length === 0) { logger.warn(`Attempted to untrack bill ${bill_id } for user ${ user_id }, but no active preference found.`);
        return; // Succeed silently if already untracked or never tracked
      }

      await this.clearUserTrackingCaches(user_id, bill_id);
      if (bill) { await this.recordTrackingAnalytics(user_id, bill_id, 'untracked', bills.title);
        // Consider sending notification
        }
      logger.info(`✅ Successfully untracked bill ${ bill_id } for user ${ user_id }`);
    } catch (error) { logger.error(`Error untracking bill ${bill_id } for user ${ user_id }:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Get a paginated list of bills actively tracked by the users.
   */
  async getUserTrackedBills(
    user_id: string,
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
  const cacheKey = `user:tracked_bills:${ user_id }:${page}:${limit}:${filterKey}`;

    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for tracked bills: ${cacheKey}`);
      return cachedData;
    }
    logger.debug(`Cache miss for tracked bills: ${cacheKey}`);

    try { const baseConditions = [
        eq(schema.userBillTrackingPreference.user_id, user_id),
        eq(schema.userBillTrackingPreference.is_active, true)
      ];
      if (options.category) baseConditions.push(eq(schema.bills.category, options.category));
      if (options.status) baseConditions.push(eq(schema.bills.status, options.status));

      const [{ count: total  }] = await this.db
        .select({ count: count() })
        .from(schema.userBillTrackingPreference)
        .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.bill_id, schema.bills.id))
        .where(and(...baseConditions));

      if (total === 0) return { bills: [], pagination: { page, limit, total: 0, pages: 0 } };

      let sortColumn;
      switch (sortBy) {
        case 'last_updated': sortColumn = schema.bills.updated_at; break;
        case 'engagement': sortColumn = schema.bill_engagement.engagement_score; break; // Needs join
        case 'date_tracked':
        default: sortColumn = schema.userBillTrackingPreference.updated_at;
      }
      const orderFunction = sortOrder === 'asc' ? asc : desc;

      const results = await this.db
        .select({
          bill: schema.bills,
          engagement: schema.bill_engagement,
          trackingPreferences: schema.userBillTrackingPreference
        })
        .from(schema.userBillTrackingPreference)
        .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.bill_id, schema.bills.id))
        .leftJoin(schema.bill_engagement, and(
          eq(schema.userBillTrackingPreference.bill_id, schema.bill_engagement.bill_id),
          eq(schema.userBillTrackingPreference.user_id, schema.bill_engagement.user_id)
        ))
        .where(and(...baseConditions))
        .orderBy(orderFunction(sortColumn))
        .limit(limit)
        .offset(offset);

      const enhancedBills: TrackedBillWithDetails[] = await Promise.all(results.map(async (res) => {
        const recentUpdates = await this.getBillRecentUpdates(res.bills.id);
        const engagement_data = res.engagement || { view_count: 0, comment_count: 0, share_count: 0, engagement_score: "0", last_engaged_at: res.trackingPreferences.created_at };
        return {
          ...(res.bill as schema.Bill),
          trackingPreferences: res.trackingPreferences,
          engagement: {
            view_count: engagement_data.view_count,
            comment_count: engagement_data.comment_count,
            share_count: engagement_data.share_count,
            engagement_score: parseFloat(engagement_data.engagement_score || '0'),
            lastEngaged: engagement_data.last_engaged_at || new Date(),
          },
          recentUpdates
        };
      }));

      const response = {
        bills: enhancedBills,
        pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) }
      };
  await cacheService.set(cacheKey, response, 3600); // 1 hour
      return response;
    } catch (error) { logger.error(`Error getting tracked bills for user ${user_id }:`, { component: 'BillTrackingService' }, error);
      return { bills: [], pagination: { page, limit, total: 0, pages: 0 } }; // Return empty on error
    }
  }

  /**
   * Update specific tracking preferences for a bill a user is already tracking.
   */
  async updateBillTrackingPreferences(
    user_id: string,
    bill_id: number,
    preferences: z.infer<typeof updatePreferencesSchema> // Use Zod type for input
  ): Promise<schema.UserBillTrackingPreference> { logger.info(`🔄 Updating tracking preferences for bill ${bill_id }, user ${ user_id }`);
    try { // Input already validated by Zod in the router
      const updateData: Partial<Omit<schema.UserBillTrackingPreference, 'id' | 'user_id' | 'bill_id' | 'created_at' | 'is_active'>> = {
          ...preferences,
          updated_at: new Date()
        };


      const [updatedPreference] = await this.db
        .update(schema.userBillTrackingPreference)
        .set(updateData)
        .where(and(eq(schema.userBillTrackingPreference.user_id, user_id), eq(schema.userBillTrackingPreference.bill_id, bill_id), eq(schema.userBillTrackingPreference.is_active, true))) // Ensure we only update active prefs
        .returning();

      if (!updatedPreference) { throw new Error(`No active tracking preference found for bill ${bill_id } and user ${ user_id } to update.`);
      }

      await this.clearUserTrackingCaches(user_id, bill_id);
      await this.recordTrackingAnalytics(user_id, bill_id, 'updated_preferences');

      logger.info(`✅ Updated tracking preferences for bill ${ bill_id } and user ${ user_id }`);
      return updatedPreference;
    } catch (error) { logger.error(`Error updating tracking preferences for bill ${bill_id } and user ${ user_id }:`, { component: 'BillTrackingService' }, error);
      throw error;
    }
  }

  /**
   * Perform bulk track or untrack operations for multiple bills.
   */
  async bulkTrackingOperation(operation: BulkTrackingOperation): Promise<BulkTrackingResult> {
    logger.info(`📦 Performing bulk ${operation.operation} for user ${operation.user_id} on ${operation.bill_ids.length} bills`);
    const result: BulkTrackingResult = { successful: [], failed: [], summary: { total: operation.bill_ids.length, successful: 0, failed: 0 } };

    // Validate preferences only needed for track operation
    if (operation.operation === 'track' && operation.preferences) {
        const prefValidation = basePreferenceSchema.safeParse(operation.preferences);
        if (!prefValidation.success) {
            throw new Error(`Invalid preferences provided for bulk track: ${prefValidation.error.message}`);
        }
    }


    // Consider running operations in parallel batches for performance
    for (const bill_id of operation.bill_ids) { try {
        if (operation.operation === 'track') {
          await this.trackBill(operation.user_id, bill_id, operation.preferences);
         } else { await this.untrackBill(operation.user_id, bill_id);
         }
        result.successful.push(bill_id);
        result.summary.successful++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Bulk ${operation.operation} failed for bill ${ bill_id }, user ${operation.user_id}: ${message}`);
        result.failed.push({ bill_id, error: message  });
        result.summary.failed++;
      }
    }

    // Clear general user caches after bulk op, specific caches cleared in track/untrack
    await this.clearUserTrackingCaches(operation.user_id);

    logger.info(`✅ Bulk ${operation.operation} completed for user ${operation.user_id}: ${result.summary.successful}/${result.summary.total} successful`);
    return result;
  }


  /**
   * Get analytics related to a user's bill tracking activities.
   */
  async getUserTrackingAnalytics(user_id: string): Promise<TrackingAnalytics> { const cacheKey = `user:tracking_analytics:${user_id }`;
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
                activeTrackedBills: count(sql`CASE WHEN ${schema.userBillTrackingPreference.is_active} = true THEN 1 ELSE NULL END`)
            }).from(schema.userBillTrackingPreference).where(eq(schema.userBillTrackingPreference.user_id, user_id)),

            // Query 2: Tracking by Category (Active Only)
            this.db.select({ category: schema.bills.category, count: count() })
                .from(schema.userBillTrackingPreference)
                .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.bill_id, schema.bills.id))
                .where(and(eq(schema.userBillTrackingPreference.user_id, user_id), eq(schema.userBillTrackingPreference.is_active, true)))
                .groupBy(schema.bills.category),

            // Query 3: Tracking by Status (Active Only)
            this.db.select({ status: schema.bills.status, count: count() })
                .from(schema.userBillTrackingPreference)
                .innerJoin(schema.bills, eq(schema.userBillTrackingPreference.bill_id, schema.bills.id))
                .where(and(eq(schema.userBillTrackingPreference.user_id, user_id), eq(schema.userBillTrackingPreference.is_active, true)))
                .groupBy(schema.bills.status),

            // Query 4: Engagement Summary (Across all user engagements)
            this.db.select({
                totalViews: sql<number>`COALESCE(SUM(${schema.bill_engagement.view_count}), 0)`,
                totalComments: sql<number>`COALESCE(SUM(${schema.bill_engagement.comment_count}), 0)`,
                totalShares: sql<number>`COALESCE(SUM(${schema.bill_engagement.share_count}), 0)`,
                averageEngagementScore: sql<number>`COALESCE(AVG(CAST(${schema.bill_engagement.engagement_score} AS DECIMAL)), 0)`
            }).from(schema.bill_engagement).where(eq(schema.bill_engagement.user_id, user_id)),

             // Query 5: Recent Activity (Fetch from cache)
             this.getRecentTrackingActivity(user_id)
        ]);


        const analyticsData: TrackingAnalytics = { user_id,
            totalTrackedBills: Number(totals[0]?.totalTrackedBills || 0),
            activeTrackedBills: Number(totals[0]?.activeTrackedBills || 0),
            trackingByCategory: categoryData.map(item => ({ category: item.category || 'Uncategorized', count: Number(item.count)  })),
            trackingByStatus: statusData.map(item => ({ status: item.status, count: Number(item.count) })),
            recentActivity: recentActivityData,
            engagementSummary: {
                totalViews: Number(engagementSummaryData[0]?.totalViews || 0),
                totalComments: Number(engagementSummaryData[0]?.totalComments || 0),
                totalShares: Number(engagementSummaryData[0]?.totalShares || 0),
                averageEngagementScore: Number(engagementSummaryData[0]?.averageEngagementScore || 0)
            }
        };

  await cacheService.set(cacheKey, analyticsData, 3600); // 1 hour
        return analyticsData;
    } catch (error) { logger.error(`Error getting tracking analytics for user ${user_id }:`, { component: 'BillTrackingService' }, error);
      return { // Return default structure on error
          user_id, totalTrackedBills: 0, activeTrackedBills: 0, trackingByCategory: [],
          trackingByStatus: [], recentActivity: [],
          engagementSummary: { totalViews: 0, totalComments: 0, totalShares: 0, averageEngagementScore: 0  }
      };
    }
  }

  /**
   * Check if a user is actively tracking a specific bills.
   */
  async isUserTrackingBill(user_id: string, bill_id: number): Promise<boolean> { const cacheKey = `user:tracking:${user_id }:bill:${ bill_id }`;
     const cachedValue = await cacheService.get(cacheKey);
     if (cachedValue !== null && cachedValue !== undefined) {
         logger.debug(`Cache hit for isUserTrackingBill: ${cacheKey}`);
         return Boolean(cachedValue);
     }
     logger.debug(`Cache miss for isUserTrackingBill: ${cacheKey}`);

    try {
      // Optimize query to just check for existence and is_active status
      const [preference] = await this.db
        .select({ is_active: schema.userBillTrackingPreference.is_active })
        .from(schema.userBillTrackingPreference)
        .where(and(eq(schema.userBillTrackingPreference.user_id, user_id), eq(schema.userBillTrackingPreference.bill_id, bill_id)))
        .limit(1);

       const isTracking = preference?.is_active ?? false; // Default to false if no record found
  await cacheService.set(cacheKey, isTracking, 300); // 5 minutes
       return isTracking;
    } catch (error) { logger.error(`Error checking if user ${user_id } is tracking bill ${ bill_id }:`, { component: 'BillTrackingService' }, error);
      return false; // Return false on error
    }
  }

  /**
   * Recommend bills for tracking based on user interests and untracked popular bills.
   */
  async getRecommendedBillsForTracking(user_id: string, limit: number = 10): Promise<schema.Bill[]> { const cacheKey = `user:recommended_tracking:${user_id }:${limit}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for recommended tracking: ${cacheKey}`);
      return cachedData;
    }
    logger.debug(`Cache miss for recommended tracking: ${cacheKey}`);

    try { // Find bills user is already tracking (active or inactive)
      const trackedBillIdsResult = await this.db
        .select({ bill_id: schema.userBillTrackingPreference.bill_id  })
        .from(schema.userBillTrackingPreference)
        .where(eq(schema.userBillTrackingPreference.user_id, user_id));
      const trackedBillIds = trackedBillIdsResult.map(t => t.bill_id);

      // Find user interests
      const user_interestsResult = await this.db
        .select({ interest: schema.user_interests.interest })
        .from(schema.user_interests)
        .where(eq(schema.user_interests.user_id, user_id));
      const interests = user_interestsResult.map(ui => ui.interest.toLowerCase()); // Normalize interests

      let recommendations: schema.Bill[] = [];

      // Strategy 1: Find untracked bills matching user interests (by category or tags)
      if (interests.length > 0) {
        const interestConditions = or(
          // Match category (case-insensitive)
          ...interests.map(interest => sql`LOWER(${schema.bills.category}) = ${interest}`),
          // Match tags (assuming tags are stored appropriately, e.g., in bill_tags table)
          // This requires a subquery or join depending on your final schema for tags
          // Example using exists subquery on bill_tags table:
           sql`EXISTS (
               SELECT 1 FROM ${schema.bill_tags}
               WHERE ${schema.bill_tags.bill_id} = ${schema.bills.id}
               AND LOWER(${schema.bill_tags.tag}) IN ${interests}
           )`
        );

        const interestBasedRecs = await this.db.select()
          .from(schema.bills)
          .where(and(
            interestConditions,
            trackedBillIds.length > 0 ? sql`${schema.bills.id} NOT IN ${trackedBillIds}` : undefined // Exclude tracked
          ))
          .orderBy(desc(schema.bills.view_count)) // Prioritize popular within interest
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
          .orderBy(desc(schema.bills.view_count)) // Order by popularity
          .limit(remainingLimit + recommendations.length); // Fetch slightly more to filter out duplicates

         // Add popular bills ensuring no duplicates from interest-based recs
         const currentRecIds = new Set(recommendations.map(r => r.id));
         popularUntracked.forEach(bill => {
             if (recommendations.length < limit && !currentRecIds.has(bills.id)) {
                 recommendations.push(bill);
             }
         });

      }

  await cacheService.set(cacheKey, recommendations, 3600); // 1 hour
      return recommendations;
    } catch (error) { logger.error(`Error getting recommended bills for user ${user_id }:`, { component: 'BillTrackingService' }, error);
      return []; // Return empty on error
    }
  }


  // --- Helper Methods ---

  private async validateBillExists(bill_id: number): Promise<Pick<Bill, 'id' | 'title'> | null> { if (isNaN(bill_id) || bill_id <= 0) throw new Error('Invalid Bill ID provided.');

  const cacheKey = `bill:exists:${bill_id }`; // Simple existence cache
    const cachedExists = await cacheService.get(cacheKey);
    // Return minimal info if exists, null otherwise
    if (cachedExists !== null && cachedExists !== undefined) { return cachedExists ? ({ id: bill_id, title: 'Cached Title'  } as Pick<Bill, 'id' | 'title'>) : null;
    }


    try {
      const [bill] = await this.db
        .select({ id: schema.bills.id, title: schema.bills.title }) // Only fetch needed fields
        .from(schema.bills)
        .where(eq(schema.bills.id, bill_id))
        .limit(1);

  await cacheService.set(cacheKey, !!bill, 3600); // 1 hour
      return bill || null;
    } catch (error) { logger.error(`Error validating bill existence for ID ${bill_id }:`, { component: 'BillTrackingService' }, error);
      throw new Error(`Database error validating bill existence for ID ${ bill_id }`);
    }
  }

  private async clearUserTrackingCaches(user_id: string, bill_id?: number): Promise<void> { // Define patterns/keys more specifically using CACHE_KEYS
    const patternsToDelete = [
      `user:tracked_bills:${user_id }:*`, // Pattern for paginated results
      `user:tracking_analytics:${ user_id }`,
      `user:recommended_tracking:${ user_id }:*`, // Pattern for different limits
    ];
    if (bill_id) { patternsToDelete.push(`user:tracking:${user_id }:bill:${ bill_id }`);
    }

    logger.debug(`Clearing cache keys/patterns for user ${ user_id }: ${patternsToDelete.join(', ')}`);
    try {
      // Use Promise.all to clear concurrently
    const clearPromises = patternsToDelete.map(async (keyOrPattern) => {
      // Pattern-based invalidation
      if (keyOrPattern.includes('*')) {
        if (typeof (cacheService as any).invalidateByPattern === 'function') {
          return (cacheService as any).invalidateByPattern(keyOrPattern);
        }
        // Fallback: resolve keys then delete
        if (typeof (cacheService as any).keys === 'function') {
          const keys: string[] = await (cacheService as any).keys(keyOrPattern);
          return Promise.all(keys.map(k => (cacheService as any).del ? (cacheService as any).del(k) : (cacheService as any).delete ? (cacheService as any).delete(k) : Promise.resolve()));
        }
        return Promise.resolve();
      } else {
        return (cacheService as any).del ? (cacheService as any).del(keyOrPattern) : (cacheService as any).delete ? (cacheService as any).delete(keyOrPattern) : Promise.resolve();
      }
    });
    await Promise.all(clearPromises);

      logger.debug(`Successfully cleared caches for user ${ user_id }`);
    } catch (error) { logger.error(`Error clearing cache for user ${user_id }:`, { component: 'BillTrackingService' }, error);
      // Log error but don't fail the primary operation
    }
  }

  private async getBillRecentUpdates(bill_id: number): Promise<TrackedBillWithDetails['recentUpdates']> {
     // Fetch recent status changes from billStatusMonitorService history (if available and reliable)
     // Or query related tables like analysis, comments, etc., ordered by date, limit 3-5
     // Example: Query last 3 comments + last status change
     try {
         // Placeholder: Get last status update from bill itself
         const [bill] = await this.db.select({ status: schema.bills.status, updated_at: schema.bills.updated_at })
             .from(schema.bills)
             .where(eq(schema.bills.id, bill_id));

         const updates: TrackedBillWithDetails['recentUpdates'] = [];
         if (bill) {
             updates.push({
                 type: 'status_change', // This is simplified, needs better tracking
                 timestamp: bills.updated_at,
                 description: `Bill status is now "${bills.status}"`
             });
         }

         // Add recent comments if needed
         const comments = await this.db.select({ content: schema.comments.content, created_at: schema.comments.created_at })
             .from(schema.comments)
             .where(eq(schema.comments.bill_id, bill_id))
             .orderBy(desc(schema.comments.created_at))
             .limit(2);

         comments.forEach(c => {
             updates.push({
                 type: 'new_comment',
                 timestamp: c.created_at,
                 description: `New comment: "${c.content.substring(0, 50)}..."`
             });
         });

         // Sort combined updates by timestamp
         updates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

         return updates.slice(0, 3); // Return top 3 most recent

     } catch (error) { logger.error(`Error getting recent updates for bill ${bill_id }:`, { component: 'BillTrackingService' }, error);
         return [];
     }
  }


  private async getRecentTrackingActivity(user_id: string): Promise<TrackingAnalytics['recentActivity']> { // This requires a dedicated activity log table or relying on cache which isn't persistent.
    // For now, return from cache if implemented, otherwise empty.
    const cacheKey = `tracking_activity:${user_id }`;
    try {
      const activity = await cacheService.get(cacheKey);
      return activity || [];
    } catch (error) {
      logger.error('Error getting recent tracking activity from cache:', { component: 'BillTrackingService' }, error);
      return [];
    }
  }

  private async recordTrackingAnalytics(user_id: string, bill_id: number, action: 'tracked' | 'untracked' | 'updated_preferences', billTitle?: string): Promise<void> { // Persist this to an analytics event log table or use cache for short-term view
    const cacheKey = `tracking_activity:${user_id }`;
    try { const activityRecord = {
            bill_id,
            billTitle: billTitle || `Bill ${bill_id }`, // Fetch title if not provided
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
