/**
 * Bill API Contracts
 * Type-safe API contracts for bill-related endpoints
 */


import { z } from 'zod';
import { Bill, BillEngagementMetrics } from '../../domains/legislative';
import {
  CreateBillRequestSchema,
  UpdateBillRequestSchema,
  GetBillParamsSchema,
  ListBillsQuerySchema,
  DeleteBillParamsSchema,
  GetBillEngagementParamsSchema
} from './bill.schemas';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create Bill Request
 */
export type CreateBillRequest = z.infer<typeof CreateBillRequestSchema>;

/**
 * Update Bill Request
 */
export type UpdateBillRequest = z.infer<typeof UpdateBillRequestSchema>;

/**
 * Get Bill Request (path params)
 */
export type GetBillRequest = z.infer<typeof GetBillParamsSchema>;

/**
 * List Bills Request (query params)
 */
export type ListBillsRequest = z.infer<typeof ListBillsQuerySchema>;

/**
 * Delete Bill Request (path params)
 */
export type DeleteBillRequest = z.infer<typeof DeleteBillParamsSchema>;

/**
 * Get Bill Engagement Request (path params)
 */
export type GetBillEngagementRequest = z.infer<typeof GetBillEngagementParamsSchema>;

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
