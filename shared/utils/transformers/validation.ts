/**
 * Validation Middleware for Transformers
 * 
 * Provides Zod schema-based validation before transformation.
 * Ensures data integrity at transformation boundaries.
 * 
 * Requirements: 5.2, 5.3
 */

import { z } from 'zod';
import type { Transformer } from './types';
import { ErrorContextBuilder } from '../errors/context';
import { ValidationError } from '../errors/types';

/**
 * Options for creating a validating transformer
 */
export interface ValidatingTransformerOptions<TSource, TTarget> {
  /**
   * Zod schema to validate source data before transformation
   */
  sourceSchema?: z.ZodSchema<TSource>;
  
  /**
   * Zod schema to validate target data before reverse transformation
   */
  targetSchema?: z.ZodSchema<TTarget>;
  
  /**
   * Name of the entity being transformed (for error messages)
   */
  entityName?: string;
  
  /**
   * Whether to validate source data during transform operation
   * @default true
   */
  validateOnTransform?: boolean;
  
  /**
   * Whether to validate target data during reverse operation
   * @default true
   */
  validateOnReverse?: boolean;
}

/**
 * Creates a validating transformer that validates data using Zod schemas
 * before performing transformations.
 * 
 * This ensures that:
 * 1. Invalid data is rejected before transformation (fail fast)
 * 2. Validation errors include field-level details
 * 3. Error context is enriched with operation and layer information
 * 
 * @param transformer - The base transformer to wrap with validation
 * @param options - Validation options including Zod schemas
 * @returns A new transformer that validates before transforming
 * 
 * @example
 * ```typescript
 * const userTransformer = createValidatingTransformer(
 *   baseUserTransformer,
 *   {
 *     sourceSchema: UserDomainSchema,
 *     targetSchema: UserDbSchema,
 *     entityName: 'User',
 *   }
 * );
 * 
 * // This will validate the user object before transforming
 * const dbUser = userTransformer.transform(domainUser);
 * ```
 */
export function createValidatingTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>,
  options: ValidatingTransformerOptions<TSource, TTarget>
): Transformer<TSource, TTarget> {
  const {
    sourceSchema,
    targetSchema,
    entityName = 'Entity',
    validateOnTransform = true,
    validateOnReverse = true,
  } = options;

  return {
    transform: (source: TSource): TTarget => {
      // Validate source data before transformation
      if (validateOnTransform && sourceSchema) {
        const result = sourceSchema.safeParse(source);
        
        if (!result.success) {
          const context = new ErrorContextBuilder()
            .operation(`${entityName}.transform`)
            .layer('transformation')
            .field('source')
            .value(source)
            .severity('high')
            .metadata({
              validationErrors: result.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            })
            .build();
          
          // Format validation errors consistently
          const errorMessages = result.error.errors.map(err => {
            const field = err.path.join('.') || 'root';
            return `${field}: ${err.message}`;
          });
          
          throw new ValidationError(
            `Validation failed for ${entityName} source data: ${errorMessages.join(', ')}`,
            context,
            result.error.errors.map(err => ({
              field: err.path.join('.') || 'root',
              rule: err.code,
              message: err.message,
            }))
          );
        }
      }

      // Perform transformation
      return transformer.transform(source);
    },

    reverse: (target: TTarget): TSource => {
      // Validate target data before reverse transformation
      if (validateOnReverse && targetSchema) {
        const result = targetSchema.safeParse(target);
        
        if (!result.success) {
          const context = new ErrorContextBuilder()
            .operation(`${entityName}.reverse`)
            .layer('transformation')
            .field('target')
            .value(target)
            .severity('high')
            .metadata({
              validationErrors: result.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            })
            .build();
          
          // Format validation errors consistently
          const errorMessages = result.error.errors.map(err => {
            const field = err.path.join('.') || 'root';
            return `${field}: ${err.message}`;
          });
          
          throw new ValidationError(
            `Validation failed for ${entityName} target data: ${errorMessages.join(', ')}`,
            context,
            result.error.errors.map(err => ({
              field: err.path.join('.') || 'root',
              rule: err.code,
              message: err.message,
            }))
          );
        }
      }

      // Perform reverse transformation
      return transformer.reverse(target);
    },
  };
}

/**
 * Creates a validating transformer with only source validation.
 * Useful when you only need to validate domain models before converting to DB format.
 * 
 * @param transformer - The base transformer to wrap
 * @param sourceSchema - Zod schema for source validation
 * @param entityName - Name of the entity for error messages
 * @returns A transformer that validates source data
 * 
 * @example
 * ```typescript
 * const userTransformer = createSourceValidatingTransformer(
 *   baseUserTransformer,
 *   UserDomainSchema,
 *   'User'
 * );
 * ```
 */
export function createSourceValidatingTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>,
  sourceSchema: z.ZodSchema<TSource>,
  entityName?: string
): Transformer<TSource, TTarget> {
  return createValidatingTransformer(transformer, {
    sourceSchema,
    entityName,
    validateOnTransform: true,
    validateOnReverse: false,
  });
}

/**
 * Creates a validating transformer with only target validation.
 * Useful when you only need to validate DB data before converting to domain models.
 * 
 * @param transformer - The base transformer to wrap
 * @param targetSchema - Zod schema for target validation
 * @param entityName - Name of the entity for error messages
 * @returns A transformer that validates target data
 * 
 * @example
 * ```typescript
 * const userTransformer = createTargetValidatingTransformer(
 *   baseUserTransformer,
 *   UserDbSchema,
 *   'User'
 * );
 * ```
 */
export function createTargetValidatingTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>,
  targetSchema: z.ZodSchema<TTarget>,
  entityName?: string
): Transformer<TSource, TTarget> {
  return createValidatingTransformer(transformer, {
    targetSchema,
    entityName,
    validateOnTransform: false,
    validateOnReverse: true,
  });
}

/**
 * Creates a bidirectional validating transformer that validates both directions.
 * This is the most comprehensive validation approach.
 * 
 * @param transformer - The base transformer to wrap
 * @param sourceSchema - Zod schema for source validation
 * @param targetSchema - Zod schema for target validation
 * @param entityName - Name of the entity for error messages
 * @returns A transformer that validates in both directions
 * 
 * @example
 * ```typescript
 * const userTransformer = createBidirectionalValidatingTransformer(
 *   baseUserTransformer,
 *   UserDomainSchema,
 *   UserDbSchema,
 *   'User'
 * );
 * ```
 */
export function createBidirectionalValidatingTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>,
  sourceSchema: z.ZodSchema<TSource>,
  targetSchema: z.ZodSchema<TTarget>,
  entityName?: string
): Transformer<TSource, TTarget> {
  return createValidatingTransformer(transformer, {
    sourceSchema,
    targetSchema,
    entityName,
    validateOnTransform: true,
    validateOnReverse: true,
  });
}

/**
 * Validates data against a Zod schema and throws a ValidationError if invalid.
 * This is a standalone validation function that can be used outside of transformers.
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param entityName - Name of the entity for error messages
 * @param operation - Name of the operation for error context
 * @returns The validated data (typed)
 * @throws ValidationError if validation fails
 * 
 * @example
 * ```typescript
 * const validatedUser = validateData(userData, UserSchema, 'User', 'createUser');
 * ```
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  entityName: string,
  operation: string
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const context = new ErrorContextBuilder()
      .operation(operation)
      .layer('validation')
      .value(data)
      .severity('high')
      .metadata({
        validationErrors: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      })
      .build();
    
    // Format validation errors consistently: "{field}: {rule} - {description}"
    const errorMessages = result.error.errors.map(err => {
      const field = err.path.join('.') || 'root';
      return `${field}: ${err.code} - ${err.message}`;
    });
    
    throw new ValidationError(
      `Validation failed for ${entityName}: ${errorMessages.join(', ')}`,
      context,
      result.error.errors.map(err => ({
        field: err.path.join('.') || 'root',
        rule: err.code,
        message: err.message,
      }))
    );
  }
  
  return result.data;
}

/**
 * Validates data and returns a result object instead of throwing.
 * Useful for scenarios where you want to handle validation errors gracefully.
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Result object with success flag and either data or errors
 * 
 * @example
 * ```typescript
 * const result = validateDataSafe(userData, UserSchema);
 * if (result.success) {
 *   console.log('Valid user:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateDataSafe<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Array<{ field: string; rule: string; message: string }> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.') || 'root',
      rule: err.code,
      message: err.message,
    })),
  };
}
