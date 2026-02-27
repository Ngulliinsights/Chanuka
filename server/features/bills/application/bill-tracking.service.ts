// Bill Tracking Service - Refactored with Repository Pattern
import { logger } from '@server/infrastructure/observability';
import { readDatabase, withTransaction } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import type { Bill } from '@server/infrastructure/schema';
import { and, count as drizzleCount, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { cacheService } from '@server/infrastructure/cache';
import type { BillRepository } from '../domain/repositories/bill.repository';

// ============================================================================
// IMPORTANT: Table Name Configuration
// ============================================================================
// The actual table reference depends on your schema exports.
// Update this constant to match your actual schema export name:
// 
// Option 1: If exported as camelCase
// const TRACKING_TABLE = schema.userBillTrackingPreferences;
//
// Option 2: If exported as snake_case
// const TRACKING_TABLE = schema.user_bill_tracking_preferences;
//
// Option 3: If it has a different name
// const TRACKING_TABLE = schema.billTracking;
//
// Currently using a conditional to handle both cases:
const TRACKING_TABLE = (schema as any).user_bill_tracking_preferences || 
                       (schema as any).userBillTrackingPreferences ||
                       (schema as any).billTracking;

if (!TRACKING_TABLE) {
  logger.error('❌ CRITICAL: user_bill_tracking_preferences table not found in schema exports!');
  logger.error('Please check server/infrastructure/schema/citizen_participation.ts');
}
// ============================================================================

// --- Constants ---
const CACHE_TTL = {
  SHORT: 300,           // 5 minutes
  MEDIUM: 1800,         // 30 minutes
  LONG: 3600,           // 1 hour
  USER_DATA_LONG: 7200, // 2 hours
} as const;

// --- Type Definitions ---
const TrackingTypeEnum = z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule']);
const AlertFrequencyEnum = z.enum(['immediate', 'hourly', 'daily', 'weekly']);
const AlertChannelEnum = z.enum(['in_app', 'email', 'push', 'sms']);
const SortByEnum = z.enum(['date_tracked', 'last_updated', 'engagement']);
const SortOrderEnum = z.enum(['asc', 'desc']);

type TrackingType = z.infer<typeof TrackingTypeEnum>;
type AlertFrequency = z.infer<typeof AlertFrequencyEnum>;
type AlertChannel = z.infer<typeof AlertChannelEnum>;

// --- Zod Schemas for Validation ---
const basePreferenceSchema = z.object({
  tracking_types: z.array(TrackingTypeEnum).optional(),
  alert_frequency: AlertFrequencyEnum.optional(),
  alert_channels: z.array(AlertChannelEnum).optional(),
  is_active: z.boolean().optional(),
});

const updatePreferencesSchema = basePreferenceSchema.omit({ is_active: true });

// --- Interface Definitions ---
export interface BillTrackingPreference {
  id: number;
  user_id: string;
  bill_id: number;
  tracking_types: TrackingType[];
  alert_frequency: AlertFrequency;
  alert_channels: AlertChannel[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InsertBillTrackingPreference {
  user_id: string;
  bill_id: number;
  tracking_types: TrackingType[];
  alert_frequency: AlertFrequency;
  alert_channels: AlertChannel[];
  is_active: boolean;
}

export interface TrackingAnalytics {
  user_id: string;
  totalTrackedBills: number;
  activeTrackedBills: number;
  trackingByCategory: Array<{ category: string | null; count: number }>;
  trackingByStatus: Array<{ status: string; count: number }>;
  recentActivity: Array<{
    bill_id: number;
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
  user_id: string;
  bill_ids: number[];
  operation: 'track' | 'untrack';
  preferences?: Partial<{
    tracking_types: TrackingType[];
    alert_frequency: AlertFrequency;
    alert_channels: AlertChannel[];
    is_active: boolean;
  }>;
}

export interface BulkTrackingResult {
  successful: number[];
  failed: Array<{ bill_id: number; error: string }>;
  summary: { total: number; successful: number; failed: number };
}

export interface TrackedBillWithDetails extends schema.Bill {
  trackingPreferences: BillTrackingPreference;
  engagement: {
    view_count: number;
    comment_count: number;
    share_count: number;
    engagement_score: number;
    lastEngaged: Date;
  };
  recentUpdates: Array<{
    type: 'status_change' | 'new_comment' | 'amendment';
    timestamp: Date;
    description: string;
  }>;
}

/**
 * Service for managing user bill tracking preferences and related operations.
 * 
 * REFACTORED WITH REPOSITORY PATTERN:
 * - Uses BillRepository for bill data access
 * - Maintains tracking-specific logic (user preferences, analytics)
 */
export class BillTrackingService {
  constructor(
    private readonly billRepository: BillRepository
  ) {}

  private get db() {
    return readDatabase as any;
  }

  /**
   * Track a bill for a user or update existing preferences if already tracked.
   */
  async trackBill(
    user_id: string,
    bill_id: number,
    preferences?: z.infer<typeof basePreferenceSchema>
  ): Promise<BillTrackingPreference> {
    logger.info(`📌 Tracking bill ${bill_id} for user ${user_id}`);
    
    try {
      const bill = await this.validateBillExists(bill_id);
      if (!bill) {
        throw new Error(`Bill with ID ${bill_id} not found`);
      }

      const result = await withTransaction(async (tx) => {
        const defaultPrefs = {
          tracking_types: (preferences?.tracking_types ?? ['status_changes', 'new_comments']) as TrackingType[],
          alert_frequency: (preferences?.alert_frequency ?? 'immediate') as AlertFrequency,
          alert_channels: (preferences?.alert_channels ?? ['in_app', 'email']) as AlertChannel[],
          is_active: true,
        };

        const valuesToInsert: InsertBillTrackingPreference = {
          user_id,
          bill_id,
          ...defaultPrefs,
        };

        const valuesToUpdate = {
          ...defaultPrefs,
          updated_at: new Date(),
        };

        const [preference] = await tx
          .insert(TRACKING_TABLE)
          .values(valuesToInsert)
          .onConflictDoUpdate({
            target: [
              TRACKING_TABLE.user_id,
              TRACKING_TABLE.bill_id,
            ],
            set: valuesToUpdate,
          })
          .returning();

        // Ensure bill_engagement record exists
        const [existingEngagement] = await tx
          .select({ id: schema.bill_engagement.id })
          .from(schema.bill_engagement)
          .where(
            and(
              eq(schema.bill_engagement.bill_id, bill_id),
              eq(schema.bill_engagement.user_id, user_id)
            )
          );

        if (!existingEngagement) {
          const engagementToInsert = {
            bill_id,
            user_id,
            view_count: 1,
            comment_count: 0,
            share_count: 0,
            engagement_score: '1',
            last_engaged_at: new Date(),
          };
          await tx.insert(schema.bill_engagement).values(engagementToInsert);
        } else {
          await tx
            .update(schema.bill_engagement)
            .set({ last_engaged_at: new Date(), updated_at: new Date() })
            .where(eq(schema.bill_engagement.id, existingEngagement.id));
        }

        return preference;
      });

      await this.clearUserTrackingCaches(user_id, bill_id);
      await this.recordTrackingAnalytics(user_id, bill_id, 'tracked', bill.title);
      
      logger.info(`✅ Successfully tracked bill ${bill_id} for user ${user_id}`);
      return result as BillTrackingPreference;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error tracking bill: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Mark a user's tracking preference for a bill as inactive.
   */
  async untrackBill(user_id: string, bill_id: number): Promise<void> {
    logger.info(`📌 Untracking bill ${bill_id} for user ${user_id}`);
    
    try {
      const bill = await this.validateBillExists(bill_id);

      const result = await this.db
        .update(TRACKING_TABLE)
        .set({ is_active: false, updated_at: new Date() })
        .where(
          and(
            eq(TRACKING_TABLE.bill_id, bill_id),
            eq(TRACKING_TABLE.user_id, user_id)
          )
        )
        .returning({ id: TRACKING_TABLE.id });

      if (result.length === 0) {
        logger.warn(
          `Attempted to untrack bill ${bill_id} for user ${user_id}, but no active preference found.`
        );
        return;
      }

      await this.clearUserTrackingCaches(user_id, bill_id);
      if (bill) {
        await this.recordTrackingAnalytics(user_id, bill_id, 'untracked', bill.title);
      }
      
      logger.info(`✅ Successfully untracked bill ${bill_id} for user ${user_id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error untracking bill: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get a paginated list of bills actively tracked by the user.
   * 
   * REFACTORED: Now uses BillRepository for bill queries
   */
  async getUserTrackedBills(
    user_id: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      sortBy?: z.infer<typeof SortByEnum>;
      sortOrder?: z.infer<typeof SortOrderEnum>;
    } = {}
  ): Promise<{
    bills: TrackedBillWithDetails[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy ?? 'date_tracked';
    const sortOrder = options.sortOrder ?? 'desc';

    const filterKey = `${options.category ?? 'all'}:${options.status ?? 'all'}:${sortBy}:${sortOrder}`;
    const cacheKey = `user:tracked_bills:${user_id}:${page}:${limit}:${filterKey}`;

    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for tracked bills: ${cacheKey}`);
      return cachedData as {
        bills: TrackedBillWithDetails[];
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    }
    logger.debug(`Cache miss for tracked bills: ${cacheKey}`);

    try {
      // Step 1: Get tracking preferences for user
      const trackingConditions = [
        eq(TRACKING_TABLE.user_id, user_id),
        eq(TRACKING_TABLE.is_active, true),
      ];

      const trackingResults = await this.db
        .select({
          bill_id: TRACKING_TABLE.bill_id,
          trackingPreferences: TRACKING_TABLE,
        })
        .from(TRACKING_TABLE)
        .where(and(...trackingConditions));

      if (trackingResults.length === 0) {
        return { bills: [], pagination: { page, limit, total: 0, pages: 0 } };
      }

      const trackedBillIds = trackingResults.map((t: any) => t.bill_id);
      const trackingMap = new Map(
        trackingResults.map((t: any) => [t.bill_id, t.trackingPreferences])
      );

      // Step 2: Use repository to fetch bills with filters
      const billsResult = await this.billRepository.findByIds(trackedBillIds, {
        category: options.category,
        status: options.status as any,
        sortBy: sortBy === 'date_tracked' ? 'updated_at' : (sortBy === 'last_updated' ? 'updated_at' : undefined),
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      if (billsResult.isErr) {
        logger.error(`Error fetching bills: ${billsResult.error.message}`);
        return { bills: [], pagination: { page, limit, total: 0, pages: 0 } };
      }

      let bills = billsResult.value;

      // Step 3: Apply pagination
      const total = bills.length;
      const paginatedBills = bills.slice(offset, offset + limit);

      // Step 4: Enhance with engagement data and tracking preferences
      const enhancedBills: TrackedBillWithDetails[] = await Promise.all(
        paginatedBills.map(async (bill: any) => {
          const recentUpdates = await this.getBillRecentUpdates(bill.id);
          
          // Get engagement data
          const [engagement] = await this.db
            .select()
            .from(schema.bill_engagement)
            .where(
              and(
                eq(schema.bill_engagement.bill_id, bill.id),
                eq(schema.bill_engagement.user_id, user_id)
              )
            )
            .limit(1);

          const engagement_data = engagement || {
            view_count: 0,
            comment_count: 0,
            share_count: 0,
            engagement_score: '0',
            last_engaged_at: new Date(),
          };

          const trackingPreferences = trackingMap.get(bill.id);
          
          return {
            ...bill,
            trackingPreferences: trackingPreferences as BillTrackingPreference,
            engagement: {
              view_count: engagement_data.view_count,
              comment_count: engagement_data.comment_count,
              share_count: engagement_data.share_count,
              engagement_score: parseFloat(engagement_data.engagement_score || '0'),
              lastEngaged: engagement_data.last_engaged_at || new Date(),
            },
            recentUpdates,
          };
        })
      );

      const response = {
        bills: enhancedBills,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
      
      await cacheService.set(cacheKey, response, CACHE_TTL.LONG);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting tracked bills: ${errorMessage}`);
      return { bills: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  /**
   * Update specific tracking preferences for a bill a user is already tracking.
   */
  async updateBillTrackingPreferences(
    user_id: string,
    bill_id: number,
    preferences: z.infer<typeof updatePreferencesSchema>
  ): Promise<BillTrackingPreference> {
    logger.info(`🔄 Updating tracking preferences for bill ${bill_id}, user ${user_id}`);
    
    try {
      const updateData: any = {
        ...preferences,
        updated_at: new Date(),
      };

      const [updatedPreference] = await this.db
        .update(TRACKING_TABLE)
        .set(updateData)
        .where(
          and(
            eq(TRACKING_TABLE.user_id, user_id),
            eq(TRACKING_TABLE.bill_id, bill_id),
            eq(TRACKING_TABLE.is_active, true)
          )
        )
        .returning();

      if (!updatedPreference) {
        throw new Error(
          `No active tracking preference found for bill ${bill_id} and user ${user_id} to update.`
        );
      }

      await this.clearUserTrackingCaches(user_id, bill_id);
      await this.recordTrackingAnalytics(user_id, bill_id, 'updated_preferences');

      logger.info(`✅ Updated tracking preferences for bill ${bill_id} and user ${user_id}`);
      return updatedPreference as BillTrackingPreference;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error updating tracking preferences: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Perform bulk track or untrack operations for multiple bills.
   */
  async bulkTrackingOperation(operation: BulkTrackingOperation): Promise<BulkTrackingResult> {
    logger.info(
      `📦 Performing bulk ${operation.operation} for user ${operation.user_id} on ${operation.bill_ids.length} bills`
    );
    
    const result: BulkTrackingResult = {
      successful: [],
      failed: [],
      summary: { total: operation.bill_ids.length, successful: 0, failed: 0 },
    };

    if (operation.operation === 'track' && operation.preferences) {
      const prefValidation = basePreferenceSchema.safeParse(operation.preferences);
      if (!prefValidation.success) {
        throw new Error(`Invalid preferences: ${prefValidation.error.message}`);
      }
    }

    for (const bill_id of operation.bill_ids) {
      try {
        if (operation.operation === 'track') {
          await this.trackBill(operation.user_id, bill_id, operation.preferences as any);
        } else {
          await this.untrackBill(operation.user_id, bill_id);
        }
        result.successful.push(bill_id);
        result.summary.successful++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Bulk ${operation.operation} failed for bill ${bill_id}: ${message}`);
        result.failed.push({ bill_id, error: message });
        result.summary.failed++;
      }
    }

    await this.clearUserTrackingCaches(operation.user_id);

    logger.info(
      `✅ Bulk ${operation.operation} completed: ${result.summary.successful}/${result.summary.total} successful`
    );
    return result;
  }

  /**
   * Get analytics related to a user's bill tracking activities.
   */
  async getUserTrackingAnalytics(user_id: string): Promise<TrackingAnalytics> {
    const cacheKey = `user:tracking_analytics:${user_id}`;
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.debug(`Cache hit for tracking analytics: ${cacheKey}`);
      return cachedData as TrackingAnalytics;
    }
    logger.debug(`Cache miss for tracking analytics: ${cacheKey}`);

    try {
      const [totals, categoryData, statusData, engagementSummaryData, recentActivityData] =
        await Promise.all([
          // Query 1: Total and Active Counts
          this.db
            .select({
              totalTrackedBills: drizzleCount(),
              activeTrackedBills: drizzleCount(
                sql`CASE WHEN ${TRACKING_TABLE.is_active} = true THEN 1 ELSE NULL END`
              ),
            })
            .from(TRACKING_TABLE)
            .where(eq(TRACKING_TABLE.user_id, user_id)),

          // Query 2: Tracking by Category
          this.db
            .select({ category: schema.bills.category, count: drizzleCount() })
            .from(TRACKING_TABLE)
            .innerJoin(
              schema.bills,
              eq(TRACKING_TABLE.bill_id, schema.bills.id)
            )
            .where(
              and(
                eq(TRACKING_TABLE.user_id, user_id),
                eq(TRACKING_TABLE.is_active, true)
              )
            )
            .groupBy(schema.bills.category),

          // Query 3: Tracking by Status
          this.db
            .select({ status: schema.bills.status, count: drizzleCount() })
            .from(TRACKING_TABLE)
            .innerJoin(
              schema.bills,
              eq(TRACKING_TABLE.bill_id, schema.bills.id)
            )
            .where(
              and(
                eq(TRACKING_TABLE.user_id, user_id),
                eq(TRACKING_TABLE.is_active, true)
              )
            )
            .groupBy(schema.bills.status),

          // Query 4: Engagement Summary
          this.db
            .select({
              totalViews: sql<number>`COALESCE(SUM(${schema.bill_engagement.view_count}), 0)`,
              totalComments: sql<number>`COALESCE(SUM(${schema.bill_engagement.comment_count}), 0)`,
              totalShares: sql<number>`COALESCE(SUM(${schema.bill_engagement.share_count}), 0)`,
              averageEngagementScore: sql<number>`COALESCE(AVG(CAST(${schema.bill_engagement.engagement_score} AS DECIMAL)), 0)`,
            })
            .from(schema.bill_engagement)
            .where(eq(schema.bill_engagement.user_id, user_id)),

          // Query 5: Recent Activity
          this.getRecentTrackingActivity(user_id),
        ]);

      const analyticsData: TrackingAnalytics = {
        user_id,
        totalTrackedBills: Number(totals[0]?.totalTrackedBills || 0),
        activeTrackedBills: Number(totals[0]?.activeTrackedBills || 0),
        trackingByCategory: categoryData.map((item: any) => ({
          category: item.category || 'Uncategorized',
          count: Number(item.count),
        })),
        trackingByStatus: statusData.map((item: any) => ({
          status: item.status,
          count: Number(item.count),
        })),
        recentActivity: recentActivityData,
        engagementSummary: {
          totalViews: Number(engagementSummaryData[0]?.totalViews || 0),
          totalComments: Number(engagementSummaryData[0]?.totalComments || 0),
          totalShares: Number(engagementSummaryData[0]?.totalShares || 0),
          averageEngagementScore: Number(engagementSummaryData[0]?.averageEngagementScore || 0),
        },
      };

      await cacheService.set(cacheKey, analyticsData, CACHE_TTL.LONG);
      return analyticsData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting tracking analytics: ${errorMessage}`);
      return {
        user_id,
        totalTrackedBills: 0,
        activeTrackedBills: 0,
        trackingByCategory: [],
        trackingByStatus: [],
        recentActivity: [],
        engagementSummary: {
          totalViews: 0,
          totalComments: 0,
          totalShares: 0,
          averageEngagementScore: 0,
        },
      };
    }
  }

  /**
   * Check if a user is actively tracking a specific bill.
   */
  async isUserTrackingBill(user_id: string, bill_id: number): Promise<boolean> {
    const cacheKey = `user:tracking:${user_id}:bill:${bill_id}`;
    const cachedValue = await cacheService.get(cacheKey);
    
    if (cachedValue !== null && cachedValue !== undefined) {
      logger.debug(`Cache hit for isUserTrackingBill: ${cacheKey}`);
      return Boolean(cachedValue);
    }
    logger.debug(`Cache miss for isUserTrackingBill: ${cacheKey}`);

    try {
      const [preference] = await this.db
        .select({ is_active: TRACKING_TABLE.is_active })
        .from(TRACKING_TABLE)
        .where(
          and(
            eq(TRACKING_TABLE.user_id, user_id),
            eq(TRACKING_TABLE.bill_id, bill_id)
          )
        )
        .limit(1);

      const isTracking = preference?.is_active ?? false;
      await cacheService.set(cacheKey, isTracking, CACHE_TTL.SHORT);
      return isTracking;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error checking if user is tracking bill: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Recommend bills for tracking based on user interests.
   * 
   * PARTIALLY REFACTORED: Uses BillRepository for bill queries
   * TODO: Move recommendation logic to domain service
   */
  async getRecommendedBillsForTracking(
    user_id: string,
    limit: number = 10
  ): Promise<schema.Bill[]> {
    const cacheKey = `user:recommended_tracking:${user_id}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.debug(`Cache hit for recommended tracking: ${cacheKey}`);
      return cachedData as schema.Bill[];
    }
    logger.debug(`Cache miss for recommended tracking: ${cacheKey}`);

    try {
      // Find bills user is already tracking
      const trackedBillIdsResult = await this.db
        .select({ bill_id: TRACKING_TABLE.bill_id })
        .from(TRACKING_TABLE)
        .where(eq(TRACKING_TABLE.user_id, user_id));
      const trackedBillIds = trackedBillIdsResult.map((t: any) => t.bill_id);

      // Find user interests
      const userInterestsResult = await this.db
        .select({ interest: schema.user_interests.interest })
        .from(schema.user_interests)
        .where(eq(schema.user_interests.user_id, user_id));
      const interests = userInterestsResult.map((ui: any) => ui.interest.toLowerCase());

      const recommendations: schema.Bill[] = [];

      // Strategy 1: Find untracked bills matching user interests by category
      if (interests.length > 0) {
        for (const interest of interests) {
          if (recommendations.length >= limit) break;
          
          const categoryResult = await this.billRepository.findByCategory(
            interest,
            { limit: limit - recommendations.length }
          );
          
          if (categoryResult.isOk) {
            // Filter out already tracked bills
            const untrackedBills = categoryResult.value.filter(
              bill => !trackedBillIds.includes(bill.id)
            );
            recommendations.push(...untrackedBills);
          }
        }
      }

      // Strategy 2: Add popular untracked bills if needed
      if (recommendations.length < limit) {
        const popularResult = await this.billRepository.findPopular({
          limit: limit - recommendations.length,
          excludeIds: [...trackedBillIds, ...recommendations.map(r => r.id)]
        });

        if (popularResult.isOk) {
          recommendations.push(...popularResult.value);
        }
      }

      // Limit to requested amount
      const finalRecommendations = recommendations.slice(0, limit);
      
      await cacheService.set(cacheKey, finalRecommendations, CACHE_TTL.LONG);
      return finalRecommendations;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting recommended bills: ${errorMessage}`);
      return [];
    }
  }

  // --- Helper Methods ---

  /**
   * Validate bill exists using repository
   * 
   * REFACTORED: Now uses BillRepository instead of direct database access
   */
  private async validateBillExists(
    bill_id: number
  ): Promise<Pick<Bill, 'id' | 'title'> | null> {
    if (isNaN(bill_id) || bill_id <= 0) {
      throw new Error('Invalid Bill ID provided.');
    }

    try {
      // Use repository to find bill by ID
      const result = await this.billRepository.findById(bill_id);
      
      if (result.isErr) {
        logger.error(`Error finding bill ${bill_id}: ${result.error.message}`);
        throw result.error;
      }

      if (result.value === null) {
        return null;
      }

      // Return only id and title
      return {
        id: result.value.id,
        title: result.value.title,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error validating bill existence: ${errorMessage}`);
      throw new Error(`Database error validating bill existence for ID ${bill_id}`);
    }
  }

  private async clearUserTrackingCaches(user_id: string, bill_id?: number): Promise<void> {
    const patternsToDelete = [
      `user:tracked_bills:${user_id}:*`,
      `user:tracking_analytics:${user_id}`,
      `user:recommended_tracking:${user_id}:*`,
    ];
    
    if (bill_id) {
      patternsToDelete.push(`user:tracking:${user_id}:bill:${bill_id}`);
    }

    logger.debug(`Clearing cache keys/patterns for user ${user_id}: ${patternsToDelete.join(', ')}`);
    
    try {
      const clearPromises = patternsToDelete.map(async (keyOrPattern) => {
        if (keyOrPattern.includes('*')) {
          if (typeof cacheService.invalidateByPattern === 'function') {
            return cacheService.invalidateByPattern(keyOrPattern);
          }
          logger.warn(`Pattern-based cache invalidation not supported, skipping: ${keyOrPattern}`);
          return Promise.resolve();
        } else {
          return cacheService.del(keyOrPattern);
        }
      });
      
      await Promise.all(clearPromises);
      logger.debug(`Successfully cleared caches for user ${user_id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error clearing cache: ${errorMessage}`);
    }
  }

  /**
   * Get recent updates for a bill
   * 
   * REFACTORED: Now uses BillRepository instead of direct database access
   */
  private async getBillRecentUpdates(
    bill_id: number
  ): Promise<TrackedBillWithDetails['recentUpdates']> {
    try {
      // Use repository to get bill
      const billResult = await this.billRepository.findById(bill_id);
      
      if (billResult.isErr) {
        logger.error(`Error fetching bill ${bill_id}: ${billResult.error.message}`);
        return [];
      }

      const updates: TrackedBillWithDetails['recentUpdates'] = [];
      
      if (billResult.value) {
        updates.push({
          type: 'status_change',
          timestamp: billResult.value.updated_at,
          description: `Bill status is now "${billResult.value.status}"`,
        });
      }

      // Add recent comments (still using direct query as comments aren't in bill repository)
      const comments = await this.db
        .select({ content: schema.comments.content, created_at: schema.comments.created_at })
        .from(schema.comments)
        .where(eq(schema.comments.bill_id, bill_id))
        .orderBy(desc(schema.comments.created_at))
        .limit(2);

      comments.forEach((c: any) => {
        updates.push({
          type: 'new_comment',
          timestamp: c.created_at,
          description: `New comment: "${c.content.substring(0, 50)}..."`,
        });
      });

      updates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return updates.slice(0, 3);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting recent updates: ${errorMessage}`);
      return [];
    }
  }

  private async getRecentTrackingActivity(
    user_id: string
  ): Promise<TrackingAnalytics['recentActivity']> {
    const cacheKey = `tracking_activity:${user_id}`;
    try {
      const activity = await cacheService.get(cacheKey);
      return (activity as TrackingAnalytics['recentActivity']) || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting recent tracking activity: ${errorMessage}`);
      return [];
    }
  }

  private async recordTrackingAnalytics(
    user_id: string,
    bill_id: number,
    action: 'tracked' | 'untracked' | 'updated_preferences',
    billTitle?: string
  ): Promise<void> {
    const cacheKey = `tracking_activity:${user_id}`;
    try {
      const activityRecord = {
        bill_id,
        billTitle: billTitle || `Bill ${bill_id}`,
        action,
        timestamp: new Date(),
      };

      const existingActivity = (await cacheService.get(cacheKey) as any[]) || [];
      const updatedActivity = [activityRecord, ...existingActivity].slice(0, 20);

      await cacheService.set(cacheKey, updatedActivity, CACHE_TTL.USER_DATA_LONG);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error recording tracking analytics: ${errorMessage}`);
    }
  }
}

// NOTE: Singleton instance now created in bill.factory.ts with dependency injection
// Export class for factory usage
// export const billTrackingService = new BillTrackingService();