/**
 * Bill Entity Transformers
 * Transformations between database, domain, and API representations of Bill entity
 * 
 * Requirements: 4.2, 4.3
 */

import type { Transformer } from '../types';
import type {
  Bill,
  BillTimelineEvent,
  BillEngagementMetrics,
  Sponsor,
  Committee,
  BillCommitteeAssignment,
} from '../../../types/domains/legislative/bill';
import type {
  BillTable,
  BillTimelineEventTable,
  BillEngagementMetricsTable,
  SponsorTable,
  CommitteeTable,
  BillCommitteeAssignmentTable,
} from '../../../types/database/tables';
import type {
  BillId,
  UserId,
  CommitteeId,
  SponsorId,
  ActionId,
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from '../../../types/core/branded';
import {
  BillStatus,
  Chamber,
  BillType,
  CommitteeStatus,
} from '../../../types/core/enums';
import {
  BillPriority,
  type SponsorType,
  type CommitteeType,
  type LegislativeActionType,
} from '../../../types/domains/legislative/bill';
import {
  dateToStringTransformer,
} from '../base';

// ============================================================================
// Database to Domain Transformers
// ============================================================================

/**
 * Transform BillTable (database) to Bill (domain)
 */
export const billDbToDomain: Transformer<BillTable, Bill> = {
  transform(dbBill: BillTable): Bill {
    return {
      id: dbBill.id,
      billNumber: dbBill.bill_number,
      title: dbBill.title,
      officialTitle: dbBill.official_title ?? undefined,
      summary: dbBill.summary,
      detailedSummary: dbBill.detailed_summary ?? undefined,
      status: dbBill.status as BillStatus,
      chamber: dbBill.chamber as Chamber,
      billType: dbBill.bill_type as BillType,
      priority: dbBill.priority as BillPriority,
      introductionDate: dbBill.introduction_date,
      congress: dbBill.congress,
      session: dbBill.session,
      sponsorId: dbBill.sponsor_id as unknown as UserId,
      fullTextUrl: dbBill.full_text_url ?? undefined,
      pdfUrl: dbBill.pdf_url ?? undefined,
      timeline: [], // Timeline is loaded separately
      engagement: {
        billId: dbBill.id,
        views: 0,
        comments: 0,
        shares: 0,
        endorsements: 0,
        oppositions: 0,
      }, // Engagement is loaded separately
      isActive: dbBill.is_active,
      version: dbBill.version,
      metadata: dbBill.metadata ?? undefined,
      createdAt: dbBill.created_at,
      updatedAt: dbBill.updated_at,
      createdBy: (dbBill.created_by as string) ?? '',
      updatedBy: (dbBill.updated_by as string) ?? '',
    };
  },

  reverse(bill: Bill): BillTable {
    return {
      id: bill.id as BillId,
      bill_number: bill.billNumber,
      title: bill.title,
      official_title: bill.officialTitle ?? null,
      summary: bill.summary,
      detailed_summary: bill.detailedSummary ?? null,
      status: bill.status as string,
      chamber: bill.chamber as string,
      bill_type: (bill.billType as string) ?? 'bill',
      priority: (bill.priority as string) ?? 'medium',
      introduction_date: (bill.introductionDate as Date) ?? new Date(),
      congress: bill.congress ?? 0,
      session: (bill.session as number) ?? 0,
      sponsor_id: (bill.sponsorId as SponsorId) ?? ('' as SponsorId),
      full_text_url: bill.fullTextUrl ?? null,
      pdf_url: bill.pdfUrl ?? null,
      is_active: bill.isActive ?? true,
      version: bill.version ?? 1,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
      created_by: (bill.createdBy as UserId) ?? null,
      updated_by: (bill.updatedBy as UserId) ?? null,
      metadata: bill.metadata ?? null,
    };
  },
};

/**
 * Transform BillTimelineEventTable (database) to BillTimelineEvent (domain)
 */
export const billTimelineEventDbToDomain: Transformer<BillTimelineEventTable, BillTimelineEvent> = {
  transform(dbEvent: BillTimelineEventTable): BillTimelineEvent {
    return {
      id: dbEvent.id as unknown as ActionId,
      billId: dbEvent.bill_id,
      actionType: dbEvent.action_type as LegislativeActionType,
      timestamp: dbEvent.timestamp,
      description: dbEvent.description,
      chamber: dbEvent.chamber ? (dbEvent.chamber as Chamber) : undefined,
      result: dbEvent.result ?? undefined,
      metadata: dbEvent.metadata ?? undefined,
    };
  },

  reverse(event: BillTimelineEvent): BillTimelineEventTable {
    return {
      id: event.id as unknown as BillTimelineEventId,
      bill_id: event.billId,
      action_type: event.actionType,
      timestamp: event.timestamp,
      description: event.description,
      chamber: event.chamber ?? null,
      result: event.result ?? null,
      metadata: event.metadata ?? null,
      created_at: new Date(),
    };
  },
};

/**
 * Transform BillEngagementMetricsTable (database) to BillEngagementMetrics (domain)
 */
export const billEngagementMetricsDbToDomain: Transformer<BillEngagementMetricsTable, BillEngagementMetrics> = {
  transform(dbMetrics: BillEngagementMetricsTable): BillEngagementMetrics {
    return {
      billId: dbMetrics.bill_id,
      views: dbMetrics.views,
      comments: dbMetrics.comments,
      shares: dbMetrics.shares,
      endorsements: dbMetrics.endorsements,
      oppositions: dbMetrics.oppositions,
      lastEngagedAt: dbMetrics.last_engaged_at ?? undefined,
    };
  },

  reverse(metrics: BillEngagementMetrics): BillEngagementMetricsTable {
    return {
      bill_id: (metrics.billId as BillId) ?? ('' as BillId),
      views: metrics.views ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      endorsements: metrics.endorsements ?? 0,
      oppositions: metrics.oppositions ?? 0,
      last_engaged_at: metrics.lastEngagedAt ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  },
};

/**
 * Transform SponsorTable (database) to Sponsor (domain)
 */
export const sponsorDbToDomain: Transformer<SponsorTable, Sponsor> = {
  transform(dbSponsor: SponsorTable): Sponsor {
    return {
      id: dbSponsor.id,
      billId: dbSponsor.bill_id,
      legislatorId: dbSponsor.legislator_id as unknown as UserId,
      name: dbSponsor.legislator_name,
      legislatorName: dbSponsor.legislator_name,
      party: dbSponsor.party,
      state: dbSponsor.state,
      district: dbSponsor.district ?? undefined,
      sponsorType: dbSponsor.sponsor_type as SponsorType,
      sponsorshipDate: dbSponsor.sponsorship_date,
      isPrimary: dbSponsor.is_primary,
      createdAt: dbSponsor.created_at,
      updatedAt: dbSponsor.updated_at,
    };
  },

  reverse(sponsor: Sponsor): SponsorTable {
    return {
      id: sponsor.id as SponsorId,
      bill_id: (sponsor.billId as BillId) ?? ('' as BillId),
      legislator_id: (sponsor.legislatorId as LegislatorId) ?? ('' as LegislatorId),
      legislator_name: sponsor.legislatorName ?? sponsor.name,
      party: sponsor.party,
      state: sponsor.state ?? '',
      district: sponsor.district ?? null,
      sponsor_type: (sponsor.sponsorType as string) ?? 'primary',
      sponsorship_date: sponsor.sponsorshipDate ?? new Date(),
      is_primary: sponsor.isPrimary ?? false,
      created_at: sponsor.createdAt,
      updated_at: sponsor.updatedAt,
    };
  },
};

/**
 * Transform CommitteeTable (database) to Committee (domain)
 */
export const committeeDbToDomain: Transformer<CommitteeTable, Committee> = {
  transform(dbCommittee: CommitteeTable): Committee {
    return {
      id: dbCommittee.id,
      name: dbCommittee.name,
      committeeType: dbCommittee.committee_type as CommitteeType,
      chamber: dbCommittee.chamber as Chamber,
      jurisdiction: dbCommittee.jurisdiction,
      chairperson: dbCommittee.chairperson ?? undefined,
      createdAt: dbCommittee.created_at,
      updatedAt: dbCommittee.updated_at,
    };
  },

  reverse(committee: Committee): CommitteeTable {
    return {
      id: committee.id,
      name: committee.name,
      committee_type: committee.committeeType,
      chamber: committee.chamber,
      jurisdiction: committee.jurisdiction,
      chairperson: committee.chairperson ?? null,
      created_at: committee.createdAt,
      updated_at: committee.updatedAt,
    };
  },
};

/**
 * Transform BillCommitteeAssignmentTable (database) to BillCommitteeAssignment (domain)
 */
export const billCommitteeAssignmentDbToDomain: Transformer<BillCommitteeAssignmentTable, BillCommitteeAssignment> = {
  transform(dbAssignment: BillCommitteeAssignmentTable): BillCommitteeAssignment {
    return {
      id: dbAssignment.id,
      billId: dbAssignment.bill_id,
      committeeId: dbAssignment.committee_id,
      assignmentDate: dbAssignment.assignment_date,
      status: dbAssignment.status as CommitteeStatus,
      actionTaken: dbAssignment.action_taken ?? undefined,
      reportDate: dbAssignment.report_date ?? undefined,
      createdAt: dbAssignment.created_at,
      updatedAt: dbAssignment.updated_at,
    };
  },

  reverse(assignment: BillCommitteeAssignment): BillCommitteeAssignmentTable {
    return {
      id: assignment.id as BillCommitteeAssignmentId,
      bill_id: assignment.billId,
      committee_id: assignment.committeeId,
      assignment_date: assignment.assignmentDate,
      status: assignment.status,
      action_taken: assignment.actionTaken ?? null,
      report_date: assignment.reportDate ?? null,
      created_at: assignment.createdAt,
      updated_at: assignment.updatedAt,
    };
  },
};

// ============================================================================
// Domain to API Transformers
// ============================================================================

/**
 * API representation of Bill (serialized for wire transfer)
 */
export interface ApiBill {
  readonly id: string;
  readonly billNumber: string;
  readonly title: string;
  readonly officialTitle?: string;
  readonly summary: string;
  readonly detailedSummary?: string;
  readonly status: string;
  readonly chamber: string;
  readonly billType: string;
  readonly priority: string;
  readonly introductionDate: string;
  readonly congress: number;
  readonly session: number;
  readonly sponsorId: string;
  readonly sponsors?: readonly ApiSponsor[];
  readonly committees?: readonly ApiCommittee[];
  readonly committeeAssignments?: readonly ApiBillCommitteeAssignment[];
  readonly fullTextUrl?: string;
  readonly pdfUrl?: string;
  readonly relatedDocuments?: readonly string[];
  readonly timeline: readonly ApiBillTimelineEvent[];
  readonly subjects?: readonly string[];
  readonly policyAreas?: readonly string[];
  readonly relatedBills?: readonly string[];
  readonly engagement?: ApiBillEngagementMetrics;
  readonly isActive: boolean;
  readonly version: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

export interface ApiBillTimelineEvent {
  readonly id: string;
  readonly billId: string;
  readonly actionType: string;
  readonly timestamp: string;
  readonly description: string;
  readonly chamber?: string;
  readonly result?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ApiBillEngagementMetrics {
  readonly billId: string;
  readonly views: number;
  readonly comments: number;
  readonly shares: number;
  readonly endorsements: number;
  readonly oppositions: number;
  readonly lastEngagedAt?: string;
}

export interface ApiSponsor {
  readonly id: string;
  readonly billId: string;
  readonly legislatorId: string;
  readonly legislatorName: string;
  readonly party: string;
  readonly state: string;
  readonly district?: string;
  readonly sponsorType: string;
  readonly sponsorshipDate: string;
  readonly isPrimary: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApiCommittee {
  readonly id: string;
  readonly name: string;
  readonly committeeType: string;
  readonly chamber: string;
  readonly jurisdiction: string;
  readonly chairperson?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApiBillCommitteeAssignment {
  readonly id: string;
  readonly billId: string;
  readonly committeeId: string;
  readonly assignmentDate: string;
  readonly status: string;
  readonly actionTaken?: string;
  readonly reportDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Transform Bill (domain) to ApiBill (API)
 */
export const billDomainToApi: Transformer<Bill, ApiBill> = {
  transform(bill: Bill): ApiBill {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      title: bill.title,
      officialTitle: bill.officialTitle,
      summary: bill.summary,
      detailedSummary: bill.detailedSummary,
      status: bill.status,
      chamber: bill.chamber,
      billType: bill.billType ?? 'bill',
      priority: (bill.priority as string) ?? 'medium',
      introductionDate: dateToStringTransformer.transform((bill.introductionDate as Date) ?? new Date()),
      congress: bill.congress ?? 0,
      session: (bill.session as number) ?? 0,
      sponsorId: bill.sponsorId ?? '',
      sponsors: bill.sponsors?.map(s => sponsorDomainToApi.transform(s)),
      committees: bill.committees?.map(c => committeeDomainToApi.transform(c)),
      committeeAssignments: bill.committeeAssignments?.map(a => billCommitteeAssignmentDomainToApi.transform(a)),
      fullTextUrl: bill.fullTextUrl,
      pdfUrl: bill.pdfUrl,
      relatedDocuments: bill.relatedDocuments,
      timeline: bill.timeline?.map(e => billTimelineEventDomainToApi.transform(e as BillTimelineEvent)) ?? [],
      subjects: bill.subjects,
      policyAreas: bill.policyAreas,
      relatedBills: bill.relatedBills as readonly string[] | undefined,
      engagement: bill.engagement ? billEngagementMetricsDomainToApi.transform(bill.engagement) : undefined,
      isActive: bill.isActive ?? true,
      version: bill.version ?? 1,
      metadata: bill.metadata,
      createdAt: dateToStringTransformer.transform(bill.createdAt),
      updatedAt: dateToStringTransformer.transform(bill.updatedAt),
      createdBy: bill.createdBy,
      updatedBy: bill.updatedBy,
    };
  },

  reverse(apiBill: ApiBill): Bill {
    return {
      id: apiBill.id as BillId,
      billNumber: apiBill.billNumber,
      title: apiBill.title,
      officialTitle: apiBill.officialTitle,
      summary: apiBill.summary,
      detailedSummary: apiBill.detailedSummary,
      status: apiBill.status as BillStatus,
      chamber: apiBill.chamber as Chamber,
      billType: apiBill.billType as BillType,
      priority: apiBill.priority as BillPriority,
      introductionDate: dateToStringTransformer.reverse(apiBill.introductionDate),
      congress: apiBill.congress,
      session: apiBill.session,
      sponsorId: apiBill.sponsorId as UserId,
      sponsors: apiBill.sponsors?.map(s => sponsorDomainToApi.reverse(s)),
      committees: apiBill.committees?.map(c => committeeDomainToApi.reverse(c)),
      committeeAssignments: apiBill.committeeAssignments?.map(a => billCommitteeAssignmentDomainToApi.reverse(a)),
      fullTextUrl: apiBill.fullTextUrl,
      pdfUrl: apiBill.pdfUrl,
      relatedDocuments: apiBill.relatedDocuments,
      timeline: apiBill.timeline?.map(e => billTimelineEventDomainToApi.reverse(e)),
      subjects: apiBill.subjects,
      policyAreas: apiBill.policyAreas,
      relatedBills: apiBill.relatedBills as BillId[] | undefined,
      engagement: apiBill.engagement ? billEngagementMetricsDomainToApi.reverse(apiBill.engagement) : undefined,
      isActive: apiBill.isActive,
      version: apiBill.version,
      metadata: apiBill.metadata,
      createdAt: dateToStringTransformer.reverse(apiBill.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiBill.updatedAt),
      createdBy: apiBill.createdBy ?? '',
      updatedBy: apiBill.updatedBy ?? '',
    };
  },
};

/**
 * Transform BillTimelineEvent (domain) to ApiBillTimelineEvent (API)
 */
export const billTimelineEventDomainToApi: Transformer<BillTimelineEvent, ApiBillTimelineEvent> = {
  transform(event: BillTimelineEvent): ApiBillTimelineEvent {
    return {
      id: event.id,
      billId: event.billId,
      actionType: event.actionType,
      timestamp: dateToStringTransformer.transform(event.timestamp),
      description: event.description,
      chamber: event.chamber,
      result: event.result,
      metadata: event.metadata,
    };
  },

  reverse(apiEvent: ApiBillTimelineEvent): BillTimelineEvent {
    return {
      id: apiEvent.id as ActionId,
      billId: apiEvent.billId as BillId,
      actionType: apiEvent.actionType as LegislativeActionType,
      timestamp: dateToStringTransformer.reverse(apiEvent.timestamp),
      description: apiEvent.description,
      chamber: apiEvent.chamber as Chamber | undefined,
      result: apiEvent.result,
      metadata: apiEvent.metadata,
    };
  },
};

/**
 * Transform BillEngagementMetrics (domain) to ApiBillEngagementMetrics (API)
 */
export const billEngagementMetricsDomainToApi: Transformer<BillEngagementMetrics, ApiBillEngagementMetrics> = {
  transform(metrics: BillEngagementMetrics): ApiBillEngagementMetrics {
    return {
      billId: metrics.billId ?? '',
      views: metrics.views ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      endorsements: metrics.endorsements ?? 0,
      oppositions: metrics.oppositions ?? 0,
      lastEngagedAt: metrics.lastEngagedAt ? dateToStringTransformer.transform(metrics.lastEngagedAt) : undefined,
    };
  },

  reverse(apiMetrics: ApiBillEngagementMetrics): BillEngagementMetrics {
    return {
      billId: apiMetrics.billId as BillId,
      views: apiMetrics.views,
      comments: apiMetrics.comments,
      shares: apiMetrics.shares,
      endorsements: apiMetrics.endorsements,
      oppositions: apiMetrics.oppositions,
      lastEngagedAt: apiMetrics.lastEngagedAt ? dateToStringTransformer.reverse(apiMetrics.lastEngagedAt) : undefined,
    };
  },
};

/**
 * Transform Sponsor (domain) to ApiSponsor (API)
 */
export const sponsorDomainToApi: Transformer<Sponsor, ApiSponsor> = {
  transform(sponsor: Sponsor): ApiSponsor {
    return {
      id: sponsor.id,
      billId: sponsor.billId ?? '',
      legislatorId: sponsor.legislatorId ?? '',
      legislatorName: sponsor.legislatorName ?? sponsor.name,
      party: sponsor.party,
      state: sponsor.state ?? '',
      district: sponsor.district,
      sponsorType: (sponsor.sponsorType as string) ?? 'primary',
      sponsorshipDate: dateToStringTransformer.transform(sponsor.sponsorshipDate ?? new Date()),
      isPrimary: sponsor.isPrimary ?? false,
      createdAt: dateToStringTransformer.transform(sponsor.createdAt),
      updatedAt: dateToStringTransformer.transform(sponsor.updatedAt),
    };
  },

  reverse(apiSponsor: ApiSponsor): Sponsor {
    return {
      id: apiSponsor.id as SponsorId,
      billId: apiSponsor.billId as BillId,
      legislatorId: apiSponsor.legislatorId as UserId,
      name: apiSponsor.legislatorName,
      legislatorName: apiSponsor.legislatorName,
      party: apiSponsor.party,
      state: apiSponsor.state,
      district: apiSponsor.district,
      sponsorType: apiSponsor.sponsorType as SponsorType,
      sponsorshipDate: dateToStringTransformer.reverse(apiSponsor.sponsorshipDate),
      isPrimary: apiSponsor.isPrimary,
      createdAt: dateToStringTransformer.reverse(apiSponsor.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiSponsor.updatedAt),
    };
  },
};

/**
 * Transform Committee (domain) to ApiCommittee (API)
 */
export const committeeDomainToApi: Transformer<Committee, ApiCommittee> = {
  transform(committee: Committee): ApiCommittee {
    return {
      id: committee.id,
      name: committee.name,
      committeeType: committee.committeeType,
      chamber: committee.chamber,
      jurisdiction: committee.jurisdiction,
      chairperson: committee.chairperson,
      createdAt: dateToStringTransformer.transform(committee.createdAt),
      updatedAt: dateToStringTransformer.transform(committee.updatedAt),
    };
  },

  reverse(apiCommittee: ApiCommittee): Committee {
    return {
      id: apiCommittee.id as CommitteeId,
      name: apiCommittee.name,
      committeeType: apiCommittee.committeeType as CommitteeType,
      chamber: apiCommittee.chamber as Chamber,
      jurisdiction: apiCommittee.jurisdiction,
      chairperson: apiCommittee.chairperson,
      createdAt: dateToStringTransformer.reverse(apiCommittee.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiCommittee.updatedAt),
    };
  },
};

/**
 * Transform BillCommitteeAssignment (domain) to ApiBillCommitteeAssignment (API)
 */
export const billCommitteeAssignmentDomainToApi: Transformer<BillCommitteeAssignment, ApiBillCommitteeAssignment> = {
  transform(assignment: BillCommitteeAssignment): ApiBillCommitteeAssignment {
    return {
      id: assignment.id,
      billId: assignment.billId,
      committeeId: assignment.committeeId,
      assignmentDate: dateToStringTransformer.transform(assignment.assignmentDate),
      status: assignment.status,
      actionTaken: assignment.actionTaken,
      reportDate: assignment.reportDate ? dateToStringTransformer.transform(assignment.reportDate) : undefined,
      createdAt: dateToStringTransformer.transform(assignment.createdAt),
      updatedAt: dateToStringTransformer.transform(assignment.updatedAt),
    };
  },

  reverse(apiAssignment: ApiBillCommitteeAssignment): BillCommitteeAssignment {
    return {
      id: apiAssignment.id as BillCommitteeAssignmentId,
      billId: apiAssignment.billId as BillId,
      committeeId: apiAssignment.committeeId as CommitteeId,
      assignmentDate: dateToStringTransformer.reverse(apiAssignment.assignmentDate),
      status: apiAssignment.status as CommitteeStatus,
      actionTaken: apiAssignment.actionTaken,
      reportDate: apiAssignment.reportDate ? dateToStringTransformer.reverse(apiAssignment.reportDate) : undefined,
      createdAt: dateToStringTransformer.reverse(apiAssignment.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiAssignment.updatedAt),
    };
  },
};

// ============================================================================
// Composite Transformers (Database → Domain → API)
// ============================================================================

/**
 * Transform BillTable directly to ApiBill (bypassing domain)
 * Useful for performance-critical paths
 */
export const billDbToApi: Transformer<BillTable, ApiBill> = {
  transform(dbBill: BillTable): ApiBill {
    const domainBill = billDbToDomain.transform(dbBill);
    return billDomainToApi.transform(domainBill);
  },

  reverse(apiBill: ApiBill): BillTable {
    const domainBill = billDomainToApi.reverse(apiBill);
    return billDbToDomain.reverse(domainBill);
  },
};
