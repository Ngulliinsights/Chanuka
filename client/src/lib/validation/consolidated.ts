import { z } from 'zod';

/**
 * Shared Validation Module - Consolidated
 *
 * Base validation utilities and schemas following navigation component patterns.
 * This module provides standardized validation patterns for all client components.
 */

// Base error class for validation errors
export class BaseValidationError extends Error {
  public readonly type: string;
  public readonly field: string;
  public readonly value: any;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    field: string,
    value: any,
    type: string = 'VALIDATION_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BaseValidationError';
    this.type = type;
    this.field = field;
    this.value = value;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BaseValidationError);
    }
  }
}

// Common validation schemas
export const CommonSchemas = {
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  id: z.string().min(1, 'ID cannot be empty'),
  uuid: z.string().uuid('Invalid UUID format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  dateString: z.string().datetime('Invalid date format'),
  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),
  nonEmptyArray: z.array(z.any()).min(1, 'Array cannot be empty'),
  boolean: z.boolean(),
  optionalString: z.string().optional(),
  optionalNumber: z.number().optional(),
  optionalBoolean: z.boolean().optional(),
};

// User role validation
export const UserRoleSchema = z.enum([
  'public',
  'citizen',
  'expert',
  'admin',
  'journalist',
  'advocate',
]);

// Component configuration schema
export const ComponentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  debug: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(100).max(30000).default(5000),
});

// Form validation schemas
export const FormFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(['text', 'email', 'password', 'number', 'select', 'textarea', 'checkbox', 'radio']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      custom: z.function().optional(),
    })
    .optional(),
});

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      details: z.record(z.any()).optional(),
    })
    .optional(),
  meta: z
    .object({
      timestamp: z.string().datetime(),
      requestId: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

// Validation utility functions
export function createValidationError(
  message: string,
  field: string,
  value: any,
  zodError?: z.ZodError
): BaseValidationError {
  return new BaseValidationError(message, field, value, 'VALIDATION_ERROR', { zodError });
}

export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = 'data'
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const field = firstError?.path.join('.') || fieldName;
      const message = firstError?.message || 'Validation failed';
      throw createValidationError(message, field, data, error);
    }
    throw createValidationError('Validation failed', fieldName, data);
  }
}

export function safeValidateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = 'data'
): { success: boolean; data?: T; error?: BaseValidationError } {
  try {
    const validatedData = validateWithSchema(schema, data, fieldName);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: error as BaseValidationError };
  }
}

// Specific validation functions
export function validateUserRole(role: string): string {
  return validateWithSchema(UserRoleSchema, role, 'role');
}

export function validateEmail(email: string): string {
  return validateWithSchema(CommonSchemas.email, email, 'email');
}

export function validateId(id: string): string {
  return validateWithSchema(CommonSchemas.id, id, 'id');
}

export function validateUrl(url: string): string {
  return validateWithSchema(CommonSchemas.url, url, 'url');
}

// Safe validation functions
export function safeValidateUserRole(role: string) {
  return safeValidateWithSchema(UserRoleSchema, role, 'role');
}

export function safeValidateEmail(email: string) {
  return safeValidateWithSchema(CommonSchemas.email, email, 'email');
}

export function safeValidateId(id: string) {
  return safeValidateWithSchema(CommonSchemas.id, id, 'id');
}

export function safeValidateUrl(url: string) {
  return safeValidateWithSchema(CommonSchemas.url, url, 'url');
}

export function validateFormField(field: unknown) {
  return validateWithSchema(FormFieldSchema, field, 'formField');
}

export function validateApiResponse(response: unknown) {
  return validateWithSchema(ApiResponseSchema, response, 'apiResponse');
}

export function validateComponentConfig(config: unknown) {
  return validateWithSchema(ComponentConfigSchema, config, 'componentConfig');
}

export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  fieldName: string = 'items'
): { valid: T[]; invalid: Array<{ item: unknown; error: BaseValidationError }> } {
  const valid: T[] = [];
  const invalid: Array<{ item: unknown; error: BaseValidationError }> = [];

  items.forEach((item, index) => {
    const result = safeValidateWithSchema(schema, item, `${fieldName}[${index}]`);
    if (result.success && result.data) {
      valid.push(result.data);
    } else if (result.error) {
      invalid.push({ item, error: result.error });
    }
  });

  return { valid, invalid };
}

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: BaseValidationError;
  warnings?: string[];
}

// Enhanced validation with warnings
export function validateWithWarnings<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = 'data',
  warningChecks?: Array<(data: T) => string | null>
): ValidationResult<T> {
  const result = safeValidateWithSchema(schema, data, fieldName);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const warnings: string[] = [];
  if (warningChecks && result.data) {
    warningChecks.forEach(check => {
      const warning = check(result.data!);
      if (warning) {
        warnings.push(warning);
      }
    });
  }

  return {
    success: true,
    data: result.data,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Re-export commonly used Zod utilities
export { z };
export type { ZodSchema, ZodError } from 'zod';

// For backward compatibility, export BaseValidationError as default too
export default BaseValidationError;
