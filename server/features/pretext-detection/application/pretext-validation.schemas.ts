/**
 * Pretext Detection Feature - Validation Schemas
 * 
 * Zod schemas for validating pretext detection inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Detection Type and Confidence Enums
// ============================================================================

export const PretextTypeSchema = z.enum([
  'misleading_title',
  'hidden_provision',
  'ambiguous_language',
  'contradictory_clauses',
  'scope_creep',
  'sunset_clause_manipulation',
  'definition_manipulation',
  'procedural_manipulation'
]);

export const ConfidenceLevelSchema = z.enum([
  'very_low',
  'low',
  'medium',
  'high',
  'very_high'
]);

export const SeverityLevelSchema = z.enum([
  'informational',
  'low',
  'medium',
  'high',
  'critical'
]);

// ============================================================================
// Detection Request Schemas
// ============================================================================

export const AnalyzeBillSchema = z.object({
  bill_id: CommonSchemas.id,
  analysis_types: z.array(PretextTypeSchema).min(1).max(8).optional(),
  include_suggestions: z.boolean().default(true),
  confidence_threshold: ConfidenceLevelSchema.default('medium'),
});

export const AnalyzeTextSchema = z.object({
  text: z.string().min(50).max(50000),
  context: z.object({
    bill_id: CommonSchemas.id.optional(),
    section: z.string().max(200).optional(),
    clause_number: z.string().max(50).optional(),
  }).optional(),
  analysis_types: z.array(PretextTypeSchema).optional(),
  include_suggestions: z.boolean().default(true),
});

export const CompareSectionsSchema = z.object({
  bill_id: CommonSchemas.id,
  section1: z.string().max(200),
  section2: z.string().max(200),
  detect_contradictions: z.boolean().default(true),
  detect_scope_changes: z.boolean().default(true),
});

// ============================================================================
// Detection Result Schemas
// ============================================================================

export const ReportDetectionSchema = z.object({
  bill_id: CommonSchemas.id,
  pretext_type: PretextTypeSchema,
  location: z.object({
    section: z.string().max(200),
    clause: z.string().max(50).optional(),
    line_start: z.number().int().positive().optional(),
    line_end: z.number().int().positive().optional(),
  }),
  description: z.string().min(20).max(2000),
  evidence: z.string().min(10).max(5000),
  severity: SeverityLevelSchema,
  confidence: ConfidenceLevelSchema,
  suggested_revision: z.string().max(5000).optional(),
});

export const ValidateDetectionSchema = z.object({
  detection_id: CommonSchemas.id,
  is_valid: z.boolean(),
  feedback: z.string().max(1000).optional(),
  corrected_type: PretextTypeSchema.optional(),
  corrected_severity: SeverityLevelSchema.optional(),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetDetectionsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  pretext_type: PretextTypeSchema.optional(),
  severity: SeverityLevelSchema.optional(),
  confidence: ConfidenceLevelSchema.optional(),
  validated_only: z.boolean().default(false),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetDetectionByIdSchema = z.object({
  detection_id: CommonSchemas.id,
  include_context: z.boolean().default(true),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetDetectionStatsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['type', 'severity', 'confidence', 'bill']).optional(),
});

export const GetTrendingPretextsSchema = z.object({
  timeframe: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  pretext_type: PretextTypeSchema.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetBillRiskScoreSchema = z.object({
  bill_id: CommonSchemas.id,
  include_breakdown: z.boolean().default(true),
});

// ============================================================================
// Model Training and Feedback Schemas
// ============================================================================

export const SubmitFeedbackSchema = z.object({
  detection_id: CommonSchemas.id,
  feedback_type: z.enum(['correct', 'incorrect', 'partially_correct', 'false_positive']),
  comments: z.string().max(1000).optional(),
  suggested_improvement: z.string().max(2000).optional(),
});

export const GetModelPerformanceSchema = z.object({
  pretext_type: PretextTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// ============================================================================
// Batch Processing Schemas
// ============================================================================

export const BatchAnalyzeBillsSchema = z.object({
  bill_ids: z.array(CommonSchemas.id).min(1).max(50),
  analysis_types: z.array(PretextTypeSchema).optional(),
  confidence_threshold: ConfidenceLevelSchema.default('medium'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export const GetBatchStatusSchema = z.object({
  batch_id: CommonSchemas.id,
});

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyzeBillInput = z.infer<typeof AnalyzeBillSchema>;
export type AnalyzeTextInput = z.infer<typeof AnalyzeTextSchema>;
export type CompareSectionsInput = z.infer<typeof CompareSectionsSchema>;
export type ReportDetectionInput = z.infer<typeof ReportDetectionSchema>;
export type ValidateDetectionInput = z.infer<typeof ValidateDetectionSchema>;
export type GetDetectionsInput = z.infer<typeof GetDetectionsSchema>;
export type GetDetectionByIdInput = z.infer<typeof GetDetectionByIdSchema>;
export type GetDetectionStatsInput = z.infer<typeof GetDetectionStatsSchema>;
export type GetTrendingPretextsInput = z.infer<typeof GetTrendingPretextsSchema>;
export type GetBillRiskScoreInput = z.infer<typeof GetBillRiskScoreSchema>;
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type GetModelPerformanceInput = z.infer<typeof GetModelPerformanceSchema>;
export type BatchAnalyzeBillsInput = z.infer<typeof BatchAnalyzeBillsSchema>;
export type GetBatchStatusInput = z.infer<typeof GetBatchStatusSchema>;
export type PretextType = z.infer<typeof PretextTypeSchema>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
