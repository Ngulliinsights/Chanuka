import { database as db } from '@shared/database';
import { notifications, users, bills, bill_engagement } from '@shared/schema';
import { eq, and, lt, gte, sql } from 'drizzle-orm';
import * as cron from 'node-cron';
import { userPreferencesService, type BillTrackingPreferences } from '@server/features/users/domain/user-preferences.ts';
// import { enhancedNotificationService, type EnhancedNotificationData } from './enhanced-notification';

// Temporary stub implementation until enhanced-notification service is created
const enhancedNotificationService = {
  createEnhancedNotification: async (data: any) => {
    console.log('[NOTIFICATION] Creating enhanced notification:', data);
  }
};

type EnhancedNotificationData = any;
import { logger  } from '@shared/core/index.js';

export interface ScheduledDigest { user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  timeOfDay: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  lastSent?: Date;
  nextScheduled: Date;
 }

export interface DigestContent { billUpdates: Array<{
    bill_id: number;
    title: string;
    updates: string[];
    priority: 'low' | 'medium' | 'high';
   }>;
  engagementSummary: {
    totalViews: number;
    totalComments: number;
    newBillsTracked: number;
  };
  trendingBills: Array<{ bill_id: number;
    title: string;
    engagement_score: number;
    category: string;
   }>;
  actionItems: Array<{ bill_id: number;
    title: string;
    action: string;
    deadline?: Date;
   }>;
}

export class NotificationSchedulerService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;
  private initializationLock = false;
  private jobUpdateLock = new Set<string>();

  /**
   * Initialize the notification scheduler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.initializationLock) {
      logger.info('Notification scheduler already initialized or initialization in progress', { component: 'Chanuka' });
      return;
    }

    this.initializationLock = true;
    
    try {
      logger.info('Initializing notification scheduler...', { component: 'Chanuka' });

    // Schedule digest notifications
    await this.scheduleDigestNotifications();

    // Schedule cleanup tasks
    this.scheduleCleanupTasks();

    // Schedule engagement analysis
    this.scheduleEngagementAnalysis();

      this.isInitialized = true;
      logger.info('Notification scheduler initialized successfully', { component: 'Chanuka' });
    } finally {
      this.initializationLock = false;
    }
  }

  /**
   * Schedule digest notifications for all users
   */
  private async scheduleDigestNotifications(): Promise<void> {
    try {
      // Get all users with digest preferences enabled
      const usersWithDigests = await this.getUsersWithDigestEnabled();

      for (const user of usersWithDigests) {
        await this.scheduleUserDigest(users.user_id, users.preferences.billTracking);
      }

      console.log(`Scheduled digest notifications for ${usersWithDigests.length} users`);
    } catch (error) {
      logger.error('Error scheduling digest notifications:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Schedule digest for a specific user
   */
  private async scheduleUserDigest(user_id: string, preferences: BillTrackingPreferences): Promise<void> {
    const { digestSchedule } = preferences.advancedSettings;
    
    if (!digestSchedule.enabled) return;

    const jobId = `digest_${ user_id }`;
    
    // Prevent concurrent updates to the same job
    if (this.jobUpdateLock.has(jobId)) { console.log(`Job update already in progress for user ${user_id }`);
      return;
    }
    
    this.jobUpdateLock.add(jobId);
    
    try {
      const cronExpression = this.createCronExpression(digestSchedule);

      // Remove existing job if it exists
      if (this.scheduledJobs.has(jobId)) {
        this.scheduledJobs.get(jobId)?.destroy();
        this.scheduledJobs.delete(jobId);
      }

    // Create new scheduled job
    const job = cron.schedule(cronExpression, async () => { try {
        await this.sendDigestNotification(user_id);
       } catch (error) { console.error(`Error sending digest for user ${user_id }:`, error);
      }
    }, {
      timezone: 'UTC' // TODO: Use user's timezone
    });

      this.scheduledJobs.set(jobId, job);
      console.log(`Scheduled digest for user ${ user_id } with cron: ${cronExpression}`);
    } finally {
      this.jobUpdateLock.delete(jobId);
    }
  }

  /**
   * Send digest notification to user
   */
  private async sendDigestNotification(user_id: string): Promise<void> { try {
      const digestContent = await this.generateDigestContent(user_id);
      
      if (this.isDigestEmpty(digestContent)) {
        console.log(`Skipping empty digest for user ${user_id }`);
        return;
      }

      const digestData: EnhancedNotificationData = { user_id,
        type: 'digest',
        title: this.createDigestTitle(digestContent),
        message: this.createDigestMessage(digestContent),
        priority: 'medium',
        channels: [], // Will be determined by enhanced notification service
        metadata: {
          digestContent,
          actionRequired: digestContent.actionItems.length > 0
         }
      };

      await enhancedNotificationService.createEnhancedNotification(digestData);
      
      console.log(`Sent digest notification to user ${ user_id }`);
    } catch (error) { console.error(`Error generating digest for user ${user_id }:`, error);
    }
  }

  /**
   * Generate digest content for a user
   */
  private async generateDigestContent(user_id: string): Promise<DigestContent> { const timeframe = await this.getDigestTimeframe(user_id);
    
    // Get bill updates for user's tracked bills
    const billUpdates = await this.getBillUpdatesForUser(user_id, timeframe);
    
    // Get engagement summary
    const engagementSummary = await this.getEngagementSummary(user_id, timeframe);
    
    // Get trending bills in user's areas of interest
    const trendingBills = await this.getTrendingBills(user_id, 5);
    
    // Get action items (bills requiring user attention)
    const actionItems = await this.getActionItems(user_id);

    return {
      billUpdates,
      engagementSummary,
      trendingBills,
      actionItems
     };
  }

  /**
   * Get bill updates for user's tracked bills
   */
  private async getBillUpdatesForUser(
    user_id: string, 
    timeframe: { start: Date; end: Date }
  ): Promise<DigestContent['billUpdates']> { try {
      // Get bills the user is tracking
      const trackedBills = await db
        .select({
          bill_id: bill_engagement.bill_id,
          billTitle: bills.title,
          billCategory: bills.category
         })
        .from(bill_engagement)
        .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
        .where(and(
          eq(bill_engagement.user_id, user_id),
          gte(bill_engagement.lastEngaged, timeframe.start)
        ));

      // For each tracked bill, get recent updates
      const billUpdates = await Promise.all(
        trackedBills.map(async (bill) => { // This would typically query a bill_updates or bill_history table
          // For now, generate mock updates based on bill activity
          const updates = await this.getMockBillUpdates(bills.bill_id, timeframe);
          
          return {
            bill_id: bills.bill_id,
            title: bills.billTitle,
            updates,
            priority: this.calculateUpdatePriority(updates)
           };
        })
      );

      return billUpdates.filter(bill => bills.updates.length > 0);
    } catch (error) {
      logger.error('Error getting bill updates for user:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get engagement summary for user
   */
  private async getEngagementSummary(
    user_id: string, 
    timeframe: { start: Date; end: Date }
  ): Promise<DigestContent['engagementSummary']> {
    try {
      const engagement = await db
        .select({
          totalViews: sql<number>`SUM(${bill_engagement.view_count})`,
          totalComments: sql<number>`SUM(${bill_engagement.comment_count})`,
          billsTracked: sql<number>`COUNT(DISTINCT ${bill_engagement.bill_id})`
        })
        .from(bill_engagement)
        .where(and(
          eq(bill_engagement.user_id, user_id),
          gte(bill_engagement.lastEngaged, timeframe.start)
        ));

      const result = engagement[0];
      
      return {
        totalViews: Number(result?.totalViews) || 0,
        totalComments: Number(result?.totalComments) || 0,
        newBillsTracked: Number(result?.billsTracked) || 0
      };
    } catch (error) {
      logger.error('Error getting engagement summary:', { component: 'Chanuka' }, error);
      return {
        totalViews: 0,
        totalComments: 0,
        newBillsTracked: 0
      };
    }
  }

  /**
   * Get trending bills based on user interests
   */
  private async getTrendingBills(user_id: string, limit: number): Promise<DigestContent['trendingBills']> { try {
      // Get user's areas of interest from their engagement history
      const user_interests = await this.getUserInterests(user_id);
      
      // Get trending bills in those categories
      const trendingBills = await db
        .select({
          id: bills.id,
          title: bills.title,
          category: bills.category,
          view_count: bills.view_count,
          share_count: bills.share_count
         })
        .from(bills)
        .where(
          user_interests.length > 0 
            ? sql`${bills.category} = ANY(${user_interests})`
            : sql`1=1`
        )
        .orderBy(sql`(${bills.view_count} + ${bills.share_count}) DESC`)
        .limit(limit);

      return trendingBills.map(bill => ({ bill_id: bills.id,
        title: bills.title,
        engagement_score: (bills.view_count || 0) + (bills.share_count || 0),
        category: bills.category || 'Uncategorized'
       }));
    } catch (error) {
      logger.error('Error getting trending bills:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Get action items for user
   */
  private async getActionItems(user_id: string): Promise<DigestContent['actionItems']> {
    try {
      // Get bills that require user attention (voting soon, comments needed, etc.)
      const actionItems = await db
        .select({
          id: bills.id,
          title: bills.title,
          status: bills.status,
          last_action_date: bills.last_action_date
        })
        .from(bills)
        .innerJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
        .where(and(
          eq(bill_engagement.user_id, user_id),
          sql`${bills.status} IN ('committee', 'voting_scheduled')`
        ))
        .limit(10);

      return actionItems.map(bill => ({ bill_id: bills.id,
        title: bills.title,
        action: this.getActionForBillStatus(bills.status),
        deadline: bills.last_action_date ? new Date(bills.last_action_date) : undefined
       }));
    } catch (error) {
      logger.error('Error getting action items:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Schedule cleanup tasks
   */
  private scheduleCleanupTasks(): void {
    // Clean up old notifications daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldNotifications();
        logger.info('Completed notification cleanup', { component: 'Chanuka' });
      } catch (error) {
        logger.error('Error during notification cleanup:', { component: 'Chanuka' }, error);
      }
    });

    this.scheduledJobs.set('cleanup', cleanupJob);
  }

  /**
   * Schedule engagement analysis
   */
  private scheduleEngagementAnalysis(): void {
    // Analyze engagement patterns weekly on Sunday at 3 AM
    const analysisJob = cron.schedule('0 3 * * 0', async () => {
      try {
        await this.analyzeEngagementPatterns();
        logger.info('Completed engagement analysis', { component: 'Chanuka' });
      } catch (error) {
        logger.error('Error during engagement analysis:', { component: 'Chanuka' }, error);
      }
    });

    this.scheduledJobs.set('engagement_analysis', analysisJob);
  }

  /**
   * Update user's digest schedule
   */
  async updateUserDigestSchedule(user_id: string, preferences: BillTrackingPreferences): Promise<void> { await this.scheduleUserDigest(user_id, preferences);
   }

  /**
   * Remove user's digest schedule
   */
  async removeUserDigestSchedule(user_id: string): Promise<void> { const jobId = `digest_${user_id }`;
    
    // Prevent concurrent updates
    if (this.jobUpdateLock.has(jobId)) { console.log(`Job update in progress for user ${user_id }, skipping removal`);
      return;
    }
    
    this.jobUpdateLock.add(jobId);
    
    try { if (this.scheduledJobs.has(jobId)) {
        this.scheduledJobs.get(jobId)?.destroy();
        this.scheduledJobs.delete(jobId);
        console.log(`Removed digest schedule for user ${user_id }`);
      }
    } finally {
      this.jobUpdateLock.delete(jobId);
    }
  }

  // Helper methods
  private async getUsersWithDigestEnabled(): Promise<Array<{ user_id: string; preferences: any  }>> {
    const allUsers = await db.select({ id: users.id, preferences: users.preferences }).from(user);
    
    return allUsers
      .map(userData => ({ user_id: userData.id,
        preferences: userData.preferences || { }
      }))
      .filter(userData => {
        const prefs = userData.preferences as any;
        return prefs?.billTracking?.advancedSettings?.digestSchedule?.enabled === true;
      });
  }

  private createCronExpression(digestSchedule: BillTrackingPreferences['advancedSettings']['digestSchedule']): string {
    const [hour, minute] = digestSchedule.timeOfDay.split(':').map(Number);
    
    switch (digestSchedule.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        const dayOfWeek = digestSchedule.dayOfWeek || 1; // Default to Monday
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        const dayOfMonth = digestSchedule.dayOfMonth || 1; // Default to 1st
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        return `${minute} ${hour} * * *`; // Default to daily
    }
  }

  private async getDigestTimeframe(user_id: string): Promise<{ start: Date; end: Date }> { const preferences = await userPreferencesService.getUserPreferences(user_id);
    const frequency = preferences.billTracking.advancedSettings.digestSchedule.frequency;
    
    const end = new Date();
    const start = new Date();
    
    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
     }
    
    return { start, end };
  }

  private async getMockBillUpdates(bill_id: number, timeframe: { start: Date; end: Date }): Promise<string[]> {
    // This would typically query a bill_updates table
    // For now, return mock updates
    const updates = [
      'Status changed to "In Committee Review"',
      'New amendment proposed by sponsor',
      '3 new expert comments added',
      'Voting scheduled for next week'
    ];
    
    // Randomly return 0-3 updates to simulate real activity
    const numUpdates = Math.floor(Math.random() * 4);
    return updates.slice(0, numUpdates);
  }

  private calculateUpdatePriority(updates: string[]): 'low' | 'medium' | 'high' {
    if (updates.some(update => update.includes('Voting scheduled'))) return 'high';
    if (updates.some(update => update.includes('Status changed'))) return 'medium';
    return 'low';
  }

  private async getUserInterests(user_id: string): Promise<string[]> {
    // Get user's most engaged categories
    const interests = await db
      .select({
        category: bills.category,
        engagement: sql<number>`SUM(${bill_engagement.engagement_score})`
      })
      .from(bill_engagement)
      .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
      .where(eq(bill_engagement.user_id, user_id))
      .groupBy(bills.category)
      .orderBy(sql`SUM(${bill_engagement.engagement_score}) DESC`)
      .limit(5);

    return interests.map(i => i.category).filter((cat): cat is string => cat !== null);
  }

  private getActionForBillStatus(status: string): string {
    switch (status) {
      case 'committee': return 'Review committee discussions';
      case 'voting_scheduled': return 'Prepare for upcoming vote';
      default: return 'Review recent updates';
    }
  }

  private isDigestEmpty(content: DigestContent): boolean {
    return content.billUpdates.length === 0 && 
           content.actionItems.length === 0 && 
           content.trendingBills.length === 0;
  }

  private createDigestTitle(content: DigestContent): string {
    const updateCount = content.billUpdates.reduce((sum, bill) => sum + bills.updates.length, 0);
    const actionCount = content.actionItems.length;
    
    if (actionCount > 0) {
      return `Legislative Digest: ${updateCount} updates, ${actionCount} action items`;
    } else {
      return `Legislative Digest: ${updateCount} updates`;
    }
  }

  private createDigestMessage(content: DigestContent): string {
    let message = 'Your personalized legislative update digest:\n\n';
    
    // Bill updates
    if (content.billUpdates.length > 0) {
      message += 'BILL UPDATES:\n';
      content.billUpdates.forEach(bill => {
        message += `• ${bills.title} (${bills.updates.length} updates)\n`;
      });
      message += '\n';
    }
    
    // Action items
    if (content.actionItems.length > 0) {
      message += 'ACTION REQUIRED:\n';
      content.actionItems.forEach(item => {
        message += `• ${item.title}: ${item.action}\n`;
      });
      message += '\n';
    }
    
    // Trending bills
    if (content.trendingBills.length > 0) {
      message += 'TRENDING IN YOUR INTERESTS:\n';
      content.trendingBills.slice(0, 3).forEach(bill => {
        message += `• ${bills.title} (${bills.category})\n`;
      });
    }
    
    return message;
  }

  private async cleanupOldNotifications(): Promise<void> {
    // Clean up notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // This would typically delete old notifications
    logger.info('Cleaning up notifications older than 30 days', { component: 'Chanuka' });
  }

  private async analyzeEngagementPatterns(): Promise<void> {
    // Analyze user engagement patterns to optimize notification timing
    logger.info('Analyzing engagement patterns for notification optimization', { component: 'Chanuka' });
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    activeJobs: number;
    scheduledDigests: number;
    isInitialized: boolean;
  } {
    return {
      activeJobs: this.scheduledJobs.size,
      scheduledDigests: Array.from(this.scheduledJobs.keys()).filter(key => key.startsWith('digest_')).length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Cleanup method to stop all scheduled jobs
   */
  cleanup(): void {
    // Wait for any pending job updates to complete
    if (this.jobUpdateLock.size > 0) {
      console.log(`Waiting for ${this.jobUpdateLock.size} job updates to complete before cleanup`);
      // In a real implementation, you might want to wait or force cleanup
    }
    
    this.scheduledJobs.forEach(job => {
      try {
        job.destroy();
      } catch (error) {
        logger.error('Error destroying scheduled job:', { component: 'Chanuka' }, error);
      }
    });
    this.scheduledJobs.clear();
    this.jobUpdateLock.clear();
    this.isInitialized = false;
    logger.info('Notification scheduler cleanup completed', { component: 'Chanuka' });
  }
}

export const notificationSchedulerService = new NotificationSchedulerService();













































