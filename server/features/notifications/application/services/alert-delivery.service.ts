/**
 * Alert Delivery Service
 * 
 * Orchestrates alert delivery based on user preferences:
 * - Fetches user preferences
 * - Applies smart filtering
 * - Determines channels and priority
 * - Handles batching vs immediate delivery
 * - Logs all delivery attempts
 */

import { logger } from '@server/infrastructure/observability';
import { cacheService } from '@server/infrastructure/cache';
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';

import type {
  AlertType,
  Priority,
  AlertDeliveryLog,
  ChannelType
} from '../../domain/entities/alert-preference';
import { alertPreferenceManagementService } from './alert-preference-management.service';
import { alertPreferenceDomainService } from '../../domain/services/alert-preference-domain.service';
import { smartNotificationFilterService } from '../../domain/services/smart-notification-filter';
import type { FilterCriteria } from '../../domain/services/smart-notification-filter';
import { userPreferencesService } from '@server/features/users/domain/user-preferences';

export interface AlertDeliveryRequest {
  user_id: string;
  alertType: AlertType;
  alertData: {
    title: string;
    message: string;
    bill_id?: number;
    billCategory?: string;
    billStatus?: string;
    sponsor_id?: number;
    sponsorName?: string;
    keywords?: string[];
    engagementCount?: number;
    [key: string]: any;
  };
  originalPriority?: Priority;
}

export interface AlertDeliveryResult {
  success: boolean;
  deliveryLogs: AlertDeliveryLog[];
  filteredCount: number;
  sentCount: number;
  failedCount: number;
}

export class AlertDeliveryService {
  /**
   * Process alert delivery for a user
   */
  async processAlertDelivery(
    request: AlertDeliveryRequest
  ): Promise<AlertDeliveryResult> {
    const { user_id, alertType, alertData, originalPriority = 'normal' } = request;

    try {
      const preferences = await alertPreferenceManagementService.getUserAlertPreferences(user_id);
      const deliveryLogs: AlertDeliveryLog[] = [];
      let filteredCount = 0;
      let sentCount = 0;
      let failedCount = 0;

      for (const preference of preferences) {
        // Skip inactive preferences
        if (!preference.is_active) continue;

        // Check if this alert type is enabled
        const alertTypeConfig = preference.alertTypes.find(at => at.type === alertType);
        if (!alertTypeConfig || !alertTypeConfig.enabled) continue;

        // Check if conditions match
        if (!alertPreferenceDomainService.matchesConditions(alertData, alertType, preference)) {
          continue;
        }

        // Apply smart filtering
        const filteringResult = await this.applySmartFiltering(
          user_id,
          alertType,
          alertData,
          preference,
          alertTypeConfig.priority
        );

        if (!filteringResult.shouldSend) {
          // Log filtered alert
          const log = this.createDeliveryLog(
            user_id,
            preference.id,
            alertType,
            [],
            'filtered',
            originalPriority,
            {
              filteredReason: filteringResult.filteredReason,
              confidence: filteringResult.confidence,
              bill_id: alertData.bill_id,
              sponsor_id: alertData.sponsor_id
            }
          );

          deliveryLogs.push(log);
          await alertPreferenceManagementService.storeDeliveryLog(log);
          filteredCount++;
          continue;
        }

        // Determine final priority
        const finalPriority = filteringResult.adjustedPriority || alertTypeConfig.priority;

        // Get enabled channels for this priority
        let enabledChannels = alertPreferenceDomainService.getChannelsForPriority(
          preference,
          finalPriority
        );

        // Filter by quiet hours
        enabledChannels = alertPreferenceDomainService.filterChannelsByQuietHours(
          enabledChannels,
          finalPriority
        );

        if (enabledChannels.length === 0) continue;

        // Handle batching vs immediate delivery
        if (alertPreferenceDomainService.shouldBatchAlert(preference, finalPriority)) {
          await this.addToBatch(user_id, preference.id, {
            alertType,
            alertData,
            priority: finalPriority,
            channels: enabledChannels.map(ch => ch.type)
          });

          const log = this.createDeliveryLog(
            user_id,
            preference.id,
            alertType,
            enabledChannels.map(ch => ch.type),
            'pending',
            originalPriority,
            {
              adjustedPriority: finalPriority,
              confidence: filteringResult.confidence,
              bill_id: alertData.bill_id,
              sponsor_id: alertData.sponsor_id
            }
          );

          deliveryLogs.push(log);
          await alertPreferenceManagementService.storeDeliveryLog(log);
        } else {
          // Immediate delivery
          const deliveryResult = await this.deliverImmediateAlert(
            user_id,
            alertType,
            alertData,
            enabledChannels.map(ch => ch.type),
            finalPriority
          );

          const log = this.createDeliveryLog(
            user_id,
            preference.id,
            alertType,
            enabledChannels.map(ch => ch.type),
            deliveryResult.success ? 'sent' : 'failed',
            originalPriority,
            {
              adjustedPriority: finalPriority,
              confidence: filteringResult.confidence,
              bill_id: alertData.bill_id,
              sponsor_id: alertData.sponsor_id
            },
            deliveryResult.success ? new Date() : undefined,
            deliveryResult.error
          );

          deliveryLogs.push(log);
          await alertPreferenceManagementService.storeDeliveryLog(log);

          if (deliveryResult.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        }
      }

      logger.info(`Alert delivery processed: ${deliveryLogs.length} logs created`, {
        component: 'AlertDelivery',
        user_id,
        alertType,
        filtered: filteredCount,
        sent: sentCount,
        failed: failedCount
      });

      return {
        success: sentCount > 0 || deliveryLogs.length > 0,
        deliveryLogs,
        filteredCount,
        sentCount,
        failedCount
      };
    } catch (error) {
      logger.error('Error processing alert delivery', {
        component: 'AlertDelivery',
        user_id,
        alertType
      }, error);
      throw error;
    }
  }

  /**
   * Process batched alerts for a user
   */
  async processBatchedAlerts(user_id: string, preferenceId: string): Promise<number> {
    const batchKey = `alert_batch:${user_id}:${preferenceId}`;

    try {
      const batch = await cacheService.get(batchKey);

      if (!batch || !Array.isArray(batch) || batch.length === 0) {
        return 0;
      }

      const preference = await alertPreferenceManagementService.getAlertPreference(
        user_id,
        preferenceId
      );

      if (!preference) {
        logger.warn(`Preference ${preferenceId} not found for batched alerts`, {
          component: 'AlertDelivery',
          user_id,
          preferenceId
        });
        return 0;
      }

      // Group alerts by type
      const groupedAlerts: Record<string, any[]> = {};
      batch.forEach((alert: any) => {
        if (alert && alert.alertType) {
          if (!groupedAlerts[alert.alertType]) {
            groupedAlerts[alert.alertType] = [];
          }
          groupedAlerts[alert.alertType].push(alert);
        }
      });

      // Send batch notification
      await this.deliverImmediateAlert(
        user_id,
        'engagement_milestone',
        {
          title: 'Alert Digest',
          message: `You have ${batch.length} new alerts`,
          batch: groupedAlerts,
          preferenceId
        },
        ['in_app', 'email'],
        'normal'
      );

      // Clear the batch
      await cacheService.delete(batchKey);

      logger.info(`Processed ${batch.length} batched alerts`, {
        component: 'AlertDelivery',
        user_id,
        preferenceId
      });

      return batch.length;
    } catch (error) {
      logger.error('Error processing batched alerts', {
        component: 'AlertDelivery',
        user_id,
        preferenceId
      }, error);
      return 0;
    }
  }

  // Private helper methods

  private async applySmartFiltering(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    preference: any,
    priority: Priority
  ): Promise<any> {
    try {
      // Get user preferences for smart filter
      const userPrefs = await userPreferencesService.getUserPreferences(user_id);

      // Build filter criteria
      const criteria: FilterCriteria = {
        user_id,
        bill_id: alertData.bill_id,
        category: alertData.billCategory,
        tags: alertData.keywords,
        sponsorName: alertData.sponsorName,
        priority: this.mapPriorityToFilterPriority(priority),
        notificationType: this.mapAlertTypeToNotificationType(alertType),
        subType: this.mapAlertTypeToSubType(alertType),
        content: {
          title: alertData.title,
          message: alertData.message
        },
        userPreferences: userPrefs as any
      };

      // Apply smart filter
      const filterResult = await smartNotificationFilterService.shouldSendNotification(criteria);

      return {
        shouldSend: filterResult.shouldNotify,
        filteredReason: filterResult.reasons.join(', ') || undefined,
        adjustedPriority: this.mapFilterPriorityToPriority(filterResult.suggestedPriority),
        confidence: filterResult.confidence
      };
    } catch (error) {
      logger.error('Error applying smart filtering', {
        component: 'AlertDelivery',
        user_id
      }, error);

      // On error, default to sending
      return {
        shouldSend: true,
        filteredReason: undefined,
        adjustedPriority: undefined,
        confidence: 0.5
      };
    }
  }

  private async deliverImmediateAlert(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    channels: ChannelType[],
    priority: Priority
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notificationTypeMap: Record<AlertType, { type: string; subType?: string }> = {
        'bill_status_change': { type: 'bill_update', subType: 'status_change' },
        'new_comment': { type: 'bill_update', subType: 'new_comment' },
        'amendment': { type: 'bill_update', subType: 'amendment' },
        'voting_scheduled': { type: 'bill_update', subType: 'voting_scheduled' },
        'sponsor_update': { type: 'bill_update', subType: 'sponsor_update' },
        'engagement_milestone': { type: 'digest' }
      };

      const mapped = notificationTypeMap[alertType] || { type: 'system_alert' };

      // Map channels to notification channel format
      const mappedChannels = channels.map(ch => {
        const channelMap: Record<ChannelType, 'inApp' | 'email' | 'sms' | 'push'> = {
          'in_app': 'inApp',
          'email': 'email',
          'sms': 'sms',
          'push': 'push',
          'webhook': 'email' // Fallback webhook to email
        };
        return channelMap[ch] || 'inApp';
      }) as Array<'inApp' | 'email' | 'sms' | 'push'>;

      await notificationChannelService.sendToMultipleChannels(
        user_id,
        mappedChannels,
        {
          title: alertData.title || this.getDefaultTitle(alertType),
          message: alertData.message || 'You have a new alert',
          htmlMessage: alertData.htmlMessage
        },
        {
          priority: this.mapPriorityToFilterPriority(priority),
          relatedBillId: alertData.bill_id,
          category: alertData.billCategory,
          ...alertData
        }
      );

      return { success: true };
    } catch (error) {
      logger.error('Error delivering immediate alert', {
        component: 'AlertDelivery',
        user_id
      }, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async addToBatch(
    user_id: string,
    preferenceId: string,
    alertData: any
  ): Promise<void> {
    const batchKey = `alert_batch:${user_id}:${preferenceId}`;

    try {
      const existingBatch = (await cacheService.get(batchKey)) || [];
      const batch = Array.isArray(existingBatch) ? existingBatch : [];
      
      batch.push({
        ...alertData,
        timestamp: new Date()
      });

      await cacheService.set(batchKey, batch, 7200); // 2 hours
    } catch (error) {
      logger.error('Error adding to batch', {
        component: 'AlertDelivery',
        user_id,
        preferenceId
      }, error);
    }
  }

  private createDeliveryLog(
    user_id: string,
    preferenceId: string,
    alertType: AlertType,
    channels: ChannelType[],
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'filtered',
    originalPriority: Priority,
    metadata: any,
    deliveredAt?: Date,
    failureReason?: string
  ): AlertDeliveryLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id,
      preferenceId,
      alertType,
      channels,
      status,
      deliveryAttempts: status === 'failed' ? 1 : 0,
      lastAttempt: new Date(),
      deliveredAt,
      failureReason,
      metadata: {
        originalPriority,
        ...metadata
      },
      created_at: new Date()
    };
  }

  private getDefaultTitle(alertType: AlertType): string {
    const titles: Record<AlertType, string> = {
      'bill_status_change': 'Bill Status Update',
      'new_comment': 'New Comment',
      'amendment': 'Bill Amendment',
      'voting_scheduled': 'Voting Scheduled',
      'sponsor_update': 'Sponsor Update',
      'engagement_milestone': 'Engagement Milestone Reached'
    };
    return titles[alertType] || 'New Alert';
  }

  private mapPriorityToFilterPriority(priority: Priority): 'low' | 'medium' | 'high' | 'urgent' {
    const map: Record<Priority, 'low' | 'medium' | 'high' | 'urgent'> = {
      'low': 'low',
      'normal': 'medium',
      'high': 'high',
      'urgent': 'urgent'
    };
    return map[priority];
  }

  private mapFilterPriorityToPriority(priority: 'low' | 'medium' | 'high' | 'urgent'): Priority {
    const map: Record<'low' | 'medium' | 'high' | 'urgent', Priority> = {
      'low': 'low',
      'medium': 'normal',
      'high': 'high',
      'urgent': 'urgent'
    };
    return map[priority];
  }

  private mapAlertTypeToNotificationType(
    alertType: AlertType
  ): 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest' {
    const map: Record<AlertType, 'bill_update' | 'digest' | 'system_alert'> = {
      'bill_status_change': 'bill_update',
      'new_comment': 'bill_update',
      'amendment': 'bill_update',
      'voting_scheduled': 'bill_update',
      'sponsor_update': 'bill_update',
      'engagement_milestone': 'digest'
    };
    return map[alertType] || 'system_alert';
  }

  private mapAlertTypeToSubType(
    alertType: AlertType
  ): 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update' | undefined {
    const map: Record<AlertType, string | undefined> = {
      'bill_status_change': 'status_change',
      'new_comment': 'new_comment',
      'amendment': 'amendment',
      'voting_scheduled': 'voting_scheduled',
      'sponsor_update': 'sponsor_update',
      'engagement_milestone': undefined
    };
    return map[alertType] as any;
  }
}

export const alertDeliveryService = new AlertDeliveryService();
