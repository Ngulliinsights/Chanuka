/**
 * Legislative Bill Entity
 * Standardized bill type following the exemplary pattern from loading.ts
 */

import { BaseEntity, UserTrackableEntity } from '../../core/base';
import { BillId } from '../../core/common';

/**
 * Bill Status - Comprehensive lifecycle states
 */
export type BillStatus =
  | 'draft'
  | 'introduced'
  | 'committee_review'
  | 'floor_debate'
  | 'amendment'
  | 'vote_scheduled'
  | 'passed_chamber'
  | 'conference'
  | 'passed_both_chambers'
  | 'presidential_action'
  | 'enacted'
  | 'vetoed'
  | 'failed'
  | 'withdrawn'
  | 'archived';

/**
 * Legislative Chamber
 */
export type Chamber = 'house' | 'senate' | 'joint';

/**
 * Bill Type Classification
 */
export type BillType =
  | 'bill'
  | 'resolution'
  | 'amendment'
  | 'appropriation'
  | 'budget'
  | 'treaty'
  | 'nomination';

/**
 * Bill Priority Level
 */
export type BillPriority = 'low' | 'medium' | 'high' | 'critical';

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
  readonly id: string;
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
  readonly billId: BillId;
  readonly legislatorId: string;
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
  readonly name: string;
  readonly committeeType: CommitteeType;
  readonly chamber: Chamber;
  readonly jurisdiction: string;
  readonly chairperson?: string;
  readonly members?: readonly string[];
  readonly contactInfo?: Readonly<Record<string, unknown>>;
}

/**
 * Committee Assignment for a Bill
 */
export interface BillCommitteeAssignment extends BaseEntity {
  readonly billId: BillId;
  readonly committeeId: string;
  readonly assignmentDate: Date;
  readonly status: 'referred' | 'discharged' | 'reporting' | 'completed';
  readonly actionTaken?: string;
  readonly reportDate?: Date;
}

/**
 * Bill Entity - Comprehensive legislative entity
 */
export interface Bill extends UserTrackableEntity {
  readonly billId: BillId;
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
  readonly primarySponsorId: string;
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