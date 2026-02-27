/**
 * Core Validator Implementation
 *
 * Main validator class that integrates with the error handling system.
 */

import { z } from 'zod';
import { ErrorFactory, coreErrorHandler } from '../error';
import type {
  FieldValidationRules,
  FormValidationSchema,
  IValidator,
  ValidationError,
  ValidationFieldError,
  ValidationResult,
} from './types';
import {
  validateEmail,
  validateLength,
  validatePassword,
  validatePattern,
  validatePhone,
  validateRange,
  validateRequired,
  validateUrl,
  validateUuid,
} from './validators';

/**
 * Core validator implementation
 */
export class Validator implements IValidator {
  /**
   * Validate a single value against rules
   */
  validate<T>(value: T, rules: FieldValidationRules): ValidationResult<T> {
    const errors: ValidationFieldError[] = [];

    // Required validation
    if (rules.required) {
      const result = validateRequired(value, 'value');
      if (!result.success && result.errors) {
        errors.push(...result.errors);
        return { success: false, errors };
      }
    }

    // Skip other validations if value is empty and not required
    if (!value && !rules.required) {
      return { success: true, data: value };
    }

    // String validations
    if (typeof value === 'string') {
      // Length validation
      if (rules.minLength !== undefined || rules.maxLength !== undefined) {
        const result = validateLength(value, 'value', {
          min: rules.minLength,
          max: rules.maxLength,
        });
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }

      // Email validation
      if (rules.email) {
        const result = validateEmail(value);
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }

      // URL validation
      if (rules.url) {
        const result = validateUrl(value);
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }

      // Phone validation
      if (rules.phone) {
        const result = validatePhone(value);
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }

      // Pattern validation
      if (rules.pattern) {
        const result = validatePattern(value, 'value', rules.pattern);
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined || rules.max !== undefined) {
        const result = validateRange(value, 'value', {
          min: rules.min,
          max: rules.max,
        });
        if (!result.success && result.errors) {
          errors.push(...result.errors);
        }
      }
    }

    // Custom validations
    if (rules.custom) {
      for (const customRule of rules.custom) {
        const isValid = customRule.test(value);
        if (!isValid) {
          const message =
            typeof customRule.message === 'function'
              ? customRule.message(value)
              : customRule.message;
          errors.push({
            field: 'value',
            message,
            code: 'CUSTOM_VALIDATION',
            value,
          });
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: value };
  }

  /**
   * Validate a single field
   */
  validateField<T>(field: string, value: T, rules: FieldValidationRules): ValidationResult<T> {
    const result = this.validate(value, rules);

    // Update field names in errors
    if (!result.success && result.errors) {
      result.errors = result.errors.map(error => ({
        ...error,
        field,
      }));
    }

    return result;
  }

  /**
   * Validate an entire form
   */
  validateForm<T extends Record<string, unknown>>(
    data: T,
    schema: FormValidationSchema
  ): ValidationResult<T> {
    const allErrors: ValidationFieldError[] = [];

    // Validate each field
    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = data[fieldName];
      const result = this.validateField(fieldName, value, rules);

      if (!result.success && result.errors) {
        allErrors.push(...result.errors);
      }
    }

    if (allErrors.length > 0) {
      // Create validation error using error factory
      const validationError = this.createValidationError(
        'Form validation failed',
        allErrors,
        'form'
      );

      return {
        success: false,
        errors: allErrors,
        error: validationError,
      };
    }

    return { success: true, data };
  }

  /**
   * Validate against a Zod schema
   */
  validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: ValidationFieldError[] = error.errors.map(zodError => ({
          field: zodError.path.join('.'),
          message: zodError.message,
          code: zodError.code,
          value: data,
        }));

        const validationError = this.createValidationError(
          'Schema validation failed',
          fieldErrors,
          'schema',
          error
        );

        return {
          success: false,
          errors: fieldErrors,
          error: validationError,
        };
      }

      // Handle non-Zod errors
      const validationError = this.createValidationError(
        'Validation failed',
        [{ field: 'unknown', message: String(error), code: 'UNKNOWN_ERROR' }],
        'schema'
      );

      return {
        success: false,
        error: validationError,
      };
    }
  }

  /**
   * Async validation
   */
  async validateAsync<T>(value: T, rules: FieldValidationRules): Promise<ValidationResult<T>> {
    // Perform synchronous validations first
    const syncResult = this.validate(value, rules);
    if (!syncResult.success) {
      return syncResult;
    }

    // Perform async custom validations
    if (rules.custom) {
      const asyncRules = rules.custom.filter(rule => rule.async);
      const errors: ValidationFieldError[] = [];

      for (const asyncRule of asyncRules) {
        try {
          const isValid = await asyncRule.test(value);
          if (!isValid) {
            const message =
              typeof asyncRule.message === 'function'
                ? asyncRule.message(value)
                : asyncRule.message;
            errors.push({
              field: 'value',
              message,
              code: 'ASYNC_VALIDATION',
              value,
            });
          }
        } catch (error) {
          errors.push({
            field: 'value',
            message: `Async validation failed: ${error}`,
            code: 'ASYNC_ERROR',
            value,
          });
        }
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }
    }

    return { success: true, data: value };
  }

  /**
   * Create a validation error integrated with error handling system
   */
  private createValidationError(
    message: string,
    fieldErrors: ValidationFieldError[],
    validationType: 'field' | 'form' | 'schema' | 'custom',
    zodError?: z.ZodError
  ): ValidationError {
    // Create base error using factory
    const baseError = ErrorFactory.createValidationError(
      message,
      {
        fields: fieldErrors,
        validationType,
        zodError: zodError?.errors,
      },
      {
        component: 'Validator',
        operation: 'validate',
      }
    );

    // Extend with validation-specific properties
    const validationError = {
      ...baseError,
      fields: fieldErrors,
      validationType,
    } as ValidationError;

    // Track error through error handler
    coreErrorHandler.handleError(validationError);

    return validationError;
  }
}

/**
 * Singleton validator instance
 */
export const validator = new Validator();

/**
 * Convenience functions
 */

export function validateField<T>(
  field: string,
  value: T,
  rules: FieldValidationRules
): ValidationResult<T> {
  return validator.validateField(field, value, rules);
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  schema: FormValidationSchema
): ValidationResult<T> {
  return validator.validateForm(data, schema);
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  return validator.validateSchema(schema, data);
}

export async function validateAsync<T>(
  value: T,
  rules: FieldValidationRules
): Promise<ValidationResult<T>> {
  return validator.validateAsync(value, rules);
}

// Re-export common validators
export {
  validateEmail,
  validatePassword,
  validatePhone,
  validateUrl,
  validateRequired,
  validateLength,
  validateRange,
  validatePattern,
  validateUuid,
};
