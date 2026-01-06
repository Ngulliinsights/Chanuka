import { PaginationParams } from './common';

// ============================================================================
// Enums
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
  OVERRIDE_ATTEMPT = 'override_attempt',
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert',
}

// ============================================================================
// Data Structures
// ============================================================================

export interface Sponsor {
  id: number;
  name: string;
  party: string;
  role: 'primary' | 'co-sponsor';
  district?: string;
  avatarUrl?: string;
}

export interface Bill {
  id: number;
  billNumber: string;
  title: string;
  summary: string;
  status: BillStatus;
  urgency: UrgencyLevel;
  complexity: ComplexityLevel;
  introducedDate: string;
  lastActionDate: string;
  sponsors: Sponsor[];
  tags: string[];
  policyAreas: string[];

  // Engagement Metrics
  trackingCount?: number;
  viewCount?: number;
  commentCount?: number;

  // Analysis
  constitutionalIssues?: string[];
  financialImpact?: string;
}

// ============================================================================
// API Inputs
// ============================================================================

export interface BillsQueryParams extends PaginationParams {
  query?: string;
  status?: BillStatus[];
  urgency?: UrgencyLevel[];
  sponsors?: number[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'date' | 'relevance' | 'urgency';
  sortOrder?: 'asc' | 'desc';
}

// Alias for backward compatibility
export type BillsSearchParams = BillsQueryParams;
