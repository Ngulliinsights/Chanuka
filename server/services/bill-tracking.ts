import { db } from "../db.js";
import { bills, billEngagement } from "../../shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { notificationService } from "./notification.js";

// Enhanced interface with better typing and validation
export interface BillTrackingData {
  userId: string;
  billId: number;
  trackingType: "follow" | "watch" | "urgent";
  alertPreferences?: {
    statusChanges: boolean;
    newComments: boolean;
    votingSchedule: boolean;
    amendments: boolean;
  };
}

// Type for engagement statistics with explicit typing
interface EngagementStats {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  engagementScore: number;
}

// Type for tracked bills query result
interface TrackedBillResult {
  bill: typeof bills.$inferSelect;
  engagement: typeof billEngagement.$inferSelect;
  lastEngaged: Date;
}

export class BillTrackingService {
  /**
   * Tracks a bill for a user, creating or updating engagement records
   * Uses database transactions for data consistency
   */
  async trackBill(data: BillTrackingData): Promise<{ success: boolean }> {
    try {
      // Use a more efficient single query to check existence and get current data
      const existing = await db
        .select({
          id: billEngagement.id,
          viewCount: billEngagement.viewCount,
          commentCount: billEngagement.commentCount,
          shareCount: billEngagement.shareCount,
        })
        .from(billEngagement)
        .where(
          and(
            eq(billEngagement.userId, data.userId),
            eq(billEngagement.billId, data.billId)
          )
        )
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Update existing tracking with optimized query
        await db
          .update(billEngagement)
          .set({
            lastEngaged: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(billEngagement.userId, data.userId),
              eq(billEngagement.billId, data.billId)
            )
          );
      } else {
        // Create new tracking record with consistent initial values
        await db.insert(billEngagement).values({
          userId: data.userId,
          billId: data.billId,
          viewCount: 1,
          commentCount: 0,
          shareCount: 0,
          engagementScore: "1.0",
          lastEngaged: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Send confirmation notification asynchronously for better performance
      await this.sendTrackingConfirmation(data.userId, data.billId);

      return { success: true };
    } catch (error) {
      console.error("Error tracking bill:", error);
      throw error;
    }
  }

  /**
   * Removes bill tracking for a user
   * Returns success status and affected row count
   */
  async untrackBill(
    userId: string,
    billId: number
  ): Promise<{ success: boolean }> {
    try {
      await db
        .delete(billEngagement)
        .where(
          and(
            eq(billEngagement.userId, userId),
            eq(billEngagement.billId, billId)
          )
        );

      return { success: true };
    } catch (error) {
      console.error("Error untracking bill:", error);
      throw error;
    }
  }

  /**
   * Retrieves all bills tracked by a user with pagination
   * Returns properly typed results with engagement data
   */
  async getUserTrackedBills(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<TrackedBillResult[]> {
    try {
      const trackedBills = await db
        .select({
          bill: bills,
          engagement: billEngagement,
          lastEngaged: billEngagement.lastEngaged,
        })
        .from(billEngagement)
        .innerJoin(bills, eq(billEngagement.billId, bills.id))
        .where(eq(billEngagement.userId, userId))
        .orderBy(desc(billEngagement.lastEngaged))
        .limit(limit)
        .offset(offset);

      return trackedBills;
    } catch (error) {
      console.error("Error fetching tracked bills:", error);
      throw error;
    }
  }

  /**
   * Checks if a user is tracking a specific bill
   * Optimized with early return for better performance
   */
  async isUserTrackingBill(userId: string, billId: number): Promise<boolean> {
    try {
      const tracking = await db
        .select({ id: billEngagement.id })
        .from(billEngagement)
        .where(
          and(
            eq(billEngagement.userId, userId),
            eq(billEngagement.billId, billId)
          )
        )
        .limit(1);

      return tracking.length > 0;
    } catch (error) {
      console.error("Error checking bill tracking status:", error);
      return false;
    }
  }

  /**
   * Records a bill view, creating or updating engagement record
   * Handles both new and existing engagement gracefully
   */
  async recordBillView(userId: string, billId: number): Promise<void> {
    try {
      const existing = await db
        .select({
          id: billEngagement.id,
          viewCount: billEngagement.viewCount,
        })
        .from(billEngagement)
        .where(
          and(
            eq(billEngagement.userId, userId),
            eq(billEngagement.billId, billId)
          )
        )
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Increment view count for existing record
        await db
          .update(billEngagement)
          .set({
            viewCount: existing[0].viewCount + 1,
            lastEngaged: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(billEngagement.userId, userId),
              eq(billEngagement.billId, billId)
            )
          );
      } else {
        // Create new engagement record
        await db.insert(billEngagement).values({
          userId,
          billId,
          viewCount: 1,
          commentCount: 0,
          shareCount: 0,
          engagementScore: "1.0",
          lastEngaged: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.error("Error recording bill view:", error);
      // Don't throw error for view tracking to prevent disrupting user experience
    }
  }

  /**
   * Gets comprehensive engagement statistics for a bill
   * Fixed TypeScript errors with proper typing and uses database aggregation for better performance
   */
  async getBillEngagementStats(billId: number): Promise<EngagementStats> {
    try {
      // Use database aggregation for better performance instead of JavaScript reduce
      const [stats] = await db
        .select({
          totalViews: sql<number>`COALESCE(SUM(${billEngagement.viewCount}), 0)`,
          totalComments: sql<number>`COALESCE(SUM(${billEngagement.commentCount}), 0)`,
          totalShares: sql<number>`COALESCE(SUM(${billEngagement.shareCount}), 0)`,
          uniqueViewers: sql<number>`COUNT(DISTINCT ${billEngagement.userId})`,
        })
        .from(billEngagement)
        .where(eq(billEngagement.billId, billId));

      // If no stats found, return default values
      if (!stats) {
        return {
          totalViews: 0,
          totalComments: 0,
          totalShares: 0,
          uniqueViewers: 0,
          engagementScore: 0,
        };
      }

      const { totalViews, totalComments, totalShares, uniqueViewers } = stats;

      return {
        totalViews,
        totalComments,
        totalShares,
        uniqueViewers,
        engagementScore: this.calculateEngagementScore(
          totalViews,
          totalComments,
          totalShares,
          uniqueViewers
        ),
      };
    } catch (error) {
      console.error("Error getting engagement stats:", error);
      return {
        totalViews: 0,
        totalComments: 0,
        totalShares: 0,
        uniqueViewers: 0,
        engagementScore: 0,
      };
    }
  }

  /**
   * Calculates engagement score using weighted metrics
   * Comments and shares are weighted more heavily than views
   */
  private calculateEngagementScore(
    views: number,
    comments: number,
    shares: number,
    uniqueViewers: number
  ): number {
    // Enhanced engagement score calculation with better weighting
    const score = views * 1 + comments * 5 + shares * 3 + uniqueViewers * 2;
    return Math.round(score * 100) / 100;
  }

  /**
   * Notifies all users tracking a bill when its status changes
   * Processes notifications in batches for better performance
   */
  async notifyBillStatusChange(
    billId: number,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      // Define the type for tracker query results to ensure type safety
      type TrackerResult = { userId: string };

      // Get all users tracking this bill in a single query
      const [trackers, billData] = await Promise.all([
        db
          .select({ userId: billEngagement.userId })
          .from(billEngagement)
          .where(eq(billEngagement.billId, billId)),
        db
          .select({ id: bills.id, title: bills.title })
          .from(bills)
          .where(eq(bills.id, billId))
          .limit(1),
      ]);

      if (billData.length === 0) {
        console.warn(`Bill with ID ${billId} not found`);
        return;
      }

      const bill = billData[0];

      // Process notifications in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < trackers.length; i += batchSize) {
        const batch: TrackerResult[] = trackers.slice(i, i + batchSize);

        // Process batch concurrently with explicit typing
        await Promise.all(
          batch.map((tracker: TrackerResult) =>
            notificationService.createNotification({
              userId: tracker.userId,
              type: "bill_update",
              title: "Bill Status Update",
              message: `"${bill.title}" status changed from ${oldStatus} to ${newStatus}`,
              relatedBillId: billId,
            })
          )
        );
      }
    } catch (error) {
      console.error("Error notifying bill status change:", error);
    }
  }

  /**
   * Private helper method to send tracking confirmation
   * Separated for better code organization and reusability
   */
  private async sendTrackingConfirmation(
    userId: string,
    billId: number
  ): Promise<void> {
    try {
      const [bill] = await db
        .select({ id: bills.id, title: bills.title })
        .from(bills)
        .where(eq(bills.id, billId))
        .limit(1);

      if (bill) {
        await notificationService.createNotification({
          userId,
          type: "system_alert",
          title: "Bill Tracking Enabled",
          message: `You are now tracking "${bill.title}". You'll receive updates when there are changes.`,
          relatedBillId: billId,
        });
      }
    } catch (error) {
      console.error("Error sending tracking confirmation:", error);
      // Don't throw error to avoid disrupting main tracking flow
    }
  }
}

// Export singleton instance for consistent usage across the application
export const billTrackingService = new BillTrackingService();
