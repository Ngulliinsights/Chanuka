/**
 * User API Contract Validation Schemas
 * Zod schemas for user endpoint request/response validation
 */

import { z } from 'zod';
import { emailSchema, userRoleSchema, uuidSchema } from '@shared/validation';
import { USER_VALIDATION_RULES } from '@shared/validation/schemas/user.schema';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create User Request Schema
 */
export const CreateUserRequestSchema = z.object({
  email: emailSchema.regex(USER_VALIDATION_RULES.EMAIL_PATTERN, 'Email format is invalid'),
  username: z
    .string()
    .regex(
      USER_VALIDATION_RULES.USERNAME_PATTERN,
      'Username must be 3-20 characters (alphanumeric, dash, underscore)'
    ),
  password: z
    .string()
    .min(USER_VALIDATION_RULES.PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters')
    .regex(
      USER_VALIDATION_RULES.PASSWORD_PATTERN,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  role: userRoleSchema.optional(),
});

/**
 * Update User Request Schema
 */
export const UpdateUserRequestSchema = z.object({
  email: emailSchema.regex(USER_VALIDATION_RULES.EMAIL_PATTERN, 'Email format is invalid').optional(),
  username: z
    .string()
    .regex(
      USER_VALIDATION_RULES.USERNAME_PATTERN,
      'Username must be 3-20 characters (alphanumeric, dash, underscore)'
    )
    .optional(),
  role: userRoleSchema.optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  profile: z
    .object({
      displayName: z.string().min(1).max(100).optional(),
      firstName: z
        .string()
        .min(USER_VALIDATION_RULES.FIRST_NAME_MIN_LENGTH)
        .max(USER_VALIDATION_RULES.FIRST_NAME_MAX_LENGTH)
        .optional(),
      lastName: z
        .string()
        .min(USER_VALIDATION_RULES.LAST_NAME_MIN_LENGTH)
        .max(USER_VALIDATION_RULES.LAST_NAME_MAX_LENGTH)
        .optional(),
      bio: z.string().max(USER_VALIDATION_RULES.BIO_MAX_LENGTH).optional(),
      avatarUrl: z.string().url().optional(),
    })
    .optional(),
});

/**
 * Get User Request Schema (path params)
 */
export const GetUserParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * List Users Request Schema (query params)
 */
export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: userRoleSchema.optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().optional(),
});

/**
 * Delete User Request Schema (path params)
 */
export const DeleteUserParamsSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User Schema (for responses)
 */
export const UserResponseSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  username: z.string(),
  role: userRoleSchema,
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  profile: z
    .object({
      displayName: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      bio: z.string().nullable().optional(),
      avatarUrl: z.string().url().nullable().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Create User Response Schema
 */
export const CreateUserResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string(),
});

/**
 * Get User Response Schema
 */
export const GetUserResponseSchema = z.object({
  user: UserResponseSchema,
});

/**
 * Update User Response Schema
 */
export const UpdateUserResponseSchema = z.object({
  user: UserResponseSchema,
});

/**
 * List Users Response Schema
 */
export const ListUsersResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

/**
 * Delete User Response Schema
 */
export const DeleteUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
