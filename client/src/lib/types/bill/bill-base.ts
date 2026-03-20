/**
 * Bill Domain Types - Client Layer
 *
 * Re-exports canonical Bill types from shared and adds client-specific extensions.
 * 
 * IMPORTANT: This file re-exports from @shared/types (canonical source).
 * Do not redefine Bill, Sponsor, or other core types here.
 *
 * @module client/lib/types/bill
 * @version 2.0.0
 */

// ============================================================================
// Re-exports from Canonical Source
// ============================================================================

import type {
  Bill,
  ExtendedBill,
  BillAction,
  BillAmendment,
  RelatedBill,
  Sponsor,
  Committee,
  BillCommitteeAssignment,
  BillEngagementMetrics,
  ConstitutionalFlag,
  BillTimelineEvent,
} from '@shared/types/domains/legislative/bill';

export type {
  Bill,
  ExtendedBill,
  BillAction,
  BillAmendment,
  RelatedBill,
  Sponsor,
  Committee,
  BillCommitteeAssignment,
  BillEngagementMetrics,
  ConstitutionalFlag,
  BillTimelineEvent,
};

import {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  Chamber,
  BillType,
  CommitteeStatus,
  BillPriority,
  type BillStatusValue,
  type UrgencyLevelValue,
  type ComplexityLevelValue,
  type ChamberValue,
  type VoteType,
  type VoteResult,
  type SponsorRole,
  type AmendmentStatus,
  type BillRelationship,
  type ConstitutionalSeverity,
  type SentimentType,
  type CommitteeType,
  type LegislativeActionType,
  type SponsorType,
} from '@shared/types';

export {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  Chamber,
  BillType,
  CommitteeStatus,
  BillPriority,
  type BillStatusValue,
  type UrgencyLevelValue,
  type ComplexityLevelValue,
  type ChamberValue,
  type VoteType,
  type VoteResult,
  type SponsorRole,
  type AmendmentStatus,
  type BillRelationship,
  type ConstitutionalSeverity,
  type SentimentType,
  type CommitteeType,
  type LegislativeActionType,
  type SponsorType,
};

// ============================================================================
// Client-Specific Type Aliases (for backward compatibility)
// ============================================================================

/** @deprecated Use Chamber from @shared/types instead */
export type ChamberType = 'House' | 'Senate' | 'Both';

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Legacy status mapping for migration from US-style to Kenyan legislative process.
 * @deprecated Use BillStatus enum directly for new implementations
 */
export const LEGACY_STATUS_MAP: Record<string, BillStatus> = {
  introduced: BillStatus.FirstReading,
  committee: BillStatus.CommitteeStage,
  floor_debate: BillStatus.SecondReading,
  passed_house: BillStatus.ThirdReading,
  passed_senate: BillStatus.ThirdReading,
  passed: BillStatus.Enacted,
  failed: BillStatus.Lost,
  signed: BillStatus.PresidentialAssent,
  vetoed: BillStatus.Withdrawn,
  override_attempt: BillStatus.ThirdReading,
} as const;

// ============================================================================
// Analysis & Impact Types (Client-Specific)
// ============================================================================
// ============================================================================
// Analysis & Impact Types (Client-Specific)
// ============================================================================

/**
 * Bill engagement metrics (client-specific view)
 * @deprecated Use BillEngagementMetrics from @shared/types instead
 */
export interface BillEngagement {
  readonly views?: number;
  readonly saves?: number;
  readonly shares?: number;
  readonly comments?: number;
  readonly votes?: number;
  readonly engagement_score?: number;
}



// ============================================================================
// Bill Analysis (Client-Specific)
// ============================================================================

export interface BillAnalysis {
  readonly id: string;
  readonly billId: number | string;
  readonly summary: string;
  readonly keyPoints: readonly string[];
  readonly impact: ImpactAssessment;
  readonly sentiment: SentimentAnalysis;
}

/**
 * Sentiment analysis results with confidence scoring
 */
export interface SentimentAnalysis {
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
  readonly overallSentiment: SentimentType;
  readonly confidence?: number;
}

/**
 * Impact assessment across multiple domains
 */
export interface ImpactAssessment {
  readonly economic?: string;
  readonly social?: string;
  readonly environmental?: string;
  readonly political?: string;
}

/**
 * Financial impact analysis with budget implications
 */
export interface FinancialImpact {
  readonly billId: number;
  readonly estimatedCost: number;
  readonly fundingSource?: string;
  readonly budgetEffect?: string;
  readonly fiscalNote?: string;
  readonly economicImpact?: string;
  readonly lastUpdated: string;
}

/**
 * Health and safety impact assessment
 */
export interface HealthSafetyImpact {
  readonly billId: number;
  readonly healthImpact?: string;
  readonly safetyImpact?: string;
  readonly publicHealthConcerns?: readonly string[];
  readonly affectedPopulation?: string;
  readonly implementation?: string;
}

/**
 * Environmental impact assessment
 */
export interface EnvironmentalImpact {
  readonly billId: number;
  readonly environmentalImpact?: string;
  readonly climateImpact?: string;
  readonly affectedEcosystems?: readonly string[];
  readonly conservation?: string;
  readonly sustainability?: string;
}

// ============================================================================
// Committee & Voting
// ============================================================================

/**
 * Committee assignment for bill review
 */
export interface CommitteeAssignment {
  readonly billId: number;
  readonly committeeId: number;
  readonly committeeName: string;
  readonly chamber: ChamberType;
  readonly status: CommitteeStatus;
  readonly assignedDate: string;
  readonly completedDate?: string;
  readonly notes?: string;
}

/**
 * Individual legislator vote record
 */
export interface VoteRecord {
  readonly id: string;
  readonly billId: string;
  readonly legislatorId: string;
  readonly legislatorName: string;
  readonly vote: VoteType;
  readonly voteDate: string;
  readonly chamber: ChamberType;
  readonly session?: string;
}

// ============================================================================
// Bill Versions & Categories
// ============================================================================

/**
 * Bill version tracking for amendments and revisions
 */
export interface BillVersion {
  readonly id: string;
  readonly billId: string;
  readonly versionNumber: number;
  readonly description: string;
  readonly url: string;
  readonly createdDate: string;
  readonly isCurrentVersion: boolean;
}

/**
 * Bill category or policy area classification
 */
export interface BillCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly billCount?: number;
}

// ============================================================================
// Query & Search Types
// ============================================================================

/**
 * Date range filter
 */
export interface DateRange {
  readonly start?: string;
  readonly end?: string;
}

/**
 * Sort configuration
 */
export type SortField = 'date' | 'relevance' | 'urgency' | 'complexity' | 'score';
export type SortOrder = 'asc' | 'desc';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
}

/**
 * Query parameters for fetching bills with filtering and sorting
 *
 * @example
 * {
 *   query: 'education reform',
 *   status: [BillStatus.COMMITTEE_STAGE, BillStatus.SECOND_READING],
 *   urgency: [UrgencyLevel.HIGH],
 *   dateRange: { start: '2025-01-01', end: '2025-12-31' },
 *   sortBy: 'urgency',
 *   sortOrder: 'desc',
 *   page: 1,
 *   limit: 20
 * }
 */
export interface BillsQueryParams extends PaginationParams {
  readonly query?: string;
  readonly status?: BillStatus[];
  readonly urgency?: UrgencyLevel[];
  readonly sponsors?: number[];
  readonly dateRange?: DateRange;
  readonly sortBy?: SortField;
  readonly sortOrder?: SortOrder;
  readonly chamber?: ChamberType;
  readonly session?: string;
  readonly category?: string;
}

/**
 * Advanced filter criteria for bill search
 */
export interface BillFilters {
  readonly status?: BillStatus[];
  readonly urgency?: UrgencyLevel[];
  readonly complexity?: ComplexityLevel[];
  readonly policyArea?: string[];
  readonly sponsors?: number[];
  readonly dateRange?: DateRange;
  readonly tags?: string[];
  readonly chamber?: ChamberType;
  readonly hasAnalysis?: boolean;
  readonly sentimentFilter?: SentimentType;
  readonly minScore?: number;
  readonly maxScore?: number;
}

/**
 * Advanced search query with comprehensive filtering
 */
export interface AdvancedBillSearch extends PaginationParams {
  readonly query: string;
  readonly filters: BillFilters;
  readonly sortBy?: SortField;
  readonly sortOrder?: SortOrder;
}

/**
 * @deprecated Use BillsQueryParams instead
 */
export type BillsSearchParams = BillsQueryParams;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid Bill object
 *
 * @param value - Value to check
 * @returns True if value is a Bill
 *
 * @example
 * if (isBill(data)) {
 *   console.log(data.billNumber);
 * }
 */
export function isBill(value: unknown): value is Bill {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    (typeof obj.id === 'number' || typeof obj.id === 'string') &&
    typeof obj.billNumber === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.summary === 'string'
  );
}

/**
 * Type guard to check if a value is a valid BillAnalysis object
 *
 * @param value - Value to check
 * @returns True if value is a BillAnalysis
 */
export function isBillAnalysis(value: unknown): value is BillAnalysis {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    (typeof obj.billId === 'number' || typeof obj.billId === 'string') &&
    typeof obj.summary === 'string' &&
    Array.isArray(obj.keyPoints) &&
    typeof obj.impact === 'object' &&
    typeof obj.sentiment === 'object'
  );
}

/**
 * Type guard to check if a value is an ExtendedBill object
 *
 * @param value - Value to check
 * @returns True if value is an ExtendedBill
 */
export function isExtendedBill(value: unknown): value is ExtendedBill {
  return isBill(value);
}

/**
 * Type guard to check if a value is a valid Sponsor object
 *
 * @param value - Value to check
 * @returns True if value is a Sponsor
 */
export function isSponsor(value: unknown): value is Sponsor {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    (typeof obj.id === 'number' || typeof obj.id === 'string') &&
    typeof obj.name === 'string' &&
    typeof obj.party === 'string' &&
    (obj.role === 'primary' || obj.role === 'co-sponsor')
  );
}

/**
 * Type guard to check if a status string is a valid BillStatus
 *
 * @param value - Value to check
 * @returns True if value is a valid BillStatus
 */
export function isBillStatus(value: unknown): value is BillStatus {
  return typeof value === 'string' && Object.values(BillStatus).includes(value as BillStatus);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract type for bill with required fields only
 */
export type MinimalBill = Pick<
  Bill,
  'id' | 'billNumber' | 'title' | 'summary' | 'status' | 'introducedDate'
>;

/**
 * Extract type for bill update operations (omit readonly fields)
 */
export type BillUpdate = Partial<Omit<Bill, 'id' | 'billNumber' | 'introducedDate'>>;

/**
 * Extract type for creating a new bill (omit system-generated fields)
 */
export type BillCreate = Omit<
  Bill,
  'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'trackingCount' | 'commentCount'
>;

/**
 * Union type of all possible bill-related entities
 */
export type BillEntity =
  | Bill
  | ExtendedBill
  | BillAnalysis
  | BillAmendment
  | BillAction
  | BillVersion;

/**
 * Union type of all impact assessment types
 */
export type ImpactAnalysis = FinancialImpact | HealthSafetyImpact | EnvironmentalImpact;