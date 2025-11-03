// ============================================================================
// ADVOCACY COORDINATION - Domain Events
// ============================================================================

export abstract class AdvocacyDomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {
    this.occurredAt = new Date();
    this.eventId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Campaign Events
export class CampaignCreatedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly title: string,
    public readonly billId: string,
    public readonly organizerId: string
  ) {
    super(campaignId, 'CampaignCreated');
  }
}

export class CampaignStatusChangedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly changedBy: string
  ) {
    super(campaignId, 'CampaignStatusChanged');
  }
}

export class ParticipantJoinedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly participantCount: number
  ) {
    super(campaignId, 'ParticipantJoined');
  }
}

export class ParticipantLeftEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly participantCount: number
  ) {
    super(campaignId, 'ParticipantLeft');
  }
}

export class CampaignMilestoneReachedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly milestone: string,
    public readonly value: number,
    public readonly target: number
  ) {
    super(campaignId, 'CampaignMilestoneReached');
  }
}

// Action Events
export class ActionCreatedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly actionId: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly actionType: string
  ) {
    super(actionId, 'ActionCreated');
  }
}

export class ActionStartedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly actionId: string,
    public readonly campaignId: string,
    public readonly userId: string
  ) {
    super(actionId, 'ActionStarted');
  }
}

export class ActionCompletedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly actionId: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly successful: boolean,
    public readonly completionTime?: number
  ) {
    super(actionId, 'ActionCompleted');
  }
}

export class ActionSkippedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly actionId: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly reason?: string
  ) {
    super(actionId, 'ActionSkipped');
  }
}

// Coalition Events
export class CoalitionOpportunityIdentifiedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly potentialPartnerCampaignId: string,
    public readonly alignmentScore: number,
    public readonly sharedObjectives: string[]
  ) {
    super(campaignId, 'CoalitionOpportunityIdentified');
  }
}

export class CoalitionFormedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly coalitionId: string,
    public readonly campaignIds: string[],
    public readonly objectives: string[]
  ) {
    super(coalitionId, 'CoalitionFormed');
  }
}

// Impact Events
export class ImpactAchievedEvent extends AdvocacyDomainEvent {
  constructor(
    public readonly campaignId: string,
    public readonly impactType: 'bill_amended' | 'committee_feedback' | 'media_attention' | 'legislative_response',
    public readonly description: string,
    public readonly attribution: number
  ) {
    super(campaignId, 'ImpactAchieved');
  }
}

// Event Handler Interface
export interface AdvocacyEventHandler<T extends AdvocacyDomainEvent> {
  handle(event: T): Promise<void>;
}

// Event Publisher Interface
export interface AdvocacyEventPublisher {
  publish(event: AdvocacyDomainEvent): Promise<void>;
  publishAll(events: AdvocacyDomainEvent[]): Promise<void>;
  subscribe<T extends AdvocacyDomainEvent>(
    eventType: string,
    handler: AdvocacyEventHandler<T>
  ): void;
  unsubscribe(eventType: string, handler: AdvocacyEventHandler<any>): void;
}

// In-Memory Event Publisher Implementation
export class InMemoryAdvocacyEventPublisher implements AdvocacyEventPublisher {
  private handlers = new Map<string, AdvocacyEventHandler<any>[]>();

  async publish(event: AdvocacyDomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];
    await Promise.all(
      eventHandlers.map(handler => handler.handle(event))
    );
  }

  async publishAll(events: AdvocacyDomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  subscribe<T extends AdvocacyDomainEvent>(
    eventType: string,
    handler: AdvocacyEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: AdvocacyEventHandler<any>): void {
    const eventHandlers = this.handlers.get(eventType) || [];
    const index = eventHandlers.indexOf(handler);
    if (index > -1) {
      eventHandlers.splice(index, 1);
    }
  }
}