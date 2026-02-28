/**
 * Community Feature - Validation Schemas
 * 
 * Zod schemas for validating community-related inputs (comments, posts, discussions).
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Comment and Post Type Enums
// ============================================================================

export const CommentTypeSchema = z.enum([
  'comment',
  'reply',
  'discussion',
  'question',
  'answer'
]);

export const ModerationStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'flagged',
  'removed'
]);

export const FlagReasonSchema = z.enum([
  'spam',
  'harassment',
  'misinformation',
  'off_topic',
  'inappropriate',
  'other'
]);

// ============================================================================
// Comment Creation and Update Schemas
// ============================================================================

export const CreateCommentSchema = z.object({
  bill_id: CommonSchemas.id,
  content: z.string().min(1).max(5000).trim(),
  parent_id: CommonSchemas.id.optional(),
  comment_type: CommentTypeSchema.default('comment'),
  is_anonymous: z.boolean().default(false),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

export const DeleteCommentSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============================================================================
// Comment Interaction Schemas
// ============================================================================

export const LikeCommentSchema = z.object({
  comment_id: CommonSchemas.id,
});

export const UnlikeCommentSchema = z.object({
  comment_id: CommonSchemas.id,
});

export const EndorseCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  endorsement_type: z.enum(['helpful', 'insightful', 'well_sourced', 'constructive']).optional(),
});

export const FlagCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  reason: FlagReasonSchema,
  details: z.string().max(1000).optional(),
});

// ============================================================================
// Moderation Schemas
// ============================================================================

export const ModerateCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  status: ModerationStatusSchema,
  moderator_notes: z.string().max(1000).optional(),
});

export const HighlightCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  highlight_reason: z.string().max(500).optional(),
});

export const UnhighlightCommentSchema = z.object({
  comment_id: CommonSchemas.id,
});

// ============================================================================
// Discussion Thread Schemas
// ============================================================================

export const CreateDiscussionSchema = z.object({
  bill_id: CommonSchemas.id,
  title: CommonSchemas.title,
  content: z.string().min(10).max(10000).trim(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  is_pinned: z.boolean().default(false),
});

export const UpdateDiscussionSchema = z.object({
  title: CommonSchemas.title.optional(),
  content: z.string().min(10).max(10000).trim().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  is_pinned: z.boolean().optional(),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetCommentsSchema = z.object({
  bill_id: CommonSchemas.id,
  parent_id: CommonSchemas.id.optional(),
  comment_type: CommentTypeSchema.optional(),
  highlighted: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sortBy: z.enum(['recent', 'popular', 'endorsements', 'controversial']).default('recent'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetRepliesSchema = z.object({
  comment_id: CommonSchemas.id,
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const SearchCommentsSchema = z.object({
  query: CommonSchemas.searchQuery,
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  comment_type: CommentTypeSchema.optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetCommentStatsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const GetTrendingDiscussionsSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week'),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentSchema>;
export type LikeCommentInput = z.infer<typeof LikeCommentSchema>;
export type UnlikeCommentInput = z.infer<typeof UnlikeCommentSchema>;
export type EndorseCommentInput = z.infer<typeof EndorseCommentSchema>;
export type FlagCommentInput = z.infer<typeof FlagCommentSchema>;
export type ModerateCommentInput = z.infer<typeof ModerateCommentSchema>;
export type HighlightCommentInput = z.infer<typeof HighlightCommentSchema>;
export type UnhighlightCommentInput = z.infer<typeof UnhighlightCommentSchema>;
export type CreateDiscussionInput = z.infer<typeof CreateDiscussionSchema>;
export type UpdateDiscussionInput = z.infer<typeof UpdateDiscussionSchema>;
export type GetCommentsInput = z.infer<typeof GetCommentsSchema>;
export type GetRepliesInput = z.infer<typeof GetRepliesSchema>;
export type SearchCommentsInput = z.infer<typeof SearchCommentsSchema>;
export type GetCommentStatsInput = z.infer<typeof GetCommentStatsSchema>;
export type GetTrendingDiscussionsInput = z.infer<typeof GetTrendingDiscussionsSchema>;
export type CommentType = z.infer<typeof CommentTypeSchema>;
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;
export type FlagReason = z.infer<typeof FlagReasonSchema>;
