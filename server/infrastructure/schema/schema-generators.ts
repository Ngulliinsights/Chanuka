// ============================================================================
// SCHEMA-TO-TYPE GENERATORS - Utilities for Type Generation
// ============================================================================
// Provides utilities for generating and managing types from database schemas
// Integrates with branded types and validation schemas

import { z } from "zod";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  UserId,
  BillId,
  SessionId,
  ModerationId,
  LegislatorId,
  CommitteeId,
  SponsorId,
  AmendmentId,
  ConferenceId,
  createBrandedId,
  isBrandedId,
} from "@shared/validation/schemas/common";
import type { ValidatedType } from "../../../shared/types/core/validation";
import { createValidatedType } from "../../../shared/types/core/validation";

// ============================================================================
// BRANDED TYPE GENERATORS - Create and Validate Branded IDs
// ============================================================================

/**
 * Generator for branded ID values from database queries
 * Ensures all database IDs are properly branded
 */
export class BrandedIdGenerator {
  /**
   * Create UserId from database value
   */
  static userId(id: string): UserId {
    return createBrandedId<UserId>(id);
  }

  /**
   * Create BillId from database value
   */
  static billId(id: string): BillId {
    return createBrandedId<BillId>(id);
  }

  /**
   * Create SessionId from database value
   */
  static sessionId(id: string): SessionId {
    return createBrandedId<SessionId>(id);
  }

  /**
   * Create ModerationId from database value
   */
  static moderationId(id: string): ModerationId {
    return createBrandedId<ModerationId>(id);
  }

  /**
   * Create LegislatorId from database value
   */
  static legislatorId(id: string): LegislatorId {
    return createBrandedId<LegislatorId>(id);
  }

  /**
   * Create CommitteeId from database value
   */
  static committeeId(id: string): CommitteeId {
    return createBrandedId<CommitteeId>(id);
  }

  /**
   * Create SponsorId from database value
   */
  static sponsorId(id: string): SponsorId {
    return createBrandedId<SponsorId>(id);
  }

  /**
   * Create AmendmentId from database value
   */
  static amendmentId(id: string): AmendmentId {
    return createBrandedId<AmendmentId>(id);
  }

  /**
   * Create ConferenceId from database value
   */
  static conferenceId(id: string): ConferenceId {
    return createBrandedId<ConferenceId>(id);
  }
}

// ============================================================================
// SCHEMA MIGRATION UTILITIES - Transform Data Between Schemas
// ============================================================================

/**
 * Configuration for schema transformation
 */
export interface SchemaTransformConfig<T = any> {
  /** Source schema for validation */
  sourceSchema?: z.ZodSchema;
  /** Target schema for validation */
  targetSchema?: z.ZodSchema;
  /** Field mapping from source to target */
  fieldMap?: Record<string, string>;
  /** Custom transformers for specific fields */
  fieldTransformers?: Record<string, (value: unknown) => any>;
  /** Whether to strip unknown fields */
  stripUnknown?: boolean;
}

/**
 * Transform data from one schema to another
 * Useful for database migrations and data transformations
 */
export async function transformData<T, U>(
  data: T,
  config: SchemaTransformConfig<T>
): Promise<U> {
  let transformed: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  // Apply field mapping
  if (config.fieldMap) {
    for (const [source, target] of Object.entries(config.fieldMap)) {
      if (source in transformed && target !== source) {
        transformed[target] = transformed[source];
        if (source !== target) {
          delete transformed[source];
        }
      }
    }
  }

  // Apply custom transformers
  if (config.fieldTransformers) {
    for (const [field, transformer] of Object.entries(config.fieldTransformers)) {
      if (field in transformed) {
        transformed[field] = transformer(transformed[field]);
      }
    }
  }

  // Validate against target schema if provided
  if (config.targetSchema) {
    const parsed = await config.targetSchema.parseAsync(transformed);
    transformed = config.stripUnknown ? parsed : transformed;
  }

  return transformed as U;
}

// ============================================================================
// TYPE-TO-SCHEMA REGISTRY - Map Database Types to Schemas
// ============================================================================

/**
 * Registry for mapping database types to their corresponding schemas
 * Enables dynamic schema retrieval and validation
 */
export class TypeSchemaRegistry {
  private static schemas: Map<string, z.ZodSchema> = new Map();
  private static validatedTypes: Map<string, ValidatedType<any>> = new Map();

  /**
   * Register a schema for a type
   */
  static registerSchema<T extends string = string>(
    typeName: T,
    schema: z.ZodSchema,
    validatedType?: ValidatedType<any>
  ): void {
    this.schemas.set(typeName, schema);
    if (validatedType) {
      this.validatedTypes.set(typeName, validatedType);
    }
  }

  /**
   * Get schema for a type
   */
  static getSchema<T extends string = string>(typeName: T): z.ZodSchema | undefined {
    return this.schemas.get(typeName);
  }

  /**
   * Get validated type for a type name
   */
  static getValidatedType<T extends string = string>(typeName: T): ValidatedType<any> | undefined {
    return this.validatedTypes.get(typeName);
  }

  /**
   * List all registered types
   */
  static listRegistered(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Check if a type is registered
   */
  static isRegistered<T extends string = string>(typeName: T): boolean {
    return this.schemas.has(typeName);
  }

  /**
   * Clear all registered schemas
   */
  static clear(): void {
    this.schemas.clear();
    this.validatedTypes.clear();
  }
}

// ============================================================================
// SCHEMA VALIDATION UTILITIES - Enhanced Validation with Context
// ============================================================================

/**
 * Validation context for enhanced error reporting
 */
export interface ValidationContext {
  /** Entity type being validated */
  entityType?: string;
  /** Operation context (e.g., 'create', 'update', 'delete') */
  operation?: 'create' | 'update' | 'delete' | 'query' | string;
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
  /** Field-specific validation rules */
  fieldRules?: Record<string, z.ZodSchema>;
}

/**
 * Validate data with context information
 * Provides enhanced error messages with context
 */
export async function validateWithContext<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: ValidationContext
): Promise<{ success: boolean; data?: T; error?: string; context?: ValidationContext }> {
  try {
    // Apply field-specific rules if provided
    let dataToValidate = data;
    if (context?.fieldRules) {
      const fieldValidations = await Promise.all(
        Object.entries(context.fieldRules).map(async ([field, fieldSchema]) => {
          const fieldValue = (data as Record<string, unknown>)?.[field];
          const result = await fieldSchema.parseAsync(fieldValue);
          return [field, result] as const;
        })
      );
      dataToValidate = Object.fromEntries(fieldValidations);
    }

    const validated = await schema.parseAsync(dataToValidate);
    return {
      success: true,
      data: validated,
      context,
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError
      ? error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      : String(error);

    return {
      success: false,
      error: errorMessage,
      context,
    };
  }
}

// ============================================================================
// SCHEMA INTROSPECTION - Analyze Schema Structure
// ============================================================================

/**
 * Introspection result for schema analysis
 */
export interface SchemaIntrospectionResult {
  /** Schema shape/fields */
  shape: Record<string, unknown>;
  /** Required fields */
  requiredFields: string[];
  /** Optional fields */
  optionalFields: string[];
  /** Field types */
  fieldTypes: Record<string, string>;
}

/**
 * Introspect a Zod schema to understand its structure
 * Useful for dynamic validation and documentation
 */
export function introspectSchema(schema: z.ZodSchema): SchemaIntrospectionResult {
  const shape: Record<string, unknown> = {};
  const requiredFields: string[] = [];
  const optionalFields: string[] = [];
  const fieldTypes: Record<string, string> = {};

  // Extract shape from schema
  if (schema instanceof z.ZodObject) {
    const fields = schema.shape;
    for (const [fieldName, fieldSchema] of Object.entries(fields)) {
      shape[fieldName] = fieldSchema;

      // Determine if required or optional
      if (fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodNullable) {
        optionalFields.push(fieldName);
      } else {
        requiredFields.push(fieldName);
      }

      // Extract type information
      fieldTypes[fieldName] = fieldSchema._type ?? 'unknown';
    }
  }

  return {
    shape,
    requiredFields,
    optionalFields,
    fieldTypes,
  };
}

// ============================================================================
// SCHEMA COMPOSITION - Build Complex Schemas
// ============================================================================

/**
 * Compose multiple schemas into a single schema
 * Useful for combining validation rules from different sources
 */
export function composeSchemas<T extends Record<string, unknown>>(
  baseSchema: z.ZodSchema<T>,
  ...additionalSchemas: z.ZodSchema[]
): z.ZodSchema<T> {
  return baseSchema.and(z.intersection(...additionalSchemas));
}

/**
 * Extend a schema with additional validation
 * Useful for adding runtime-specific rules
 */
export function extendSchema<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  rules: Record<string, z.ZodSchema>
): z.ZodSchema<T> {
  const extensions = z.object(rules);
  return schema.and(extensions);
}

// ============================================================================
// SCHEMA GENERATORS VERSION & CHANGELOG
// ============================================================================

export const SCHEMA_GENERATORS_VERSION = "1.0.0";
export const SCHEMA_GENERATORS_CHANGELOG = {
  "1.0.0": `Schema-to-type generators and utilities:

  - BrandedIdGenerator for creating branded IDs from database values
  - Schema transformation utilities for migrations
  - TypeSchemaRegistry for dynamic schema management
  - Validation with enhanced context information
  - Schema introspection for understanding schema structure
  - Schema composition utilities for combining rules
  - Comprehensive error reporting with context

  Key Features:
  ✅ Branded ID generation from database values
  ✅ Schema transformation and migration utilities
  ✅ Dynamic schema registry and retrieval
  ✅ Context-aware validation with enhanced errors
  ✅ Schema introspection for analysis
  ✅ Schema composition for complex rules
  ✅ Full TypeScript type safety
  ✅ Integration with Zod and branded types
  ✅ Extensible architecture
  `,
} as const;

