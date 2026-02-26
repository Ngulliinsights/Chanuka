import { logger } from '@server/infrastructure/observability';
import { BillCreatedEvent, BillStatusChangedEvent, BillUpdatedEvent } from '@server/features/bills/domain/events/bill-events';

import { BillNotificationService } from './bill-notification-service';

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
      logger.info({
        component: 'BillEventHandler',
        eventType: event.constructor.name,
        bill_id: event.bill_id
      }, 'Handling bill domain event');

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
          logger.warn({
            component: 'BillEventHandler',
            eventType: event.constructor.name
          }, 'Unknown bill event type');
      }

    } catch (error) {
      logger.error({
        component: 'BillEventHandler',
        eventType: event.constructor.name,
        bill_id: event.bill_id,
        error
      }, 'Failed to handle bill domain event');

      // Don't rethrow - event handling should not break the main flow
    }
  }

  /**
   * Handle multiple events in batch
   */
  async handleBatch(events: Array<BillCreatedEvent | BillStatusChangedEvent | BillUpdatedEvent>): Promise<void> {
    logger.info({
      component: 'BillEventHandler',
      eventCount: events.length
    }, 'Handling batch of bill events');

    // Process events in parallel but handle errors individually
    const promises = events.map(event => this.handle(event));
    await Promise.allSettled(promises);

    logger.info({
      component: 'BillEventHandler',
      eventCount: events.length
    }, 'Batch bill event handling completed');
  }
}


