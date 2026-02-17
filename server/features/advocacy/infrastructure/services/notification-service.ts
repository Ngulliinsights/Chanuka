// ============================================================================
// ADVOCACY COORDINATION - Notification Service
// ============================================================================

import { NotificationPreferences } from '@server/types/index';
import { logger } from '@server/infrastructure/observability';

export interface NotificationConfig {
  enableEmail: boolean;
  enableSMS: boolean;
  enablePush: boolean;
  enableUSSD: boolean;
  batchSize: number;
  retryAttempts: number;
}

export interface NotificationMessage {
  id: string;
  recipientId: string;
  type: 'campaign_update' | 'action_reminder' | 'coalition_opportunity' | 'impact_report' | 'urgent_alert';
  title: string;
  content: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'sms' | 'push' | 'ussd')[];
  scheduledAt?: Date;
  expires_at?: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  messageId: string;
  channel: string;
  status: 'sent' | 'failed' | 'pending' | 'expired';
  sentAt?: Date;
  error?: string;
  deliveryConfirmation?: boolean;
}

export class NotificationService {
  constructor(private config: NotificationConfig) {}

  async sendNotification(
    message: NotificationMessage,
    userPreferences: NotificationPreferences
  ): Promise<NotificationResult[]> {
    try {
      const results: NotificationResult[] = [];
      const enabledChannels = this.getEnabledChannels(message, userPreferences);

      if (enabledChannels.length === 0) {
        logger.info('No enabled channels for notification', { 
          messageId: message.id,
          recipientId: message.recipientId,
          component: 'NotificationService' 
        });
        return [];
      }

      for (const channel of enabledChannels) {
        try {
          const result = await this.sendThroughChannel(message, channel);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to send notification through ${channel}`, error, { 
            messageId: message.id,
            recipientId: message.recipientId,
            channel,
            component: 'NotificationService' 
          });

          results.push({
            messageId: message.id,
            channel,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to send notification', error, { 
        messageId: message.id,
        recipientId: message.recipientId,
        component: 'NotificationService' 
      });
      throw error;
    }
  }

  createCampaignUpdateNotification(
    campaign_id: string,
    campaignTitle: string,
    updateType: string,
    updateDescription: string,
    recipientId: string
  ): NotificationMessage {
    return {
      id: `campaign-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      type: 'campaign_update',
      title: `Campaign Update: ${campaignTitle}`,
      content: `${updateType}: ${updateDescription}`,
      actionUrl: `/campaigns/${ campaign_id }`,
      priority: 'medium',
      channels: ['email', 'push'],
      metadata: {
        campaign_id,
        updateType
      }
    };
  }

  private getEnabledChannels(
    message: NotificationMessage,
    userPreferences: NotificationPreferences
  ): ('email' | 'sms' | 'push' | 'ussd')[] {
    const enabledChannels: ('email' | 'sms' | 'push' | 'ussd')[] = [];

    for (const channel of message.channels) {
      const isUserEnabled = this.isChannelEnabledForUser(channel, message.type, userPreferences);
      const isSystemEnabled = this.isChannelEnabledInSystem(channel);

      if (isUserEnabled && isSystemEnabled) {
        enabledChannels.push(channel);
      }
    }

    return enabledChannels;
  }

  private isChannelEnabledForUser(
    channel: string,
    messageType: NotificationMessage['type'],
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.channels[channel as keyof typeof preferences.channels]) {
      return false;
    }

    switch (messageType) {
      case 'campaign_update':
        return preferences.campaignUpdates;
      case 'action_reminder':
        return preferences.actionReminders;
      case 'coalition_opportunity':
        return preferences.coalitionOpportunities;
      case 'impact_report':
        return preferences.impactReports;
      case 'urgent_alert':
        return preferences.urgentAlerts;
      default:
        return false;
    }
  }

  private isChannelEnabledInSystem(channel: string): boolean {
    switch (channel) {
      case 'email':
        return this.config.enableEmail;
      case 'sms':
        return this.config.enableSMS;
      case 'push':
        return this.config.enablePush;
      case 'ussd':
        return this.config.enableUSSD;
      default:
        return false;
    }
  }

  private async sendThroughChannel(
    message: NotificationMessage,
    channel: string
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'email':
        return await this.sendEmail(message);
      case 'sms':
        return await this.sendSMS(message);
      case 'push':
        return await this.sendPushNotification(message);
      case 'ussd':
        return await this.sendUSSD(message);
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  private async sendEmail(message: NotificationMessage): Promise<NotificationResult> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      messageId: message.id,
      channel: 'email',
      status: 'sent',
      sentAt: new Date(),
      deliveryConfirmation: true
    };
  }

  private async sendSMS(message: NotificationMessage): Promise<NotificationResult> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      messageId: message.id,
      channel: 'sms',
      status: 'sent',
      sentAt: new Date(),
      deliveryConfirmation: true
    };
  }

  private async sendPushNotification(message: NotificationMessage): Promise<NotificationResult> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return {
      messageId: message.id,
      channel: 'push',
      status: 'sent',
      sentAt: new Date(),
      deliveryConfirmation: true
    };
  }

  private async sendUSSD(message: NotificationMessage): Promise<NotificationResult> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      messageId: message.id,
      channel: 'ussd',
      status: 'sent',
      sentAt: new Date(),
      deliveryConfirmation: false
    };
  }
}


