/**
 * Bill API Contracts
 * Type-safe API contracts for bill-related endpoints
 */

import { Bill, BillEngagementMetrics } from '../../domains/legislative';
import { BillId, UserId } from '../../core/branded';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create Bill Request
 */
export interface CreateBillRequest {
  billNumber: string;
  title: string;
  summary: string;
  status: string;
  chamber: string;
  billType: string;
  sponsorId: UserId;
}

/**
 * Update Bill Request
 */
export interface UpdateBillRequest {
  title?: string;
  summary?: string;
  status?: string;
  detailedSummary?: string;
}

/**
 * Get Bill Request (path params)
 */
export interface GetBillRequest {
  id: BillId;
}

/**
 * List Bills Request (query params)
 */
export interface ListBillsRequest {
  page?: number;
  limit?: number;
  status?: string;
  chamber?: string;
  sponsorId?: UserId;
  search?: string;
  sortBy?: 'date' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Delete Bill Request (path params)
 */
export interface DeleteBillRequest {
  id: BillId;
}

/**
 * Get Bill Engagement Request (path params)
 */
export interface GetBillEngagementRequest {
  id: BillId;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Create Bill Response
 */
export interface CreateBillResponse {
  bill: Bill;
}

/**
 * Get Bill Response
 */
export interface GetBillResponse {
  bill: Bill;
}

/**
 * Update Bill Response
 */
export interface UpdateBillResponse {
  bill: Bill;
}

/**
 * List Bills Response
 */
export interface ListBillsResponse {
  bills: Bill[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Delete Bill Response
 */
export interface DeleteBillResponse {
  success: boolean;
  message: string;
}

/**
 * Get Bill Engagement Response
 */
export interface GetBillEngagementResponse {
  engagement: BillEngagementMetrics;
}
