/**
 * Bill Validation Schema
 *
 * Centralized validation rules for legislative bills used by both client and server.
 * Integrates with @shared/core/validation framework for enterprise features.
 */

import { z } from 'zod';

/**
 * Bill Validation Rules
 * Constants defining min/max lengths and other constraints
 */
export const BILL_VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 200,
  SUMMARY_MIN_LENGTH: 20,
  SUMMARY_MAX_LENGTH: 1000,
  CONTENT_MIN_LENGTH: 50,
  CONTENT_MAX_LENGTH: 100000,
  SHORT_TITLE_MIN_LENGTH: 5,
  SHORT_TITLE_MAX_LENGTH: 100,
  BILL_NUMBER_PATTERN: /^(H|S)\.?\d+$/i,
} as const;

/**
 * Zod Schema for Bill validation
 * Can be used with @shared/core/validation/ValidationService
 */
export const BillSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .min(BILL_VALIDATION_RULES.TITLE_MIN_LENGTH, 'Bill title must be at least 10 characters')
    .max(BILL_VALIDATION_RULES.TITLE_MAX_LENGTH, 'Bill title must not exceed 200 characters'),
  short_title: z
    .string()
    .min(BILL_VALIDATION_RULES.SHORT_TITLE_MIN_LENGTH)
    .max(BILL_VALIDATION_RULES.SHORT_TITLE_MAX_LENGTH)
    .optional(),
  summary: z
    .string()
    .min(BILL_VALIDATION_RULES.SUMMARY_MIN_LENGTH, 'Summary must be at least 20 characters')
    .max(BILL_VALIDATION_RULES.SUMMARY_MAX_LENGTH, 'Summary must not exceed 1000 characters'),
  content: z
    .string()
    .min(BILL_VALIDATION_RULES.CONTENT_MIN_LENGTH, 'Bill content must be at least 50 characters')
    .max(BILL_VALIDATION_RULES.CONTENT_MAX_LENGTH, 'Bill content must not exceed 100000 characters'),
  bill_number: z
    .string()
    .regex(BILL_VALIDATION_RULES.BILL_NUMBER_PATTERN, 'Invalid bill number format (e.g., H.123 or S.456)')
    .optional(),
  status: z.enum([
    'draft',
    'introduced',
    'committee_review',
    'floor_debate',
    'amendment',
    'vote_scheduled',
    'passed_chamber',
    'conference',
    'passed_both_chambers',
    'presidential_action',
    'enacted',
    'vetoed',
    'failed',
    'withdrawn',
    'archived',
  ]).default('draft'),
  chamber: z.enum(['house', 'senate', 'joint']).optional(),
  type: z.enum(['bill', 'resolution', 'amendment', 'appropriation', 'budget', 'treaty', 'nomination']).default('bill'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type BillValidationInput = z.input<typeof BillSchema>;
export type Bill = z.infer<typeof BillSchema>;

/**
 * Validation helper function for bills
 * Can be used in both client and server without duplication
 */
export function validateBill(data: unknown): { valid: boolean; errors: Record<string, string[]> } {
  const result = BillSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const field = err.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(err.message);
  });
  return { valid: false, errors };
}
