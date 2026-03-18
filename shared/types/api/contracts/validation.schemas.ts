/**
 * API Validation Schemas
 * Zod schemas for runtime validation of API contracts across all features
 * Uses validation primitives from @shared/validation for consistency
 */

// eslint-disable-next-line no-restricted-imports
import { z } from 'zod';

import { uuidSchema } from '../../../validation/schemas/common';

// ============================================================================
// BASE SCHEMAS - Reusable components
// ============================================================================

export const UuidSchema = uuidSchema;

export const TimestampSchema = z.string().datetime();

export const BaseEntitySchema = z.object({
  id: UuidSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const PaginationSchema = z.object({
  total: z.number().int().positive(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
  totalPages: z.number().int().positive(),
});

export const StandardErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
  details: z.unknown().optional(),
  statusCode: z.number().optional(),
});

export const StandardResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: StandardErrorSchema.optional(),
  message: z.string().optional(),
  timestamp: TimestampSchema,
  metadata: z.unknown().optional(),
});

// ============================================================================
// FEATURE FLAGS SCHEMAS
// ============================================================================

export const FeatureFlagSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().max(1024).optional(),
  enabled: z.boolean(),
  type: z.enum(['BOOLEAN', 'PERCENTAGE', 'TARGETING']),
  rollout: z.number().min(0).max(100).default(0),
  owner: z.string().email().optional(),
  targetingRules: z.array(z.object({
    id: UuidSchema,
    name: z.string(),
    condition: z.string(),
    percentage: z.number().min(0).max(100),
  })),
});

export const CreateFlagRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1024).optional(),
  enabled: z.boolean().default(false),
  type: z.enum(['BOOLEAN', 'PERCENTAGE', 'TARGETING']).default('BOOLEAN'),
  rollout: z.number().min(0).max(100).optional(),
  owner: z.string().email().optional(),
  targetingRules: z.array(z.object({
    name: z.string(),
    condition: z.string(),
    percentage: z.number().min(0).max(100),
  })).optional(),
});

export const UpdateFlagRequestSchema = z.object({
  description: z.string().max(1024).optional(),
  enabled: z.boolean().optional(),
  type: z.enum(['BOOLEAN', 'PERCENTAGE', 'TARGETING']).optional(),
  rollout: z.number().min(0).max(100).optional(),
  owner: z.string().email().optional(),
});

export const ToggleFlagRequestSchema = z.object({
  enabled: z.boolean(),
});

export const UpdateRolloutRequestSchema = z.object({
  percentage: z.number().min(0).max(100),
});

// ============================================================================
// BILLS SCHEMAS
// ============================================================================

export const BillStatusEnum = z.enum(['introduced', 'committee', 'floor', 'passed', 'signed', 'vetoed', 'failed']);

export const BillSchema = BaseEntitySchema.extend({
  billNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000),
  description: z.string().max(5000).optional(),
  status: BillStatusEnum,
  chamber: z.enum(['house', 'senate']),
  billType: z.enum(['bill', 'resolution', 'concurrent']),
  sponsorId: UuidSchema,
  tags: z.array(z.string()),
  trackedByCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
});

export const SearchBillsRequestSchema = z.object({
  query: z.string().min(1).max(500).optional(),
  status: BillStatusEnum.optional(),
  chamber: z.enum(['house', 'senate']).optional(),
  sponsor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const CreateBillRequestSchema = z.object({
  billNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000),
  description: z.string().max(5000).optional(),
  status: BillStatusEnum.default('introduced'),
  chamber: z.enum(['house', 'senate']),
  billType: z.enum(['bill', 'resolution', 'concurrent']),
  sponsorId: UuidSchema,
  tags: z.array(z.string()).optional(),
});

export const UpdateBillRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  summary: z.string().max(2000).optional(),
  description: z.string().max(5000).optional(),
  status: BillStatusEnum.optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// MONITORING SCHEMAS
// ============================================================================

export const HealthStatusEnum = z.enum(['healthy', 'degraded', 'down']);

export const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  timestamp: TimestampSchema,
  dimensions: z.record(z.string()).optional(),
});

export const AlertSeverityEnum = z.enum(['info', 'warning', 'critical']);

export const AlertSchema = z.object({
  id: UuidSchema,
  severity: AlertSeverityEnum,
  message: z.string(),
  source: z.string(),
  timestamp: TimestampSchema,
  resolved: z.boolean(),
  resolvedAt: TimestampSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const HealthCheckResponseSchema = z.object({
  status: HealthStatusEnum,
  uptime: z.number(),
  version: z.string(),
  timestamp: TimestampSchema,
  components: z.record(z.object({
    status: HealthStatusEnum,
    latency: z.number().optional(),
  })),
});

// ============================================================================
// COMMUNITY SCHEMAS
// ============================================================================

export const CommentSchema = BaseEntitySchema.extend({
  content: z.string().min(1).max(5000),
  authorId: UuidSchema,
  billId: UuidSchema.optional(),
  threadId: UuidSchema.optional(),
  parentCommentId: UuidSchema.optional(),
  upvotes: z.number().int().nonnegative(),
  downvotes: z.number().int().nonnegative(),
});

export const CreateCommentRequestSchema = z.object({
  content: z.string().min(1).max(5000),
  billId: UuidSchema.optional(),
  threadId: UuidSchema.optional(),
  parentCommentId: UuidSchema.optional(),
});

export const DiscussionThreadSchema = BaseEntitySchema.extend({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  authorId: UuidSchema,
  billId: UuidSchema.optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  commentCount: z.number().int().nonnegative(),
  upvotes: z.number().int().nonnegative(),
  downvotes: z.number().int().nonnegative(),
  isPinned: z.boolean(),
  isClosed: z.boolean(),
});

export const VoteSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  targetId: UuidSchema,
  targetType: z.enum(['comment', 'discussion', 'bill']),
  type: z.enum(['up', 'down']),
  createdAt: TimestampSchema,
});

export const CreateVoteRequestSchema = z.object({
  targetId: UuidSchema,
  targetType: z.enum(['comment', 'discussion', 'bill']),
  type: z.enum(['up', 'down']),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates data against a schema
 * Throws if validation fails
 */
export function validateSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(data);
}

/**
 * Safely validates data against a schema
 * Returns result object instead of throwing
 */
export function safeValidateSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Creates a standard error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
) {
  return {
    success: false,
    error: {
      code: code || 'INTERNAL_ERROR',
      message,
      statusCode,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a standard success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
) {
  return {
    success: true,
    data,
    message: message || 'Success',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      totalPages: Math.ceil(total / pageSize),
    },
    timestamp: new Date().toISOString(),
  };
}
