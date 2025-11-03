import { BillStatus, EngagementType, BillVoteType } from '@shared/schema';

/**
 * Base domain event class
 */
export abstract class BillDomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly billId: string;
  public readonly occurredAt: Date;
  public readonly eventVersion: number = 1;

  constructor(billId: string, eventType: string) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.billId = billId;
    this.occurredAt = new Date();
  }
}

/**
 * Bill creation event
 */
export class BillCreatedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly billNumber: string,
    public readonly title: string,
    public readonly sponsorId?: string
  ) {
    super(billId, 'BillCreated');
  }
}

/**
 * Bill status change event
 */
export class BillStatusChangedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly previousStatus: BillStatus,
    public readonly newStatus: BillStatus,
    public readonly changedBy?: string
  ) {
    super(billId, 'BillStatusChanged');
  }
}

/**
 * Bill engagement event
 */
export class BillEngagedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly engagementType: EngagementType,
    public readonly userId: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(billId, 'BillEngaged');
  }
}

/**
 * Bill vote event
 */
export class BillVotedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly voteType: BillVoteType,
    public readonly userId: string,
    public readonly previousVote?: BillVoteType
  ) {
    super(billId, 'BillVoted');
  }
}

/**
 * Bill comment event
 */
export class BillCommentedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly commentId: string,
    public readonly userId: string,
    public readonly commentText: string,
    public readonly isReply: boolean = false,
    public readonly parentCommentId?: string
  ) {
    super(billId, 'BillCommented');
  }
}

/**
 * Bill stakeholder added event
 */
export class BillStakeholderAddedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly stakeholderId: string,
    public readonly stakeholderType: 'sponsor' | 'co_sponsor' | 'committee_member',
    public readonly addedBy: string
  ) {
    super(billId, 'BillStakeholderAdded');
  }
}

/**
 * Bill tracking started event
 */
export class BillTrackingStartedEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly userId: string,
    public readonly notificationPreferences: {
      statusChanges: boolean;
      newComments: boolean;
      hearings: boolean;
      committeeReports: boolean;
    }
  ) {
    super(billId, 'BillTrackingStarted');
  }
}

/**
 * Bill deadline approaching event
 */
export class BillDeadlineApproachingEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly deadlineType: 'committee_review' | 'second_reading' | 'third_reading' | 'assent',
    public readonly deadlineDate: Date,
    public readonly daysRemaining: number
  ) {
    super(billId, 'BillDeadlineApproaching');
  }
}

/**
 * Bill requires attention event
 */
export class BillRequiresAttentionEvent extends BillDomainEvent {
  constructor(
    public readonly billId: string,
    public readonly reason: 'no_recent_activity' | 'stalled_in_committee' | 'public_deadline_approaching',
    public readonly severity: 'low' | 'medium' | 'high',
    public readonly details?: Record<string, any>
  ) {
    super(billId, 'BillRequiresAttention');
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