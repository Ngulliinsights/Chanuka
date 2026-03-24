/**
 * Community Feature - Validation Schemas
 * Integrated with Argument Intelligence
 * 
 * Zod schemas for validating community interactions including
 * comments, discussions, votes, and AI-powered argument analysis.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const CreateCommentSchema = z.object({
  bill_id: CommonSchemas.id,
  content: z.string().min(10).max(5000),
  parent_id: CommonSchemas.id.optional(),
  analyze_argument: z.boolean().default(true), // Enable AI analysis
});

export const UpdateCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  content: z.string().min(10).max(5000),
  reanalyze: z.boolean().default(true), // Re-run AI analysis
});

export const DeleteCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  reason: z.string().max(500).optional(),
});

export const GetCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  include_analysis: z.boolean().default(true),
  include_related: z.boolean().default(true),
  include_counter_arguments: z.boolean().default(true),
});

export const GetCommentsSchema = z.object({
  bill_id: CommonSchemas.id,
  parent_id: CommonSchemas.id.optional(),
  sort_by: z.enum(['recent', 'popular', 'quality', 'controversial']).default('quality'),
  limit: CommonSchemas.limit,
  offset: CommonSchemas.offset,
  min_quality_score: z.number().min(0).max(10).optional(),
});

// ============================================================================
// VOTING SCHEMAS
// ============================================================================

export const VoteCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  vote: z.enum(['up', 'down', 'remove']),
  reason: z.string().max(200).optional(), // Helps AI learn
});

export const GetVoteStatsSchema = z.object({
  comment_id: CommonSchemas.id,
});

// ============================================================================
// ARGUMENT ANALYSIS SCHEMAS
// ============================================================================

export const ArgumentClaimSchema = z.object({
  text: z.string().min(5).max(500),
  type: z.enum(['factual', 'value', 'policy']),
  confidence: z.number().min(0).max(1),
});

export const ArgumentEvidenceSchema = z.object({
  text: z.string().min(10).max(1000),
  source: z.string().max(500).optional(),
  source_type: z.enum(['citation', 'data', 'expert', 'anecdote', 'none']),
  strength: z.number().min(0).max(1),
  verified: z.boolean().default(false),
});

export const ArgumentFallacySchema = z.object({
  type: z.enum([
    'ad_hominem',
    'straw_man',
    'false_dichotomy',
    'slippery_slope',
    'appeal_to_authority',
    'appeal_to_emotion',
    'hasty_generalization',
    'circular_reasoning',
    'red_herring',
    'false_cause',
    'none'
  ]),
  description: z.string().max(500),
  severity: z.enum(['low', 'medium', 'high']),
  location: z.string().max(200), // Where in the comment
});

export const ArgumentStructureSchema = z.object({
  claims: z.array(ArgumentClaimSchema),
  evidence: z.array(ArgumentEvidenceSchema),
  fallacies: z.array(ArgumentFallacySchema),
  reasoning_type: z.enum(['deductive', 'inductive', 'abductive', 'analogical', 'unclear']),
  coherence_score: z.number().min(0).max(1),
});

export const ArgumentQualityMetricsSchema = z.object({
  overall_score: z.number().min(0).max(10),
  evidence_strength: z.number().min(0).max(1),
  logical_validity: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  fallacy_penalty: z.number().min(0).max(1),
});

export const ArgumentAnalysisSchema = z.object({
  comment_id: CommonSchemas.id,
  structure: ArgumentStructureSchema,
  quality_metrics: ArgumentQualityMetricsSchema,
  related_arguments: z.array(CommonSchemas.id),
  counter_arguments: z.array(CommonSchemas.id),
  suggested_improvements: z.array(z.string().max(200)),
  analyzed_at: z.date(),
});

// ============================================================================
// ARGUMENT INTELLIGENCE OPERATIONS
// ============================================================================

export const AnalyzeCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  force_reanalysis: z.boolean().default(false),
});

export const FindRelatedArgumentsSchema = z.object({
  comment_id: CommonSchemas.id,
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  limit: CommonSchemas.limit,
});

export const FindCounterArgumentsSchema = z.object({
  comment_id: CommonSchemas.id,
  limit: CommonSchemas.limit,
});

export const GetArgumentClustersSchema = z.object({
  bill_id: CommonSchemas.id,
  min_cluster_size: z.number().int().min(2).default(3),
  max_clusters: z.number().int().min(1).max(20).default(10),
});

// ============================================================================
// DEBATE QUALITY SCHEMAS
// ============================================================================

export const GetDebateQualitySchema = z.object({
  bill_id: CommonSchemas.id,
  time_period: z.enum(['day', 'week', 'month', 'all']).default('all'),
});

export const DebateQualityMetricsSchema = z.object({
  bill_id: CommonSchemas.id,
  total_comments: z.number().int().min(0),
  average_quality_score: z.number().min(0).max(10),
  evidence_rate: z.number().min(0).max(1), // % with evidence
  fallacy_rate: z.number().min(0).max(1), // % with fallacies
  engagement_rate: z.number().min(0).max(1), // replies/comments
  quality_distribution: z.object({
    high: z.number().int().min(0), // 8-10
    medium: z.number().int().min(0), // 5-7
    low: z.number().int().min(0), // 0-4
  }),
  top_fallacies: z.array(z.object({
    type: z.string(),
    count: z.number().int().min(0),
  })),
  calculated_at: z.date(),
});

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

export const FlagCommentSchema = z.object({
  comment_id: CommonSchemas.id,
  reason: z.enum([
    'spam',
    'harassment',
    'misinformation',
    'off_topic',
    'inappropriate',
    'other'
  ]),
  description: z.string().max(500).optional(),
});

export const GetFlaggedCommentsSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved', 'all']).default('pending'),
  limit: CommonSchemas.limit,
  offset: CommonSchemas.offset,
});

// ============================================================================
// DISCUSSION THREAD SCHEMAS
// ============================================================================

export const GetDiscussionThreadSchema = z.object({
  comment_id: CommonSchemas.id, // Root comment
  max_depth: z.number().int().min(1).max(10).default(5),
  include_analysis: z.boolean().default(true),
});

export const GetDiscussionStatsSchema = z.object({
  bill_id: CommonSchemas.id,
});

// ============================================================================
// USER ENGAGEMENT SCHEMAS
// ============================================================================

export const GetUserCommentsSchema = z.object({
  user_id: CommonSchemas.id,
  limit: CommonSchemas.limit,
  offset: CommonSchemas.offset,
  include_analysis: z.boolean().default(false),
});

export const GetUserArgumentQualitySchema = z.object({
  user_id: CommonSchemas.id,
  time_period: z.enum(['week', 'month', 'year', 'all']).default('all'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentSchema>;
export type GetCommentInput = z.infer<typeof GetCommentSchema>;
export type GetCommentsInput = z.infer<typeof GetCommentsSchema>;
export type VoteCommentInput = z.infer<typeof VoteCommentSchema>;
export type GetVoteStatsInput = z.infer<typeof GetVoteStatsSchema>;
export type AnalyzeCommentInput = z.infer<typeof AnalyzeCommentSchema>;
export type FindRelatedArgumentsInput = z.infer<typeof FindRelatedArgumentsSchema>;
export type FindCounterArgumentsInput = z.infer<typeof FindCounterArgumentsSchema>;
export type GetArgumentClustersInput = z.infer<typeof GetArgumentClustersSchema>;
export type GetDebateQualityInput = z.infer<typeof GetDebateQualitySchema>;
export type FlagCommentInput = z.infer<typeof FlagCommentSchema>;
export type GetFlaggedCommentsInput = z.infer<typeof GetFlaggedCommentsSchema>;
export type GetDiscussionThreadInput = z.infer<typeof GetDiscussionThreadSchema>;
export type GetDiscussionStatsInput = z.infer<typeof GetDiscussionStatsSchema>;
export type GetUserCommentsInput = z.infer<typeof GetUserCommentsSchema>;
export type GetUserArgumentQualityInput = z.infer<typeof GetUserArgumentQualitySchema>;

export type ArgumentClaim = z.infer<typeof ArgumentClaimSchema>;
export type ArgumentEvidence = z.infer<typeof ArgumentEvidenceSchema>;
export type ArgumentFallacy = z.infer<typeof ArgumentFallacySchema>;
export type ArgumentStructure = z.infer<typeof ArgumentStructureSchema>;
export type ArgumentQualityMetrics = z.infer<typeof ArgumentQualityMetricsSchema>;
export type ArgumentAnalysis = z.infer<typeof ArgumentAnalysisSchema>;
export type DebateQualityMetrics = z.infer<typeof DebateQualityMetricsSchema>;
