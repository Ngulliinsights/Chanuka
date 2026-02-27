import { NotificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
// UserRepository interface removed - using direct service calls
import { logger } from '@server/infrastructure/observability';
import { Bill } from '@shared/entities/bill';
import { BillCreatedEvent, BillStatusChangedEvent, BillUpdatedEvent } from '@server/features/bills/domain/events/bill-events';

/**
 * Handles notification workflows for bill events
 * Listens to domain events and coordinates notifications to stakeholders
 */
export class BillNotificationService {
  constructor(
    private readonly notificationChannelService: NotificationChannelService,
    private readonly userService: UserService
  ) {}

  /**
   * Handle bill created event
   */
  async handleBillCreated(event: BillCreatedEvent): Promise<void> {
    try {
      logger.info('Handling bill created event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        billNumber: event.billNumber
      });

      // Get stakeholders for the bill
      const stakeholders = await this.getBillStakeholders(event.bill_id);

      // Send notifications to all stakeholders
      const notificationPromises = stakeholders.map(stakeholder =>
        this.notificationChannelService.sendToMultipleChannels(
          stakeholder.id,
          ['inApp', 'email'], // Default channels for bill creation
          {
            title: `New Bill Introduced: ${event.billNumber}`,
            message: `A new bill "${event.title}" has been introduced by ${stakeholder.sponsorName || 'a legislator'}.`
          },
          {
            priority: 'medium',
            category: 'bill_created',
            relatedBillId: parseInt(event.bill_id),
            actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bills/${event.bill_id}`
          }
        )
      );

      await Promise.allSettled(notificationPromises);

      logger.info('Bill created notifications sent', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        stakeholdersCount: stakeholders.length
      });

    } catch (error) {
      logger.error('Failed to handle bill created event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id
      }, error);
    }
  }

  /**
   * Handle bill status changed event
   */
  async handleBillStatusChanged(event: BillStatusChangedEvent): Promise<void> {
    try {
      logger.info('Handling bill status changed event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus
      });

      // Get stakeholders for the bill
      const stakeholders = await this.getBillStakeholders(event.bill_id);

      // Determine notification priority based on status change
      const priority = this.getStatusChangePriority(event.oldStatus, event.newStatus);

      // Send notifications to all stakeholders
      const notificationPromises = stakeholders.map(stakeholder =>
        this.notificationChannelService.sendToMultipleChannels(
          stakeholder.id,
          this.getChannelsForStatusChange(event.newStatus),
          {
            title: `Bill Status Updated: ${stakeholder.billNumber}`,
            message: `Bill "${stakeholder.billTitle}" status changed from ${event.oldStatus} to ${event.newStatus}.`
          },
          {
            priority,
            category: 'bill_status_changed',
            relatedBillId: parseInt(event.bill_id),
            actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bills/${event.bill_id}`,
            oldStatus: event.oldStatus,
            newStatus: event.newStatus
          }
        )
      );

      await Promise.allSettled(notificationPromises);

      logger.info('Bill status change notifications sent', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        stakeholdersCount: stakeholders.length
      });

    } catch (error) {
      logger.error('Failed to handle bill status changed event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id
      }, error);
    }
  }

  /**
   * Handle bill updated event
   */
  async handleBillUpdated(event: BillUpdatedEvent): Promise<void> {
    try {
      logger.info('Handling bill updated event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        updateType: event.updateType
      });

      // Only send notifications for significant updates
      if (!this.shouldNotifyOnUpdate(event.updateType)) {
        return;
      }

      // Get stakeholders for the bill
      const stakeholders = await this.getBillStakeholders(event.bill_id);

      // Send notifications to stakeholders who track this bill
      const notificationPromises = stakeholders
        .filter(stakeholder => stakeholder.role === 'tracker' || stakeholder.role === 'sponsor')
        .map(stakeholder =>
          this.notificationChannelService.sendToMultipleChannels(
            stakeholder.id,
            ['inApp'], // Only in-app for updates to avoid spam
            {
              title: `Bill Updated: ${stakeholder.billNumber}`,
              message: this.getUpdateMessage(event.updateType, stakeholder.billTitle)
            },
            {
              priority: 'low',
              category: 'bill_updated',
              relatedBillId: parseInt(event.bill_id),
              actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bills/${event.bill_id}`,
              updateType: event.updateType
            }
          )
        );

      await Promise.allSettled(notificationPromises);

      logger.info('Bill updated notifications sent', {
        component: 'BillNotificationService',
        bill_id: event.bill_id,
        stakeholdersCount: stakeholders.length
      });

    } catch (error) {
      logger.error('Failed to handle bill updated event', {
        component: 'BillNotificationService',
        bill_id: event.bill_id
      }, error);
    }
  }

  /**
   * Get stakeholders for a bill
   */
  private async getBillStakeholders(bill_id: string): Promise<Array<{
    id: string;
    role: 'sponsor' | 'tracker' | 'engaged';
    billNumber?: string;
    billTitle?: string;
    sponsorName?: string;
  }>> {
    try {
      // This would need to be implemented to get stakeholders from the repository
      // For now, return a basic structure
      return [
        {
          id: 'system-admin', // Placeholder
          role: 'tracker',
          billNumber: 'BILL-001', // Would come from bill data
          billTitle: 'Sample Bill' // Would come from bill data
        }
      ];
    } catch (error) {
      logger.error('Failed to get bill stakeholders', {
        component: 'BillNotificationService',
        bill_id
      }, error);
      return [];
    }
  }

  /**
   * Determine notification priority based on status change
   */
  private getStatusChangePriority(oldStatus: string, newStatus: string): 'low' | 'medium' | 'high' | 'urgent' {
    // Critical status changes get higher priority
    const criticalStatuses = ['passed', 'assented', 'failed', 'withdrawn'];
    const highPriorityStatuses = ['committee', 'second_reading', 'third_reading'];

    if (criticalStatuses.includes(newStatus)) {
      return 'urgent';
    }

    if (highPriorityStatuses.includes(newStatus)) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Get appropriate channels for status change notifications
   */
  private getChannelsForStatusChange(newStatus: string): Array<'email' | 'inApp' | 'sms' | 'push'> {
    const criticalStatuses = ['passed', 'assented', 'failed', 'withdrawn'];

    if (criticalStatuses.includes(newStatus)) {
      return ['inApp', 'email', 'push']; // Multiple channels for critical updates
    }

    return ['inApp', 'email']; // Standard channels for regular updates
  }

  /**
   * Determine if an update type should trigger notifications
   */
  private shouldNotifyOnUpdate(updateType: string): boolean {
    // Only notify on significant updates to avoid spam
    const significantUpdates = [
      'content_updated',
      'tracker_added',
      'tracker_removed'
    ];

    return significantUpdates.includes(updateType);
  }

  /**
   * Get appropriate message for update type
   */
  private getUpdateMessage(updateType: string, billTitle: string): string {
    switch (updateType) {
      case 'content_updated':
        return `Bill "${billTitle}" has been updated with new content.`;
      case 'tracker_added':
        return `A new person is now tracking bill "${billTitle}".`;
      case 'tracker_removed':
        return `Someone stopped tracking bill "${billTitle}".`;
      case 'vote_recorded':
        return `A new vote has been recorded on bill "${billTitle}".`;
      default:
        return `Bill "${billTitle}" has been updated.`;
    }
  }

  /**
   * Send urgent notifications for critical bill events
   */
  async sendUrgentNotification(bill_id: string, message: string, stakeholders?: string[]): Promise<void> {
    try {
      const targetStakeholders = stakeholders || (await this.getBillStakeholders(bill_id)).map(s => s.id);

      const notificationPromises = targetStakeholders.map(stakeholderId =>
        this.notificationChannelService.sendToMultipleChannels(
          stakeholderId,
          ['inApp', 'email', 'sms', 'push'], // All channels for urgent notifications
          {
            title: 'URGENT: Bill Update',
            message
          },
          {
            priority: 'urgent',
            category: 'bill_urgent',
            relatedBillId: parseInt(bill_id),
            actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bills/${ bill_id }`
          }
        )
      );

      await Promise.allSettled(notificationPromises);

      logger.info('Urgent bill notifications sent', {
        component: 'BillNotificationService',
        bill_id,
        stakeholdersCount: targetStakeholders.length
      });

    } catch (error) {
      logger.error('Failed to send urgent bill notification', {
        component: 'BillNotificationService',
        bill_id
      }, error);
    }
  }

  /**
   * Send digest notifications for multiple bill updates
   */
  async sendDigestNotification(user_id: string, billUpdates: Array<{
    bill_id: string;
    billNumber: string;
    billTitle: string;
    updateType: string;
    timestamp: Date;
  }>): Promise<void> {
    try {
      if (billUpdates.length === 0) {
        return;
      }

      const summary = billUpdates.length === 1
        ? `1 bill update`
        : `${billUpdates.length} bill updates`;

      const message = `You have ${summary} in your tracked bills. Check your dashboard for details.`;

      await this.notificationChannelService.sendToMultipleChannels(
        user_id,
        ['inApp', 'email'],
        {
          title: `Bill Digest: ${summary}`,
          message
        },
        {
          priority: 'low',
          category: 'bill_digest',
          actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
          billUpdates: billUpdates.map(u => ({
            bill_id: u.bill_id,
            billNumber: u.billNumber,
            updateType: u.updateType,
            timestamp: u.timestamp.toISOString()
          }))
        }
      );

      logger.info('Bill digest notification sent', {
        component: 'BillNotificationService',
        user_id,
        updatesCount: billUpdates.length
      });

    } catch (error) {
      logger.error('Failed to send bill digest notification', {
        component: 'BillNotificationService',
        user_id
      }, error);
    }
  }
}


