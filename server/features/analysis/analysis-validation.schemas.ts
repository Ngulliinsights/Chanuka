/**
 * Validation schemas for analysis API routes
 * 
 * These schemas validate all user input to prevent SQL injection,
 * XSS attacks, and data corruption.
 */

import { z } from 'zod';

/**
 * Schema for GET /api/analysis/bills/:bill_id/comprehensive
 */
export const GetComprehensiveAnalysisSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  force: z.enum(['true', 'false']).optional(),
});

/**
 * Schema for POST /api/analysis/bills/:bill_id/comprehensive/run
 */
export const TriggerAnalysisParamsSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
});

export const TriggerAnalysisBodySchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  notify_on_complete: z.boolean().optional().default(false),
});

/**
 * Schema for GET /api/analysis/bills/:bill_id/history
 */
export const GetAnalysisHistorySchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  limit: z.number().int().positive().max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  type: z.enum(['all', 'comprehensive', 'constitutional', 'stakeholder', 'transparency']).optional().default('all'),
});
