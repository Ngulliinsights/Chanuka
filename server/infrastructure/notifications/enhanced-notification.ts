import { database as db } from '../../../shared/database/connection.js';
import { notifications, users, bills, billEngagement } from '../../../shared/schema.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { userPreferencesService, type BillTrackingPreferences } from '../../features/users/user-preferences.js';
import { getEmailService } from '../../services/email.service';
import { webSocketService } from '../websocket.js';
import { logger } from '../utils/logger';

export interface NotificationChannel {
  type: 'email' | 'inApp' | 'push' | 'sms';
  enabled: boolean;
  config?: {
    email?: { template?: string; priority?: 'low' | 'normal' | 'high' };
    push?: { sound?: boolean; vibration?: boolean };
    sms?: { shortFormat?: boolean };
  };
}

export interface SmartNotificationFilter {
  categoryFilters: string[];
  keywordFilters: string[];
  sponsorFilters: string[];
  priorityThreshold: 'low' | 'medium' | 'high';
  interestBasedFiltering: boolean;
  engagementThreshold?: number;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: EnhancedNotificationData[];
  scheduledFor: Date;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
}

export interface EnhancedNotificationData {
  userId: string;
  type: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  title: string;
  message: string;
  relatedBillId?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    billTitle?: string;
    sponsorName?: string;
    category?: string;
    tags?: string[];
    engagementScore?: number;
    actionRequired?: boolean;
    digestContent?: any;
  };
  channels: NotificationChannel[];
  scheduledFor?: Date;
  batchId?: string;
}

// Cache interface for performance optimization
interface NotificationCache {
  userPreferences: Map<string, { data: BillTrackingPreferences; expiry: number }>;
  billInfo: Map<number, { data: any; expiry: number }>;
  userEngagement: Map<string, { data: number; expiry: number }>;
}

// Singleton instance will be exported at the end
let enhancedNotificationServiceInstance: EnhancedNotificationService;

export class EnhancedNotificationService {
  private notificationBatches: Map<string, NotificationBatch> = new Map();
  private batchProcessingInterval: NodeJS.Timeout | null = null;
  private processingBatch = false;
  
  // Performance optimization: Add caching layer
  private cache: NotificationCache = {
    userPreferences: new Map(),
    billInfo: new Map(),
    userEngagement: new Map()
  };
  
  // Cache expiry times (in milliseconds)
  private readonly CACHE_TTL = {
    USER_PREFERENCES: 5 * 60 * 1000, // 5 minutes
    BILL_INFO: 30 * 60 * 1000,       // 30 minutes
    USER_ENGAGEMENT: 10 * 60 * 1000   // 10 minutes
  };

  // Rate limiting to prevent notification spam
  private userNotificationRateLimit: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = {
    MAX_NOTIFICATIONS_PER_HOUR: 50,
    MAX_URGENT_PER_HOUR: 10
  };

  constructor() {
    this.startBatchProcessor();
    this.startCacheCleanup(); // Clean expired cache entries periodically
  }

  /**
   * Create and send enhanced notification with smart filtering and channel selection
   * Optimized with caching and rate limiting
   */
  async createEnhancedNotification(data: EnhancedNotificationData): Promise<void> {
    try {
      // Rate limiting check - prevent notification spam
      if (!this.checkRateLimit(data.userId, data.priority)) {
        console.log(`Rate limit exceeded for user ${data.userId}`);
        return;
      }

      // Get user preferences with caching
      const userPrefs = await this.getCachedUserPreferences(data.userId);

      // Apply smart filtering
      if (!await this.shouldSendNotification(data, userPrefs.billTracking)) {
        console.log(`Notification filtered out for user ${data.userId}: ${data.title}`);
        return;
      }

      // Determine appropriate channels based on preferences and priority
      const enabledChannels = this.getEnabledChannels(data, userPrefs.billTracking);

      if (enabledChannels.length === 0) {
        console.log(`No enabled channels for user ${data.userId}`);
        return;
      }

      // Update rate limit counter
      this.updateRateLimit(data.userId, data.priority);

      // Check if notification should be batched or sent immediately
      const shouldBatch = this.shouldBatchNotification(data, userPrefs.billTracking);

      if (shouldBatch) {
        await this.addToBatch(data, enabledChannels, userPrefs.billTracking);
      } else {
        await this.sendImmediateNotification(data, enabledChannels);
      }

    } catch (error) {
      logger.error('Error creating enhanced notification:', { component: 'SimpleTool' }, error);
      // Don't re-throw to prevent cascading failures
      this.logNotificationError(data, error);
    }
  }

  /**
   * Cached user preferences retrieval for performance
   */
  private async getCachedUserPreferences(userId: string): Promise<{ billTracking: BillTrackingPreferences }> {
    const cached = this.cache.userPreferences.get(userId);
    
    if (cached && Date.now() < cached.expiry) {
      return { billTracking: cached.data };
    }

    try {
      const userPrefs = await userPreferencesService.getUserPreferences(userId);
      
      // Cache the result
      this.cache.userPreferences.set(userId, {
        data: userPrefs.billTracking,
        expiry: Date.now() + this.CACHE_TTL.USER_PREFERENCES
      });
      
      return userPrefs;
    } catch (error) {
      console.error(`Failed to get user preferences for ${userId}:`, error);
      // Return sensible defaults to prevent complete failure
      return {
        billTracking: {
          statusChanges: true,
          newComments: true,
          votingSchedule: true,
          amendments: true,
          updateFrequency: 'daily',
          notificationChannels: { inApp: true, email: false, push: false, sms: false },
          smartFiltering: { enabled: false, priorityThreshold: 'low' },
          advancedSettings: {
            batchingRules: { similarUpdatesGrouping: true, maxBatchSize: 10, batchTimeWindow: 30 }
          }
        } as BillTrackingPreferences
      };
    }
  }

  /**
   * Rate limiting implementation to prevent notification spam
   */
  private checkRateLimit(userId: string, priority: string): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const userLimit = this.userNotificationRateLimit.get(userId);

    // Clean up expired rate limit entries
    if (!userLimit || now > userLimit.resetTime) {
      this.userNotificationRateLimit.set(userId, { count: 0, resetTime: now + hourInMs });
      return true;
    }

    // Check general rate limit
    if (userLimit.count >= this.RATE_LIMIT.MAX_NOTIFICATIONS_PER_HOUR) {
      return false;
    }

    // For urgent notifications, check separate limit
    if (priority === 'urgent') {
      const urgentCount = userLimit.count; // This could be tracked separately
      if (urgentCount >= this.RATE_LIMIT.MAX_URGENT_PER_HOUR) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update rate limit counters
   */
  private updateRateLimit(userId: string, priority: string): void {
    const userLimit = this.userNotificationRateLimit.get(userId);
    if (userLimit) {
      userLimit.count++;
    }
  }

  /**
   * Send notification through multiple channels with improved error handling
   */
  private async sendImmediateNotification(
    data: EnhancedNotificationData,
    channels: NotificationChannel[]
  ): Promise<void> {
    const sendPromises: Promise<{ channel: string; success: boolean; error?: any }>[] = [];

    // Create promises for each channel with better error tracking
    for (const channel of channels) {
      let promise: Promise<any>;

      switch (channel.type) {
        case 'inApp':
          promise = this.sendInAppNotification(data);
          break;
        case 'email':
          promise = this.sendEmailNotification(data, channel.config?.email);
          break;
        case 'push':
          promise = this.sendPushNotification(data, channel.config?.push);
          break;
        case 'sms':
          promise = this.sendSMSNotification(data, channel.config?.sms);
          break;
        default:
          continue;
      }

      // Wrap each promise to track success/failure per channel
      sendPromises.push(
        promise
          .then(() => ({ channel: channel.type, success: true }))
          .catch(error => ({ channel: channel.type, success: false, error }))
      );
    }

    // Send all notifications in parallel with timeout protection
    const timeoutMs = 30000; // 30 second timeout
    const results = await Promise.allSettled(
      sendPromises.map(promise => this.withTimeout(promise, timeoutMs))
    );

    // Enhanced logging and error tracking
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failureCount++;
        const channelType = channels[index]?.type || 'unknown';
        const error = result.status === 'rejected' ? result.reason : result.value?.error;
        console.error(`Failed to send ${channelType} notification for user ${data.userId}:`, error);
        
        // Log to error tracking service (if available)
        this.logNotificationError(data, error, channelType);
      }
    });

    // Log summary
    console.log(`Notification delivery summary for user ${data.userId}: ${successCount} successful, ${failureCount} failed`);
  }

  /**
   * Utility method to add timeout to promises
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }

  /**
   * Enhanced error logging
   */
  private logNotificationError(data: EnhancedNotificationData, error: any, channel?: string): void {
    const errorInfo = {
      userId: data.userId,
      notificationType: data.type,
      subType: data.subType,
      priority: data.priority,
      channel,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
      billId: data.relatedBillId
    };

    // In production, you'd send this to your error tracking service
    logger.error('Notification error:', { component: 'SimpleTool' }, errorInfo);
    
    // Could also store in database for analysis
    // await this.storeErrorLog(errorInfo);
  }

  /**
   * Send in-app notification (existing functionality enhanced with better error handling)
   */
  private async sendInAppNotification(data: EnhancedNotificationData): Promise<any> {
    try {
      const notification = await db
        .insert(notifications)
        .values({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          createdAt: new Date()
        })
        .returning();

      // Send real-time notification via WebSocket with error handling
      try {
        webSocketService.sendUserNotification(data.userId, {
          type: data.type,
          title: data.title,
          message: data.message,
          data: {
            id: notification[0].id,
            relatedBillId: data.relatedBillId,
            priority: data.priority,
            metadata: data.metadata,
            createdAt: notification[0].createdAt
          }
        });
      } catch (wsError) {
        console.warn('WebSocket notification failed, but in-app notification was saved:', wsError);
        // Don't fail the entire operation if WebSocket fails
      }

      return notification[0];
    } catch (error) {
      logger.error('Failed to create in-app notification:', { component: 'SimpleTool' }, error);
      throw new Error(`In-app notification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send email notification with enhanced templates and better error handling
   */
  private async sendEmailNotification(
    data: EnhancedNotificationData,
    config?: { template?: string; priority?: 'low' | 'normal' | 'high' }
  ): Promise<void> {
    try {
      // Get user email with caching consideration
      const user = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error(`User not found: ${data.userId}`);
      }

      const { email, name } = user[0];

      if (!email) {
        throw new Error(`No email address for user: ${data.userId}`);
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }

      // Create enhanced email content
      const emailContent = await this.createEmailContent(data, name);

      await (await getEmailService()).sendEmail({
        to: email,
        subject: this.getEmailSubject(data),
        text: emailContent.text,
        html: emailContent.html
      });

    } catch (error) {
      console.error(`Email notification failed for user ${data.userId}:`, error);
      throw new Error(`Email notification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Email validation utility
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send push notification (enhanced placeholder with better structure)
   */
  private async sendPushNotification(
    data: EnhancedNotificationData,
    config?: { sound?: boolean; vibration?: boolean }
  ): Promise<void> {
    // TODO: Implement push notification service (Firebase, OneSignal, etc.)
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`Push notification would be sent: ${data.title}`);
    console.log(`Config:`, config);
    
    // For now, this is a placeholder - in production you'd integrate with actual push service
    // throw new Error('Push notifications not yet implemented');
  }

  /**
   * Send SMS notification (enhanced placeholder with better structure)
   */
  private async sendSMSNotification(
    data: EnhancedNotificationData,
    config?: { shortFormat?: boolean }
  ): Promise<void> {
    // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const message = config?.shortFormat
      ? `${data.title}: ${data.message.substring(0, 100)}...`
      : `${data.title}: ${data.message}`;

    console.log(`SMS would be sent: ${message}`);
    
    // For now, this is a placeholder - in production you'd integrate with actual SMS service
    // throw new Error('SMS notifications not yet implemented');
  }

  /**
   * Determine if notification should be sent based on smart filtering
   * Enhanced with better performance and error handling
   */
  private async shouldSendNotification(
    data: EnhancedNotificationData,
    preferences: BillTrackingPreferences
  ): Promise<boolean> {
    try {
      // Check if notification type is enabled
      const typeEnabled = this.isNotificationTypeEnabled(data.type, data.subType, preferences);
      if (!typeEnabled) return false;

      // Check quiet hours
      if (preferences.quietHours?.enabled && this.isInQuietHours(preferences.quietHours)) {
        // Allow urgent notifications during quiet hours
        if (data.priority !== 'urgent') return false;
      }

      // Apply smart filtering if enabled
      if (preferences.smartFiltering?.enabled) {
        return await this.applySmartFiltering(data, preferences.smartFiltering);
      }

      return true;
    } catch (error) {
      logger.error('Error in notification filtering:', { component: 'SimpleTool' }, error);
      // Default to sending notification if filtering fails
      return true;
    }
  }

  /**
   * Apply smart filtering based on user interests and preferences
   * Enhanced with better performance through caching
   */
  private async applySmartFiltering(
    data: EnhancedNotificationData,
    filters: BillTrackingPreferences['smartFiltering']
  ): Promise<boolean> {
    try {
      // Priority threshold check
      const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
      const thresholdLevels = { low: 1, medium: 2, high: 3 };

      if (priorityLevels[data.priority] < thresholdLevels[filters.priorityThreshold]) {
        return false;
      }

      // Category filtering
      if (filters.categoryFilters?.length > 0 && data.metadata?.category) {
        if (!filters.categoryFilters.includes(data.metadata.category)) {
          return false;
      }
    }

      // Keyword filtering - case insensitive and optimized
      if (filters.keywordFilters?.length > 0) {
        const content = `${data.title} ${data.message}`.toLowerCase();
        const hasKeyword = filters.keywordFilters.some(keyword =>
          content.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Sponsor filtering
      if (filters.sponsorFilters?.length > 0 && data.metadata?.sponsorName) {
        if (!filters.sponsorFilters.includes(data.metadata.sponsorName)) {
          return false;
        }
      }

      // Interest-based filtering with caching
      if (filters.interestBasedFiltering && data.relatedBillId) {
        const userEngagement = await this.getCachedUserBillEngagement(data.userId, data.relatedBillId);
        if (userEngagement === 0) return false; // User hasn't engaged with this bill
      }

      return true;
    } catch (error) {
      logger.error('Error in smart filtering:', { component: 'SimpleTool' }, error);
      // Default to allowing notification if filtering fails
      return true;
    }
  }

  /**
   * Cached user bill engagement retrieval
   */
  private async getCachedUserBillEngagement(userId: string, billId: number): Promise<number> {
    const cacheKey = `${userId}-${billId}`;
    const cached = this.cache.userEngagement.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const engagement = await this.getUserBillEngagement(userId, billId);
      
      // Cache the result
      this.cache.userEngagement.set(cacheKey, {
        data: engagement,
        expiry: Date.now() + this.CACHE_TTL.USER_ENGAGEMENT
      });
      
      return engagement;
    } catch (error) {
      console.error(`Failed to get user engagement for ${userId}-${billId}:`, error);
      return 0; // Default to no engagement
    }
  }

  /**
   * Get enabled notification channels based on preferences and priority
   * Enhanced with better validation
   */
  private getEnabledChannels(
    data: EnhancedNotificationData,
    preferences: BillTrackingPreferences
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    const { notificationChannels } = preferences;

    // Ensure notificationChannels exists
    if (!notificationChannels) {
      return [{ type: 'inApp', enabled: true }]; // Default to in-app only
    }

    // In-app notifications (always enabled for urgent)
    if (notificationChannels.inApp || data.priority === 'urgent') {
      channels.push({ type: 'inApp', enabled: true });
    }

    // Email notifications
    if (notificationChannels.email) {
      channels.push({
        type: 'email',
        enabled: true,
        config: { email: { priority: data.priority === 'urgent' ? 'high' : 'normal' } }
      });
    }

    // Push notifications
    if (notificationChannels.push) {
      channels.push({
        type: 'push',
        enabled: true,
        config: { push: { sound: data.priority === 'urgent', vibration: true } }
      });
    }

    // SMS notifications (only for urgent by default)
    if (notificationChannels.sms && data.priority === 'urgent') {
      channels.push({
        type: 'sms',
        enabled: true,
        config: { sms: { shortFormat: true } }
      });
    }

    return channels;
  }

  /**
   * Determine if notification should be batched
   * Enhanced with better validation
   */
  private shouldBatchNotification(
    data: EnhancedNotificationData,
    preferences: BillTrackingPreferences
  ): boolean {
    // Never batch urgent notifications
    if (data.priority === 'urgent') return false;

    // Check update frequency preference
    if (preferences.updateFrequency === 'immediate') return false;

    // Check batching rules exist and are enabled
    const batchingRules = preferences.advancedSettings?.batchingRules;
    if (!batchingRules?.similarUpdatesGrouping) return false;

    return true;
  }

  /**
   * Add notification to batch for later processing
   * Enhanced with better batch management
   */
  private async addToBatch(
    data: EnhancedNotificationData,
    channels: NotificationChannel[],
    preferences: BillTrackingPreferences
  ): Promise<void> {
    try {
      const batchId = `${data.userId}_${this.getBatchTimeWindow()}`;

      let batch = this.notificationBatches.get(batchId);

      if (!batch) {
        const scheduledFor = this.calculateBatchSchedule(preferences);
        batch = {
          id: batchId,
          userId: data.userId,
          notifications: [],
          scheduledFor,
          channels,
          status: 'pending',
          createdAt: new Date()
        };
        this.notificationBatches.set(batchId, batch);
      }

      // Add notification to batch
      batch.notifications.push({ ...data, batchId });

      // Check if batch is full
      const maxBatchSize = preferences.advancedSettings?.batchingRules?.maxBatchSize || 10;
      if (batch.notifications.length >= maxBatchSize) {
        await this.processBatch(batch);
      }
    } catch (error) {
      logger.error('Error adding notification to batch:', { component: 'SimpleTool' }, error);
      // Fallback to immediate sending if batching fails
      await this.sendImmediateNotification(data, channels);
    }
  }

  /**
   * Process notification batch
   * Enhanced with better error handling and retry logic
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    try {
      batch.status = 'sent';

      // Create digest notification
      const digestData: EnhancedNotificationData = {
        userId: batch.userId,
        type: 'digest',
        title: `Legislative Update Digest (${batch.notifications.length} updates)`,
        message: this.createDigestMessage(batch.notifications),
        priority: 'medium',
        channels: batch.channels,
        metadata: {
          actionRequired: batch.notifications.some(n => n.metadata?.actionRequired)
        }
      };

      await this.sendImmediateNotification(digestData, batch.channels);

      // Remove processed batch
      this.notificationBatches.delete(batch.id);

      console.log(`Successfully processed batch ${batch.id} with ${batch.notifications.length} notifications`);

    } catch (error) {
      logger.error('Error processing notification batch:', { component: 'SimpleTool' }, error);
      batch.status = 'failed';
      
      // Optionally retry failed batches or send individual notifications
      // await this.retryFailedBatch(batch);
    }
  }

  /**
   * Start batch processor for scheduled notifications
   * Enhanced with better error handling and performance monitoring
   */
  private startBatchProcessor(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
    }

    this.batchProcessingInterval = setInterval(async () => {
      if (this.processingBatch) {
        logger.info('Batch processor already running, skipping...', { component: 'SimpleTool' });
        return;
      }
      
      this.processingBatch = true;

      try {
        const startTime = Date.now();
        const now = new Date();
        let processedCount = 0;

        for (const [batchId, batch] of this.notificationBatches.entries()) {
          if (batch.status === 'pending' && batch.scheduledFor <= now) {
            await this.processBatch(batch);
            processedCount++;
          }
        }

        const processingTime = Date.now() - startTime;
        
        if (processedCount > 0) {
          console.log(`Batch processor completed: ${processedCount} batches processed in ${processingTime}ms`);
        }

      } catch (error) {
        logger.error('Error in batch processor:', { component: 'SimpleTool' }, error);
      } finally {
        this.processingBatch = false;
      }
    }, 60000); // Check every minute

    logger.info('✅ Batch processor started', { component: 'SimpleTool' });
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up enhanced notification service...', { component: 'SimpleTool' });

    try {
      // Clear all batches
      this.notificationBatches.clear();

      // Clear cache
      this.cache.userPreferences.clear();
      this.cache.billInfo.clear();
      this.cache.userEngagement.clear();

      // Clear rate limits
      this.userNotificationRateLimit.clear();

      // Clear batch processing interval
      if (this.batchProcessingInterval) {
        clearInterval(this.batchProcessingInterval);
        this.batchProcessingInterval = null;
      }

      logger.info('✅ Enhanced notification service cleanup completed', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('❌ Error during enhanced notification service cleanup:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Start cache cleanup process to prevent memory leaks
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();

      // Clean expired user preferences
      for (const [key, value] of this.cache.userPreferences.entries()) {
        if (now > value.expiry) {
          this.cache.userPreferences.delete(key);
        }
      }

      // Clean expired bill info
      for (const [key, value] of this.cache.billInfo.entries()) {
        if (now > value.expiry) {
          this.cache.billInfo.delete(key);
        }
      }

      // Clean expired user engagement
      for (const [key, value] of this.cache.userEngagement.entries()) {
        if (now > value.expiry) {
          this.cache.userEngagement.delete(key);
        }
      }

      // Clean expired rate limits
      for (const [key, value] of this.userNotificationRateLimit.entries()) {
        if (now > value.resetTime) {
          this.userNotificationRateLimit.delete(key);
        }
      }

    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  /**
   * Utility method to chunk arrays into smaller batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cached bill information retrieval
   */
  private async getCachedBillInfo(billId: number): Promise<any> {
    const cached = this.cache.billInfo.get(billId);

    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const bill = await db
        .select()
        .from(bills)
        .where(eq(bills.id, billId))
        .limit(1);

      if (bill.length === 0) {
        return null;
      }

      // Cache the result
      this.cache.billInfo.set(billId, {
        data: bill[0],
        expiry: Date.now() + this.CACHE_TTL.BILL_INFO
      });

      return bill[0];
    } catch (error) {
      console.error(`Failed to get bill info for ${billId}:`, error);
      return null;
    }
  }

  /**
   * Get user bill engagement score from database
   */
  private async getUserBillEngagement(userId: string, billId: number): Promise<number> {
    try {
      const engagement = await db
        .select({ engagementScore: billEngagement.engagementScore })
        .from(billEngagement)
        .where(and(eq(billEngagement.userId, userId), eq(billEngagement.billId, billId)))
        .limit(1);

      return engagement.length > 0 ? Number(engagement[0].engagementScore) || 0 : 0;
    } catch (error) {
      console.error(`Failed to get user engagement for ${userId}-${billId}:`, error);
      return 0;
    }
  }

  /**
   * Check if notification type is enabled in user preferences
   */
  private isNotificationTypeEnabled(
    type: EnhancedNotificationData['type'],
    subType: EnhancedNotificationData['subType'],
    preferences: BillTrackingPreferences
  ): boolean {
    switch (type) {
      case 'bill_update':
        if (subType === 'status_change') return preferences.statusChanges;
        if (subType === 'new_comment') return preferences.newComments;
        if (subType === 'amendment') return preferences.amendments;
        if (subType === 'voting_scheduled') return preferences.votingSchedule;
        if (subType === 'sponsor_update') return preferences.amendments;
        return false;
      case 'comment_reply':
        return preferences.newComments;
      case 'verification_status':
      case 'system_alert':
      case 'digest':
        return true; // Always enabled for system notifications
      default:
        return false;
    }
  }

  /**
   * Bulk notification for bill updates with smart targeting
   * Enhanced with better performance and error handling
   */
  async notifyBillUpdateWithSmartTargeting(
    billId: number,
    updateType: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled',
    updateData: {
      title: string;
      message: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      metadata?: any;
    }
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = { success: 0, failed: 0, errors: [] as { userId: string; error: string }[] };
    
    try {
      // Get all users who should be notified for this bill
      const eligibleUsers = await userPreferencesService.getUsersToNotify(billId, 'statusChanges');

      // Get bill information for context with caching
      const billInfo = await this.getCachedBillInfo(billId);

      if (!billInfo) {
        throw new Error(`Bill not found: ${billId}`);
      }

      // Process notifications in batches to avoid overwhelming the system
      const BATCH_SIZE = 50;
      const userBatches = this.chunkArray(eligibleUsers, BATCH_SIZE);

      for (const userBatch of userBatches) {
        const notificationPromises = userBatch.map(async ({ userId, preferences }: { userId: string; preferences: BillTrackingPreferences }) => {
          try {
            const notificationData: EnhancedNotificationData = {
              userId,
              type: 'bill_update',
              subType: updateType,
              title: updateData.title,
              message: updateData.message,
              relatedBillId: billId,
              priority: updateData.priority || 'medium',
              channels: [], // Will be determined by createEnhancedNotification
              metadata: {
                billTitle: billInfo.title,
                category: billInfo.category,
                tags: billInfo.tags,
                ...updateData.metadata
              }
            };

            await this.createEnhancedNotification(notificationData);
            return { success: true };
          } catch (error) {
            return { success: false, error, userId };
          }
        });

        const batchResults = await Promise.allSettled(notificationPromises);

        // Process results
        batchResults.forEach((result: PromiseSettledResult<any>, index: number) => {
          if (result.status === 'fulfilled' && result.value.success) {
            results.success++;
          } else {
            results.failed++;
            const error = result.status === 'rejected' ? result.reason : result.value.error;
            results.errors.push({
              userId: userBatch[index]?.userId || 'unknown',
              error: error?.message || error
            });
          }
        });

        // Add small delay between batches to avoid overwhelming the system
        if (userBatches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in bulk notification:', { component: 'SimpleTool' }, error);
      return { success: results.success, failed: results.failed + 1, errors: [...results.errors, { userId: 'system', error: error instanceof Error ? error.message : String(error) }] };
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(quietHours: { enabled: boolean; startTime: string; endTime: string }): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      // Same day
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get batch time window for grouping notifications
   */
  private getBatchTimeWindow(): string {
    const now = new Date();
    const hour = now.getHours();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${hour}`;
  }

  /**
   * Calculate when to send the batch based on user preferences
   */
  private calculateBatchSchedule(preferences: BillTrackingPreferences): Date {
    const now = new Date();
    const updateFrequency = preferences.updateFrequency;

    switch (updateFrequency) {
      case 'daily':
        // Send at end of day
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay;
      case 'weekly':
        // Send on Sunday evening
        const daysUntilSunday = (7 - now.getDay()) % 7;
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (daysUntilSunday || 7));
        nextSunday.setHours(23, 59, 59, 999);
        return nextSunday;
      case 'immediate':
      default:
        // Send immediately (shouldn't reach here due to shouldBatchNotification check)
        return new Date(now.getTime() + 1000); // 1 second from now
    }
  }

  /**
   * Create digest message from batch of notifications
   */
  private createDigestMessage(notifications: EnhancedNotificationData[]): string {
    const billUpdates = notifications.filter(n => n.type === 'bill_update');
    const comments = notifications.filter(n => n.type === 'comment_reply');
    const systemAlerts = notifications.filter(n => n.type === 'system_alert');

    let message = '';

    if (billUpdates.length > 0) {
      message += `📜 Bill Updates (${billUpdates.length}):\n`;
      billUpdates.forEach(update => {
        message += `• ${update.title}\n`;
      });
      message += '\n';
    }

    if (comments.length > 0) {
      message += `💬 Comments (${comments.length}):\n`;
      comments.forEach(comment => {
        message += `• ${comment.title}\n`;
      });
      message += '\n';
    }

    if (systemAlerts.length > 0) {
      message += `⚠️ System Alerts (${systemAlerts.length}):\n`;
      systemAlerts.forEach(alert => {
        message += `• ${alert.title}\n`;
      });
    }

    return message.trim();
  }

  /**
   * Create email content for notifications
   */
  private async createEmailContent(data: EnhancedNotificationData, userName: string): Promise<{ text: string; html: string }> {
    const subject = this.getEmailSubject(data);

    let textContent = `Hello ${userName},\n\n`;
    textContent += `${data.title}\n\n`;
    textContent += `${data.message}\n\n`;

    if (data.relatedBillId) {
      textContent += `Related Bill ID: ${data.relatedBillId}\n`;
    }

    textContent += `Priority: ${data.priority.toUpperCase()}\n\n`;
    textContent += 'Best regards,\nSimpleTool Team';

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #14B8A6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .priority { color: ${data.priority === 'urgent' ? '#EF4444' : data.priority === 'high' ? '#F59E0B' : '#10B981'}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SimpleTool Notification</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <h3>${data.title}</h3>
          <p>${data.message}</p>
          ${data.relatedBillId ? `<p><strong>Related Bill ID:</strong> ${data.relatedBillId}</p>` : ''}
          <p><strong>Priority:</strong> <span class="priority">${data.priority.toUpperCase()}</span></p>
          <p>Best regards,<br>SimpleTool Team</p>
        </div>
      </body>
      </html>
    `;

    return { text: textContent, html: htmlContent };
  }

  /**
   * Get email subject for notification
   */
  private getEmailSubject(data: EnhancedNotificationData): string {
    const prefix = data.priority === 'urgent' ? 'URGENT: ' : '';
    return `${prefix}${data.title} - SimpleTool`;
  }
}

// Export singleton instance
enhancedNotificationServiceInstance = new EnhancedNotificationService();
export { enhancedNotificationServiceInstance as enhancedNotificationService };






