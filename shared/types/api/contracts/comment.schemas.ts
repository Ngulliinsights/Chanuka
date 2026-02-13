/**
 * Comment API Validation Schemas
 * Zod schemas for runtime validation of comment API contracts
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Comment Request Schema
 */
export const CreateCommentRequestSchema = z.object({
  billId: z.string().uuid('Bill ID must be a valid UUID'),
  content: z.string()
    .min(1, 'Comment content is required')
    .max(5000, 'Comment content must not exceed 5000 characters'),
  parentCommentId: z.string().uuid('Parent comment ID must be a valid UUID').optional(),
});

/**
 * Update Comment Request Schema
 */
export const UpdateCommentRequestSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(5000, 'Comment content must not exceed 5000 characters')
    .optional(),
  status: z.enum(['active', 'deleted', 'flagged', 'hidden']).optional(),
});

/**
 * Get Comment Request Schema (path params)
 */
export const GetCommentRequestSchema = z.object({
  id: z.string().uuid('Comment ID must be a valid UUID'),
});

/**
 * List Comments Request Schema (query params)
 */
export const ListCommentsRequestSchema = z.object({
  billId: z.string().uuid('Bill ID must be a valid UUID').optional(),
  userId: z.string().uuid('User ID must be a valid UUID').optional(),
  parentCommentId: z.string().uuid('Parent comment ID must be a valid UUID').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['date', 'votes']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Delete Comment Request Schema (path params)
 */
export const DeleteCommentRequestSchema = z.object({
  id: z.string().uuid('Comment ID must be a valid UUID'),
});

/**
 * Vote on Comment Request Schema
 */
export const VoteCommentRequestSchema = z.object({
  id: z.string().uuid('Comment ID must be a valid UUID'),
  vote: z.enum(['up', 'down'], {
    errorMap: () => ({ message: 'Vote must be either "up" or "down"' }),
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Comment Schema (for responses)
 */
const CommentSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  parentCommentId: z.string().uuid().nullable(),
  status: z.string(),
  votes: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Create Comment Response Schema
 */
export const CreateCommentResponseSchema = z.object({
  comment: CommentSchema,
});

/**
 * Get Comment Response Schema
 */
export const GetCommentResponseSchema = z.object({
  comment: CommentSchema,
});

/**
 * Update Comment Response Schema
 */
export const UpdateCommentResponseSchema = z.object({
  comment: CommentSchema,
});

/**
 * List Comments Response Schema
 */
export const ListCommentsResponseSchema = z.object({
  comments: z.array(CommentSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

/**
 * Comment Thread Schema
 */
const CommentThreadSchema = z.object({
  comment: CommentSchema,
  replies: z.array(z.lazy(() => CommentThreadSchema)),
});

/**
 * Get Comment Thread Response Schema
 */
export const GetCommentThreadResponseSchema = z.object({
  thread: CommentThreadSchema,
});

/**
 * Delete Comment Response Schema
 */
export const DeleteCommentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Vote Comment Response Schema
 */
export const VoteCommentResponseSchema = z.object({
  comment: CommentSchema,
  voteApplied: z.boolean(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type ValidatedCreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type ValidatedUpdateCommentRequest = z.infer<typeof UpdateCommentRequestSchema>;
export type ValidatedGetCommentRequest = z.infer<typeof GetCommentRequestSchema>;
export type ValidatedListCommentsRequest = z.infer<typeof ListCommentsRequestSchema>;
export type ValidatedDeleteCommentRequest = z.infer<typeof DeleteCommentRequestSchema>;
export type ValidatedVoteCommentRequest = z.infer<typeof VoteCommentRequestSchema>;
