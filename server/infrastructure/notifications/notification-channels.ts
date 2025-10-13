import { userPreferencesService, type BillTrackingPreferences } from '../../features/users/user-preferences.ts';
import { getEmailService } from '../../services/email.service.ts';
import { webSocketService } from '../websocket.ts';
import { database as db } from '../../../shared/database/connection.ts';
import { users, bills, notifications } from '../../../shared/schema.ts';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';

export interface NotificationChannelConfig {
  type: 'email' | 'inApp' | 'sms' | 'push';
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  template?: string;
  metadata?: Record<string, any>;
}

export interface NotificationData {
  userId: string;
  type: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  relatedBillId?: number;
  metadata?: {
    billTitle?: string;
    sponsorName?: string;
    category?: string;
    tags?: string[];
    actionRequired?: boolean;
  };
}

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface PushConfig {
  provider: 'firebase' | 'onesignal' | 'mock';
  serverKey?: string;
  appId?: string;
}

export class NotificationChannelService {
  private smsConfig: SMSConfig;
  private pushConfig: PushConfig;

  constructor() {
    // Initialize with environment variables or defaults
    this.smsConfig = {
      provider: (process.env.SMS_PROVIDER as SMSConfig['provider']) || 'mock',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER
    };

    this.pushConfig = {
      provider: (process.env.PUSH_PROVIDER as PushConfig['provider']) || 'mock',
      serverKey: process.env.FIREBASE_SERVER_KEY || process.env.ONESIGNAL_API_KEY,
      appId: process.env.FIREBASE_APP_ID || process.env.ONESIGNAL_APP_ID
    };
  }

  /**
   * Send notification through multiple channels based on user preferences
   */
  async sendMultiChannelNotification(data: NotificationData): Promise<{
    success: boolean;
    channels: Array<{ type: string; success: boolean; error?: string }>;
  }> {
    try {
      // Get user preferences
      const userPrefs = await userPreferencesService.getUserPreferences(data.userId);
      
      // Apply smart filtering
      if (!await this.shouldSendNotification(data, userPrefs.billTracking)) {
        return {
          success: true,
          channels: [{ type: 'filtered', success: true }]
        };
      }

      // Determine enabled channels
      const enabledChannels = this.getEnabledChannels(data, userPrefs.billTracking);
      
      if (enabledChannels.length === 0) {
        return {
          success: true,
          channels: [{ type: 'none_enabled', success: true }]
        };
      }

      // Send through each enabled channel
      const channelResults = await Promise.allSettled(
        enabledChannels.map(channel => this.sendToChannel(data, channel))
      );

      const results = channelResults.map((result, index) => ({
        type: enabledChannels[index].type,
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? String(result.reason) : undefined
      }));

      const overallSuccess = results.some(r => r.success);

      return {
        success: overallSuccess,
        channels: results
      };

    } catch (error) {
      logger.error('Error in multi-channel notification:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        channels: [{ type: 'error', success: false, error: String(error) }]
      };
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    data: NotificationData, 
    config: NotificationChannelConfig
  ): Promise<void> {
    switch (config.type) {
      case 'inApp':
        await this.sendInAppNotification(data);
        break;
      case 'email':
        await this.sendEmailNotification(data, config);
        break;
      case 'sms':
        await this.sendSMSNotification(data, config);
        break;
      case 'push':
        await this.sendPushNotification(data, config);
        break;
      default:
        throw new Error(`Unsupported channel type: ${config.type}`);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(data: NotificationData): Promise<void> {
    // Store in database
    const notification = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedBillId: data.relatedBillId,
        isRead: false
      })
      .returning();

    // Send real-time via WebSocket
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
  }

  /**
   * Send email notification with enhanced templates
   */
  private async sendEmailNotification(
    data: NotificationData, 
    config: NotificationChannelConfig
  ): Promise<void> {
    // Get user details
    const user = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error(`User not found: ${data.userId}`);
    }

    const { email, name } = user[0];
    
    // Create email content based on notification type
    const emailContent = await this.createEmailContent(data, name);
    const emailService = await getEmailService();
    await emailService.sendEmail({
      to: email,
      subject: this.getEmailSubject(data),
      text: emailContent.text,
      html: emailContent.html
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    data: NotificationData, 
    config: NotificationChannelConfig
  ): Promise<void> {
    // Get user phone number (would need to be added to user schema)
    const user = await db
      .select({ 
        preferences: users.preferences,
        name: users.name 
      })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error(`User not found: ${data.userId}`);
    }

    const phoneNumber = (user[0].preferences as any)?.phoneNumber;
    if (!phoneNumber) {
      throw new Error(`No phone number configured for user: ${data.userId}`);
    }

    const message = this.createSMSMessage(data);

    switch (this.smsConfig.provider) {
      case 'twilio':
        await this.sendTwilioSMS(phoneNumber, message);
        break;
      case 'aws-sns':
        await this.sendAWSSMS(phoneNumber, message);
        break;
      case 'mock':
        console.log(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${this.smsConfig.provider}`);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    data: NotificationData, 
    config: NotificationChannelConfig
  ): Promise<void> {
    // Get user push tokens (would need to be stored in user preferences)
    const user = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error(`User not found: ${data.userId}`);
    }

    const pushTokens = (user[0].preferences as any)?.pushTokens || [];
    if (pushTokens.length === 0) {
      throw new Error(`No push tokens configured for user: ${data.userId}`);
    }

    const pushPayload = this.createPushPayload(data);

    switch (this.pushConfig.provider) {
      case 'firebase':
        await this.sendFirebasePush(pushTokens, pushPayload);
        break;
      case 'onesignal':
        await this.sendOneSignalPush(pushTokens, pushPayload);
        break;
      case 'mock':
        console.log(`[MOCK PUSH] Tokens: ${pushTokens.length}, Payload:`, pushPayload);
        break;
      default:
        throw new Error(`Unsupported push provider: ${this.pushConfig.provider}`);
    }
  }

  /**
   * Apply smart filtering based on user interests and preferences
   */
  private async shouldSendNotification(
    data: NotificationData,
    preferences: BillTrackingPreferences
  ): Promise<boolean> {
    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(data.type, data.subType, preferences)) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled && this.isInQuietHours(preferences.quietHours)) {
      // Allow urgent notifications during quiet hours
      if (data.priority !== 'urgent') return false;
    }

    // Apply smart filtering if enabled
    if (preferences.smartFiltering.enabled) {
      return await this.applySmartFiltering(data, preferences.smartFiltering);
    }

    return true;
  }

  /**
   * Apply smart filtering based on user interests
   */
  private async applySmartFiltering(
    data: NotificationData,
    filters: BillTrackingPreferences['smartFiltering']
  ): Promise<boolean> {
    // Priority threshold check
    const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
    const thresholdLevels = { low: 1, medium: 2, high: 3 };
    
    if (priorityLevels[data.priority] < thresholdLevels[filters.priorityThreshold]) {
      return false;
    }

    // Category filtering
    if (filters.categoryFilters.length > 0 && data.metadata?.category) {
      if (!filters.categoryFilters.includes(data.metadata.category)) {
        return false;
      }
    }

    // Keyword filtering
    if (filters.keywordFilters.length > 0) {
      const content = `${data.title} ${data.message}`.toLowerCase();
      const hasKeyword = filters.keywordFilters.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Sponsor filtering
    if (filters.sponsorFilters.length > 0 && data.metadata?.sponsorName) {
      if (!filters.sponsorFilters.includes(data.metadata.sponsorName)) {
        return false;
      }
    }

    // Interest-based filtering using bill content
    if (filters.interestBasedFiltering && data.relatedBillId) {
      const isRelevant = await this.isRelevantToUserInterests(data.userId, data.relatedBillId);
      if (!isRelevant) return false;
    }

    return true;
  }

  /**
   * Check if bill is relevant to user's interests
   */
  private async isRelevantToUserInterests(userId: string, billId: number): Promise<boolean> {
    try {
      const userPrefs = await userPreferencesService.getUserPreferences(userId);
      const interests = userPrefs.billTracking.smartFiltering.categoryFilters.concat(
        userPrefs.billTracking.smartFiltering.keywordFilters
      );

      if (interests.length === 0) {
        return true; // If no interests set, show all
      }

      const bill = await db
        .select({
          title: bills.title,
          category: bills.category,
          tags: bills.tags,
          description: bills.description
        })
        .from(bills)
        .where(eq(bills.id, billId))
        .limit(1);

      if (bill.length === 0) return false;

      const billData = bill[0];
      const searchText = `${billData.title} ${billData.description} ${billData.category}`.toLowerCase();
      const billTags = (billData.tags || []).map(tag => tag.toLowerCase());

      return interests.some(interest => {
        const interestLower = interest.toLowerCase();
        return searchText.includes(interestLower) || 
               billTags.some(tag => tag.includes(interestLower));
      });

    } catch (error) {
      logger.error('Error checking bill relevance:', { component: 'SimpleTool' }, error);
      return true; // Default to showing notification if check fails
    }
  }

  /**
   * Get enabled channels based on preferences and priority
   */
  private getEnabledChannels(
    data: NotificationData,
    preferences: BillTrackingPreferences
  ): NotificationChannelConfig[] {
    const channels: NotificationChannelConfig[] = [];
    const { notificationChannels } = preferences;

    // In-app notifications (always enabled for urgent)
    if (notificationChannels.inApp || data.priority === 'urgent') {
      channels.push({ 
        type: 'inApp', 
        enabled: true, 
        priority: data.priority 
      });
    }

    // Email notifications
    if (notificationChannels.email) {
      channels.push({ 
        type: 'email', 
        enabled: true, 
        priority: data.priority,
        template: data.type
      });
    }

    // SMS notifications (only for urgent by default, or if explicitly enabled)
    if (notificationChannels.sms && (data.priority === 'urgent' || data.priority === 'high')) {
      channels.push({ 
        type: 'sms', 
        enabled: true, 
        priority: data.priority 
      });
    }

    // Push notifications
    if (notificationChannels.push) {
      channels.push({ 
        type: 'push', 
        enabled: true, 
        priority: data.priority 
      });
    }

    return channels;
  }

  // Helper methods for different notification types
  private isNotificationTypeEnabled(
    type: string, 
    subType: string | undefined, 
    preferences: BillTrackingPreferences
  ): boolean {
    switch (subType) {
      case 'status_change': return preferences.statusChanges;
      case 'new_comment': return preferences.newComments;
      case 'voting_scheduled': return preferences.votingSchedule;
      case 'amendment': return preferences.amendments;
      default: return true;
    }
  }

  private isInQuietHours(quietHours: { startTime: string; endTime: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  // Content creation methods
  private async createEmailContent(data: NotificationData, userName: string): Promise<{ text: string; html: string }> {
    const text = `
Hello ${userName},

${data.title}

${data.message}

${data.metadata?.billTitle ? `Related Bill: ${data.metadata.billTitle}` : ''}
${data.metadata?.category ? `Category: ${data.metadata.category}` : ''}

Priority: ${data.priority.toUpperCase()}

Visit the Chanuka Legislative Transparency Platform to view more details and take action.

Best regards,
Chanuka Legislative Transparency Platform
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Chanuka Legislative Platform</h1>
  </div>
  
  <div style="padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">${data.title}</h2>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid ${this.getPriorityColor(data.priority)}; margin: 20px 0;">
      <p style="margin: 0;">${data.message}</p>
    </div>
    
    ${data.metadata?.billTitle ? `<p><strong>Related Bill:</strong> ${data.metadata.billTitle}</p>` : ''}
    ${data.metadata?.category ? `<p><strong>Category:</strong> ${data.metadata.category}</p>` : ''}
    ${data.metadata?.tags ? `<p><strong>Tags:</strong> ${data.metadata.tags.join(', ')}</p>` : ''}
    
    <p><strong>Priority:</strong> 
      <span style="background-color: ${this.getPriorityColor(data.priority)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
        ${data.priority.toUpperCase()}
      </span>
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
         style="background-color: #1e40af; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
        View on Platform
      </a>
    </div>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
    <p>You received this notification based on your preferences. 
       <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications">Update preferences</a>
    </p>
  </div>
</div>
    `;

    return { text, html };
  }

  private getEmailSubject(data: NotificationData): string {
    const priorityPrefix = data.priority === 'urgent' ? '[URGENT] ' : 
                          data.priority === 'high' ? '[HIGH] ' : '';
    return `${priorityPrefix}${data.title}`;
  }

  private createSMSMessage(data: NotificationData): string {
    const maxLength = 160; // Standard SMS length
    const priorityPrefix = data.priority === 'urgent' ? '[URGENT] ' : '';
    const baseMessage = `${priorityPrefix}${data.title}: ${data.message}`;
    
    if (baseMessage.length <= maxLength) {
      return baseMessage;
    }
    
    // Truncate message to fit SMS limit
    const availableLength = maxLength - priorityPrefix.length - 3; // 3 for "..."
    const truncatedMessage = data.message.substring(0, availableLength - data.title.length - 2) + '...';
    return `${priorityPrefix}${data.title}: ${truncatedMessage}`;
  }

  private createPushPayload(data: NotificationData): any {
    return {
      title: data.title,
      body: data.message,
      data: {
        type: data.type,
        priority: data.priority,
        billId: data.relatedBillId?.toString(),
        metadata: JSON.stringify(data.metadata || {})
      },
      android: {
        priority: data.priority === 'urgent' ? 'high' : 'normal',
        notification: {
          sound: data.priority === 'urgent' ? 'default' : undefined,
          priority: data.priority === 'urgent' ? 'high' : 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: data.priority === 'urgent' ? 'default' : undefined,
            badge: 1
          }
        }
      }
    };
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  // SMS Provider implementations (mock for now)
  private async sendTwilioSMS(phoneNumber: string, message: string): Promise<void> {
    // TODO: Implement Twilio SMS
    console.log(`[TWILIO SMS] To: ${phoneNumber}, Message: ${message}`);
  }

  private async sendAWSSMS(phoneNumber: string, message: string): Promise<void> {
    // TODO: Implement AWS SNS SMS
    console.log(`[AWS SNS SMS] To: ${phoneNumber}, Message: ${message}`);
  }

  // Push Provider implementations (mock for now)
  private async sendFirebasePush(tokens: string[], payload: any): Promise<void> {
    // TODO: Implement Firebase push notifications
    console.log(`[FIREBASE PUSH] Tokens: ${tokens.length}, Payload:`, payload);
  }

  private async sendOneSignalPush(tokens: string[], payload: any): Promise<void> {
    // TODO: Implement OneSignal push notifications
    console.log(`[ONESIGNAL PUSH] Tokens: ${tokens.length}, Payload:`, payload);
  }
}

export const notificationChannelService = new NotificationChannelService();






