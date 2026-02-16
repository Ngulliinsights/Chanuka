// ============================================================================
// VALIDATION INTEGRATION - Database Type Validation Layer
// ============================================================================
// Comprehensive validation integration for database types
// Connects Drizzle ORM schemas with Zod validation and runtime type checking

import { z } from "zod";
import { createValidatedType, ValidatedType, validateWithSchema } from "../types/core/validation";
import { ValidationError, Result } from "../types/core/errors";
import { isBrandedId } from "../types/core/common";

// Import database types
import { users, userRelations, UserSchema, ValidatedUserType, isUser } from "./integration";
import { bills, billRelations, sponsors, sponsorRelations, governors, governorRelations, committees, committeeRelations, BillSchema, SponsorSchema, ValidatedBillType, ValidatedSponsorType } from "./integration-extended";

// ============================================================================
// COMPREHENSIVE VALIDATION INTEGRATION
// ============================================================================

/**
 * Database Validation Registry
 * Centralized registry for all database entity validations
 */
export const DatabaseValidationRegistry = {
  users: {
    schema: UserSchema,
    validatedType: createValidatedType(UserSchema, 'User'),
    typeGuard: (value: unknown): value is typeof users.$inferSelect => {
      return UserSchema.safeParse(value).success;
    },
  },
  bills: {
    schema: BillSchema,
    validatedType: createValidatedType(BillSchema, 'Bill'),
    typeGuard: (value: unknown): value is typeof bills.$inferSelect => {
      return BillSchema.safeParse(value).success;
    },
  },
  sponsors: {
    schema: SponsorSchema,
    validatedType: createValidatedType(SponsorSchema, 'Sponsor'),
    typeGuard: (value: unknown): value is typeof sponsors.$inferSelect => {
      return SponsorSchema.safeParse(value).success;
    },
  },
} as const;

// ============================================================================
// VALIDATION UTILITIES - Database-Specific
// ============================================================================

/**
 * Validate database entity with comprehensive error reporting
 * Integrates Zod validation with database constraints
 */
export function validateDatabaseEntity<T extends keyof typeof DatabaseValidationRegistry>(
  entityType: T,
  data: unknown
): Result<typeof DatabaseValidationRegistry[T]['validatedType']['_type'], ValidationError> {
  const validator = DatabaseValidationRegistry[entityType];
  return validator.validatedType.validate(data);
}

/**
 * Validate database entity asynchronously
 * Useful for complex validation scenarios
 */
export async function validateDatabaseEntityAsync<T extends keyof typeof DatabaseValidationRegistry>(
  entityType: T,
  data: unknown
): Promise<Result<typeof DatabaseValidationRegistry[T]['validatedType']['_type'], ValidationError>> {
  const validator = DatabaseValidationRegistry[entityType];
  return validator.validatedType.validateAsync(data);
}

/**
 * Batch validation for database operations
 * Validates multiple entities with comprehensive error reporting
 */
export function validateDatabaseBatch<T extends keyof typeof DatabaseValidationRegistry>(
  entityType: T,
  items: unknown[]
): Result<typeof DatabaseValidationRegistry[T]['validatedType']['_type'][], ValidationError> {
  const validator = DatabaseValidationRegistry[entityType];
  const validatedItems: typeof DatabaseValidationRegistry[T]['validatedType']['_type'][] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = validator.validatedType.validate(item);

    if (result.success) {
      validatedItems.push(result.data);
    } else {
      errors.push({
        index: i,
        error: result.error.message
      });
    }
  }

  if (errors.length === 0) {
    return { success: true, data: validatedItems };
  }

  return {
    success: false,
    error: new ValidationError(`Database validation failed for ${errors.length} items`, undefined, {
      errors,
      totalItems: items.length,
      validItems: validatedItems.length,
      entityType
    })
  };
}

// ============================================================================
// BRANDED TYPE VALIDATION - Type-Safe Database Operations
// ============================================================================

/**
 * Validate branded ID for database operations
 * Ensures type safety across the application
 */
export function validateBrandedId<T extends string>(
  value: unknown,
  brand: T,
  context?: { fieldName?: string; entityType?: string }
): Result<string & { readonly __brand: T }, ValidationError> {
  if (isBrandedId(value, brand)) {
    return { success: true, data: value };
  }

  const fieldName = context?.fieldName ?? 'id';
  const entityType = context?.entityType ?? 'entity';

  return {
    success: false,
    error: new ValidationError(
      `Invalid ${brand} for ${fieldName} in ${entityType}: expected branded ${brand}, got ${typeof value}`,
      fieldName,
      { value, expectedBrand: brand, entityType }
    )
  };
}

/**
 * Validate multiple branded IDs
 * Useful for foreign key relationships
 */
export function validateBrandedIds<T extends string>(
  values: unknown[],
  brand: T,
  context?: { fieldName?: string; entityType?: string }
): Result<(string & { readonly __brand: T })[], ValidationError> {
  const fieldName = context?.fieldName ?? 'ids';
  const entityType = context?.entityType ?? 'entities';
  const validatedIds: any[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (isBrandedId(value, brand)) {
      validatedIds.push(value);
    } else {
      errors.push({
        index: i,
        error: `Invalid ${brand} at index ${i}`
      });
    }
  }

  if (errors.length === 0) {
    return { success: true, data: validatedIds };
  }

  return {
    success: false,
    error: new ValidationError(
      `Validation failed for ${errors.length} ${brand} items in ${fieldName}`,
      fieldName,
      { errors, totalItems: values.length, validItems: validatedIds.length, entityType }
    )
  };
}

// ============================================================================
// DATABASE CONSTRAINT VALIDATION - Schema-Level Validation
// ============================================================================

/**
 * Database constraint validation schemas
 * Ensures data meets database-level constraints before insertion
 */
export const DatabaseConstraintSchemas = {
  // User constraints
  UserConstraints: z.object({
    email: z.string().email(),
    password_hash: z.string().min(60).max(255), // BCrypt hash length
    role: z.enum(['citizen', 'verified_citizen', 'ambassador', 'expert_verifier', 'mp_staff', 'clerk', 'admin', 'auditor', 'journalist']),
    failed_login_attempts: z.number().int().min(0).max(10),
    is_active: z.boolean(),
  }),

  // Bill constraints
  BillConstraints: z.object({
    bill_number: z.string().min(1).max(50),
    title: z.string().min(1).max(500),
    status: z.enum(['first_reading', 'second_reading', 'committee_stage', 'third_reading', 'presidential_assent', 'gazetted', 'withdrawn', 'lost', 'enacted']),
    chamber: z.enum(['national_assembly', 'senate', 'county_assembly']),
    view_count: z.number().int().min(0),
    engagement_score: z.number().min(0),
    trending_score: z.number().min(0),
  }),

  // Sponsor constraints
  SponsorConstraints: z.object({
    name: z.string().min(1).max(255),
    chamber: z.enum(['national_assembly', 'senate', 'county_assembly']),
    bills_sponsored: z.number().int().min(0),
    bills_passed: z.number().int().min(0),
    attendance_rate: z.number().min(0).max(100).optional(),
    performance_score: z.number().min(0).max(100).optional(),
    is_active: z.boolean(),
  }),
} as const;

/**
 * Validate database constraints
 * Ensures data meets schema-level constraints
 */
export function validateDatabaseConstraints<T extends keyof typeof DatabaseConstraintSchemas>(
  constraintType: T,
  data: unknown
): Result<z.infer<(typeof DatabaseConstraintSchemas)[T]>, ValidationError> {
  const schema = DatabaseConstraintSchemas[constraintType];
  return validateWithSchema(schema, data, { typeName: constraintType });
}

// ============================================================================
// TRANSACTION VALIDATION - Multi-Entity Validation
// ============================================================================

/**
 * Transaction validation result
 * Comprehensive validation for database transactions
 */
export interface TransactionValidationResult {
  success: boolean;
  validatedEntities: Record<string, any>;
  errors: Record<string, ValidationError>;
  errorCount: number;
}

/**
 * Validate database transaction with multiple entities
 * Ensures atomic validation across related entities
 */
export function validateDatabaseTransaction(
  transaction: { entityType: keyof typeof DatabaseValidationRegistry; data: unknown }[]
): TransactionValidationResult {
  const validatedEntities: Record<string, any> = {};
  const errors: Record<string, ValidationError> = {};
  let errorCount = 0;

  for (const { entityType, data } of transaction) {
    const result = validateDatabaseEntity(entityType, data);

    if (result.success) {
      validatedEntities[entityType] = result.data;
    } else {
      errors[entityType] = result.error;
      errorCount++;
    }
  }

  return {
    success: errorCount === 0,
    validatedEntities,
    errors,
    errorCount
  };
}

// ============================================================================
// VALIDATION INTEGRATION - Type Exports
// ============================================================================

export type {
  DatabaseValidationRegistry,
  TransactionValidationResult,
};

export {
  validateDatabaseEntity,
  validateDatabaseEntityAsync,
  validateDatabaseBatch,
  validateBrandedId,
  validateBrandedIds,
  validateDatabaseConstraints,
  validateDatabaseTransaction,
  DatabaseConstraintSchemas,
};

// ============================================================================
// VALIDATION INTEGRATION VERSION & CHANGELOG
// ============================================================================

export const VALIDATION_INTEGRATION_VERSION = "1.0.0";
export const VALIDATION_INTEGRATION_CHANGELOG = {
  "1.0.0": `Comprehensive validation integration for database types:

  - Database Validation Registry for centralized validation management
  - Entity-specific validation with Zod integration
  - Batch validation for database operations
  - Branded type validation for type-safe operations
  - Database constraint validation at schema level
  - Transaction validation for multi-entity operations
  - Comprehensive error reporting and handling
  - Full integration with existing validation utilities

  Key Features:
  ✅ Centralized validation registry for all database entities
  ✅ Comprehensive error reporting with context
  ✅ Batch validation for bulk operations
  ✅ Branded type validation for foreign keys
  ✅ Database constraint validation
  ✅ Transaction validation for atomic operations
  ✅ Full TypeScript type safety
  ✅ Integration with Zod validation
  ✅ Backward compatibility maintained
  `,
} as const;
