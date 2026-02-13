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
 * 
 * NOTE: Updated to align with database schema:
 * - title: max 500 chars (DB allows varchar(500))
 * - summary: optional (DB allows NULL)
 * - content/full_text: optional (DB allows NULL)
 * - bill_number: required (DB has NOT NULL constraint)
 * - chamber: required (DB has NOT NULL constraint)
 */
export const BILL_VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 500, // Updated to match DB varchar(500)
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
 * Aligned with database schema in server/infrastructure/schema/foundation.ts
 * Can be used with @shared/core/validation/ValidationService
 * 
 * NOTE: Field requirements updated to match database:
 * - title: required, max 500 chars (DB: NOT NULL, varchar(500))
 * - summary: optional (DB: text, NULL allowed)
 * - full_text: optional (DB: text, NULL allowed)
 * - bill_number: required (DB: NOT NULL, varchar(50))
 * - chamber: required (DB: NOT NULL, enum)
 * - status: required with default (DB: NOT NULL, enum, default 'first_reading')
 * 
 * Fields NOT in database (removed from this schema):
 * - type (was in validation but not in DB)
 * - priority (was in validation but not in DB)
 */
export const BillSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .min(BILL_VALIDATION_RULES.TITLE_MIN_LENGTH, 'Bill title must be at least 10 characters')
    .max(BILL_VALIDATION_RULES.TITLE_MAX_LENGTH, 'Bill title must not exceed 500 characters'),
  short_title: z
    .string()
    .min(BILL_VALIDATION_RULES.SHORT_TITLE_MIN_LENGTH)
    .max(BILL_VALIDATION_RULES.SHORT_TITLE_MAX_LENGTH)
    .optional(),
  summary: z
    .string()
    .min(BILL_VALIDATION_RULES.SUMMARY_MIN_LENGTH, 'Summary must be at least 20 characters')
    .max(BILL_VALIDATION_RULES.SUMMARY_MAX_LENGTH, 'Summary must not exceed 1000 characters')
    .optional(), // Updated: DB allows NULL
  full_text: z
    .string()
    .min(BILL_VALIDATION_RULES.CONTENT_MIN_LENGTH, 'Bill content must be at least 50 characters')
    .max(BILL_VALIDATION_RULES.CONTENT_MAX_LENGTH, 'Bill content must not exceed 100000 characters')
    .optional(), // Updated: DB allows NULL
  bill_number: z
    .string()
    .regex(BILL_VALIDATION_RULES.BILL_NUMBER_PATTERN, 'Invalid bill number format (e.g., H.123 or S.456)'), // Updated: required to match DB
  status: z.enum([
    'draft',
    'first_reading',
    'second_reading',
    'committee',
    'third_reading',
    'passed',
    'rejected',
    'assented',
    'enacted',
  ]).default('first_reading'), // Updated: matches DB enum and default
  chamber: z.enum(['national_assembly', 'senate', 'joint']), // Updated: required to match DB
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

/**
 * Legacy Bill Schema (for backward compatibility)
 * Includes fields that were in validation but not in database
 * @deprecated Use BillSchema instead
 */
export const LegacyBillSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .min(BILL_VALIDATION_RULES.TITLE_MIN_LENGTH, 'Bill title must be at least 10 characters')
    .max(200, 'Bill title must not exceed 200 characters'),
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
export type LegacyBillValidationInput = z.input<typeof LegacyBillSchema>;
export type LegacyBill = z.infer<typeof LegacyBillSchema>;

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
