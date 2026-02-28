/**
 * Constitutional Intelligence Feature - Validation Schemas
 * 
 * Zod schemas for validating constitutional analysis inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Constitutional Analysis Enums
// ============================================================================

export const ConstitutionalArticleSchema = z.enum([
  'article_i',
  'article_ii',
  'article_iii',
  'article_iv',
  'article_v',
  'article_vi',
  'article_vii',
  'amendment_1',
  'amendment_2',
  'amendment_4',
  'amendment_5',
  'amendment_6',
  'amendment_8',
  'amendment_10',
  'amendment_14',
  'other'
]);

export const ConcernSeveritySchema = z.enum([
  'none',
  'minor',
  'moderate',
  'significant',
  'critical'
]);

export const ConstitutionalPrincipleSchema = z.enum([
  'separation_of_powers',
  'federalism',
  'individual_rights',
  'due_process',
  'equal_protection',
  'free_speech',
  'religious_freedom',
  'commerce_clause',
  'necessary_and_proper',
  'supremacy_clause'
]);

export const AnalysisConfidenceSchema = z.enum([
  'very_low',
  'low',
  'medium',
  'high',
  'very_high'
]);

// ============================================================================
// Constitutional Analysis Schemas
// ============================================================================

export const AnalyzeBillSchema = z.object({
  bill_id: CommonSchemas.id,
  analysis_depth: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
  focus_areas: z.array(ConstitutionalPrincipleSchema).max(10).optional(),
  include_precedents: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
});

export const AnalyzeTextSchema = z.object({
  text: z.string().min(50).max(50000),
  context: z.object({
    bill_id: CommonSchemas.id.optional(),
    section: z.string().max(200).optional(),
    jurisdiction: z.string().max(100).optional(),
  }).optional(),
  focus_areas: z.array(ConstitutionalPrincipleSchema).optional(),
  include_precedents: z.boolean().default(true),
});

export const CompareWithPrecedentSchema = z.object({
  bill_id: CommonSchemas.id,
  precedent_case: z.string().min(5).max(200),
  comparison_aspects: z.array(z.enum([
    'legal_reasoning',
    'constitutional_basis',
    'scope',
    'implications'
  ])).min(1).max(4).optional(),
});

// ============================================================================
// Concern Reporting Schemas
// ============================================================================

export const ReportConcernSchema = z.object({
  bill_id: CommonSchemas.id,
  article: ConstitutionalArticleSchema,
  principle: ConstitutionalPrincipleSchema,
  severity: ConcernSeveritySchema,
  description: z.string().min(50).max(5000),
  legal_basis: z.string().min(20).max(2000),
  precedents: z.array(z.object({
    case_name: z.string().max(200),
    citation: z.string().max(200),
    relevance: z.string().max(1000),
    url: CommonSchemas.url.optional(),
  })).max(10).optional(),
  suggested_revision: z.string().max(5000).optional(),
});

export const ValidateConcernSchema = z.object({
  concern_id: CommonSchemas.id,
  is_valid: z.boolean(),
  expert_opinion: z.string().max(2000).optional(),
  supporting_precedents: z.array(z.string().max(200)).max(10).optional(),
  confidence: AnalysisConfidenceSchema,
});

// ============================================================================
// Precedent Analysis Schemas
// ============================================================================

export const SearchPrecedentsSchema = z.object({
  query: CommonSchemas.searchQuery,
  article: ConstitutionalArticleSchema.optional(),
  principle: ConstitutionalPrincipleSchema.optional(),
  date_from: z.string().regex(/^\d{4}$/).optional(), // Year format
  date_to: z.string().regex(/^\d{4}$/).optional(),
  court_level: z.enum(['supreme_court', 'appellate', 'district', 'all']).default('all'),
  limit: CommonSchemas.limit.optional(),
});

export const GetRelevantPrecedentsSchema = z.object({
  bill_id: CommonSchemas.id,
  max_results: z.number().int().positive().max(50).default(10),
  min_relevance_score: z.number().min(0).max(1).default(0.5),
});

export const AnalyzePrecedentImpactSchema = z.object({
  bill_id: CommonSchemas.id,
  precedent_case: z.string().min(5).max(200),
  impact_areas: z.array(z.enum([
    'constitutionality',
    'enforcement',
    'interpretation',
    'scope'
  ])).optional(),
});

// ============================================================================
// Rights Impact Analysis Schemas
// ============================================================================

export const AnalyzeRightsImpactSchema = z.object({
  bill_id: CommonSchemas.id,
  rights_categories: z.array(z.enum([
    'civil_rights',
    'civil_liberties',
    'property_rights',
    'privacy_rights',
    'voting_rights',
    'due_process'
  ])).optional(),
  affected_groups: z.array(z.string().max(100)).max(20).optional(),
});

export const GetBalancingTestSchema = z.object({
  bill_id: CommonSchemas.id,
  right1: z.string().max(200),
  right2: z.string().max(200),
  include_precedents: z.boolean().default(true),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetConcernsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  article: ConstitutionalArticleSchema.optional(),
  principle: ConstitutionalPrincipleSchema.optional(),
  severity: ConcernSeveritySchema.optional(),
  validated_only: z.boolean().default(false),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetAnalysisHistorySchema = z.object({
  bill_id: CommonSchemas.id,
  include_resolved: z.boolean().default(false),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetConstitutionalStatsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['article', 'principle', 'severity', 'bill']).optional(),
});

export const GetRiskScoreSchema = z.object({
  bill_id: CommonSchemas.id,
  include_breakdown: z.boolean().default(true),
  include_mitigation: z.boolean().default(true),
});

export const GetTrendingConcernsSchema = z.object({
  timeframe: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  article: ConstitutionalArticleSchema.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Expert Review Schemas
// ============================================================================

export const SubmitExpertReviewSchema = z.object({
  bill_id: CommonSchemas.id,
  expert_id: CommonSchemas.id,
  analysis: z.string().min(100).max(10000),
  concerns: z.array(z.object({
    article: ConstitutionalArticleSchema,
    principle: ConstitutionalPrincipleSchema,
    severity: ConcernSeveritySchema,
    description: z.string().max(2000),
  })).max(20),
  overall_assessment: z.enum(['constitutional', 'likely_constitutional', 'questionable', 'likely_unconstitutional', 'unconstitutional']),
  confidence: AnalysisConfidenceSchema,
});

export const GetExpertReviewsSchema = z.object({
  bill_id: CommonSchemas.id,
  expert_id: CommonSchemas.id.optional(),
  min_confidence: AnalysisConfidenceSchema.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyzeBillInput = z.infer<typeof AnalyzeBillSchema>;
export type AnalyzeTextInput = z.infer<typeof AnalyzeTextSchema>;
export type CompareWithPrecedentInput = z.infer<typeof CompareWithPrecedentSchema>;
export type ReportConcernInput = z.infer<typeof ReportConcernSchema>;
export type ValidateConcernInput = z.infer<typeof ValidateConcernSchema>;
export type SearchPrecedentsInput = z.infer<typeof SearchPrecedentsSchema>;
export type GetRelevantPrecedentsInput = z.infer<typeof GetRelevantPrecedentsSchema>;
export type AnalyzePrecedentImpactInput = z.infer<typeof AnalyzePrecedentImpactSchema>;
export type AnalyzeRightsImpactInput = z.infer<typeof AnalyzeRightsImpactSchema>;
export type GetBalancingTestInput = z.infer<typeof GetBalancingTestSchema>;
export type GetConcernsInput = z.infer<typeof GetConcernsSchema>;
export type GetAnalysisHistoryInput = z.infer<typeof GetAnalysisHistorySchema>;
export type GetConstitutionalStatsInput = z.infer<typeof GetConstitutionalStatsSchema>;
export type GetRiskScoreInput = z.infer<typeof GetRiskScoreSchema>;
export type GetTrendingConcernsInput = z.infer<typeof GetTrendingConcernsSchema>;
export type SubmitExpertReviewInput = z.infer<typeof SubmitExpertReviewSchema>;
export type GetExpertReviewsInput = z.infer<typeof GetExpertReviewsSchema>;
export type ConstitutionalArticle = z.infer<typeof ConstitutionalArticleSchema>;
export type ConcernSeverity = z.infer<typeof ConcernSeveritySchema>;
export type ConstitutionalPrinciple = z.infer<typeof ConstitutionalPrincipleSchema>;
export type AnalysisConfidence = z.infer<typeof AnalysisConfidenceSchema>;
