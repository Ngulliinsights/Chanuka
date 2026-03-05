/**
 * ML Analysis Validation Schemas
 * 
 * Zod schemas for validating ML analysis inputs
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

export const AnalyzeBillMLSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  bill_content: z.string().min(10, 'Bill content must be at least 10 characters').max(1_000_000, 'Bill content too large'),
});

export const GetMLAnalysisHistorySchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  limit: z.number().int().positive().max(100).optional().default(10),
  analysis_type: z.string().optional(),
});

export const GetHighConfidenceAnalysesSchema = z.object({
  min_confidence: z.number().min(0).max(1).optional().default(0.8),
  limit: z.number().int().positive().max(100).optional().default(50),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyzeBillMLInput = z.infer<typeof AnalyzeBillMLSchema>;
export type GetMLAnalysisHistoryInput = z.infer<typeof GetMLAnalysisHistorySchema>;
export type GetHighConfidenceAnalysesInput = z.infer<typeof GetHighConfidenceAnalysesSchema>;
