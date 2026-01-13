/**
 * Bill Domain Types - Base
 *
 * Core bill-related types for legislation, sponsorship, status tracking,
 * and structural bill information.
 *
 * @module shared/types/bill
 */

import { BaseEntity } from '../../../../shared/types/core/base';
import { BillId } from '../../../../shared/types/core/common';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Status of a bill in the legislative process
 */
export enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  FLOOR_DEBATE = 'floor_debate',
  PASSED_HOUSE = 'passed_house',
  PASSED_SENATE = 'passed_senate',
  PASSED = 'passed',
  FAILED = 'failed',
  SIGNED = 'signed',
  VETOED = 'vetoed',
  OVERRIDE_ATTEMPT = 'override_attempt',
}

export type BillStatusType = keyof typeof BillStatus;

/**
 * Urgency level for a bill
 */
export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type UrgencyLevelType = keyof typeof UrgencyLevel;

/**
 * Complexity of a bill
 */
export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert',
}

export type ComplexityLevelType = keyof typeof ComplexityLevel;

// ============================================================================
// Bill Core Types
// ============================================================================

/**
 * Basic bill information
 *
 * @example
 * const bill: Bill = {
 *   id: 12345,
 *   billNumber: 'HB-2451',
 *   title: 'An Act Relating to Education Reform',
 *   summary: 'This bill proposes amendments to...',
 *   status: BillStatus.COMMITTEE,
 *   urgency: UrgencyLevel.MEDIUM,
 *   complexity: ComplexityLevel.HIGH,
 *   introducedDate: '2025-01-15T00:00:00Z',
 *   lastActionDate: '2025-01-20T00:00:00Z',
 *   sponsors: [...],
 *   tags: ['education', 'reform'],
 *   policyAreas: ['K-12 Education', 'Higher Education']
 * };
 */
export interface Bill {
  readonly id: number;
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly status: BillStatus;
  readonly urgency: UrgencyLevel;
  readonly complexity: ComplexityLevel;
  readonly introducedDate: string;
  readonly lastActionDate: string;
  readonly sponsors: readonly Sponsor[];
  readonly tags: readonly string[];
  readonly policyAreas: readonly string[];
  readonly trackingCount?: number;
  readonly viewCount?: number;
  readonly commentCount?: number;
  readonly constitutionalIssues?: readonly string[];
  readonly financialImpact?: string;
  readonly governmentBodies?: readonly string[];
  readonly chamber?: 'House' | 'Senate' | 'Both';
  readonly session?: string;
  readonly fullText?: string;
  readonly url?: string;
}

/**
 * Bill sponsor or co-sponsor information
 */
export interface Sponsor {
  readonly id: number;
  readonly name: string;
  readonly party: string;
  readonly role: 'primary' | 'co-sponsor';
  readonly district?: string;
  readonly avatarUrl?: string;
  readonly state?: string;
  readonly isPrimary?: boolean;
}

/**
 * Extended bill information with all details
 */
export interface ExtendedBill extends Bill {
  readonly description?: string;
  readonly detailedSummary?: string;
  readonly historicalContext?: string;
  readonly amendments?: readonly BillAmendment[];
  readonly relatedBills?: readonly RelatedBill[];
}

/**
 * Bill amendment record
 */
export interface BillAmendment {
  readonly id: number;
  readonly billId: number;
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly proposedBy: string;
  readonly status: 'proposed' | 'accepted' | 'rejected' | 'withdrawn';
  readonly dateProposed: string;
  readonly dateResolved?: string;
  readonly impact?: string;
}

/**
 * Related bill reference
 */
export interface RelatedBill {
  readonly id: number;
  readonly billNumber: string;
  readonly title: string;
  readonly relationship: 'companion' | 'substitute' | 'similar' | 'conflicts';
  readonly status: BillStatus;
}

// ============================================================================
// Bill Analysis Types
// ============================================================================

/**
 * Comprehensive analysis of a bill
 *
 * @example
 * const analysis: BillAnalysis = {
 *   id: 456,
 *   billId: 12345,
 *   summary: 'This bill seeks to reform education...',
 *   impact: {
 *     economic: 'Estimated cost of $2.5M annually',
 *     social: 'Affects 150,000 students',
 *     environmental: 'No direct impact'
 *   },
 *   keyPoints: ['Increases teacher salaries', 'Expands STEM programs'],
 *   score: 7.5
 * };
 */
export interface BillAnalysis extends BaseEntity {
  readonly billId: BillId;
  readonly summary: string;
  readonly keyPoints: readonly string[];
  readonly impact: {
    readonly economic?: string;
    readonly social?: string;
    readonly environmental?: string;
    readonly political?: string;
  };
  readonly stakeholders: readonly string[];
  readonly sentiment: SentimentAnalysis;
  readonly score: number;
  readonly analyzedBy?: string;
  readonly confidence?: number;
}

/**
 * Sentiment analysis results
 */
export interface SentimentAnalysis {
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
  readonly overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  readonly confidence?: number;
}

/**
 * Financial impact analysis
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
 * Health and safety impact
 */
export interface HealthSafetyImpact {
  readonly billId: number;
  readonly healthImpact?: string;
  readonly safetyImpact?: string;
  readonly publcHealthConcerns?: readonly string[];
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
// Query and Filter Types
// ============================================================================

/**
 * Query parameters for fetching bills
 */
export interface BillsQueryParams {
  readonly query?: string;
  readonly status?: BillStatus[];
  readonly urgency?: UrgencyLevel[];
  readonly sponsors?: number[];
  readonly dateRange?: {
    readonly start?: string;
    readonly end?: string;
  };
  readonly sortBy?: 'date' | 'relevance' | 'urgency' | 'complexity';
  readonly sortOrder?: 'asc' | 'desc';
  readonly page?: number;
  readonly limit?: number;
  readonly chamber?: 'House' | 'Senate' | 'Both';
  readonly session?: string;
  readonly category?: string;
}

/**
 * Alias for backward compatibility
 */
export type BillsSearchParams = BillsQueryParams;

/**
 * Bill filters for advanced search
 */
export interface BillFilters {
  readonly status?: BillStatus[];
  readonly urgency?: UrgencyLevel[];
  readonly complexity?: ComplexityLevel[];
  readonly policyArea?: string[];
  readonly sponsors?: number[];
  readonly dateRange?: {
    readonly start?: string;
    readonly end?: string;
  };
  readonly tags?: string[];
  readonly chamber?: 'House' | 'Senate' | 'Both';
  readonly hasAnalysis?: boolean;
  readonly sentimentFilter?: 'positive' | 'neutral' | 'negative' | 'mixed';
  readonly minScore?: number;
  readonly maxScore?: number;
}

/**
 * Advanced search query
 */
export interface AdvancedBillSearch {
  readonly query: string;
  readonly filters: BillFilters;
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
}

// ============================================================================
// Related Types
// ============================================================================

/**
 * Bill category or policy area
 */
export interface BillCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly billCount?: number;
}

/**
 * Bill action/event in the legislative process
 */
export interface BillAction {
  readonly id: number;
  readonly billId: number;
  readonly action: string;
  readonly date: string;
  readonly chamber?: 'House' | 'Senate';
  readonly actor?: string;
  readonly result?: 'passed' | 'failed' | 'pending';
  readonly notes?: string;
}

/**
 * Bill version/edition
 */
export interface BillVersion {
  readonly id: number;
  readonly billId: number;
  readonly versionNumber: number;
  readonly description: string;
  readonly url: string;
  readonly createdDate: string;
  readonly isCurrentVersion: boolean;
}

/**
 * Committee assignment
 */
export interface CommitteeAssignment {
  readonly billId: number;
  readonly committeeId: number;
  readonly committeeName: string;
  readonly chamber: 'House' | 'Senate';
  readonly status: 'assigned' | 'reviewed' | 'reported' | 'completed';
  readonly assignedDate: string;
  readonly completedDate?: string;
  readonly notes?: string;
}

/**
 * Vote record on a bill
 */
export interface VoteRecord {
  readonly id: number;
  readonly billId: number;
  readonly legislatorId: number;
  readonly legislatorName: string;
  readonly vote: 'yea' | 'nay' | 'abstain' | 'present';
  readonly voteDate: string;
  readonly chamber: 'House' | 'Senate';
  readonly session?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if value is a Bill
 */
export function isBill(value: unknown): value is Bill {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.billNumber === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string'
  );
}

/**
 * Type guard to check if value is BillAnalysis
 */
export function isBillAnalysis(value: unknown): value is BillAnalysis {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.billId === 'number' &&
    typeof obj.summary === 'string'
  );
}

/**
 * Type guard to check if value is ExtendedBill
 */
export function isExtendedBill(value: unknown): value is ExtendedBill {
  return isBill(value);
}
