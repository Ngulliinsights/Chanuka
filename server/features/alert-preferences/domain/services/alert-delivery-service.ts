import { AlertPreference } from '../entities/alert-preference';
import { AlertDeliveryLog } from '../entities/alert-delivery-log';
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
    userId: string,
    alertType: AlertType,
    alertData: any,
    preferences: AlertPreference[],
    originalPriority: Priority = Priority.NORMAL
  ): Promise<AlertDeliveryLog[]> {
    const deliveryLogs: AlertDeliveryLog[] = [];

    for (const preference of preferences) {
      const logs = await this.processPreferenceDelivery(
        userId,
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
    userId: string,
    alertType: AlertType,
    alertData: any,
    preference: AlertPreference,
    originalPriority: Priority
  ): Promise<AlertDeliveryLog[]> {
    const logs: AlertDeliveryLog[] = [];

    // Skip inactive preferences
    if (!preference.isActive) {
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
      userId,
      alertType,
      alertData,
      preference.smartFiltering
    );

    if (!filteringResult.shouldSend) {
      // Log filtered alert
      const log = this.createFilteredLog(
        userId,
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
    if (preference.frequency.isBatched() && !finalPriority.equals(Priority.URGENT)) {
      // Add to batch
      await this.addToBatch(userId, preference.id, {
        alertType,
        alertData,
        priority: finalPriority,
        channels: enabledChannels.map(ch => ch.type)
      });

      const log = this.createPendingLog(
        userId,
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
    } else {
      // Immediate delivery
      const deliveryResult = await this.deliverImmediately(
        userId,
        alertType,
        alertData,
        enabledChannels,
        finalPriority
      );

      const log = this.createDeliveryLog(
        userId,
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
    userId: string,
    alertType: AlertType,
    alertData: any,
    channels: any[], // AlertChannel[]
    priority: Priority
  ): Promise<DeliveryResult> {
    try {
      const notificationType = this.mapAlertTypeToNotificationType(alertType);

      await this.notificationService.sendMultiChannelNotification({
        userId,
        type: notificationType,
        title: alertData.title || this.getDefaultTitle(alertType),
        message: alertData.message || alertData.description || 'You have a new alert',
        priority: this.mapPriorityToNotificationPriority(priority),
        relatedBillId: alertData.billId,
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
    userId: string,
    preferenceId: string,
    alertData: any
  ): Promise<void> {
    // This would integrate with a batch processing service
    // For now, this is a placeholder
    console.log(`Adding alert to batch for user ${userId}, preference ${preferenceId}`);
  }

  /**
   * Processes batched alerts for a user
   */
  async processBatchedAlerts(userId: string, preferenceId: string): Promise<number> {
    // This would retrieve and process batched alerts
    // For now, return 0 as placeholder
    return 0;
  }

  private createFilteredLog(
    userId: string,
    preference: AlertPreference,
    alertType: AlertType,
    originalPriority: Priority,
    filteringResult: any,
    alertData: any
  ): AlertDeliveryLog {
    return new AlertDeliveryLog(
      this.generateLogId(),
      userId,
      preference.id,
      alertType,
      [], // No channels for filtered alerts
      'filtered' as any,
      0,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        filteredReason: filteringResult.filteredReason,
        confidence: filteringResult.confidence,
        billId: alertData?.billId,
        sponsorId: alertData?.sponsorId
      },
      new Date()
    );
  }

  private createPendingLog(
    userId: string,
    preference: AlertPreference,
    alertType: AlertType,
    channels: any[], // ChannelType[]
    originalPriority: Priority,
    adjustedPriority: Priority,
    confidence: number,
    alertData: any
  ): AlertDeliveryLog {
    return new AlertDeliveryLog(
      this.generateLogId(),
      userId,
      preference.id,
      alertType,
      channels,
      'pending' as any,
      0,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        adjustedPriority: adjustedPriority.toString(),
        confidence,
        billId: alertData?.billId,
        sponsorId: alertData?.sponsorId
      },
      new Date()
    );
  }

  private createDeliveryLog(
    userId: string,
    preference: AlertPreference,
    alertType: AlertType,
    channels: any[], // ChannelType[]
    success: boolean,
    originalPriority: Priority,
    adjustedPriority: Priority,
    confidence: number,
    alertData: any,
    error?: string
  ): AlertDeliveryLog {
    const status = success ? 'sent' : 'failed';
    const deliveredAt = success ? new Date() : undefined;

    return new AlertDeliveryLog(
      this.generateLogId(),
      userId,
      preference.id,
      alertType,
      channels,
      status as any,
      success ? 0 : 1,
      new Date(),
      {
        originalPriority: originalPriority.toString(),
        adjustedPriority: adjustedPriority.toString(),
        confidence,
        billId: alertData?.billId,
        sponsorId: alertData?.sponsorId
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
  sendMultiChannelNotification(notification: any): Promise<void>;
}

export interface IDeliveryLogRepository {
  save(log: AlertDeliveryLog): Promise<void>;
  findByUserId(userId: string): Promise<AlertDeliveryLog[]>;
}

interface DeliveryResult {
  success: boolean;
  error?: string;
}