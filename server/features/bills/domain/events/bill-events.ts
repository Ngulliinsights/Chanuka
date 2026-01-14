import { BillStatus, BillVoteType,EngagementType } from '@server/infrastructure/schema';

/**
 * Base domain event class
 */
export abstract class BillDomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly bill_id: string;
  public readonly occurredAt: Date;
  public readonly eventVersion: number = 1;

  constructor(bill_id: string, eventType: string) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.bill_id = billId;
    this.occurredAt = new Date();
  }
}

/**
 * Bill creation event
 */
export class BillCreatedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly billNumber: string,
    public readonly title: string,
    public readonly sponsor_id?: string
  ) {
    super(bill_id, 'BillCreated');
  }
}

/**
 * Bill status change event
 */
export class BillStatusChangedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly previousStatus: BillStatus,
    public readonly newStatus: BillStatus,
    public readonly changedBy?: string
  ) {
    super(bill_id, 'BillStatusChanged');
  }
}

/**
 * Bill engagement event
 */
export class BillEngagedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly engagementType: EngagementType,
    public readonly user_id: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(bill_id, 'BillEngaged');
  }
}

/**
 * Bill vote event
 */
export class BillVotedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly voteType: BillVoteType,
    public readonly user_id: string,
    public readonly previousVote?: BillVoteType
  ) {
    super(bill_id, 'BillVoted');
  }
}

/**
 * Bill comment event
 */
export class BillCommentedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly comment_id: string,
    public readonly user_id: string,
    public readonly commentText: string,
    public readonly isReply: boolean = false,
    public readonly parent_comment_id?: string
  ) {
    super(bill_id, 'BillCommented');
  }
}

/**
 * Bill stakeholder added event
 */
export class BillStakeholderAddedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly stakeholderId: string,
    public readonly stakeholderType: 'sponsor' | 'co_sponsor' | 'committee_member',
    public readonly addedBy: string
  ) {
    super(bill_id, 'BillStakeholderAdded');
  }
}

/**
 * Bill tracking started event
 */
export class BillTrackingStartedEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly user_id: string,
    public readonly notificationPreferences: {
      statusChanges: boolean;
      newComments: boolean;
      hearings: boolean;
      committeeReports: boolean;
    }
  ) {
    super(bill_id, 'BillTrackingStarted');
  }
}

/**
 * Bill deadline approaching event
 */
export class BillDeadlineApproachingEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly deadlineType: 'committee_review' | 'second_reading' | 'third_reading' | 'assent',
    public readonly deadlineDate: Date,
    public readonly daysRemaining: number
  ) {
    super(bill_id, 'BillDeadlineApproaching');
  }
}

/**
 * Bill requires attention event
 */
export class BillRequiresAttentionEvent extends BillDomainEvent {
  constructor(
    public readonly bill_id: string,
    public readonly reason: 'no_recent_activity' | 'stalled_in_committee' | 'public_deadline_approaching',
    public readonly severity: 'low' | 'medium' | 'high',
    public readonly details?: Record<string, any>
  ) {
    super(bill_id, 'BillRequiresAttention');
  }
}

/**
 * Domain event handler interface
 */
export interface DomainEventHandler<T extends BillDomainEvent> {
  handle(event: T): Promise<void>;
  eventType: string;
}

/**
 * Domain event publisher interface
 */
export interface DomainEventPublisher {
  publish(event: BillDomainEvent): Promise<void>;
  publishAll(events: BillDomainEvent[]): Promise<void>;
  subscribe<T extends BillDomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): void;
  unsubscribe(eventType: string, handler: DomainEventHandler<any>): void;
}

/**
 * In-memory domain event publisher implementation
 */
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private handlers = new Map<string, DomainEventHandler<any>[]>();

  async publish(event: BillDomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];
    await Promise.all(
      eventHandlers.map(handler => handler.handle(event))
    );
  }

  async publishAll(events: BillDomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  subscribe<T extends BillDomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: DomainEventHandler<any>): void {
    const eventHandlers = this.handlers.get(eventType) || [];
    const index = eventHandlers.indexOf(handler);
    if (index > -1) {
      eventHandlers.splice(index, 1);
    }
  }
}


