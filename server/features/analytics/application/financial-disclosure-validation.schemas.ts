/**
 * Financial Disclosure Validation Schemas
 * 
 * Zod schemas for validating financial disclosure inputs
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

export const GetDisclosuresBySponsorSchema = z.object({
  sponsor_id: z.string().uuid('Invalid sponsor ID format'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_amount: z.number().nonnegative().optional(),
  disclosure_type: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const GetDisclosuresByBillSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  min_amount: z.number().nonnegative().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const GetDisclosureSummarySchema = z.object({
  sponsor_id: z.string().uuid('Invalid sponsor ID format'),
});

export const CreateDisclosureSchema = z.object({
  sponsor_id: z.string().uuid('Invalid sponsor ID format'),
  bill_id: z.string().uuid('Invalid bill ID format').optional(),
  amount: z.number().positive('Amount must be positive'),
  disclosure_type: z.enum(['donation', 'investment', 'gift', 'income', 'other']),
  description: z.string().max(1000).optional(),
});

export const GetHighValueDisclosuresSchema = z.object({
  min_amount: z.number().positive().optional().default(100000),
  limit: z.number().int().positive().max(100).optional().default(50),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetDisclosuresBySponsorInput = z.infer<typeof GetDisclosuresBySponsorSchema>;
export type GetDisclosuresByBillInput = z.infer<typeof GetDisclosuresByBillSchema>;
export type GetDisclosureSummaryInput = z.infer<typeof GetDisclosureSummarySchema>;
export type CreateDisclosureInput = z.infer<typeof CreateDisclosureSchema>;
export type GetHighValueDisclosuresInput = z.infer<typeof GetHighValueDisclosuresSchema>;
