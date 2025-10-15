import { eq, and, desc, sql, count, inArray, or } from 'drizzle-orm';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { readDatabase } from '../../db.js';
import { notificationService } from '../../infrastructure/notifications/notification-service.js';
import { billStatusMonitorService } from './bill-status-monitor.js';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../infrastructure/cache/cache-service.js';
import * as schema from '../../../shared/schema.js';
import { Bill, BillEngagement } from '../../../shared/schema.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// Types and interfaces
export interface BillTrackingPreference {
  userId: string;
  billId: number;
  trackingTypes: Array<'status_changes' | 'new_comments' | 'amendments' | 'voting_schedule'>;
  alertFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  alertChannels: Array<'in_app' | 'email' | 'push' | 'sms'>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingAnalytics {
  userId: string;
  totalTrackedBills: number;
  activeTrackedBills: number;
  trackingByCategory: Array<{
    category: string;
    count: number;
  }>;
  trackingByStatus: Array<{
    status: string;
    count: number;
  }>;
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
  preferences?: Partial<BillTrackingPreference>;
}

export interface BulkTrackingResult {
  successful: number[];
  failed: Array<{
    billId: number;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface TrackedBillWithDetails extends Bill {
  trackingPreferences: BillTrackingPreference;
  engagement: {
    viewCount: number;
    commentCount: number;
    shareCount: number;
    engagementScore: number;
    lastEngaged: Date;
  };
  recentUpdates: Array<{
    type: 'status_change' | 'new_comment' | 'amendment';
    timestamp: Date;
    description: string;
  }>;
}

// Validation schemas
const trackingPreferenceSchema = z.object({
  trackingTypes: z.array(z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule'])),
  alertFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']),
  alertChannels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])),
  isActive: z.boolean().default(true)
});

const bulkTrackingSchema2 = z.object({
  billIds: z.array(z.number()).min(1).max(100), // Limit to 100 bills at once
  operation: z.enum(['track', 'untrack']),
  preferences: trackingPreferenceSchema.partial().optional()
});

/**
 * Comprehensive Bill Tracking Service
 * Handles bill tracking operations, user preferences, and analytics
 */
export class BillTrackingService {
  // Resolve the runtime DB instance at call time to avoid eager initialization
  private get db() {
    return readDatabase();
  }

  /**
   * Track a bill for a user
   */
  async trackBill(
    userId: string,
    billId: number,
    preferences?: Partial<BillTrackingPreference>
  ): Promise<BillTrackingPreference> {
    try {
      console.log(`📌 Tracking bill ${billId} for user ${userId}`);

      // Validate that bill exists
      const bill = await this.validateBillExists(billId);
      if (!bill) {
        throw new Error(`Bill with ID ${billId} not found`);
      }

      // Check if already tracking
      const existingTracking = await this.getBillTrackingPreference(userId, billId);
      if (existingTracking) {
        // Update existing tracking preferences
        return await this.updateBillTrackingPreferences(userId, billId, preferences || {});
      }

      // Create default preferences
      const defaultPreferences: BillTrackingPreference = {
        userId,
        billId,
        trackingTypes: ['status_changes', 'new_comments'],
        alertFrequency: 'immediate',
        alertChannels: ['in_app', 'email'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...preferences
      };

      // Validate preferences
      trackingPreferenceSchema.parse({
        trackingTypes: defaultPreferences.trackingTypes,
        alertFrequency: defaultPreferences.alertFrequency,
        alertChannels: defaultPreferences.alertChannels,
        isActive: defaultPreferences.isActive
      });

      const result = await databaseService.withTransaction(
        async (tx) => {
          // Create or update bill engagement record
          const [existingEngagement] = await tx
            .select()
            .from(schema.billEngagement)
            .where(
              and(
                eq(schema.billEngagement.billId, billId),
                eq(schema.billEngagement.userId, userId)
              )
            );

          if (!existingEngagement) {
            await tx
              .insert(schema.billEngagement)
              .values({
                billId,
                userId,
                viewCount: 1,
                commentCount: 0,
                shareCount: 0,
                engagementScore: "1",
                lastEngaged: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
          } else {
            await tx
              .update(schema.billEngagement)
              .set({
                lastEngaged: new Date(),
                updatedAt: new Date()
              })
              .where(eq(schema.billEngagement.id, existingEngagement.id));
          }

          // Store tracking preferences in cache (since we don't have a dedicated table)
          await this.storeTrackingPreferences(userId, billId, defaultPreferences);

          return defaultPreferences;
        },
        'trackBill'
      );

      // Clear relevant caches
      await this.clearUserTrackingCaches(userId);

      // Send confirmation notification
      // await this.sendTrackingNotification(userId, billId, 'tracked', bill.title);

      // Record analytics event
      await this.recordTrackingAnalytics(userId, billId, 'tracked');

      console.log(`✅ Successfully tracked bill ${billId} for user ${userId}`);
      return result.data;

    } catch (error) {
      console.error(`Error tracking bill ${billId} for user ${userId}:`, error as any);
      throw error;
    }
  }

  /**
   * Untrack a bill for a user
   */
  async untrackBill(userId: string, billId: number): Promise<void> {
    try {
      console.log(`📌 Untracking bill ${billId} for user ${userId}`);

      // Check if currently tracking
      const existingTracking = await this.getBillTrackingPreference(userId, billId);
      if (!existingTracking) {
        throw new Error(`Bill ${billId} is not being tracked by user ${userId}`);
      }

      // Get bill details for notification
      const bill = await this.validateBillExists(billId);

      await databaseService.withTransaction(
        async (tx) => {
          // Update engagement record to mark as inactive (don't delete for analytics)
          await tx
            .update(schema.billEngagement)
            .set({
              lastEngaged: new Date(),
              updatedAt: new Date()
            })
            .where(
              and(
                eq(schema.billEngagement.billId, billId),
                eq(schema.billEngagement.userId, userId)
              )
            );

          // Remove tracking preferences from cache
          await this.removeTrackingPreferences(userId, billId);
        },
        'untrackBill'
      );

      // Clear relevant caches
      await this.clearUserTrackingCaches(userId);

      // Send confirmation notification
      // if (bill) {
      //   await this.sendTrackingNotification(userId, billId, 'untracked', bill.title);
      // }

      // Record analytics event
      await this.recordTrackingAnalytics(userId, billId, 'untracked');

      console.log(`✅ Successfully untracked bill ${billId} for user ${userId}`);

    } catch (error) {
      console.error(`Error untracking bill ${billId} for user ${userId}:`, error as any);
      throw error;
    }
  }

  /**
   * Get user's tracked bills with details
   */
  async getUserTrackedBills(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      sortBy?: 'date_tracked' | 'last_updated' | 'engagement';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    bills: TrackedBillWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:tracked_bills:${page}:${limit}:${options.category || 'all'}:${options.status || 'all'}`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            // Get user's bill engagements (which represent tracked bills)
            let query = this.db
              .select({
                bill: schema.bills,
                engagement: schema.billEngagement
              })
              .from(schema.billEngagement)
              .innerJoin(schema.bills, eq(schema.billEngagement.billId, schema.bills.id))
              .where(eq(schema.billEngagement.userId, userId));

            // Apply filters
            const conditions = [eq(schema.billEngagement.userId, userId)];
            
            if (options.category) {
              conditions.push(eq(schema.bills.category, options.category));
            }
            
            if (options.status) {
              conditions.push(eq(schema.bills.status, options.status));
            }

            if (conditions.length > 1) {
              query = query.where(and(...conditions));
            }

            // Apply sorting
            switch (options.sortBy) {
              case 'last_updated':
                query = query.orderBy(
                  options.sortOrder === 'asc' 
                    ? schema.bills.updatedAt 
                    : desc(schema.bills.updatedAt)
                );
                break;
              case 'engagement':
                query = query.orderBy(
                  options.sortOrder === 'asc' 
                    ? schema.billEngagement.engagementScore 
                    : desc(schema.billEngagement.engagementScore)
                );
                break;
              default: // date_tracked
                query = query.orderBy(
                  options.sortOrder === 'asc' 
                    ? schema.billEngagement.createdAt 
                    : desc(schema.billEngagement.createdAt)
                );
            }

            // Get total count
            const totalQuery = this.db
              .select({ count: count() })
              .from(schema.billEngagement)
              .innerJoin(schema.bills, eq(schema.billEngagement.billId, schema.bills.id))
              .where(and(...conditions));

            const [{ count: total }] = await totalQuery;

            // Get paginated results
            const results = await query.limit(limit).offset(offset);

            // Enhance with tracking preferences and recent updates
            const enhancedBills: TrackedBillWithDetails[] = [];

            for (const result of results) {
              const trackingPreferences = await this.getBillTrackingPreference(userId, result.bill.id);
              const recentUpdates = await this.getBillRecentUpdates(result.bill.id);

              enhancedBills.push({
                ...result.bill,
                trackingPreferences: trackingPreferences || {
                  userId,
                  billId: result.bill.id,
                  trackingTypes: ['status_changes'],
                  alertFrequency: 'immediate',
                  alertChannels: ['in_app'],
                  isActive: true,
                  createdAt: result.engagement.createdAt || new Date(),
                  updatedAt: result.engagement.updatedAt || new Date()
                },
                engagement: {
                  viewCount: result.engagement.viewCount,
                  commentCount: result.engagement.commentCount,
                  shareCount: result.engagement.shareCount,
                  engagementScore: parseFloat(result.engagement.engagementScore || '0'),
                  lastEngaged: result.engagement.lastEngaged || new Date()
                },
                recentUpdates
              });
            }

            return {
              bills: enhancedBills,
              total: Number(total)
            };
          },
          { bills: [], total: 0 },
          `getUserTrackedBills:${userId}`
        );

        return {
          bills: result.data.bills,
          pagination: {
            page,
            limit,
            total: result.data.total,
            pages: Math.ceil(result.data.total / limit)
          }
        };
      },
      CACHE_TTL.USER_DATA
    );
  }

  /**
   * Update bill tracking preferences
   */
  async updateBillTrackingPreferences(
    userId: string,
    billId: number,
    preferences: Partial<BillTrackingPreference>
  ): Promise<BillTrackingPreference> {
    try {
      // Get current preferences
      const currentPreferences = await this.getBillTrackingPreference(userId, billId);
      if (!currentPreferences) {
        throw new Error(`Bill ${billId} is not being tracked by user ${userId}`);
      }

      // Merge with new preferences
      const updatedPreferences: BillTrackingPreference = {
        ...currentPreferences,
        ...preferences,
        updatedAt: new Date()
      };

      // Validate updated preferences
      trackingPreferenceSchema.parse({
        trackingTypes: updatedPreferences.trackingTypes,
        alertFrequency: updatedPreferences.alertFrequency,
        alertChannels: updatedPreferences.alertChannels,
        isActive: updatedPreferences.isActive
      });

      // Store updated preferences
      await this.storeTrackingPreferences(userId, billId, updatedPreferences);

      // Clear relevant caches
      await this.clearUserTrackingCaches(userId);

      // Record analytics event
      await this.recordTrackingAnalytics(userId, billId, 'updated_preferences');

      console.log(`✅ Updated tracking preferences for bill ${billId} and user ${userId}`);
      return updatedPreferences;

    } catch (error) {
      console.error(`Error updating tracking preferences for bill ${billId} and user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk tracking operations
   */
  async bulkTrackingOperation(operation: BulkTrackingOperation): Promise<BulkTrackingResult> {
    try {
      console.log(`📦 Performing bulk ${operation.operation} operation for ${operation.billIds.length} bills`);

      // Validate operation
      bulkTrackingSchema.parse({
        billIds: operation.billIds,
        operation: operation.operation,
        preferences: operation.preferences
      });

      const result: BulkTrackingResult = {
        successful: [],
        failed: [],
        summary: {
          total: operation.billIds.length,
          successful: 0,
          failed: 0
        }
      };

      // Process each bill
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
          result.failed.push({
            billId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.summary.failed++;
        }
      }

      // Send bulk operation notification
      // await this.sendBulkOperationNotification(operation.userId, operation.operation, result);

      console.log(`✅ Bulk ${operation.operation} operation completed: ${result.summary.successful}/${result.summary.total} successful`);
      return result;

    } catch (error) {
      logger.error('Error performing bulk tracking operation:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Get user tracking analytics
   */
  async getUserTrackingAnalytics(userId: string): Promise<TrackingAnalytics> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:tracking_analytics`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            // Get total tracked bills
            const [{ count: totalTracked }] = await this.db
              .select({ count: count() })
              .from(schema.billEngagement)
              .where(eq(schema.billEngagement.userId, userId));

            // Get tracking by category
            const trackingByCategory = await this.db
              .select({
                category: schema.bills.category,
                count: count()
              })
              .from(schema.billEngagement)
              .innerJoin(schema.bills, eq(schema.billEngagement.billId, schema.bills.id))
              .where(eq(schema.billEngagement.userId, userId))
              .groupBy(schema.bills.category);

            // Get tracking by status
            const trackingByStatus = await this.db
              .select({
                status: schema.bills.status,
                count: count()
              })
              .from(schema.billEngagement)
              .innerJoin(schema.bills, eq(schema.billEngagement.billId, schema.bills.id))
              .where(eq(schema.billEngagement.userId, userId))
              .groupBy(schema.bills.status);

            // Get recent activity (from cache/analytics)
            const recentActivity = await this.getRecentTrackingActivity(userId);

            // Get engagement summary
            const [engagementSummary] = await this.db
              .select({
                totalViews: sql<number>`SUM(${schema.billEngagement.viewCount})`,
                totalComments: sql<number>`SUM(${schema.billEngagement.commentCount})`,
                totalShares: sql<number>`SUM(${schema.billEngagement.shareCount})`,
                averageEngagementScore: sql<number>`AVG(CAST(${schema.billEngagement.engagementScore} AS DECIMAL))`
              })
              .from(schema.billEngagement)
              .where(eq(schema.billEngagement.userId, userId));

            return {
              userId,
              totalTrackedBills: Number(totalTracked),
              activeTrackedBills: Number(totalTracked), // All are considered active for now
              trackingByCategory: trackingByCategory.map(item => ({
                category: item.category || 'Unknown',
                count: Number(item.count)
              })),
              trackingByStatus: trackingByStatus.map(item => ({
                status: item.status,
                count: Number(item.count)
              })),
              recentActivity,
              engagementSummary: {
                totalViews: Number(engagementSummary?.totalViews || 0),
                totalComments: Number(engagementSummary?.totalComments || 0),
                totalShares: Number(engagementSummary?.totalShares || 0),
                averageEngagementScore: Number(engagementSummary?.averageEngagementScore || 0)
              }
            };
          },
          {
            userId,
            totalTrackedBills: 0,
            activeTrackedBills: 0,
            trackingByCategory: [],
            trackingByStatus: [],
            recentActivity: [],
            engagementSummary: {
              totalViews: 0,
              totalComments: 0,
              totalShares: 0,
              averageEngagementScore: 0
            }
          },
          `getUserTrackingAnalytics:${userId}`
        );

        return result.data;
      },
      CACHE_TTL.USER_DATA
    );
  }

  /**
   * Check if user is tracking a bill
   */
  async isUserTrackingBill(userId: string, billId: number): Promise<boolean> {
    try {
      const preferences = await this.getBillTrackingPreference(userId, billId);
      return preferences !== null && preferences.isActive;
    } catch (error) {
      console.error(`Error checking if user ${userId} is tracking bill ${billId}:`, error);
      return false;
    }
  }

  /**
   * Get bills recommended for tracking based on user interests
   */
  async getRecommendedBillsForTracking(
    userId: string,
    limit: number = 10
  ): Promise<Bill[]> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:recommended_tracking:${limit}`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            // Get user interests
            const userInterests = await this.db
              .select({ interest: schema.userInterests.interest })
              .from(schema.userInterests)
              .where(eq(schema.userInterests.userId, userId));

            const interests = userInterests.map(ui => ui.interest);

            if (interests.length === 0) {
              // Return popular bills if no interests
              return await this.db
                .select()
                .from(schema.bills)
                .orderBy(desc(schema.bills.viewCount))
                .limit(limit);
            }

            // Get bills that match user interests and aren't already tracked
            const trackedBillIds = await this.db
              .select({ billId: schema.billEngagement.billId })
              .from(schema.billEngagement)
              .where(eq(schema.billEngagement.userId, userId));

            const trackedIds = trackedBillIds.map(tb => tb.billId);

            let query = this.db
              .select()
              .from(schema.bills)
              .where(
                and(
                  or(...interests.map(interest => 
                    sql`${schema.bills.category} ILIKE ${`%${interest}%`} OR ${schema.bills.tags} && ARRAY[${interest}]`
                  )),
                  trackedIds.length > 0 ? sql`${schema.bills.id} NOT IN (${trackedIds.join(',')})` : sql`1=1`
                )
              )
              .orderBy(desc(schema.bills.viewCount))
              .limit(limit);

            return await query;
          },
          [],
          `getRecommendedBillsForTracking:${userId}`
        );

        return result.data;
      },
      CACHE_TTL.USER_DATA
    );
  }

  /**
   * Helper methods
   */
  private async validateBillExists(billId: number): Promise<Bill | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [bill] = await this.db
          .select()
          .from(schema.bills)
          .where(eq(schema.bills.id, billId))
          .limit(1);
        
        return bill || null;
      },
      null,
      `validateBillExists:${billId}`
    );

    return result.data;
  }

  private async getBillTrackingPreference(
    userId: string,
    billId: number
  ): Promise<BillTrackingPreference | null> {
    const cacheKey = `tracking_preferences:${userId}:${billId}`;
    
    try {
      const preferences = await cacheService.get(cacheKey);
      return preferences || null;
    } catch (error) {
      logger.error('Error getting tracking preferences from cache:', { component: 'Chanuka' }, error);
      return null;
    }
  }

  private async storeTrackingPreferences(
    userId: string,
    billId: number,
    preferences: BillTrackingPreference
  ): Promise<void> {
    const cacheKey = `tracking_preferences:${userId}:${billId}`;
    
    try {
      await cacheService.set(cacheKey, preferences, CACHE_TTL.USER_DATA);
    } catch (error) {
      logger.error('Error storing tracking preferences in cache:', { component: 'Chanuka' }, error);
    }
  }

  private async removeTrackingPreferences(userId: string, billId: number): Promise<void> {
    const cacheKey = `tracking_preferences:${userId}:${billId}`;
    
    try {
      await cacheService.delete(cacheKey);
    } catch (error) {
      logger.error('Error removing tracking preferences from cache:', { component: 'Chanuka' }, error);
    }
  }

  private async clearUserTrackingCaches(userId: string): Promise<void> {
    const cacheKeys = [
      `${CACHE_KEYS.USER_PROFILE(userId)}:tracked_bills:*`,
      `${CACHE_KEYS.USER_PROFILE(userId)}:tracking_analytics`,
      `${CACHE_KEYS.USER_PROFILE(userId)}:recommended_tracking:*`
    ];

    for (const pattern of cacheKeys) {
      try {
        await cacheService.deletePattern(pattern);
      } catch (error) {
        console.error(`Error clearing cache pattern ${pattern}:`, error);
      }
    }
  }

  private async getBillRecentUpdates(billId: number): Promise<Array<{
    type: 'status_change' | 'new_comment' | 'amendment';
    timestamp: Date;
    description: string;
  }>> {
    // This would get recent updates from the bill status monitor service
    try {
      const statusHistory = await billStatusMonitorService.getBillStatusHistory(billId);
      
      return statusHistory.slice(0, 5).map(change => ({
        type: 'status_change' as const,
        timestamp: change.timestamp,
        description: `Status changed from "${change.oldStatus}" to "${change.newStatus}"`
      }));
    } catch (error) {
      console.error(`Error getting recent updates for bill ${billId}:`, error);
      return [];
    }
  }

  private async getRecentTrackingActivity(userId: string): Promise<Array<{
    billId: number;
    billTitle: string;
    action: 'tracked' | 'untracked' | 'updated_preferences';
    timestamp: Date;
  }>> {
    // This would get recent activity from analytics cache
    const cacheKey = `tracking_activity:${userId}`;
    
    try {
      const activity = await cacheService.get(cacheKey);
      return activity || [];
    } catch (error) {
      logger.error('Error getting recent tracking activity:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  private async recordTrackingAnalytics(
    userId: string,
    billId: number,
    action: 'tracked' | 'untracked' | 'updated_preferences'
  ): Promise<void> {
    try {
      // Get bill title for activity record
      const bill = await this.validateBillExists(billId);
      
      const activityRecord = {
        billId,
        billTitle: bill?.title || 'Unknown Bill',
        action,
        timestamp: new Date()
      };

      // Add to recent activity cache
      const cacheKey = `tracking_activity:${userId}`;
      const existingActivity = await cacheService.get(cacheKey) || [];
      
      const updatedActivity = [activityRecord, ...existingActivity].slice(0, 20); // Keep last 20 activities
      
      await cacheService.set(cacheKey, updatedActivity, CACHE_TTL.USER_DATA);
    } catch (error) {
      logger.error('Error recording tracking analytics:', { component: 'Chanuka' }, error);
    }
  }

  private async sendTrackingNotification(
    userId: string,
    billId: number,
    action: 'tracked' | 'untracked',
    billTitle: string
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: 'system_alert',
        title: `Bill ${action === 'tracked' ? 'Tracking Started' : 'Tracking Stopped'}`,
        message: `You are ${action === 'tracked' ? 'now tracking' : 'no longer tracking'} "${billTitle}"`,
        relatedBillId: billId,
        metadata: {
          action
        }
      });
    } catch (error) {
      logger.error('Error sending tracking notification:', { component: 'Chanuka' }, error);
    }
  }

  private async sendBulkOperationNotification(
    userId: string,
    operation: 'track' | 'untrack',
    result: BulkTrackingResult
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: 'system_alert',
        title: `Bulk ${operation === 'track' ? 'Tracking' : 'Untracking'} Complete`,
        message: `${operation === 'track' ? 'Tracked' : 'Untracked'} ${result.summary.successful} of ${result.summary.total} bills successfully`,
        metadata: {
          operation,
          result: result.summary
        }
      });
    } catch (error) {
      logger.error('Error sending bulk operation notification:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      // This would include service-level statistics
      // For now, return basic info
      serviceActive: true,
      timestamp: new Date()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Bill Tracking Service...', { component: 'Chanuka' });
    // Cleanup any resources if needed
    logger.info('Bill Tracking Service shutdown complete', { component: 'Chanuka' });
  }
}

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { ApiSuccess, ApiError, ApiValidationError } from '../../utils/api-response.js';

const router = Router();

// Validation schemas
const trackBillSchema = z.object({
  preferences: z.object({
    trackingTypes: z.array(z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule'])).optional(),
    alertFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
    alertChannels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
    isActive: z.boolean().optional()
  }).optional()
});

const updatePreferencesSchema = z.object({
  trackingTypes: z.array(z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule'])).optional(),
  alertFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
  alertChannels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
  isActive: z.boolean().optional()
});

const bulkTrackingSchema = z.object({
  billIds: z.array(z.number()).min(1).max(100),
  operation: z.enum(['track', 'untrack']),
  preferences: z.object({
    trackingTypes: z.array(z.enum(['status_changes', 'new_comments', 'amendments', 'voting_schedule'])).optional(),
    alertFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
    alertChannels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
    isActive: z.boolean().optional()
  }).optional()
});

// POST /api/bill-tracking/track/:billId
router.post('/track/:billId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Invalid bill ID');
    }

    const { preferences } = trackBillSchema.parse(req.body);

    const result = await billTrackingService.trackBill(req.user!.id, billId, preferences);

    return ApiSuccess(res, {
      message: 'Bill tracked successfully',
      tracking: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors);
    }
    console.error('Error tracking bill:', error);
    return ApiError(res, 'Failed to track bill', 500);
  }
});

// DELETE /api/bill-tracking/track/:billId
router.delete('/track/:billId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Invalid bill ID');
    }

    await billTrackingService.untrackBill(req.user!.id, billId);

    return ApiSuccess(res, {
      message: 'Bill untracked successfully'
    });
  } catch (error) {
    console.error('Error untracking bill:', error);
    return ApiError(res, 'Failed to untrack bill', 500);
  }
});

// GET /api/bill-tracking/tracked
router.get('/tracked', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as 'date_tracked' | 'last_updated' | 'engagement';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const result = await billTrackingService.getUserTrackedBills(req.user!.id, {
      page,
      limit,
      category,
      status,
      sortBy,
      sortOrder
    });

    return ApiSuccess(res, result);
  } catch (error) {
    console.error('Error getting tracked bills:', error);
    return ApiError(res, 'Failed to get tracked bills', 500);
  }
});

// PUT /api/bill-tracking/preferences/:billId
router.put('/preferences/:billId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Invalid bill ID');
    }

    const preferences = updatePreferencesSchema.parse(req.body);

    const result = await billTrackingService.updateBillTrackingPreferences(req.user!.id, billId, preferences);

    return ApiSuccess(res, {
      message: 'Tracking preferences updated successfully',
      preferences: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors);
    }
    console.error('Error updating tracking preferences:', error);
    return ApiError(res, 'Failed to update tracking preferences', 500);
  }
});

// POST /api/bill-tracking/bulk
router.post('/bulk', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { billIds, operation, preferences } = bulkTrackingSchema.parse(req.body);

    const result = await billTrackingService.bulkTrackingOperation({
      userId: req.user!.id,
      billIds,
      operation,
      preferences
    });

    return ApiSuccess(res, {
      message: `Bulk ${operation} operation completed`,
      result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors);
    }
    console.error('Error performing bulk tracking operation:', error);
    return ApiError(res, 'Failed to perform bulk tracking operation', 500);
  }
});

// GET /api/bill-tracking/analytics
router.get('/analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const analytics = await billTrackingService.getUserTrackingAnalytics(req.user!.id);

    return ApiSuccess(res, analytics);
  } catch (error) {
    console.error('Error getting tracking analytics:', error);
    return ApiError(res, 'Failed to get tracking analytics', 500);
  }
});

// GET /api/bill-tracking/is-tracking/:billId
router.get('/is-tracking/:billId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Invalid bill ID');
    }

    const isTracking = await billTrackingService.isUserTrackingBill(req.user!.id, billId);

    return ApiSuccess(res, { isTracking });
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return ApiError(res, 'Failed to check tracking status', 500);
  }
});

// GET /api/bill-tracking/recommended
router.get('/recommended', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const bills = await billTrackingService.getRecommendedBillsForTracking(req.user!.id, limit);

    return ApiSuccess(res, {
      bills,
      count: bills.length
    });
  } catch (error) {
    console.error('Error getting recommended bills:', error);
    return ApiError(res, 'Failed to get recommended bills', 500);
  }
});

export { router };

export const billTrackingService = new BillTrackingService();








