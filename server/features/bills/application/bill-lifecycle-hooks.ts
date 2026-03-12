/**
 * Bill Lifecycle Hooks
 * 
 * Event-driven hooks that trigger integrations when bills are created or updated.
 * These hooks are called by the BillService and run asynchronously to avoid
 * blocking the main bill operations.
 * 
 * SAFETY:
 * - All hooks run asynchronously (fire-and-forget)
 * - Failures don't affect bill creation/update
 * - Comprehensive error logging
 * - Can be disabled via feature flags
 */

import { logger } from '@server/infrastructure/observability';
import type { Bill } from '@server/infrastructure/schema';
import { bills } from '@server/infrastructure/schema';
import { users } from '@server/infrastructure/schema';
import { billIntegrationOrchestrator } from './bill-integration-orchestrator';

export class BillLifecycleHooks {
  private isEnabled = true;

  /**
   * Hook called after a bill is created
   * Triggers the intelligent bill pipeline asynchronously
   */
  async onBillCreated(bill: Bill): Promise<void> {
    if (!this.isEnabled) {
      logger.debug({ billId: bill.id }, 'Bill lifecycle hooks disabled');
      return;
    }

    // Fire and forget - don't await
    this.processBillAsync(bill, 'created').catch(error => {
      logger.error({ error, billId: bill.id }, 
        'Bill creation hook failed (non-blocking)');
    });
  }

  /**
   * Hook called after a bill is updated
   * Triggers the intelligent bill pipeline asynchronously
   */
  async onBillUpdated(bill: Bill, changes: Partial<Bill>): Promise<void> {
    if (!this.isEnabled) {
      logger.debug({ billId: bill.id }, 'Bill lifecycle hooks disabled');
      return;
    }

    // Only reprocess if significant fields changed
    const significantFields = ['title', 'summary', 'full_text', 'status'];
    const hasSignificantChanges = Object.keys(changes).some(key => 
      significantFields.includes(key)
    );

    if (!hasSignificantChanges) {
      logger.debug({ billId: bill.id }, 
        'No significant changes, skipping reprocessing');
      return;
    }

    // Fire and forget - don't await
    this.processBillAsync(bill, 'updated').catch(error => {
      logger.error({ error, billId: bill.id }, 
        'Bill update hook failed (non-blocking)');
    });
  }

  /**
   * Hook called after a bill status changes
   * May trigger different notifications based on status
   */
  async onBillStatusChanged(
    bill: Bill, 
    oldStatus: string, 
    newStatus: string
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    logger.info({ billId: bill.id, oldStatus, newStatus }, 
      'Bill status changed');

    // Fire and forget
    this.notifyStatusChange(bill, oldStatus, newStatus).catch(error => {
      logger.error({ error, billId: bill.id }, 
        'Status change notification failed (non-blocking)');
    });
  }

  /**
   * Process bill through integration pipeline asynchronously
   */
  private async processBillAsync(bill: Bill, event: 'created' | 'updated'): Promise<void> {
    try {
      logger.info({ billId: bill.id, event }, 
        'Processing bill through integration pipeline');

      const result = await billIntegrationOrchestrator.processBill(bill);
      
      if (result.isOk()) {
        logger.info({ billId: bill.id, event, result: result.value }, 
          'Bill integration pipeline completed successfully');
      } else {
        logger.warn({ billId: bill.id, event, error: result.error }, 
          'Bill integration pipeline completed with errors');
      }
    } catch (error) {
      logger.error({ error, billId: bill.id, event }, 
        'Bill integration pipeline failed');
    }
  }

  /**
   * Notify users about status changes
   */
  private async notifyStatusChange(
    bill: Bill, 
    oldStatus: string, 
    newStatus: string
  ): Promise<void> {
    try {
      const notificationsModule = await import('@server/features/notifications');
      
      // Find users tracking this bill
      const trackingUsers = await this.findUsersTrackingBill(bill.id);
      
      const message = `Bill "${bill.title}" status changed: ${oldStatus} → ${newStatus}`;
      
      // Check if notificationsService exists in the module
      if ('notificationsService' in notificationsModule) {
        const notificationsService = (notificationsModule as any).notificationsService;
        for (const userId of trackingUsers) {
          await notificationsService.sendNotification(
            userId, 
            message, 
            'bill_status_change'
          );
        }
      }
      
      
      logger.info({ billId: bill.id, userCount: trackingUsers.length }, 
        'Status change notifications sent');
    } catch (error) {
      logger.debug({ error }, 'Status change notifications not available');
    }
  }

  /**
   * Find users tracking this bill
   */
  private async findUsersTrackingBill(_billId: string): Promise<string[]> {
    // Placeholder implementation
    // In production, this would query user preferences, subscriptions, etc.
    return [];
  }

  /**
   * Enable or disable lifecycle hooks
   * Useful for testing or feature flag control
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info({ enabled }, 'Bill lifecycle hooks enabled state changed');
  }

  /**
   * Check if hooks are enabled
   */
  isHooksEnabled(): boolean {
    return this.isEnabled;
  }
}

export const billLifecycleHooks = new BillLifecycleHooks();
