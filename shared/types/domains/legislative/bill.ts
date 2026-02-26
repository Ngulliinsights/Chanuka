/**
 * Legislative Bill Entity - CANONICAL SOURCE OF TRUTH
 * 
 * This is the single source of truth for Bill types across the entire application.
 * All other Bill types should import from here or derive from this definition.
 * 
 * @module shared/types/domains/legislative/bill
 * @canonical
 */

import { BaseEntity, UserTrackableEntity } from '../../core/base';
import { BillId, CommitteeId, UserId, AmendmentId, ActionId, SponsorId } from '../../core/branded';
import { 
  BillStatus, 
  Chamber, 
  BillType,
  CommitteeStatus,
  UrgencyLevel,
  ComplexityLevel
} from '../../core/enums';

// Re-export for convenience
export { BillStatus, Chamber, BillType, CommitteeStatus, UrgencyLevel, ComplexityLevel };

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
 * Vote types in legislative proceedings
 */
export type VoteType = 'yea' | 'nay' | 'abstain' | 'present';

/**
 * Vote result types
 */
export type VoteResult = 'passed' | 'failed' | 'pending';

/**
 * Amendment status types
 */
export type AmendmentStatus = 'proposed' | 'accepted' | 'rejected' | 'withdrawn';

/**
 * Bill relationship types
 */
export type BillRelationship = 'companion' | 'substitute' | 'similar' | 'conflicts';

/**
 * Constitutional flag severity levels
 */
export type ConstitutionalSeverity = 'low' | 'medium' | 'high';

/**
 * Overall sentiment classification
 */
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed';

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
  readonly billId?: BillId | string;
  readonly views?: number;
  readonly saves?: number;
  readonly comments?: number;
  readonly shares?: number;
  readonly endorsements?: number;
  readonly oppositions?: number;
  readonly lastEngagedAt?: Date;
}

/**
 * Constitutional concern flagged during bill review
 */
export interface ConstitutionalFlag {
  readonly id?: string;
  readonly type?: string;
  readonly severity: ConstitutionalSeverity;
  readonly description: string;
  readonly affectedArticles?: readonly string[];
  readonly expertAnalysis?: string;
}

/**
 * Sponsor role types
 */
export type SponsorRole = 'primary' | 'co-sponsor';

/**
 * Sponsor Entity
 */
export interface Sponsor extends BaseEntity {
  readonly id: SponsorId | string;
  readonly billId?: BillId | string;
  readonly legislatorId?: UserId | string;
  readonly name: string;
  readonly legislatorName?: string; // Legacy compatibility
  readonly party: string;
  readonly state?: string;
  readonly district?: string;
  readonly role?: SponsorRole;
  readonly sponsorType?: SponsorType;
  readonly sponsorshipDate?: Date;
  readonly isPrimary?: boolean;
  readonly avatarUrl?: string;
  readonly contactInfo?: Readonly<Record<string, unknown>>;
  readonly conflictOfInterest?: boolean | readonly string[];
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
 * Bill Action/Event in legislative timeline
 */
export interface BillAction {
  readonly id: string | ActionId;
  readonly billId: string | BillId;
  readonly action: string;
  readonly date: string;
  readonly chamber?: Chamber | string;
  readonly actor?: string;
  readonly result?: VoteResult;
  readonly notes?: string;
}

/**
 * Bill Amendment
 */
export interface BillAmendment {
  readonly id: string | AmendmentId;
  readonly billId: string | BillId;
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly proposedBy: string;
  readonly status: AmendmentStatus;
  readonly dateProposed: string;
  readonly dateResolved?: string;
  readonly impact?: string;
}

/**
 * Related Bill reference
 */
export interface RelatedBill {
  readonly id: string | BillId;
  readonly billNumber: string;
  readonly title: string;
  readonly relationship: BillRelationship;
  readonly status: BillStatus;
}

/**
 * Bill Entity - CANONICAL DEFINITION
 * 
 * This is the single source of truth for Bill types.
 * Supports both branded types (BillId) and string IDs for flexibility.
 */
export interface Bill extends UserTrackableEntity {
  // Core identifiers
  readonly id: BillId | string;
  readonly billNumber: string;
  
  // Content
  readonly title: string;
  readonly officialTitle?: string;
  readonly summary: string;
  readonly detailedSummary?: string;
  readonly fullText?: string;
  readonly description?: string;
  readonly historicalContext?: string;
  
  // Status & Classification
  readonly status: BillStatus;
  readonly chamber: Chamber | string;
  readonly billType?: BillType | string;
  readonly priority?: BillPriority;
  readonly urgency?: UrgencyLevel;
  readonly complexity?: ComplexityLevel;
  
  // Dates (support both Date and string for API compatibility)
  readonly introductionDate?: Date | string;
  readonly introducedDate?: string; // Alias for API compatibility
  readonly lastActionDate?: string;
  readonly lastUpdated?: string; // Legacy
  readonly created_at?: string; // Legacy snake_case
  readonly updated_at?: string; // Legacy snake_case
  readonly publication_date?: string; // Legacy
  
  // Parliamentary context
  readonly congress?: number;
  readonly session?: number | string;
  readonly parliament_session?: string;
  readonly reading_stage?: string;

  // Relationships
  readonly sponsorId?: UserId | string;
  readonly sponsors?: readonly Sponsor[];
  readonly committees?: readonly Committee[];
  readonly committeeAssignments?: readonly BillCommitteeAssignment[];

  // Content URLs
  readonly fullTextUrl?: string;
  readonly pdfUrl?: string;
  readonly url?: string;
  readonly relatedDocuments?: readonly string[];

  // Timeline & Actions
  readonly timeline?: readonly (BillTimelineEvent | BillAction)[];
  readonly amendments?: readonly BillAmendment[];
  readonly relatedBills?: readonly (BillId | string | RelatedBill)[];

  // Metadata & Classification
  readonly subjects?: readonly string[];
  readonly tags?: readonly string[];
  readonly policyAreas?: readonly string[];
  readonly constitutionalIssues?: readonly string[];
  readonly constitutionalFlags?: readonly ConstitutionalFlag[];
  readonly financialImpact?: string;
  readonly governmentBodies?: readonly string[];

  // Metrics
  readonly readingTime?: number;
  readonly trackingCount?: number;
  readonly viewCount?: number;
  readonly commentCount?: number;

  // Engagement
  readonly engagement?: BillEngagementMetrics;

  // Administrative
  readonly isActive?: boolean;
  readonly version?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  
  // Legacy compatibility
  readonly bill_id?: string;
  readonly bill_number?: string;
}

/**
 * Extended Bill with comprehensive details
 */
export interface ExtendedBill extends Bill {
  readonly amendments: readonly BillAmendment[];
  readonly relatedBills: readonly RelatedBill[];
}