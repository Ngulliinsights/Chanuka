import { eq, and, desc, sql } from 'drizzle-orm';
import { databaseService } from '../../services/database-service.js';
import { webSocketService } from '../../infrastructure/websocket.js';
import { userProfileService } from '../users/user-profile.js';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../infrastructure/cache/cache-service.js';
import * as schema from '../../../shared/schema.js';
import { Bill } from '../../../shared/schema.js';

export interface BillStatusChange {
  billId: number;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
  triggeredBy?: string;
  metadata?: {
    reason?: string;
    automaticChange?: boolean;
    scheduledChange?: boolean;
  };
}

export interface BillEngagementUpdate {
  billId: number;
  type: 'view' | 'comment' | 'share';
  userId: string;
  timestamp: Date;
  newStats: {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    engagementScore: number;
  };
}

export interface NotificationPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily';
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

/**
 * Real-Time Bill Status Monitoring Service
 * Handles bill status change detection, notification triggers, and user preference filtering
 */
export class BillStatusMonitorService {
  private db = databaseService.getDatabase();
  private statusChangeListeners: Map<number, Set<string>> = new Map();
  private batchedNotifications: Map<string, Array<{
    billId: number;
    type: string;
    data: any;
    timestamp: Date;
  }>> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBatchProcessing();
  }

  /**
   * Initialize batch processing for notifications
   */
  private initializeBatchProcessing() {
    // Process batched notifications every 5 minutes for non-immediate users
    this.batchInterval = setInterval(() => {
      this.processBatchedNotifications();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Monitor bill status change and trigger notifications
   */
  async handleBillStatusChange(change: BillStatusChange): Promise<void> {
    try {
      console.log(`📊 Processing bill status change: Bill ${change.billId} from ${change.oldStatus} to ${change.newStatus}`);

      // Get bill details
      const bill = await this.getBillDetails(change.billId);
      if (!bill) {
        console.error(`Bill ${change.billId} not found`);
        return;
      }

      // Get all users subscribed to this bill
      const subscribers = await this.getBillSubscribers(change.billId);
      console.log(`📢 Found ${subscribers.length} subscribers for bill ${change.billId}`);

      // Process notifications for each subscriber based on their preferences
      for (const subscriber of subscribers) {
        await this.processSubscriberNotification(subscriber, change, bill);
      }

      // Broadcast real-time update via WebSocket
      webSocketService.broadcastBillUpdate(change.billId, {
        type: 'status_change',
        data: {
          billId: change.billId,
          billTitle: bill.title,
          oldStatus: change.oldStatus,
          newStatus: change.newStatus,
          timestamp: change.timestamp,
          metadata: change.metadata
        },
        timestamp: change.timestamp
      });

      // Update engagement statistics
      await this.updateBillEngagementStats(change.billId, 'status_change');

      // Cache the status change for analytics
      await this.cacheStatusChange(change);

      console.log(`✅ Successfully processed status change for bill ${change.billId}`);

    } catch (error) {
      console.error('Error handling bill status change:', error);
      throw error;
    }
  }

  /**
   * Handle bill engagement updates (views, comments, shares)
   */
  async handleBillEngagementUpdate(update: BillEngagementUpdate): Promise<void> {
    try {
      console.log(`📈 Processing engagement update: ${update.type} for bill ${update.billId} by user ${update.userId}`);

      // Get bill details
      const bill = await this.getBillDetails(update.billId);
      if (!bill) {
        console.error(`Bill ${update.billId} not found`);
        return;
      }

      // Get subscribers who want engagement notifications
      const subscribers = await this.getBillSubscribersForEngagement(update.billId, update.type);

      // Process notifications for engagement updates
      for (const subscriber of subscribers) {
        // Skip notifying the user who made the engagement
        if (subscriber.userId === update.userId) continue;

        await this.processEngagementNotification(subscriber, update, bill);
      }

      // Broadcast real-time engagement update
      webSocketService.broadcastBillUpdate(update.billId, {
        type: update.type === 'comment' ? 'new_comment' : 'engagement_update',
        data: {
          billId: update.billId,
          billTitle: bill.title,
          engagementType: update.type,
          userId: update.userId,
          newStats: update.newStats,
          timestamp: update.timestamp
        },
        timestamp: update.timestamp
      });

      console.log(`✅ Successfully processed engagement update for bill ${update.billId}`);

    } catch (error) {
      console.error('Error handling bill engagement update:', error);
      throw error;
    }
  }

  /**
   * Process notification for a subscriber based on their preferences
   */
  private async processSubscriberNotification(
    subscriber: { userId: string; preferences: NotificationPreferences },
    change: BillStatusChange,
    bill: Bill
  ): Promise<void> {
    // Check if user wants status change notifications
    if (!subscriber.preferences.statusChanges) {
      return;
    }

    // Check quiet hours
    if (this.isInQuietHours(subscriber.preferences)) {
      console.log(`⏰ User ${subscriber.userId} is in quiet hours, deferring notification`);
      await this.deferNotification(subscriber.userId, {
        type: 'status_change',
        billId: change.billId,
        data: change,
        timestamp: change.timestamp
      });
      return;
    }

    // Create notification based on update frequency
    const notification = {
      type: 'bill_status_change',
      title: `Bill Status Update: ${bill.title}`,
      message: `Status changed from "${change.oldStatus}" to "${change.newStatus}"`,
      data: {
        billId: change.billId,
        billTitle: bill.title,
        oldStatus: change.oldStatus,
        newStatus: change.newStatus,
        timestamp: change.timestamp,
        metadata: change.metadata
      }
    };

    // Handle based on update frequency preference
    switch (subscriber.preferences.updateFrequency) {
      case 'immediate':
        await this.sendImmediateNotification(subscriber.userId, notification);
        break;
      case 'hourly':
      case 'daily':
        await this.batchNotification(subscriber.userId, notification);
        break;
    }
  }

  /**
   * Process engagement notification for a subscriber
   */
  private async processEngagementNotification(
    subscriber: { userId: string; preferences: NotificationPreferences },
    update: BillEngagementUpdate,
    bill: Bill
  ): Promise<void> {
    // Check if user wants this type of engagement notification
    const wantsNotification = 
      (update.type === 'comment' && subscriber.preferences.newComments) ||
      (update.type === 'view' && false) || // Usually don't notify for views
      (update.type === 'share' && false);   // Usually don't notify for shares

    if (!wantsNotification) {
      return;
    }

    // Check quiet hours
    if (this.isInQuietHours(subscriber.preferences)) {
      await this.deferNotification(subscriber.userId, {
        type: 'engagement_update',
        billId: update.billId,
        data: update,
        timestamp: update.timestamp
      });
      return;
    }

    const notification = {
      type: 'bill_engagement_update',
      title: `New Activity: ${bill.title}`,
      message: `New ${update.type} on bill you're tracking`,
      data: {
        billId: update.billId,
        billTitle: bill.title,
        engagementType: update.type,
        newStats: update.newStats,
        timestamp: update.timestamp
      }
    };

    // Handle based on update frequency preference
    switch (subscriber.preferences.updateFrequency) {
      case 'immediate':
        await this.sendImmediateNotification(subscriber.userId, notification);
        break;
      case 'hourly':
      case 'daily':
        await this.batchNotification(subscriber.userId, notification);
        break;
    }
  }

  /**
   * Send immediate notification to user
   */
  private async sendImmediateNotification(userId: string, notification: any): Promise<void> {
    try {
      // Use the multi-channel notification service
      const { notificationService } = await import('./notification-service.js');
      
      await notificationService.sendNotification({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: 'normal',
        templateId: notification.type === 'bill_status_change' ? 'bill_status_change' : 
                   notification.type === 'bill_engagement_update' ? 'new_comment' : undefined,
        templateVariables: this.createTemplateVariables(notification)
      });

      console.log(`📱 Sent immediate notification to user ${userId} via multi-channel service`);
    } catch (error) {
      console.error(`Error sending immediate notification to user ${userId}:`, error);
      
      // Fallback to direct WebSocket and database storage
      try {
        webSocketService.sendUserNotification(userId, notification);
        await this.storeNotification(userId, notification);
        console.log(`📱 Sent fallback notification to user ${userId}`);
      } catch (fallbackError) {
        console.error(`Error sending fallback notification to user ${userId}:`, fallbackError);
      }
    }
  }

  /**
   * Create template variables for notification templates
   */
  private createTemplateVariables(notification: any): Record<string, string> {
    const variables: Record<string, string> = {
      userName: 'User', // Would get from user profile
      timestamp: new Date().toLocaleString()
    };

    if (notification.data?.billId) {
      variables.billId = notification.data.billId.toString();
      variables.billUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/bills/${notification.data.billId}`;
    }

    if (notification.data?.billTitle) {
      variables.billTitle = notification.data.billTitle;
    }

    if (notification.data?.oldStatus && notification.data?.newStatus) {
      variables.oldStatus = notification.data.oldStatus;
      variables.newStatus = notification.data.newStatus;
    }

    if (notification.data?.engagementType) {
      variables.engagementType = notification.data.engagementType;
    }

    return variables;
  }

  /**
   * Batch notification for later delivery
   */
  private async batchNotification(userId: string, notification: any): Promise<void> {
    if (!this.batchedNotifications.has(userId)) {
      this.batchedNotifications.set(userId, []);
    }

    this.batchedNotifications.get(userId)!.push({
      billId: notification.data.billId,
      type: notification.type,
      data: notification,
      timestamp: new Date()
    });

    console.log(`📦 Batched notification for user ${userId}`);
  }

  /**
   * Process all batched notifications
   */
  private async processBatchedNotifications(): Promise<void> {
    console.log(`🔄 Processing batched notifications for ${this.batchedNotifications.size} users`);

    for (const [userId, notifications] of this.batchedNotifications.entries()) {
      if (notifications.length === 0) continue;

      try {
        // Get user preferences to determine batch frequency
        const preferences = await this.getUserNotificationPreferences(userId);
        
        // Check if it's time to send based on frequency
        if (!this.shouldSendBatchedNotifications(preferences)) {
          continue;
        }

        // Create batched notification
        const batchedNotification = {
          type: 'batched_bill_updates',
          title: `Bill Updates Summary (${notifications.length} updates)`,
          message: `You have ${notifications.length} bill updates`,
          data: {
            updates: notifications,
            count: notifications.length,
            timestamp: new Date()
          }
        };

        // Send batched notification
        await this.sendImmediateNotification(userId, batchedNotification);

        // Clear processed notifications
        this.batchedNotifications.set(userId, []);

        console.log(`📬 Sent batched notification to user ${userId} with ${notifications.length} updates`);

      } catch (error) {
        console.error(`Error processing batched notifications for user ${userId}:`, error);
      }
    }
  }

  /**
   * Get bill details from database or cache
   */
  private async getBillDetails(billId: number): Promise<Bill | null> {
    const cacheKey = CACHE_KEYS.BILL_DETAIL(billId);
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
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
          `getBillDetails:${billId}`
        );

        return result.data;
      },
      CACHE_TTL.BILL_DATA
    );
  }

  /**
   * Get subscribers for a specific bill
   */
  private async getBillSubscribers(billId: number): Promise<Array<{
    userId: string;
    preferences: NotificationPreferences;
  }>> {
    try {
      const result = await databaseService.withFallback(
        async () => {
          // Get users tracking this bill
          const trackers = await this.db
            .select({
              userId: schema.billEngagement.userId
            })
            .from(schema.billEngagement)
            .where(eq(schema.billEngagement.billId, billId));

          // Get preferences for each user
          const subscribers = [];
          for (const tracker of trackers) {
            const preferences = await this.getUserNotificationPreferences(tracker.userId);
            subscribers.push({
              userId: tracker.userId,
              preferences
            });
          }

          return subscribers;
        },
        [], // Fallback to empty array
        `getBillSubscribers:${billId}`
      );

      return result.data;
    } catch (error) {
      console.error(`Error getting bill subscribers for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Get subscribers for engagement notifications
   */
  private async getBillSubscribersForEngagement(
    billId: number, 
    engagementType: string
  ): Promise<Array<{
    userId: string;
    preferences: NotificationPreferences;
  }>> {
    const allSubscribers = await this.getBillSubscribers(billId);
    
    // Filter based on engagement type preferences
    return allSubscribers.filter(subscriber => {
      switch (engagementType) {
        case 'comment':
          return subscriber.preferences.newComments;
        case 'view':
          return false; // Usually don't notify for views
        case 'share':
          return false; // Usually don't notify for shares
        default:
          return false;
      }
    });
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const userPreferences = await userProfileService.getUserPreferences(userId);
      
      // Map user preferences to notification preferences
      return {
        statusChanges: userPreferences.emailNotifications ?? true,
        newComments: userPreferences.pushNotifications ?? true,
        votingSchedule: true,
        amendments: true,
        updateFrequency: 'immediate',
        notificationChannels: {
          inApp: true,
          email: userPreferences.emailNotifications ?? true,
          push: userPreferences.pushNotifications ?? true
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        }
      };
    } catch (error) {
      console.error(`Error getting notification preferences for user ${userId}:`, error);
      
      // Return default preferences
      return {
        statusChanges: true,
        newComments: true,
        votingSchedule: true,
        amendments: true,
        updateFrequency: 'immediate',
        notificationChannels: {
          inApp: true,
          email: true,
          push: true
        }
      };
    }
  }

  /**
   * Check if current time is in user's quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(preferences.quietHours.startTime);
    const endTime = this.parseTime(preferences.quietHours.endTime);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Parse time string to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Determine if batched notifications should be sent
   */
  private shouldSendBatchedNotifications(preferences: NotificationPreferences): boolean {
    const now = new Date();
    
    switch (preferences.updateFrequency) {
      case 'hourly':
        // Send at the top of each hour
        return now.getMinutes() < 5;
      case 'daily':
        // Send at 9 AM daily
        return now.getHours() === 9 && now.getMinutes() < 5;
      default:
        return false;
    }
  }

  /**
   * Store notification in database
   */
  private async storeNotification(userId: string, notification: any): Promise<void> {
    try {
      await databaseService.withFallback(
        async () => {
          await this.db
            .insert(schema.notifications)
            .values({
              userId,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              relatedBillId: notification.data?.billId,
              isRead: false,
              createdAt: new Date()
            });
        },
        null,
        `storeNotification:${userId}`
      );
    } catch (error) {
      console.error(`Error storing notification for user ${userId}:`, error);
    }
  }

  /**
   * Defer notification for later delivery
   */
  private async deferNotification(userId: string, notification: any): Promise<void> {
    // Add to batched notifications for later processing
    await this.batchNotification(userId, {
      type: notification.type,
      title: 'Deferred Notification',
      message: 'Notification deferred due to quiet hours',
      data: notification.data
    });
  }

  /**
   * Update bill engagement statistics
   */
  private async updateBillEngagementStats(billId: number, engagementType: string): Promise<void> {
    try {
      await databaseService.withFallback(
        async () => {
          // Update view count for status changes (people checking the bill)
          if (engagementType === 'status_change') {
            await this.db
              .update(schema.bills)
              .set({
                viewCount: sql`${schema.bills.viewCount} + 1`,
                updatedAt: new Date()
              })
              .where(eq(schema.bills.id, billId));
          }
        },
        null,
        `updateBillEngagementStats:${billId}`
      );
    } catch (error) {
      console.error(`Error updating engagement stats for bill ${billId}:`, error);
    }
  }

  /**
   * Cache status change for analytics
   */
  private async cacheStatusChange(change: BillStatusChange): Promise<void> {
    const cacheKey = `bill_status_changes:${change.billId}`;
    
    try {
      const existingChanges = await cacheService.get(cacheKey) || [];
      existingChanges.push(change);
      
      // Keep only last 10 changes
      const recentChanges = existingChanges.slice(-10);
      
      await cacheService.set(cacheKey, recentChanges, CACHE_TTL.BILL_DATA);
    } catch (error) {
      console.error('Error caching status change:', error);
    }
  }

  /**
   * Get bill status change history
   */
  async getBillStatusHistory(billId: number): Promise<BillStatusChange[]> {
    const cacheKey = `bill_status_changes:${billId}`;
    
    try {
      const changes = await cacheService.get(cacheKey);
      return changes || [];
    } catch (error) {
      console.error(`Error getting status history for bill ${billId}:`, error);
      return [];
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      statusChangeListeners: this.statusChangeListeners.size,
      batchedNotificationUsers: this.batchedNotifications.size,
      totalBatchedNotifications: Array.from(this.batchedNotifications.values())
        .reduce((sum, notifications) => sum + notifications.length, 0)
    };
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Bill Status Monitor Service...');
    
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    // Process any remaining batched notifications
    await this.processBatchedNotifications();

    // Clear data structures
    this.statusChangeListeners.clear();
    this.batchedNotifications.clear();
    
    console.log('Bill Status Monitor Service shutdown complete');
  }
}

export const billStatusMonitorService = new BillStatusMonitorService();