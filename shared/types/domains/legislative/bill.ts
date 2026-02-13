/**
 * Legislative Bill Entity
 * Standardized bill type following the exemplary pattern from loading.ts
 */

import { BaseEntity, UserTrackableEntity } from '../../core/base';
import { BillId, CommitteeId, UserId, AmendmentId, ActionId, SponsorId } from '../../core/branded';
import { 
  BillStatus, 
  Chamber, 
  BillType,
  CommitteeStatus
} from '../../core/enums';

// Re-export for convenience
export { BillStatus, Chamber, BillType, CommitteeStatus };

/**
 * Bill Priority Level
 */
export enum BillPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

/**
 * Sponsor Type
 */
export type SponsorType = 'primary' | 'cosponsor' | 'committee';

/**
 * Committee Type
 */
export type CommitteeType =
  | 'standing'
  | 'select'
  | 'joint'
  | 'conference'
  | 'subcommittee';

/**
 * Legislative Action Type
 */
export type LegislativeActionType =
  | 'introduction'
  | 'referral'
  | 'hearing'
  | 'markup'
  | 'report'
  | 'debate'
  | 'amendment'
  | 'vote'
  | 'passage'
  | 'conference'
  | 'signing'
  | 'veto'
  | 'override'
  | 'enactment';

/**
 * Bill Timeline Event
 */
export interface BillTimelineEvent {
  readonly id: ActionId;
  readonly billId: BillId;
  readonly actionType: LegislativeActionType;
  readonly timestamp: Date;
  readonly description: string;
  readonly chamber?: Chamber;
  readonly result?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Bill Engagement Metrics
 */
export interface BillEngagementMetrics {
  readonly billId: BillId;
  readonly views: number;
  readonly comments: number;
  readonly shares: number;
  readonly endorsements: number;
  readonly oppositions: number;
  readonly lastEngagedAt?: Date;
}

/**
 * Sponsor Entity
 */
export interface Sponsor extends BaseEntity {
  readonly id: SponsorId;
  readonly billId: BillId;
  readonly legislatorId: UserId;
  readonly legislatorName: string;
  readonly party: string;
  readonly state: string;
  readonly district?: string;
  readonly sponsorType: SponsorType;
  readonly sponsorshipDate: Date;
  readonly isPrimary: boolean;
  readonly contactInfo?: Readonly<Record<string, unknown>>;
  readonly conflictOfInterest?: readonly string[];
}

/**
 * Committee Entity
 */
export interface Committee extends BaseEntity {
  readonly id: CommitteeId;
  readonly name: string;
  readonly committeeType: CommitteeType;
  readonly chamber: Chamber;
  readonly jurisdiction: string;
  readonly chairperson?: string;
  readonly members?: readonly UserId[];
  readonly contactInfo?: Readonly<Record<string, unknown>>;
}

/**
 * Committee Assignment for a Bill
 */
export interface BillCommitteeAssignment extends BaseEntity {
  readonly billId: BillId;
  readonly committeeId: CommitteeId;
  readonly assignmentDate: Date;
  readonly status: CommitteeStatus;
  readonly actionTaken?: string;
  readonly reportDate?: Date;
}

/**
 * Bill Entity - Comprehensive legislative entity
 */
export interface Bill extends UserTrackableEntity {
  readonly id: BillId;
  readonly billNumber: string;
  readonly title: string;
  readonly officialTitle?: string;
  readonly summary: string;
  readonly detailedSummary?: string;
  readonly status: BillStatus;
  readonly chamber: Chamber;
  readonly billType: BillType;
  readonly priority: BillPriority;
  readonly introductionDate: Date;
  readonly congress: number;
  readonly session: number;

  // Relationships
  readonly sponsorId: UserId;
  readonly sponsors?: readonly Sponsor[];
  readonly committees?: readonly Committee[];
  readonly committeeAssignments?: readonly BillCommitteeAssignment[];

  // Content
  readonly fullTextUrl?: string;
  readonly pdfUrl?: string;
  readonly relatedDocuments?: readonly string[];

  // Timeline
  readonly timeline: readonly BillTimelineEvent[];

  // Metadata
  readonly subjects?: readonly string[];
  readonly policyAreas?: readonly string[];
  readonly relatedBills?: readonly BillId[];

  // Engagement
  readonly engagement: BillEngagementMetrics;

  // Administrative
  readonly isActive: boolean;
  readonly version: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}