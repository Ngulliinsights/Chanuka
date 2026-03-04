/**
 * Community Feature - Shared Validation Schemas
 * Integrated with Argument Intelligence
 * 
 * Zod schemas for validating community interactions including
 * comments, discussions, votes, and AI-powered argument analysis.
 * Shared between client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas (simplified for shared use)
// ============================================================================

const IdSchema = z.number().int().positive();
const LimitSchema = z.number().int().positive().max(100).default(20);
const OffsetSchema = z.number().int().min(0).default(0);

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const CreateCommentSchema = z.object({
  bill_id: IdSchema,
  content: z.string().min(10).max(5000),
  parent_id: IdSchema.optional(),
  analyze_argument: z.boolean().default(true), // Enable AI analysis
});

export const UpdateCommentSchema = z.object({
  comment_id: IdSchema,
  content: z.string().min(10).max(5000),
  reanalyze: z.boolean().default(true), // Re-run AI analysis
});

export const DeleteCommentSchema = z.object({
  comment_id: IdSchema,
  reason: z.string().max(500).optional(),
});

export const GetCommentSchema = z.object({
  comment_id: IdSchema,
  include_analysis: z.boolean().default(true),
  include_related: z.boolean().default(true),
  include_counter_arguments: z.boolean().default(true),
});

export const GetCommentsSchema = z.object({
  bill_id: IdSchema,
  parent_id: IdSchema.optional(),
  sort_by: z.enum(['recent', 'popular', 'quality', 'controversial']).default('quality'),
  limit: LimitSchema.default(50),
  offset: OffsetSchema,
  min_quality_score: z.number().min(0).max(10).optional(),
});

// ============================================================================
// VOTING SCHEMAS
// ============================================================================

export const VoteCommentSchema = z.object({
  comment_id: IdSchema,
  vote: z.enum(['up', 'down', 'remove']),
  reason: z.string().max(200).optional(), // Helps AI learn
});

export const GetVoteStatsSchema = z.object({
  comment_id: IdSchema,
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
  comment_id: IdSchema,
  structure: ArgumentStructureSchema,
  quality_metrics: ArgumentQualityMetricsSchema,
  related_arguments: z.array(IdSchema),
  counter_arguments: z.array(IdSchema),
  suggested_improvements: z.array(z.string().max(200)),
  analyzed_at: z.date(),
});

// ============================================================================
// ARGUMENT INTELLIGENCE OPERATIONS
// ============================================================================

export const AnalyzeCommentSchema = z.object({
  comment_id: IdSchema,
  force_reanalysis: z.boolean().default(false),
});

export const FindRelatedArgumentsSchema = z.object({
  comment_id: IdSchema,
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  limit: LimitSchema.default(10),
});

export const FindCounterArgumentsSchema = z.object({
  comment_id: IdSchema,
  limit: LimitSchema.default(5),
});

export const GetArgumentClustersSchema = z.object({
  bill_id: IdSchema,
  min_cluster_size: z.number().int().min(2).default(3),
  max_clusters: z.number().int().min(1).max(20).default(10),
});

// ============================================================================
// DEBATE QUALITY SCHEMAS
// ============================================================================

export const GetDebateQualitySchema = z.object({
  bill_id: IdSchema,
  time_period: z.enum(['day', 'week', 'month', 'all']).default('all'),
});

export const DebateQualityMetricsSchema = z.object({
  bill_id: IdSchema,
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
  comment_id: IdSchema,
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
  limit: LimitSchema,
  offset: OffsetSchema,
});

// ============================================================================
// DISCUSSION THREAD SCHEMAS
// ============================================================================

export const GetDiscussionThreadSchema = z.object({
  comment_id: IdSchema, // Root comment
  max_depth: z.number().int().min(1).max(10).default(5),
  include_analysis: z.boolean().default(true),
});

export const GetDiscussionStatsSchema = z.object({
  bill_id: IdSchema,
});

// ============================================================================
// USER ENGAGEMENT SCHEMAS
// ============================================================================

export const GetUserCommentsSchema = z.object({
  user_id: IdSchema,
  limit: LimitSchema,
  offset: OffsetSchema,
  include_analysis: z.boolean().default(false),
});

export const GetUserArgumentQualitySchema = z.object({
  user_id: IdSchema,
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
