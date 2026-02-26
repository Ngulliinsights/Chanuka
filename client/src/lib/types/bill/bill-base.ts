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
} from '@shared/types/domains/legislative/bill';

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
} from '@shared/types';

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
  introduced: BillStatus.FIRST_READING,
  committee: BillStatus.COMMITTEE_STAGE,
  floor_debate: BillStatus.SECOND_READING,
  passed_house: BillStatus.THIRD_READING,
  passed_senate: BillStatus.THIRD_READING,
  passed: BillStatus.ENACTED,
  failed: BillStatus.LOST,
  signed: BillStatus.PRESIDENTIAL_ASSENT,
  vetoed: BillStatus.WITHDRAWN,
  override_attempt: BillStatus.THIRD_READING,
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

/**
 * Constitutional concern flagged during bill review
 * @deprecated Use ConstitutionalFlag from @shared/types instead
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
 * Bill sponsor or co-sponsor information
 * @deprecated Use Sponsor from @shared/types instead
 */
export interface Sponsor {
  readonly id: string;
  readonly name: string;
  readonly legislatorName?: string;
  readonly party: string;
  readonly role: SponsorRole;
  readonly sponsorType?: 'primary' | 'cosponsor' | 'lead';
  readonly district?: string;
  readonly avatarUrl?: string;
  readonly state?: string;
  readonly isPrimary?: boolean;
  readonly conflictOfInterest?: boolean;
}

/**
 * Legislative action or event in the bill's lifecycle
 * @deprecated Use BillAction from @shared/types instead
 */
export interface BillAction {
  readonly id: string;
  readonly billId: string;
  readonly action: string;
  readonly date: string;
  readonly chamber?: ChamberType;
  readonly actor?: string;
  readonly result?: VoteResult;
  readonly notes?: string;
}

/**
 * Amendment proposed or applied to a bill
 * @deprecated Use BillAmendment from @shared/types instead
 */
export interface BillAmendment {
  readonly id: string;
  readonly billId: string;
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
 * Reference to a related bill
 * @deprecated Use RelatedBill from @shared/types instead
 */
export interface RelatedBill {
  readonly id: string;
  readonly billNumber: string;
  readonly title: string;
  readonly relationship: BillRelationship;
  readonly status: BillStatus;
}

/**
 * Core bill information and metadata
 * @deprecated Import Bill from @shared/types instead
 */
export interface Bill {
  readonly id: string;
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly fullText?: string;
  readonly billType?: string;
  readonly status: BillStatus;
  readonly urgency: UrgencyLevel;
  readonly complexity: ComplexityLevel;
  readonly introducedDate: string;
  readonly introductionDate?: string;
  readonly lastActionDate: string;
  readonly lastUpdated?: string;
  readonly sponsors: readonly Sponsor[];
  readonly tags: readonly string[];
  readonly policyAreas: readonly string[];
  readonly readingTime?: number;
  readonly trackingCount?: number;
  readonly viewCount?: number;
  readonly commentCount?: number;
  readonly constitutionalIssues?: readonly string[];
  readonly constitutionalFlags?: readonly ConstitutionalFlag[];
  readonly financialImpact?: string;
  readonly governmentBodies?: readonly string[];
  readonly chamber?: ChamberType;
  readonly session?: string;
  readonly url?: string;
  readonly engagement?: BillEngagement;
  readonly timeline?: readonly BillAction[];
  readonly bill_id?: string;
  readonly bill_number?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly publication_date?: string;
}

/**
 * Extended bill with comprehensive details, amendments, and relationships
 * @deprecated Import ExtendedBill from @shared/types instead
 */
export interface ExtendedBill extends Bill {
  readonly description?: string;
  readonly detailedSummary?: string;
  readonly historicalContext?: string;
  readonly amendments?: readonly BillAmendment[];
  readonly relatedBills?: readonly RelatedBill[];
}

// ============================================================================
// Bill Analysis (Client-Specific)
// ============================================================================

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