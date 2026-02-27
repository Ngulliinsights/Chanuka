/**
 * Validation Types
 *
 * Type definitions for the unified validation system integrated with error handling.
 */

import { z } from 'zod';
import type { AppError } from '../error/types';

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Result of a validation operation
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ValidationError;
  errors?: ValidationFieldError[];
  warnings?: string[];
}

/**
 * Field-level validation error
 */
export interface ValidationFieldError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation error extending AppError
 */
export interface ValidationError extends AppError {
  fields?: ValidationFieldError[];
  validationType: 'field' | 'form' | 'schema' | 'custom';
}

// ============================================================================
// Validation Rule Types
// ============================================================================

/**
 * Validation rule definition
 */
export interface ValidationRule<T = unknown> {
  name: string;
  test: (value: T) => boolean | Promise<boolean>;
  message: string | ((value: T) => string);
  async?: boolean;
}

/**
 * Field validation rules
 */
export interface FieldValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  phone?: boolean;
  custom?: ValidationRule[];
}

/**
 * Form validation schema
 */
export interface FormValidationSchema {
  [fieldName: string]: FieldValidationRules;
}

// ============================================================================
// Validator Interface
// ============================================================================

/**
 * Core validator interface
 */
export interface IValidator {
  /**
   * Validate a single value against rules
   */
  validate<T>(value: T, rules: FieldValidationRules): ValidationResult<T>;

  /**
   * Validate a single field
   */
  validateField<T>(field: string, value: T, rules: FieldValidationRules): ValidationResult<T>;

  /**
   * Validate an entire form
   */
  validateForm<T extends Record<string, unknown>>(
    data: T,
    schema: FormValidationSchema
  ): ValidationResult<T>;

  /**
   * Validate against a Zod schema
   */
  validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T>;

  /**
   * Async validation
   */
  validateAsync<T>(value: T, rules: FieldValidationRules): Promise<ValidationResult<T>>;
}

// ============================================================================
// Common Validation Schemas (Re-export from Zod)
// ============================================================================

export type { ZodSchema, ZodError, ZodIssue } from 'zod';
export { z };
