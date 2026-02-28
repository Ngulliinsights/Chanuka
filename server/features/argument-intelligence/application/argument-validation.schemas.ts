/**
 * Argument Intelligence Feature - Validation Schemas
 * 
 * Zod schemas for validating argument analysis inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Argument Type and Quality Enums
// ============================================================================

export const ArgumentTypeSchema = z.enum([
  'supporting',
  'opposing',
  'neutral',
  'conditional',
  'comparative'
]);

export const ArgumentQualitySchema = z.enum([
  'weak',
  'moderate',
  'strong',
  'very_strong'
]);

export const LogicalFallacySchema = z.enum([
  'ad_hominem',
  'straw_man',
  'false_dilemma',
  'slippery_slope',
  'circular_reasoning',
  'appeal_to_authority',
  'appeal_to_emotion',
  'hasty_generalization',
  'red_herring',
  'false_cause',
  'none'
]);

export const EvidenceTypeSchema = z.enum([
  'statistical',
  'expert_testimony',
  'case_study',
  'historical',
  'scientific',
  'legal',
  'anecdotal'
]);

// ============================================================================
// Argument Analysis Schemas
// ============================================================================

export const AnalyzeArgumentSchema = z.object({
  text: z.string().min(20).max(10000),
  context: z.object({
    bill_id: CommonSchemas.id.optional(),
    comment_id: CommonSchemas.id.optional(),
    discussion_id: CommonSchemas.id.optional(),
  }).optional(),
  analyze_fallacies: z.boolean().default(true),
  analyze_evidence: z.boolean().default(true),
  analyze_rhetoric: z.boolean().default(true),
});

export const ComparArgumentsSchema = z.object({
  argument1_id: CommonSchemas.id,
  argument2_id: CommonSchemas.id,
  comparison_criteria: z.array(z.enum([
    'logical_strength',
    'evidence_quality',
    'rhetorical_effectiveness',
    'factual_accuracy'
  ])).min(1).max(4).optional(),
});

export const ExtractArgumentsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  comment_id: CommonSchemas.id.optional(),
  text: z.string().min(50).max(50000).optional(),
  extract_claims: z.boolean().default(true),
  extract_evidence: z.boolean().default(true),
  extract_reasoning: z.boolean().default(true),
}).refine(data => data.bill_id || data.comment_id || data.text, {
  message: "At least one of bill_id, comment_id, or text must be provided"
});

// ============================================================================
// Argument Creation and Update Schemas
// ============================================================================

export const CreateArgumentSchema = z.object({
  bill_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  type: ArgumentTypeSchema,
  claim: z.string().min(10).max(1000),
  reasoning: z.string().min(20).max(5000),
  evidence: z.array(z.object({
    type: EvidenceTypeSchema,
    source: z.string().max(500),
    description: z.string().max(1000),
    credibility_score: z.number().min(0).max(1).optional(),
    url: CommonSchemas.url.optional(),
  })).min(1).max(10),
  counterarguments: z.array(z.string().max(1000)).max(5).optional(),
});

export const UpdateArgumentSchema = z.object({
  claim: z.string().min(10).max(1000).optional(),
  reasoning: z.string().min(20).max(5000).optional(),
  evidence: z.array(z.object({
    type: EvidenceTypeSchema,
    source: z.string().max(500),
    description: z.string().max(1000),
    credibility_score: z.number().min(0).max(1).optional(),
    url: CommonSchemas.url.optional(),
  })).optional(),
  counterarguments: z.array(z.string().max(1000)).max(5).optional(),
});

// ============================================================================
// Argument Evaluation Schemas
// ============================================================================

export const EvaluateArgumentSchema = z.object({
  argument_id: CommonSchemas.id,
  evaluation_criteria: z.object({
    logical_consistency: z.boolean().default(true),
    evidence_quality: z.boolean().default(true),
    relevance: z.boolean().default(true),
    completeness: z.boolean().default(true),
  }),
});

export const RateArgumentSchema = z.object({
  argument_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  quality_rating: z.number().int().min(1).max(5),
  persuasiveness_rating: z.number().int().min(1).max(5),
  evidence_rating: z.number().int().min(1).max(5),
  comments: z.string().max(1000).optional(),
});

export const FlagFallacySchema = z.object({
  argument_id: CommonSchemas.id,
  fallacy_type: LogicalFallacySchema,
  explanation: z.string().min(20).max(1000),
  severity: z.enum(['minor', 'moderate', 'major']),
});

// ============================================================================
// Argument Mapping Schemas
// ============================================================================

export const GetArgumentMapSchema = z.object({
  bill_id: CommonSchemas.id,
  include_counterarguments: z.boolean().default(true),
  min_quality: ArgumentQualitySchema.optional(),
  max_depth: z.number().int().positive().max(5).default(3),
});

export const GetArgumentChainSchema = z.object({
  argument_id: CommonSchemas.id,
  direction: z.enum(['supporting', 'opposing', 'both']).default('both'),
  max_depth: z.number().int().positive().max(5).default(3),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetArgumentsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  type: ArgumentTypeSchema.optional(),
  min_quality: ArgumentQualitySchema.optional(),
  has_fallacies: z.boolean().optional(),
  sort_by: z.enum(['quality', 'date', 'rating', 'engagement']).default('quality'),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const SearchArgumentsSchema = z.object({
  query: CommonSchemas.searchQuery,
  bill_id: CommonSchemas.id.optional(),
  type: ArgumentTypeSchema.optional(),
  evidence_type: EvidenceTypeSchema.optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetArgumentStatsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['type', 'quality', 'fallacy', 'evidence_type']).optional(),
});

export const GetDebateBalanceSchema = z.object({
  bill_id: CommonSchemas.id,
  include_quality_weighting: z.boolean().default(true),
});

export const GetArgumentTrendsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  timeframe: z.enum(['day', 'week', 'month', 'quarter']).default('week'),
  metric: z.enum(['count', 'quality', 'engagement', 'fallacy_rate']).default('count'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyzeArgumentInput = z.infer<typeof AnalyzeArgumentSchema>;
export type CompareArgumentsInput = z.infer<typeof ComparArgumentsSchema>;
export type ExtractArgumentsInput = z.infer<typeof ExtractArgumentsSchema>;
export type CreateArgumentInput = z.infer<typeof CreateArgumentSchema>;
export type UpdateArgumentInput = z.infer<typeof UpdateArgumentSchema>;
export type EvaluateArgumentInput = z.infer<typeof EvaluateArgumentSchema>;
export type RateArgumentInput = z.infer<typeof RateArgumentSchema>;
export type FlagFallacyInput = z.infer<typeof FlagFallacySchema>;
export type GetArgumentMapInput = z.infer<typeof GetArgumentMapSchema>;
export type GetArgumentChainInput = z.infer<typeof GetArgumentChainSchema>;
export type GetArgumentsInput = z.infer<typeof GetArgumentsSchema>;
export type SearchArgumentsInput = z.infer<typeof SearchArgumentsSchema>;
export type GetArgumentStatsInput = z.infer<typeof GetArgumentStatsSchema>;
export type GetDebateBalanceInput = z.infer<typeof GetDebateBalanceSchema>;
export type GetArgumentTrendsInput = z.infer<typeof GetArgumentTrendsSchema>;
export type ArgumentType = z.infer<typeof ArgumentTypeSchema>;
export type ArgumentQuality = z.infer<typeof ArgumentQualitySchema>;
export type LogicalFallacy = z.infer<typeof LogicalFallacySchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
