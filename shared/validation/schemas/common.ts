/**
 * Common Validation Utilities
 *
 * Shared validation helpers and refinements used across all schemas.
 */

import { z } from 'zod';

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
): z.ZodString {
  let schema = z
    .string()
    .min(minLength, `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}`)
    .refine(
      (val) => val.trim().length > 0,
      `${fieldName} cannot be empty or contain only whitespace`
    );

  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `${fieldName} must not exceed ${maxLength} characters`);
  }

  return schema;
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
): z.ZodOptional<z.ZodString> {
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
): z.ZodNullable<z.ZodString> {
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
): z.ZodOptional<z.ZodNullable<z.ZodString>> {
  return nonEmptyString(fieldName, minLength, maxLength).nullable().optional();
}
