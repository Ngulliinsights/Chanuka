/**
 * User Validation Schema
 *
 * Centralized validation rules for user data used by both client and server.
 * Integrates with @shared/core/validation framework for enterprise features.
 */

import { z } from 'zod';
import { optionalNonEmptyString, optionalNullableNonEmptyString, emailSchema, uuidSchema, userRoleSchema } from './common';

/**
 * User Validation Rules
 * Constants defining min/max lengths and patterns
 */
export const USER_VALIDATION_RULES = {
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]{3,20}$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE_PATTERN: /^(\+\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
  FIRST_NAME_MIN_LENGTH: 1,
  FIRST_NAME_MAX_LENGTH: 50,
  LAST_NAME_MIN_LENGTH: 1,
  LAST_NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
} as const;

/**
 * Zod Schema for User validation (users table only)
 * Aligned with database schema in server/infrastructure/schema/foundation.ts
 * Can be used with @shared/core/validation/ValidationService
 * 
 * NOTE: This schema represents the users table only. For profile fields
 * (first_name, last_name, bio, phone), use UserProfileSchema.
 */
export const UserSchema = z.object({
  id: uuidSchema.optional(),
  email: emailSchema,
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(USER_VALIDATION_RULES.USERNAME_PATTERN, 'Username must be 3-20 characters (alphanumeric, dash, underscore)')
    .refine((val) => val.trim().length > 0, 'Username cannot be empty or contain only whitespace'),
  role: userRoleSchema.default('citizen'),
  is_active: z.boolean().default(true),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

/**
 * Zod Schema for User Profile validation (user_profiles table)
 * Aligned with database schema in server/infrastructure/schema/foundation.ts
 * 
 * NOTE: Length constraints updated to match database:
 * - first_name, last_name: max 100 chars (DB allows varchar(100))
 * - bio: max 500 chars (validation constraint, DB has no limit)
 * - phone_number: max 20 chars (DB allows varchar(20))
 */
export const UserProfileSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  first_name: optionalNonEmptyString('first name', USER_VALIDATION_RULES.FIRST_NAME_MIN_LENGTH, 100),
  last_name: optionalNonEmptyString('last name', USER_VALIDATION_RULES.LAST_NAME_MIN_LENGTH, 100),
  display_name: optionalNonEmptyString('display name', 1, 150),
  bio: optionalNullableNonEmptyString('bio', 1, USER_VALIDATION_RULES.BIO_MAX_LENGTH),
  phone_number: z
    .string()
    .regex(USER_VALIDATION_RULES.PHONE_PATTERN, 'Invalid phone number format')
    .max(20, 'Phone number must not exceed 20 characters')
    .optional()
    .nullable(),
  is_public: z.boolean().default(true),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

/**
 * Combined User with Profile Schema (for convenience in client forms)
 * This combines fields from both users and user_profiles tables
 */
export const UserWithProfileSchema = UserSchema.merge(
  UserProfileSchema.omit({ id: true, user_id: true })
);

/**
 * User Registration Schema - includes password validation
 */
export const UserRegistrationSchema = UserSchema.extend({
  password: z.string()
    .min(USER_VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${USER_VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`)
    .regex(
      USER_VALIDATION_RULES.PASSWORD_PATTERN,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .refine((val) => val.trim().length > 0, 'Password cannot be empty or contain only whitespace'),
  password_confirm: z.string()
    .min(1, 'Password confirmation is required')
    .refine((val) => val.trim().length > 0, 'Password confirmation cannot be empty or contain only whitespace'),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
});

export type UserValidationInput = z.input<typeof UserSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserProfileValidationInput = z.input<typeof UserProfileSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserWithProfile = z.infer<typeof UserWithProfileSchema>;
export type UserRegistrationInput = z.input<typeof UserRegistrationSchema>;

/**
 * Validation helper function for users
 * Can be used in both client and server without duplication
 */
export function validateUser(data: unknown): { valid: boolean; errors: Record<string, string[]> } {
  const result = UserSchema.safeParse(data);
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

/**
 * Validation helper function for user profiles
 * Can be used in both client and server without duplication
 */
export function validateUserProfile(data: unknown): { valid: boolean; errors: Record<string, string[]> } {
  const result = UserProfileSchema.safeParse(data);
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

/**
 * Validation helper function for user registration
 * Can be used in both client and server without duplication
 */
export function validateUserRegistration(data: unknown): { valid: boolean; errors: Record<string, string[]> } {
  const result = UserRegistrationSchema.safeParse(data);
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
