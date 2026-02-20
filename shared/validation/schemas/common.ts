/**
 * Common Validation Utilities
 *
 * Shared validation helpers and refinements used across all schemas.
 * This is the SINGLE SOURCE OF TRUTH for all validation primitives.
 */

import { z } from 'zod';

// ============================================================================
// PRIMITIVE SCHEMAS - Single Source of Truth
// ============================================================================

/**
 * Email validation schema
 * Use this instead of z.string().email() everywhere
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * UUID validation schema
 * Use this instead of z.string().uuid() everywhere
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Phone number validation schema
 * Supports international formats
 */
export const phoneSchema = z.string().regex(
  /^(\+\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
  'Invalid phone number format'
);

/**
 * URL validation schema
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * User Role Schema - SINGLE SOURCE OF TRUTH
 * All role validations must use this schema
 * 
 * Roles aligned with database schema:
 * - citizen: Default user role
 * - verified_citizen: Verified citizen with enhanced privileges
 * - ambassador: Community ambassador
 * - expert_verifier: Expert who can verify content
 * - mp_staff: Member of Parliament staff
 * - clerk: Parliamentary clerk
 * - admin: System administrator
 * - auditor: System auditor
 * - journalist: Verified journalist
 * - moderator: Content moderator
 * - analyst: Data analyst
 * - expert: Domain expert
 * - advocate: Policy advocate
 * - representative: Elected representative
 */
export const userRoleSchema = z.enum([
  'citizen',
  'verified_citizen',
  'ambassador',
  'expert_verifier',
  'mp_staff',
  'clerk',
  'admin',
  'auditor',
  'journalist',
  'moderator',
  'analyst',
  'expert',
  'advocate',
  'representative'
]);

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0)
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
}).refine(
  (data) => data.end_date >= data.start_date,
  'End date must be after or equal to start date'
);

/**
 * ID schemas for common entities
 */
export const billIdSchema = uuidSchema;
export const userIdSchema = uuidSchema;
export const commentIdSchema = uuidSchema;

// ============================================================================
// STRING HELPERS
// ============================================================================

/**
 * Creates a non-empty string schema that rejects empty and whitespace-only strings.
 * 
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (optional)
 * @returns Zod string schema with non-empty validation
 * 
 * @example
 * const emailSchema = nonEmptyString('email').email();
 * const nameSchema = nonEmptyString('name', 1, 100);
 */
export function nonEmptyString(
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): z.ZodEffects<z.ZodString, string, string> {
  let schema = z
    .string()
    .min(minLength, `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}`);

  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `${fieldName} must not exceed ${maxLength} characters`);
  }

  return schema.refine(
    (val) => val.trim().length > 0,
    `${fieldName} cannot be empty or contain only whitespace`
  );
}

/**
 * Creates an optional non-empty string schema.
 * If provided, the string must not be empty or whitespace-only.
 * 
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length when provided (default: 1)
 * @param maxLength - Maximum length (optional)
 * @returns Zod optional string schema with non-empty validation
 * 
 * @example
 * const bioSchema = optionalNonEmptyString('bio', 1, 500);
 */
export function optionalNonEmptyString(
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): z.ZodOptional<z.ZodEffects<z.ZodString, string, string>> {
  return nonEmptyString(fieldName, minLength, maxLength).optional();
}

/**
 * Creates a nullable non-empty string schema.
 * If provided (not null), the string must not be empty or whitespace-only.
 * 
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length when provided (default: 1)
 * @param maxLength - Maximum length (optional)
 * @returns Zod nullable string schema with non-empty validation
 * 
 * @example
 * const phoneSchema = nullableNonEmptyString('phone', 1, 20);
 */
export function nullableNonEmptyString(
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): z.ZodNullable<z.ZodEffects<z.ZodString, string, string>> {
  return nonEmptyString(fieldName, minLength, maxLength).nullable();
}

/**
 * Creates an optional and nullable non-empty string schema.
 * If provided (not undefined or null), the string must not be empty or whitespace-only.
 * 
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length when provided (default: 1)
 * @param maxLength - Maximum length (optional)
 * @returns Zod optional nullable string schema with non-empty validation
 * 
 * @example
 * const middleNameSchema = optionalNullableNonEmptyString('middle name', 1, 50);
 */
export function optionalNullableNonEmptyString(
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>> {
  return nonEmptyString(fieldName, minLength, maxLength).nullable().optional();
}
