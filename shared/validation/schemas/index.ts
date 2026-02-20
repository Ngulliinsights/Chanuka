/**
 * Validation Schema Registry
 *
 * Central registry for all validation schemas in the application.
 * Provides type-safe access to validation schemas and ensures single source of truth.
 */

import { z } from 'zod';

// Import all schemas
import { UserSchema, UserRegistrationSchema } from './user.schema';
import { BillSchema } from './bill.schema';
import { CommentSchema } from './comment.schema';

/**
 * Schema registry type
 */
export interface SchemaRegistry {
  readonly user: typeof UserSchema;
  readonly userRegistration: typeof UserRegistrationSchema;
  readonly bill: typeof BillSchema;
  readonly comment: typeof CommentSchema;
}

/**
 * Central validation schema registry
 * All validation schemas should be registered here
 */
export const ValidationSchemas: SchemaRegistry = {
  user: UserSchema,
  userRegistration: UserRegistrationSchema,
  bill: BillSchema,
  comment: CommentSchema,
} as const;

/**
 * Get schema by name
 */
export function getSchema<K extends keyof SchemaRegistry>(
  schemaName: K
): SchemaRegistry[K] {
  return ValidationSchemas[schemaName];
}

/**
 * Validate data against a registered schema
 */
export function validateWithSchema<K extends keyof SchemaRegistry>(
  schemaName: K,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<SchemaRegistry[K]>> {
  const schema = getSchema(schemaName);
  return schema.safeParse(data);
}

// Re-export all schemas
export { UserSchema, UserRegistrationSchema } from './user.schema';
export { BillSchema } from './bill.schema';
export { CommentSchema } from './comment.schema';

// Re-export validation rules
export { USER_VALIDATION_RULES } from './user.schema';
export { BILL_VALIDATION_RULES } from './bill.schema';
export { COMMENT_VALIDATION_RULES } from './comment.schema';

// Re-export common validation utilities
export {
  nonEmptyString,
  optionalNonEmptyString,
  nullableNonEmptyString,
  optionalNullableNonEmptyString,
  // Primitive schemas - Single Source of Truth
  emailSchema,
  uuidSchema,
  phoneSchema,
  urlSchema,
  userRoleSchema,
  paginationSchema,
  searchQuerySchema,
  dateRangeSchema,
  billIdSchema,
  userIdSchema,
  commentIdSchema,
} from './common';
