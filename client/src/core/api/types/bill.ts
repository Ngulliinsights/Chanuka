/**
 * Bill Types
 * 
 * Type definitions for bill-related domain models
 */

import type { PaginationParams } from './common';
import type { Sponsor } from './sponsor';

// ============================================================================
// Bill Status and Urgency
// ============================================================================

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
  OVERRIDE_ATTEMPT = 'override_attempt'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert'
}

// ============================================================================
// Bill Models
// ============================================================================

export interface Amendment {
  readonly id: number;
  readonly billId: number;
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly proposedDate: string;
  readonly status: AmendmentStatus;
  readonly sponsor: Sponsor;
}

export type AmendmentStatus = 'proposed' | 'debated' | 'passed' | 'rejected' | 'withdrawn';

export interface ConstitutionalFlag {
  readonly id: number;
  readonly type: string;
  readonly description: string;
  readonly severity: Severity;
  readonly article?: string;
  readonly clause?: string;
  readonly analysis?: string;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Bill Subscription Types
// ============================================================================

export type BillSubscriptionType =
  | 'status_change'
  | 'new_comment'
  | 'amendment'
  | 'voting_scheduled'
  | 'sponsor_change';

export interface BillUpdate {
  readonly type: BillSubscriptionType;
  readonly data: BillUpdateData;
  readonly timestamp: string;
}

export interface BillUpdateData {
  readonly billId: number;
  readonly oldStatus?: BillStatus;
  readonly newStatus?: BillStatus;
  readonly title?: string;
  readonly viewCount?: number;
  readonly saveCount?: number;
  readonly commentCount?: number;
  readonly shareCount?: number;
  readonly changes?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Query Parameters and Search
// ============================================================================

export interface DateRange {
  readonly start?: string;
  readonly end?: string;
}

export type BillSortField = 'date' | 'title' | 'urgency' | 'engagement' | 'relevance';

export interface BillsQueryParams extends PaginationParams {
  readonly status?: ReadonlyArray<BillStatus>;
  readonly urgency?: ReadonlyArray<UrgencyLevel>;
  readonly policyAreas?: ReadonlyArray<string>;
  readonly sponsors?: ReadonlyArray<number>;
  readonly dateRange?: DateRange;
  readonly sortBy?: BillSortField;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface BillsSearchParams extends BillsQueryParams {
  readonly query?: string;
  readonly constitutionalFlags?: boolean;
  readonly controversyLevels?: ReadonlyArray<string>;
  readonly minComplexity?: ComplexityLevel;
  readonly maxComplexity?: ComplexityLevel;
}
