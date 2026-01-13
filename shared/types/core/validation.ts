/**
 * Type Validation Utilities
 * Runtime validation and type guards for type safety
 */

import { z, ZodSchema } from 'zod';
import { Result, ValidationError } from './errors';

/**
 * Type guard factory for consistent validation
 */
export function createTypeGuard<T>(
  validator: (value: unknown) => value is T,
  errorMessage: string
) {
  return (value: unknown): value is T => {
    try {
      return validator(value);
    } catch {
      console.warn(`Type guard failed: ${errorMessage}`);
      return false;
    }
  };
}

/**
 * Enhanced type guard factory with custom error handling
 */
export function createTypeGuardWithError<T>(
  validator: (value: unknown) => value is T,
  errorMessage: string,
  errorHandler?: (error: unknown) => void
) {
  return (value: unknown): value is T => {
    try {
      return validator(value);
    } catch (error) {
      console.warn(`Type guard failed: ${errorMessage}`);
      if (errorHandler) {
        errorHandler(error);
      }
      return false;
    }
  };
}

/**
 * ValidatedType interface for unified validation approach
 * Integrates Zod schemas with TypeScript types and runtime validation
 */
export interface ValidatedType<T> {
  readonly schema: ZodSchema<T>;
  readonly validate: (input: unknown) => Result<T, ValidationError>;
  readonly validateAsync: (input: unknown) => Promise<Result<T, ValidationError>>;
  readonly typeGuard: (input: unknown) => input is T;
}

/**
 * Create a validated type from a Zod schema
 */
export function createValidatedType<T>(
  schema: ZodSchema<T>,
  typeName: string
): ValidatedType<T> {
  return {
    schema,

    validate: (input: unknown): Result<T, ValidationError> => {
      try {
        const result = schema.parse(input);
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
          return {
            success: false,
            error: new ValidationError(`Validation failed for ${typeName}: ${errorMessages}`, undefined, {
              errors: error.errors,
              input
            })
          };
        }
        return {
          success: false,
          error: new ValidationError(`Validation failed for ${typeName}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, { input })
        };
      }
    },

    validateAsync: async (input: unknown): Promise<Result<T, ValidationError>> => {
      try {
        const result = await schema.parseAsync(input);
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
          return {
            success: false,
            error: new ValidationError(`Validation failed for ${typeName}: ${errorMessages}`, undefined, {
              errors: error.errors,
              input
            })
          };
        }
        return {
          success: false,
          error: new ValidationError(`Validation failed for ${typeName}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, { input })
        };
      }
    },

    typeGuard: (input: unknown): input is T => {
      return schema.safeParse(input).success;
    }
  };
}

/**
 * Runtime validation utilities with proper error handling
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  input: unknown,
  context?: { typeName?: string; fieldName?: string }
): Result<T, ValidationError> {
  try {
    const result = schema.parse(input);
    return { success: true, data: result };
  } catch (error) {
    const typeName = context?.typeName ?? 'unknown';
    const fieldName = context?.fieldName;

    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      return {
        success: false,
        error: new ValidationError(`Validation failed for ${typeName}${fieldName ? ` (field: ${fieldName})` : ''}: ${errorMessages}`, fieldName, {
          errors: error.errors,
          input
        })
      };
    }

    return {
      success: false,
      error: new ValidationError(`Validation failed for ${typeName}${fieldName ? ` (field: ${fieldName})` : ''}: ${error instanceof Error ? error.message : 'Unknown error'}`, fieldName, { input })
    };
  }
}

/**
 * Create a type guard from a Zod schema
 */
export function createZodTypeGuard<T>(
  schema: ZodSchema<T>,
  errorMessage: string
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    const result = schema.safeParse(value);
    if (!result.success) {
      console.warn(`Zod type guard failed: ${errorMessage}`);
      if (process.env.NODE_ENV === 'development') {
        console.debug('Validation errors:', result.error.errors);
      }
      return false;
    }
    return true;
  };
}

/**
 * Validate entity structure with enhanced error reporting
 */
export function validateEntityWithError<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  entityName: string
): Result<T, ValidationError> {
  if (validator(value)) {
    return { success: true, data: value };
  }

  return {
    success: false,
    error: new ValidationError(`Invalid ${entityName} structure`, undefined, {
      value,
      validator: validator.name
    })
  };
}

/**
 * Batch validation utility for arrays
 */
export function validateArray<T>(
  items: unknown[],
  validator: (value: unknown) => value is T,
  itemTypeName: string
): Result<T[], ValidationError> {
  const validatedItems: T[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (validator(item)) {
      validatedItems.push(item);
    } else {
      errors.push({
        index: i,
        error: `Invalid ${itemTypeName} at index ${i}`
      });
    }
  }

  if (errors.length === 0) {
    return { success: true, data: validatedItems };
  }

  return {
    success: false,
    error: new ValidationError(`Validation failed for ${errors.length} ${itemTypeName} items`, undefined, {
      errors,
      totalItems: items.length,
      validItems: validatedItems.length
    })
  };
}

/**
 * Create a validated type from a custom validator function
 */
export function createValidatedTypeFromValidator<T>(
  validator: (value: unknown) => value is T,
  typeName: string,
  schema?: ZodSchema<T>
): ValidatedType<T> {
  return {
    schema: schema ?? z.any() as ZodSchema<T>,

    validate: (input: unknown): Result<T, ValidationError> => {
      if (validator(input)) {
        return { success: true, data: input };
      }
      return {
        success: false,
        error: new ValidationError(`Validation failed for ${typeName}`, undefined, { input })
      };
    },

    validateAsync: async (input: unknown): Promise<Result<T, ValidationError>> => {
      if (validator(input)) {
        return { success: true, data: input };
      }
      return {
        success: false,
        error: new ValidationError(`Validation failed for ${typeName}`, undefined, { input })
      };
    },

    typeGuard: validator
  };
}

/**
 * Compose multiple validators into a single validator
 */
export function composeValidators<T>(
  validators: Array<(value: unknown) => value is T>,
  typeName: string
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    for (const validator of validators) {
      if (!validator(value)) {
        console.warn(`Composed validator failed for ${typeName}`);
        return false;
      }
    }
    return true;
  };
}

/**
 * Create a validated type that extends another validated type
 */
export function extendValidatedType<T, U extends T>(
  baseValidatedType: ValidatedType<T>,
  extensionValidator: (value: T) => value is U,
  extendedTypeName: string
): ValidatedType<U> {
  return {
    schema: baseValidatedType.schema as ZodSchema<U>,

    validate: (input: unknown): Result<U, ValidationError> => {
      const baseResult = baseValidatedType.validate(input);
      if (!baseResult.success) {
        return baseResult as Result<U, ValidationError>;
      }

      if (extensionValidator(baseResult.data)) {
        return { success: true, data: baseResult.data };
      }

      return {
        success: false,
        error: new ValidationError(`Extension validation failed for ${extendedTypeName}`, undefined, {
          baseValidation: 'success',
          input
        })
      };
    },

    validateAsync: async (input: unknown): Promise<Result<U, ValidationError>> => {
      const baseResult = await baseValidatedType.validateAsync(input);
      if (!baseResult.success) {
        return baseResult as Result<U, ValidationError>;
      }

      if (extensionValidator(baseResult.data)) {
        return { success: true, data: baseResult.data };
      }

      return {
        success: false,
        error: new ValidationError(`Extension validation failed for ${extendedTypeName}`, undefined, {
          baseValidation: 'success',
          input
        })
      };
    },

    typeGuard: (input: unknown): input is U => {
      return baseValidatedType.typeGuard(input) && extensionValidator(input as T);
    }
  };
}

/**
 * Basic type guards
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Entity validation utilities
 */
export function isBaseEntity(value: unknown): value is { id: string; createdAt: Date; updatedAt: Date } {
  return (
    isObject(value) &&
    isString(value.id) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  );
}

export function isSoftDeletableEntity(value: unknown): value is { deletedAt?: Date; isDeleted: boolean } {
  return (
    isObject(value) &&
    (value.deletedAt === undefined || isDate(value.deletedAt)) &&
    typeof value.isDeleted === 'boolean'
  );
}

/**
 * Validation result type (legacy - kept for backward compatibility)
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate entity structure (legacy - kept for backward compatibility)
 */
export function validateEntity<T>(
  value: unknown,
  validator: (value: unknown) => value is T
): ValidationResult<T> {
  if (validator(value)) {
    return { valid: true, data: value };
  }
  return { valid: false, errors: ['Invalid entity structure'] };
}
