/**
 * Form Validation Helpers
 *
 * Utilities for form validation including React Hook Form integration.
 */

import type { FieldValidationRules, FormValidationSchema, ValidationFieldError } from './types';
import { validator } from './validator';

// ============================================================================
// Form Validation Helpers
// ============================================================================

/**
 * Create a validation function for React Hook Form
 */
export function createRHFValidator(rules: FieldValidationRules) {
  return (value: unknown) => {
    const result = validator.validate(value, rules);

    if (!result.success && result.errors && result.errors.length > 0) {
      return result.errors[0].message;
    }

    return true;
  };
}

/**
 * Create async validation function for React Hook Form
 */
export function createRHFAsyncValidator(rules: FieldValidationRules) {
  return async (value: unknown) => {
    const result = await validator.validateAsync(value, rules);

    if (!result.success && result.errors && result.errors.length > 0) {
      return result.errors[0].message;
    }

    return true;
  };
}

/**
 * Convert validation schema to React Hook Form validation rules
 */
export function schemaToRHFRules(schema: FormValidationSchema) {
  const rhfRules: Record<string, any> = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    rhfRules[fieldName] = {
      required: rules.required ? 'This field is required' : false,
      minLength: rules.minLength
        ? {
            value: rules.minLength,
            message: `Must be at least ${rules.minLength} characters`,
          }
        : undefined,
      maxLength: rules.maxLength
        ? {
            value: rules.maxLength,
            message: `Must be no more than ${rules.maxLength} characters`,
          }
        : undefined,
      min: rules.min
        ? {
            value: rules.min,
            message: `Must be at least ${rules.min}`,
          }
        : undefined,
      max: rules.max
        ? {
            value: rules.max,
            message: `Must be no more than ${rules.max}`,
          }
        : undefined,
      pattern: rules.pattern
        ? {
            value: rules.pattern,
            message: 'Invalid format',
          }
        : undefined,
      validate: createRHFValidator(rules),
    };
  }

  return rhfRules;
}

/**
 * Validate form data and return errors in React Hook Form format
 */
export function validateFormForRHF<T extends Record<string, unknown>>(
  data: T,
  schema: FormValidationSchema
): Record<string, { type: string; message: string }> | undefined {
  const result = validator.validateForm(data, schema);

  if (!result.success && result.errors) {
    const rhfErrors: Record<string, { type: string; message: string }> = {};

    result.errors.forEach(error => {
      rhfErrors[error.field] = {
        type: error.code,
        message: error.message,
      };
    });

    return rhfErrors;
  }

  return undefined;
}

/**
 * Convert validation errors to field error map
 */
export function errorsToFieldMap(
  errors: ValidationFieldError[]
): Record<string, string> {
  const fieldMap: Record<string, string> = {};

  errors.forEach(error => {
    // Only keep the first error for each field
    if (!fieldMap[error.field]) {
      fieldMap[error.field] = error.message;
    }
  });

  return fieldMap;
}

/**
 * Convert validation errors to array of error messages
 */
export function errorsToMessages(errors: ValidationFieldError[]): string[] {
  return errors.map(error => `${error.field}: ${error.message}`);
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: ValidationFieldError[] | undefined): boolean {
  return !!errors && errors.length > 0;
}

/**
 * Get error message for a specific field
 */
export function getFieldError(
  errors: ValidationFieldError[] | undefined,
  fieldName: string
): string | undefined {
  if (!errors) return undefined;

  const fieldError = errors.find(error => error.field === fieldName);
  return fieldError?.message;
}

/**
 * Get all error messages for a specific field
 */
export function getFieldErrors(
  errors: ValidationFieldError[] | undefined,
  fieldName: string
): string[] {
  if (!errors) return [];

  return errors.filter(error => error.field === fieldName).map(error => error.message);
}

/**
 * Merge multiple validation error arrays
 */
export function mergeErrors(
  ...errorArrays: (ValidationFieldError[] | undefined)[]
): ValidationFieldError[] {
  const merged: ValidationFieldError[] = [];

  errorArrays.forEach(errors => {
    if (errors) {
      merged.push(...errors);
    }
  });

  return merged;
}

/**
 * Filter errors by field name pattern
 */
export function filterErrorsByField(
  errors: ValidationFieldError[] | undefined,
  pattern: string | RegExp
): ValidationFieldError[] {
  if (!errors) return [];

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  return errors.filter(error => regex.test(error.field));
}

/**
 * Group errors by field
 */
export function groupErrorsByField(
  errors: ValidationFieldError[] | undefined
): Record<string, ValidationFieldError[]> {
  if (!errors) return {};

  const grouped: Record<string, ValidationFieldError[]> = {};

  errors.forEach(error => {
    if (!grouped[error.field]) {
      grouped[error.field] = [];
    }
    grouped[error.field].push(error);
  });

  return grouped;
}

// ============================================================================
// Form State Helpers
// ============================================================================

/**
 * Form state interface
 */
export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Create initial form state
 */
export function createFormState<T extends Record<string, unknown>>(
  initialData: T
): FormState<T> {
  return {
    data: initialData,
    errors: {},
    touched: {},
    isValid: true,
    isSubmitting: false,
    isDirty: false,
  };
}

/**
 * Update form field value
 */
export function updateFormField<T extends Record<string, unknown>>(
  state: FormState<T>,
  fieldName: keyof T,
  value: unknown
): FormState<T> {
  return {
    ...state,
    data: {
      ...state.data,
      [fieldName]: value,
    },
    isDirty: true,
  };
}

/**
 * Mark field as touched
 */
export function touchField<T extends Record<string, unknown>>(
  state: FormState<T>,
  fieldName: string
): FormState<T> {
  return {
    ...state,
    touched: {
      ...state.touched,
      [fieldName]: true,
    },
  };
}

/**
 * Set form errors
 */
export function setFormErrors<T extends Record<string, unknown>>(
  state: FormState<T>,
  errors: ValidationFieldError[]
): FormState<T> {
  return {
    ...state,
    errors: errorsToFieldMap(errors),
    isValid: errors.length === 0,
  };
}

/**
 * Clear form errors
 */
export function clearFormErrors<T extends Record<string, unknown>>(
  state: FormState<T>
): FormState<T> {
  return {
    ...state,
    errors: {},
    isValid: true,
  };
}

/**
 * Reset form to initial state
 */
export function resetForm<T extends Record<string, unknown>>(
  initialData: T
): FormState<T> {
  return createFormState(initialData);
}

/**
 * Check if field should show error (touched and has error)
 */
export function shouldShowFieldError<T extends Record<string, unknown>>(
  state: FormState<T>,
  fieldName: string
): boolean {
  return !!state.touched[fieldName] && !!state.errors[fieldName];
}
