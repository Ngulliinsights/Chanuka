/**
 * Analysis Validation Schemas
 * Zod schemas for validating analysis feature inputs
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/common-schemas';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for analyzing a bill
 */
export const AnalyzeBillSchema = z.object({
  bill_id: CommonSchemas.id.describe('ID of the bill to analyze'),
  force_reanalysis: z.boolean()
    .optional()
    .default(false)
    .describe('Force a new analysis even if cached result exists'),
  analysis_type: z.enum(['comprehensive', 'constitutional', 'stakeholder', 'transparency'])
    .optional()
    .default('comprehensive')
    .describe('Type of analysis to perform'),
});

/**
 * Schema for retrieving analysis history
 */
export const GetAnalysisHistorySchema = z.object({
  bill_id: CommonSchemas.id.describe('ID of the bill'),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of history records to return'),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of records to skip'),
  analysis_type: z.enum(['comprehensive', 'constitutional', 'stakeholder', 'transparency', 'all'])
    .optional()
    .default('all')
    .describe('Filter by analysis type'),
});

/**
 * Schema for getting a specific analysis by ID
 */
export const GetAnalysisSchema = z.object({
  analysis_id: z.string()
    .min(1)
    .describe('Unique analysis ID'),
  include_details: z.boolean()
    .optional()
    .default(true)
    .describe('Include full analysis details'),
});

/**
 * Schema for triggering manual analysis (admin only)
 */
export const TriggerAnalysisSchema = z.object({
  bill_id: CommonSchemas.id.describe('ID of the bill to analyze'),
  analysis_type: z.enum(['comprehensive', 'constitutional', 'stakeholder', 'transparency'])
    .optional()
    .default('comprehensive')
    .describe('Type of analysis to trigger'),
  priority: z.enum(['low', 'normal', 'high'])
    .optional()
    .default('normal')
    .describe('Analysis priority'),
  notify_on_complete: z.boolean()
    .optional()
    .default(false)
    .describe('Send notification when analysis completes'),
});

/**
 * Schema for comparing analyses
 */
export const CompareAnalysesSchema = z.object({
  bill_id: CommonSchemas.id.describe('ID of the bill'),
  analysis_ids: z.array(z.string())
    .min(2)
    .max(5)
    .describe('Analysis IDs to compare (2-5)'),
  comparison_fields: z.array(z.enum([
    'constitutional_score',
    'transparency_score',
    'public_interest_score',
    'conflict_risk',
    'overall_confidence'
  ]))
    .optional()
    .describe('Specific fields to compare'),
});

/**
 * Schema for batch analysis
 */
export const BatchAnalyzeSchema = z.object({
  bill_ids: z.array(CommonSchemas.id)
    .min(1)
    .max(20)
    .describe('Bill IDs to analyze (max 20)'),
  analysis_type: z.enum(['comprehensive', 'constitutional', 'stakeholder', 'transparency'])
    .optional()
    .default('comprehensive')
    .describe('Type of analysis to perform'),
  parallel: z.boolean()
    .optional()
    .default(true)
    .describe('Run analyses in parallel'),
});

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type AnalyzeBillInput = z.infer<typeof AnalyzeBillSchema>;
export type GetAnalysisHistoryInput = z.infer<typeof GetAnalysisHistorySchema>;
export type GetAnalysisInput = z.infer<typeof GetAnalysisSchema>;
export type TriggerAnalysisInput = z.infer<typeof TriggerAnalysisSchema>;
export type CompareAnalysesInput = z.infer<typeof CompareAnalysesSchema>;
export type BatchAnalyzeInput = z.infer<typeof BatchAnalyzeSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Constitutional concern with severity
 */
export interface ConstitutionalConcern {
  article: string;
  concern: string;
  severity: 'info' | 'minor' | 'major' | 'critical';
  recommendation?: string;
}

/**
 * Legal precedent reference
 */
export interface LegalPrecedent {
  case_name: string;
  year: number;
  relevance: number;
  summary: string;
}

/**
 * Constitutional analysis result
 */
export interface ConstitutionalAnalysisResult {
  constitutionalityScore: number;
  concerns: ConstitutionalConcern[];
  precedents: LegalPrecedent[];
  riskAssessment: 'low' | 'medium' | 'high';
}

/**
 * Stakeholder group
 */
export interface StakeholderGroup {
  name: string;
  type: 'individual' | 'organization' | 'industry' | 'demographic';
  size: number;
  influence: number;
  position: 'support' | 'oppose' | 'neutral';
}

/**
 * Economic impact assessment
 */
export interface EconomicImpact {
  estimatedCost: number;
  estimatedBenefit: number;
  netImpact: number;
  timeframe: string;
  confidence: number;
}

/**
 * Social impact assessment
 */
export interface SocialImpact {
  equityEffect: number;
  accessibilityEffect: number;
  publicHealthEffect: number;
  environmentalEffect: number;
}

/**
 * Stakeholder analysis result
 */
export interface StakeholderAnalysisResult {
  primaryBeneficiaries: StakeholderGroup[];
  negativelyAffected: StakeholderGroup[];
  affectedPopulations: StakeholderGroup[];
  economicImpact: EconomicImpact;
  socialImpact: SocialImpact;
}

/**
 * Transparency score breakdown
 */
export interface TransparencyBreakdown {
  sponsorDisclosure: number;
  documentAccess: number;
  processTransparency: number;
  publicEngagement: number;
}

/**
 * Transparency score result
 */
export interface TransparencyScoreResult {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: TransparencyBreakdown;
  recommendations: string[];
}

/**
 * Public interest score result
 */
export interface PublicInterestScoreResult {
  score: number;
  factors: {
    stakeholderBenefit: number;
    transparency: number;
    economicImpact: number;
    socialImpact: number;
  };
  interpretation: string;
}

/**
 * Conflict of interest summary
 */
export interface ConflictSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsorsCount: number;
  totalFinancialExposureEstimate: number;
  directConflictCount: number;
  indirectConflictCount: number;
}

/**
 * Comprehensive bill analysis result
 */
export interface ComprehensiveBillAnalysis {
  bill_id: number;
  analysis_id: string;
  timestamp: Date;
  constitutionalAnalysis: ConstitutionalAnalysisResult;
  conflictAnalysisSummary: ConflictSummary;
  stakeholderImpact: StakeholderAnalysisResult;
  transparency_score: TransparencyScoreResult;
  publicInterestScore: PublicInterestScoreResult;
  recommendedActions: string[];
  overallConfidence: number;
}

/**
 * Analysis history record
 */
export interface AnalysisHistoryRecord {
  dbId: number;
  analysis_id: string;
  bill_id: number;
  analysis_type: string;
  timestamp: Date;
  overallConfidence: number;
  status: string;
  scores: {
    publicInterest?: number;
    transparency?: number;
    constitutional?: number;
  };
}

/**
 * Analysis comparison result
 */
export interface AnalysisComparison {
  bill_id: string;
  analyses: ComprehensiveBillAnalysis[];
  changes: {
    field: string;
    from: number;
    to: number;
    change_percent: number;
  }[];
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Batch analysis result
 */
export interface BatchAnalysisResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    bill_id: string;
    success: boolean;
    analysis?: ComprehensiveBillAnalysis;
    error?: string;
  }>;
}
