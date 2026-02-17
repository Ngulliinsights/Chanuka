import { AlertDeliveryLog } from '../entities/alert-delivery-log';
import { AlertPreference } from '../entities/alert-preference';
import { AlertType } from '../value-objects/alert-type';
import { Priority } from '../value-objects/priority';
import { SmartFilteringService } from './smart-filtering-service';

/**
 * Alert Delivery Service
 * Handles the orchestration of alert delivery across multiple channels
 */
export class AlertDeliveryService {
  constructor(
    private readonly smartFilteringService: SmartFilteringService,
    private readonly notificationService: INotificationService,
    private readonly deliveryLogRepository: IDeliveryLogRepository
  ) {}

  /**
   * Processes alert delivery for a user based on their preferences
   */
  async processAlertDelivery(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    preferences: AlertPreference[],
    originalPriority: Priority = Priority.NORMAL
  ): Promise<AlertDeliveryLog[]> { const deliveryLogs: AlertDeliveryLog[] = [];

    for (const preference of preferences) {
      const logs = await this.processPreferenceDelivery(
        user_id,
        alertType,
        alertData,
        preference,
        originalPriority
      );
      deliveryLogs.push(...logs);
     }

    return deliveryLogs;
  }

  /**
   * Processes delivery for a single preference
   */
  private async processPreferenceDelivery(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    preference: AlertPreference,
    originalPriority: Priority
  ): Promise<AlertDeliveryLog[]> {
    const logs: AlertDeliveryLog[] = [];

    // Skip inactive preferences
    if (!preference.is_active) {
      return logs;
    }

    // Check if this alert type is enabled
    const alertTypeConfig = preference.alertTypes.find(at => at.type.equals(alertType));
    if (!alertTypeConfig || !alertTypeConfig.enabled) {
      return logs;
    }

    // Check conditions
    if (alertTypeConfig.conditions && !alertTypeConfig.conditions.matches(alertData)) {
      return logs;
    }

    // Apply smart filtering
    const filteringResult = await this.smartFilteringService.processFiltering(
      user_id,
      alertType,
      alertData,
      preference.smartFiltering
    );

    if (!filteringResult.shouldSend) { // Log filtered alert
      const log = this.createFilteredLog(
        user_id,
        preference,
        alertType,
        originalPriority,
        filteringResult,
        alertData
      );
      logs.push(log);
      await this.deliveryLogRepository.save(log);
      return logs;
     }

    // Determine final priority
    const finalPriority = filteringResult.adjustedPriority || alertTypeConfig.priority;

    // Get enabled channels
    const enabledChannels = preference.getEnabledChannelsForPriority(finalPriority);

    if (enabledChannels.length === 0) {
      return logs;
    }

    // Handle delivery based on frequency configuration
    if (preference.frequency.isBatched() && !finalPriority.equals(Priority.URGENT)) { // Add to batch
      await this.addToBatch(user_id, preference.id, {
        alertType,
        alertData,
        priority: finalPriority,
        channels: enabledChannels.map(ch => ch.type)
       });

      const log = this.createPendingLog(
        user_id,
        preference,
        alertType,
        enabledChannels.map(ch => ch.type),
        originalPriority,
        finalPriority,
        filteringResult.confidence,
        alertData
      );
      logs.push(log);
      await this.deliveryLogRepository.save(log);
    } else { // Immediate delivery
      const deliveryResult = await this.deliverImmediately(
        user_id,
        alertType,
        alertData,
        enabledChannels,
        finalPriority
      );

      const log = this.createDeliveryLog(
        user_id,
        preference,
        alertType,
        enabledChannels.map(ch => ch.type),
        deliveryResult.success,
        originalPriority,
        finalPriority,
        filteringResult.confidence,
        alertData,
        deliveryResult.error
      );
      logs.push(log);
      await this.deliveryLogRepository.save(log);
     }

    return logs;
  }

  /**
   * Delivers alert immediately across all specified channels
   */
  private async deliverImmediately(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    channels: unknown[], // AlertChannel[]
    priority: Priority
  ): Promise<DeliveryResult> { try {
      const notificationType = this.mapAlertTypeToNotificationType(alertType);

      await this.notificationService.sendMultiChannelNotification({
        user_id,
        type: notificationType,
        title: alertData.title || this.getDefaultTitle(alertType),
        message: alertData.message || alertData.description || 'You have a new alert',
        priority: this.mapPriorityToNotificationPriority(priority),
        relatedBillId: alertData.bill_id,
        metadata: alertData
       });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delivery error'
      };
    }
  }

  /**
   * Adds alert to batch for later processing
   */
  private async addToBatch(
    user_id: string,
    preferenceId: string,
    alertData: any
  ): Promise<void> { // This would integrate with a batch processing service
    // For now, this is a placeholder
    console.log(`Adding alert to batch for user ${user_id }, preference ${preferenceId}`);
  }

  /**
   * Processes batched alerts for a user
   */
  async processBatchedAlerts(user_id: string, preferenceId: string): Promise<number> {
    // This would retrieve and process batched alerts
    // For now, return 0 as placeholder
    return 0;
  }

  private createFilteredLog(
    user_id: string,
    preference: AlertPreference,
    alertType: AlertType,
    originalPriority: Priority,
    filteringResult: any,
    alertData: any
  ): AlertDeliveryLog { return new AlertDeliveryLog(
      this.generateLogId(),
      user_id,
      preference.id,
      alertType,
      [], // No channels for filtered alerts
      'filtered' as unknown,
      0,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        filteredReason: filteringResult.filteredReason,
        confidence: filteringResult.confidence,
        bill_id: alertData?.bill_id,
        sponsor_id: alertData?.sponsor_id
        },
      new Date()
    );
  }

  private createPendingLog(
    user_id: string,
    preference: AlertPreference,
    alertType: AlertType,
    channels: unknown[], // ChannelType[]
    originalPriority: Priority,
    adjustedPriority: Priority,
    confidence: number,
    alertData: any
  ): AlertDeliveryLog { return new AlertDeliveryLog(
      this.generateLogId(),
      user_id,
      preference.id,
      alertType,
      channels,
      'pending' as unknown,
      0,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        adjustedPriority: adjustedPriority.toString(),
        confidence,
        bill_id: alertData?.bill_id,
        sponsor_id: alertData?.sponsor_id
        },
      new Date()
    );
  }

  private createDeliveryLog(
    user_id: string,
    preference: AlertPreference,
    alertType: AlertType,
    channels: unknown[], // ChannelType[]
    success: boolean,
    originalPriority: Priority,
    adjustedPriority: Priority,
    confidence: number,
    alertData: any,
    error?: string
  ): AlertDeliveryLog { const status = success ? 'sent' : 'failed';
    const deliveredAt = success ? new Date() : undefined;

    return new AlertDeliveryLog(
      this.generateLogId(),
      user_id,
      preference.id,
      alertType,
      channels,
      status as unknown,
      success ? 0 : 1,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        adjustedPriority: adjustedPriority.toString(),
        confidence,
        bill_id: alertData?.bill_id,
        sponsor_id: alertData?.sponsor_id
        },
      new Date(),
      deliveredAt,
      error
    );
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapAlertTypeToNotificationType(alertType: AlertType): string {
    const mappings: Record<string, string> = {
      'bill_status_change': 'bill_update',
      'new_comment': 'bill_update',
      'amendment': 'bill_update',
      'voting_scheduled': 'bill_update',
      'sponsor_update': 'bill_update',
      'engagement_milestone': 'digest'
    };
    return mappings[alertType.toString()] || 'system_alert';
  }

  private mapPriorityToNotificationPriority(priority: Priority): string {
    return priority.toString();
  }

  private getDefaultTitle(alertType: AlertType): string {
    const titles: Record<string, string> = {
      'bill_status_change': 'Bill Status Update',
      'new_comment': 'New Comment',
      'amendment': 'Bill Amendment',
      'voting_scheduled': 'Voting Scheduled',
      'sponsor_update': 'Sponsor Update',
      'engagement_milestone': 'Engagement Milestone Reached'
    };
    return titles[alertType.toString()] || 'New Alert';
  }
}

/**
 * Interfaces for external dependencies
 */
export interface INotificationService {
  sendMultiChannelNotification(notification: unknown): Promise<void>;
}

export interface IDeliveryLogRepository { save(log: AlertDeliveryLog): Promise<void>;
  findByUserId(user_id: string): Promise<AlertDeliveryLog[]>;
 }

interface DeliveryResult {
  success: boolean;
  error?: string;
}








































