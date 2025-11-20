import { BillCreatedEvent, BillStatusChangedEvent, BillUpdatedEvent } from '../events/bill-events';
import { BillNotificationService } from './bill-notification-service';
import { logger } from '@shared/core/index';

/**
 * Event handler that connects domain events to notification workflows
 * This acts as the bridge between domain events and external services
 */
export class BillEventHandler {
  constructor(
    private readonly notificationService: BillNotificationService
  ) {}

  /**
   * Handle domain events by routing them to appropriate handlers
   */
  async handle(event: BillCreatedEvent | BillStatusChangedEvent | BillUpdatedEvent): Promise<void> {
    try {
      logger.info('Handling bill domain event', {
        component: 'BillEventHandler',
        eventType: event.constructor.name,
        bill_id: event.bill_id
      });

      switch (event.constructor.name) {
        case 'BillCreatedEvent':
          await this.notificationService.handleBillCreated(event as BillCreatedEvent);
          break;

        case 'BillStatusChangedEvent':
          await this.notificationService.handleBillStatusChanged(event as BillStatusChangedEvent);
          break;

        case 'BillUpdatedEvent':
          await this.notificationService.handleBillUpdated(event as BillUpdatedEvent);
          break;

        default:
          logger.warn('Unknown bill event type', {
            component: 'BillEventHandler',
            eventType: event.constructor.name
          });
      }

    } catch (error) {
      logger.error('Failed to handle bill domain event', {
        component: 'BillEventHandler',
        eventType: event.constructor.name,
        bill_id: event.bill_id
      }, error);

      // Don't rethrow - event handling should not break the main flow
    }
  }

  /**
   * Handle multiple events in batch
   */
  async handleBatch(events: Array<BillCreatedEvent | BillStatusChangedEvent | BillUpdatedEvent>): Promise<void> {
    logger.info('Handling batch of bill events', {
      component: 'BillEventHandler',
      eventCount: events.length
    });

    // Process events in parallel but handle errors individually
    const promises = events.map(event => this.handle(event));
    await Promise.allSettled(promises);

    logger.info('Batch bill event handling completed', {
      component: 'BillEventHandler',
      eventCount: events.length
    });
  }
}
