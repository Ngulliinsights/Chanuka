/**
 * Bill API Contract Validation Schemas
 * Zod schemas for bill endpoint request/response validation
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Bill Request Schema
 */
export const CreateBillRequestSchema = z.object({
  billNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  summary: z.string().min(1),
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']),
  chamber: z.enum(['senate', 'house', 'joint']),
  billType: z.enum(['public', 'private', 'resolution', 'amendment']),
  sponsorId: z.string().uuid('Invalid sponsor ID format'),
});

/**
 * Update Bill Request Schema
 */
export const UpdateBillRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().min(1).optional(),
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']).optional(),
  detailedSummary: z.string().optional(),
});

/**
 * Get Bill Request Schema (path params)
 */
export const GetBillParamsSchema = z.object({
  id: z.string().uuid('Invalid bill ID format'),
});

/**
 * List Bills Request Schema (query params)
 */
export const ListBillsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']).optional(),
  chamber: z.enum(['senate', 'house', 'joint']).optional(),
  sponsorId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'title', 'status']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Delete Bill Request Schema (path params)
 */
export const DeleteBillParamsSchema = z.object({
  id: z.string().uuid('Invalid bill ID format'),
});

/**
 * Get Bill Engagement Request Schema (path params)
 */
export const GetBillEngagementParamsSchema = z.object({
  id: z.string().uuid('Invalid bill ID format'),
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Bill Schema (for responses)
 */
export const BillResponseSchema = z.object({
  id: z.string().uuid(),
  billNumber: z.string(),
  title: z.string(),
  summary: z.string(),
  detailedSummary: z.string().nullable().optional(),
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']),
  chamber: z.enum(['senate', 'house', 'joint']),
  billType: z.enum(['public', 'private', 'resolution', 'amendment']),
  sponsorId: z.string().uuid(),
  introducedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Bill Engagement Metrics Schema
 */
export const BillEngagementMetricsSchema = z.object({
  billId: z.string().uuid(),
  viewCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  supportCount: z.number().int().nonnegative(),
  opposeCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
  lastUpdated: z.coerce.date(),
});

/**
 * Create Bill Response Schema
 */
export const CreateBillResponseSchema = z.object({
  bill: BillResponseSchema,
});

/**
 * Get Bill Response Schema
 */
export const GetBillResponseSchema = z.object({
  bill: BillResponseSchema,
});

/**
 * Update Bill Response Schema
 */
export const UpdateBillResponseSchema = z.object({
  bill: BillResponseSchema,
});

/**
 * List Bills Response Schema
 */
export const ListBillsResponseSchema = z.object({
  bills: z.array(BillResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

/**
 * Delete Bill Response Schema
 */
export const DeleteBillResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Get Bill Engagement Response Schema
 */
export const GetBillEngagementResponseSchema = z.object({
  engagement: BillEngagementMetricsSchema,
});
