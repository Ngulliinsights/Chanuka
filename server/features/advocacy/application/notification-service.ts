// ============================================================================
// ADVOCACY COORDINATION - Notification Service (Advocacy-Specific Wrapper)
// ============================================================================
// Advocacy-specific notification builder that uses the generic multi-channel delivery service
// from the notifications feature.

import type {
  NotificationConfig,
  NotificationMessage,
  NotificationResult,
} from '@server/features/notifications/application/services/channel-delivery.service';
import type { NotificationPreferences } from '@server/types/index';

import { ChannelDeliveryService } from '@server/features/notifications/application/services/channel-delivery.service';

/**
 * AdvocacyNotificationService
 *
 * Advocacy-specific notification builder. Creates campaign-related notifications
 * and delegates delivery to the generic ChannelDeliveryService.
 */
export class AdvocacyNotificationService {
  // Backward compatibility alias
  static use = AdvocacyNotificationService;
  private readonly deliveryService: ChannelDeliveryService;

  constructor(config: NotificationConfig) {
    this.deliveryService = new ChannelDeliveryService(config);
  }

  async sendNotification(
    message: NotificationMessage,
    userPreferences: NotificationPreferences
  ): Promise<NotificationResult[]> {
    return this.deliveryService.sendNotification(message, userPreferences);
  }

  /**
   * Creates a campaign update notification with advocacy-specific defaults
   */
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
      actionUrl: `/campaigns/${campaign_id}`,
      priority: 'medium',
      channels: ['email', 'push'],
      metadata: {
        campaign_id,
        updateType,
      },
    };
  }

  /**
   * Creates a coalition opportunity notification
   */
  createCoalitionOpportunityNotification(
    sourceId: string,
    targetTitle: string,
    alignmentScore: number,
    recipientId: string
  ): NotificationMessage {
    return {
      id: `coalition-opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      type: 'coalition_opportunity',
      title: `Coalition Opportunity: ${targetTitle}`,
      content: `Potential coalition partner identified with ${(alignmentScore * 100).toFixed(0)}% alignment score`,
      actionUrl: `/campaigns/${sourceId}`,
      priority: 'high',
      channels: ['email', 'push'],
      metadata: {
        sourceId,
        alignmentScore,
      },
    };
  }

  /**
   * Creates an action reminder notification
   */
  createActionReminderNotification(
    campaignId: string,
    actionTitle: string,
    dueDate: Date,
    recipientId: string
  ): NotificationMessage {
    return {
      id: `action-reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      type: 'action_reminder',
      title: `Action Reminder: ${actionTitle}`,
      content: `Action due on ${dueDate.toLocaleDateString()}`,
      actionUrl: `/campaigns/${campaignId}`,
      priority: 'medium',
      channels: ['email', 'push', 'sms'],
      scheduledAt: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      metadata: {
        campaignId,
        dueDate,
      },
    };
  }
}

// Re-export as NotificationService for backward compatibility
export { AdvocacyNotificationService as NotificationService };
