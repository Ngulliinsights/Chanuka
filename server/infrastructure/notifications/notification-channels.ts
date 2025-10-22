import { database as db } from '../../../shared/database/connection';
import { notification as notifications, user as users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { getEmailService } from './email-service';
import { webSocketService } from '../websocket.js';
import { logger } from '@shared/core';

/**
 * Notification Channel Service
 * 
 * Purpose: Handles the technical delivery of notifications through various channels.
 * This service is ONLY concerned with HOW to send notifications, not WHEN or WHY.
 * 
 * Responsibilities:
 * - Send notifications via in-app, email, SMS, and push channels
 * - Handle channel-specific formatting and protocols
 * - Manage provider integrations (Twilio, Firebase, etc.)
 * - Track delivery success/failure
 * - Retry logic for failed deliveries
 * 
 * This service does NOT:
 * - Make decisions about who should receive notifications
 * - Handle batching or scheduling
 * - Manage user preferences
 */

export interface ChannelDeliveryRequest {
  userId: string;
  channel: 'email' | 'inApp' | 'sms' | 'push';
  content: {
    title: string;
    message: string;
    htmlMessage?: string; // For email
  };
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    relatedBillId?: number;
    category?: string;
    actionUrl?: string;
    [key: string]: any;
  };
  config?: ChannelConfig;
}

export interface ChannelConfig {
  email?: {
    template?: string;
    subject?: string;
    replyTo?: string;
  };
  sms?: {
    shortFormat?: boolean;
    maxLength?: number;
  };
  push?: {
    sound?: boolean;
    vibration?: boolean;
    icon?: string;
    badge?: number;
  };
}

export interface DeliveryResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface SMSProviderConfig {
  provider: 'twilio' | 'aws-sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface PushProviderConfig {
  provider: 'firebase' | 'onesignal' | 'mock';
  serverKey?: string;
  appId?: string;
}

export class NotificationChannelService {
  private smsConfig: SMSProviderConfig;
  private pushConfig: PushProviderConfig;
  private deliveryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.smsConfig = {
      provider: (process.env.SMS_PROVIDER as SMSProviderConfig['provider']) || 'mock',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER
    };

    this.pushConfig = {
      provider: (process.env.PUSH_PROVIDER as PushProviderConfig['provider']) || 'mock',
      serverKey: process.env.FIREBASE_SERVER_KEY || process.env.ONESIGNAL_API_KEY,
      appId: process.env.FIREBASE_APP_ID || process.env.ONESIGNAL_APP_ID
    };

    logger.info('✅ Notification Channel Service initialized', {
      component: 'ChannelService',
      smsProvider: this.smsConfig.provider,
      pushProvider: this.pushConfig.provider
    });
  }

  /**
   * Send notification through a single channel
   * 
   * This is the main entry point for channel delivery. It routes to the
   * appropriate channel handler and manages retries.
   */
  async sendToChannel(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    const attemptKey = `${request.userId}-${request.channel}-${Date.now()}`;

    try {
      let result: DeliveryResult;

      switch (request.channel) {
        case 'inApp':
          result = await this.sendInApp(request);
          break;
        case 'email':
          result = await this.sendEmail(request);
          break;
        case 'sms':
          result = await this.sendSMS(request);
          break;
        case 'push':
          result = await this.sendPush(request);
          break;
        default:
          throw new Error(`Unsupported channel: ${request.channel}`);
      }

      if (result.success) {
        this.deliveryAttempts.delete(attemptKey);
      }

      return result;

    } catch (error) {
      const attempts = (this.deliveryAttempts.get(attemptKey) || 0) + 1;
      this.deliveryAttempts.set(attemptKey, attempts);

      logger.error(`Channel delivery failed (attempt ${attempts}):`, {
        component: 'ChannelService',
        channel: request.channel,
        userId: request.userId
      }, error);

      // Retry logic for transient failures
      if (attempts < this.MAX_RETRY_ATTEMPTS && this.isRetryableError(error)) {
        await this.delay(Math.pow(2, attempts) * 1000); // Exponential backoff
        return this.sendToChannel(request);
      }

      return {
        success: false,
        channel: request.channel,
        error: error instanceof Error ? error.message : String(error),
        deliveredAt: new Date()
      };
    }
  }

  /**
   * Send to multiple channels in parallel
   */
  async sendToMultipleChannels(
    userId: string,
    channels: Array<'email' | 'inApp' | 'sms' | 'push'>,
    content: ChannelDeliveryRequest['content'],
    metadata?: ChannelDeliveryRequest['metadata']
  ): Promise<DeliveryResult[]> {
    const requests = channels.map(channel => ({
      userId,
      channel,
      content,
      metadata
    }));

    const results = await Promise.allSettled(
      requests.map(req => this.sendToChannel(req))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        success: false,
        channel: channels[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        deliveredAt: new Date()
      };
    });
  }

  /**
   * Send in-app notification
   * 
   * Stores notification in database and sends real-time update via WebSocket
   */
  private async sendInApp(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // Store in database
      const notification = await db
        .insert(notifications)
        .values({
          userId: request.userId,
          type: request.metadata?.category || 'general',
          title: request.content.title,
          message: request.content.message,
          relatedBillId: request.metadata?.relatedBillId,
          isRead: false,
          createdAt: new Date()
        })
        .returning();

      const notificationId = notification[0].id;

      // Send real-time via WebSocket (non-blocking)
      try {
        webSocketService.sendUserNotification(request.userId, {
          type: request.metadata?.category || 'notification',
          title: request.content.title,
          message: request.content.message,
          data: {
            id: notificationId,
            ...request.metadata
          }
        });
      } catch (wsError) {
        // WebSocket failure shouldn't fail the entire notification
        logger.warn('WebSocket delivery failed, but notification was saved:', {
          component: 'ChannelService'
        }, wsError);
      }

      return {
        success: true,
        channel: 'inApp',
        messageId: String(notificationId),
        deliveredAt: new Date()
      };

    } catch (error) {
      logger.error('In-app notification failed:', { component: 'ChannelService' }, error);
      throw new Error(`In-app delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send email notification
   * 
   * Retrieves user email and sends formatted email
   */
  private async sendEmail(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // Get user email
      const user = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error(`User not found: ${request.userId}`);
      }

      const { email, name } = user[0];

      if (!email) {
        throw new Error(`No email address for user: ${request.userId}`);
      }

      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }

      // Create email content
      const emailContent = this.formatEmailContent(request, name);
      const subject = request.config?.email?.subject || request.content.title;

      // Send email
      const emailService = await getEmailService();
      await emailService.sendEmail({
        to: email,
        subject: this.getPriorityPrefix(request.metadata?.priority) + subject,
        text: emailContent.text,
        html: emailContent.html
      });

      return {
        success: true,
        channel: 'email',
        messageId: `email-${Date.now()}`,
        deliveredAt: new Date()
      };

    } catch (error) {
      logger.error('Email notification failed:', { component: 'ChannelService' }, error);
      throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send SMS notification
   * 
   * Routes to configured SMS provider
   */
  private async sendSMS(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // Get user phone number from preferences
      const user = await db
        .select({ preferences: users.preferences, name: users.name })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error(`User not found: ${request.userId}`);
      }

      const phoneNumber = (user[0].preferences as any)?.phoneNumber;
      if (!phoneNumber) {
        throw new Error(`No phone number configured for user: ${request.userId}`);
      }

      // Format SMS message
      const message = this.formatSMSMessage(request);

      // Send via provider
      let messageId: string;
      switch (this.smsConfig.provider) {
        case 'twilio':
          messageId = await this.sendViaTwilio(phoneNumber, message);
          break;
        case 'aws-sns':
          messageId = await this.sendViaAWSSNS(phoneNumber, message);
          break;
        case 'mock':
          messageId = this.sendViaMockSMS(phoneNumber, message);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${this.smsConfig.provider}`);
      }

      return {
        success: true,
        channel: 'sms',
        messageId,
        deliveredAt: new Date()
      };

    } catch (error) {
      logger.error('SMS notification failed:', { component: 'ChannelService' }, error);
      throw new Error(`SMS delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send push notification
   * 
   * Routes to configured push provider
   */
  private async sendPush(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // Get user push tokens
      const user = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error(`User not found: ${request.userId}`);
      }

      const pushTokens = (user[0].preferences as any)?.pushTokens || [];
      if (pushTokens.length === 0) {
        throw new Error(`No push tokens configured for user: ${request.userId}`);
      }

      // Create push payload
      const payload = this.formatPushPayload(request);

      // Send via provider
      let messageId: string;
      switch (this.pushConfig.provider) {
        case 'firebase':
          messageId = await this.sendViaFirebase(pushTokens, payload);
          break;
        case 'onesignal':
          messageId = await this.sendViaOneSignal(pushTokens, payload);
          break;
        case 'mock':
          messageId = this.sendViaMockPush(pushTokens, payload);
          break;
        default:
          throw new Error(`Unsupported push provider: ${this.pushConfig.provider}`);
      }

      return {
        success: true,
        channel: 'push',
        messageId,
        deliveredAt: new Date()
      };

    } catch (error) {
      logger.error('Push notification failed:', { component: 'ChannelService' }, error);
      throw new Error(`Push delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format email content with proper HTML and text versions
   */
  private formatEmailContent(
    request: ChannelDeliveryRequest,
    userName: string
  ): { text: string; html: string } {
    const { title, message, htmlMessage } = request.content;
    const { priority, actionUrl, relatedBillId } = request.metadata || {};

    // Text version
    let text = `Hello ${userName},\n\n`;
    text += `${title}\n\n`;
    text += `${message}\n\n`;
    if (relatedBillId) text += `Related Bill ID: ${relatedBillId}\n`;
    if (priority) text += `Priority: ${priority.toUpperCase()}\n`;
    if (actionUrl) text += `\nView details: ${actionUrl}\n`;
    text += `\nBest regards,\nChanuka Legislative Tracking`;

    // HTML version
    const priorityColor = this.getPriorityColor(priority);
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #14B8A6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #ffffff; }
          .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: ${priorityColor}; }
          .action-button { display: inline-block; padding: 12px 24px; background: #14B8A6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6c757d; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Chanuka</h1>
          </div>
          <div class="content">
            <h2 style="color: #2c3e50; margin-top: 0;">${title}</h2>
            ${priority ? `<p><span class="priority-badge">${priority.toUpperCase()}</span></p>` : ''}
            <div style="margin: 20px 0;">
              ${htmlMessage || message.replace(/\n/g, '<br>')}
            </div>
            ${relatedBillId ? `<p><strong>Related Bill:</strong> #${relatedBillId}</p>` : ''}
            ${actionUrl ? `<p><a href="${actionUrl}" class="action-button">View Details</a></p>` : ''}
          </div>
          <div class="footer">
            <p>You received this notification based on your preferences.<br>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications">Update preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { text, html };
  }

  /**
   * Format SMS message with length constraints
   */
  private formatSMSMessage(request: ChannelDeliveryRequest): string {
    const maxLength = request.config?.sms?.maxLength || 160;
    const shortFormat = request.config?.sms?.shortFormat ?? true;

    const priorityPrefix = request.metadata?.priority === 'urgent' ? '[URGENT] ' : '';
    const { title, message } = request.content;
    const actionUrl = request.metadata?.actionUrl;

    if (shortFormat) {
      // Compact format for standard SMS
      let smsText = `${priorityPrefix}${title}: ${message}`;

      if (smsText.length > maxLength - 20 && actionUrl) {
        // Leave room for URL
        const availableLength = maxLength - 20 - priorityPrefix.length - 3;
        smsText = `${priorityPrefix}${title.substring(0, availableLength)}...`;
      } else if (smsText.length > maxLength) {
        smsText = smsText.substring(0, maxLength - 3) + '...';
      }

      if (actionUrl && smsText.length + actionUrl.length + 1 <= maxLength) {
        smsText += ` ${actionUrl}`;
      }

      return smsText;
    }

    // Full format (for MMS or longer messages)
    return `${priorityPrefix}${title}\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}`;
  }

  /**
   * Format push notification payload
   */
  private formatPushPayload(request: ChannelDeliveryRequest): any {
    const { title, message } = request.content;
    const { priority, actionUrl, relatedBillId, category } = request.metadata || {};
    const config = request.config?.push || {};

    return {
      title,
      body: message,
      data: {
        type: category || 'notification',
        priority: priority || 'medium',
        billId: relatedBillId?.toString(),
        actionUrl,
        timestamp: new Date().toISOString()
      },
      android: {
        priority: priority === 'urgent' || priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: config.sound !== false ? 'default' : undefined,
          priority: priority === 'urgent' ? 'high' : 'default',
          icon: config.icon || 'notification_icon'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: config.sound !== false ? 'default' : undefined,
            badge: config.badge || 1,
            'mutable-content': 1
          }
        }
      },
      webpush: {
        notification: {
          icon: config.icon || '/icon-192x192.png',
          vibrate: config.vibration !== false ? [200, 100, 200] : undefined
        }
      }
    };
  }

  // Provider-specific implementations

  private async sendViaTwilio(phoneNumber: string, message: string): Promise<string> {
    // TODO: Implement actual Twilio integration
    // const twilio = require('twilio');
    // const client = twilio(this.smsConfig.accountSid, this.smsConfig.authToken);
    // const result = await client.messages.create({
    //   body: message,
    //   from: this.smsConfig.fromNumber,
    //   to: phoneNumber
    // });
    // return result.sid;

    logger.info(`[TWILIO SMS] To: ${phoneNumber}, Message: ${message}`, { component: 'ChannelService' });
    return `twilio-${Date.now()}`;
  }

  private async sendViaAWSSNS(phoneNumber: string, message: string): Promise<string> {
    // TODO: Implement actual AWS SNS integration
    // const AWS = require('aws-sdk');
    // const sns = new AWS.SNS();
    // const result = await sns.publish({
    //   Message: message,
    //   PhoneNumber: phoneNumber
    // }).promise();
    // return result.MessageId;

    logger.info(`[AWS SNS SMS] To: ${phoneNumber}, Message: ${message}`, { component: 'ChannelService' });
    return `sns-${Date.now()}`;
  }

  private sendViaMockSMS(phoneNumber: string, message: string): string {
    logger.info(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`, { component: 'ChannelService' });
    return `mock-sms-${Date.now()}`;
  }

  private async sendViaFirebase(tokens: string[], payload: any): Promise<string> {
    // TODO: Implement actual Firebase Cloud Messaging integration
    // const admin = require('firebase-admin');
    // const result = await admin.messaging().sendMulticast({
    //   tokens,
    //   notification: {
    //     title: payload.title,
    //     body: payload.body
    //   },
    //   data: payload.data
    // });
    // return result.responses[0].messageId;

    logger.info(`[FIREBASE PUSH] Tokens: ${tokens.length}, Payload:`, { component: 'ChannelService' }, payload);
    return `fcm-${Date.now()}`;
  }

  private async sendViaOneSignal(tokens: string[], payload: any): Promise<string> {
    // TODO: Implement actual OneSignal integration
    // const OneSignal = require('onesignal-node');
    // const client = new OneSignal.Client(this.pushConfig.appId, this.pushConfig.serverKey);
    // const notification = {
    //   contents: { en: payload.body },
    //   headings: { en: payload.title },
    //   include_player_ids: tokens,
    //   data: payload.data
    // };
    // const result = await client.createNotification(notification);
    // return result.id;

    logger.info(`[ONESIGNAL PUSH] Tokens: ${tokens.length}, Payload:`, { component: 'ChannelService' }, payload);
    return `onesignal-${Date.now()}`;
  }

  private sendViaMockPush(tokens: string[], payload: any): string {
    logger.info(`[MOCK PUSH] Tokens: ${tokens.length}, Payload:`, { component: 'ChannelService' }, payload);
    return `mock-push-${Date.now()}`;
  }

  // Utility methods

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getPriorityPrefix(priority?: string): string {
    if (priority === 'urgent') return '[URGENT] ';
    if (priority === 'high') return '[HIGH PRIORITY] ';
    return '';
  }

  private getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  private isRetryableError(error: any): boolean {
    // Determine if error is transient and worth retrying
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'timeout',
      'network'
    ];

    const errorString = String(error).toLowerCase();
    return retryableErrors.some(pattern => errorString.includes(pattern));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service health status
   */
  getStatus(): {
    smsProvider: string;
    smsConfigured: boolean;
    pushProvider: string;
    pushConfigured: boolean;
    pendingRetries: number;
  } {
    return {
      smsProvider: this.smsConfig.provider,
      smsConfigured: !!(this.smsConfig.accountSid || this.smsConfig.provider === 'mock'),
      pushProvider: this.pushConfig.provider,
      pushConfigured: !!(this.pushConfig.serverKey || this.pushConfig.provider === 'mock'),
      pendingRetries: this.deliveryAttempts.size
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.deliveryAttempts.clear();
    logger.info('✅ Notification Channel Service cleanup completed', { component: 'ChannelService' });
  }
}

// Export singleton instance
export const notificationChannelService = new NotificationChannelService();





































