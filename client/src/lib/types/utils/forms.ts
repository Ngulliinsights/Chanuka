/**
 * Form-related utility types
 */

// Single form field state
export type FormField<T> = {
  value: T;
  error?: string;
  touched?: boolean;
  dirty?: boolean;
};

// Form state with all fields
export type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

// Form field validation rule
export type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

// Validation result types - re-exported from common.ts to avoid duplication
import type { ValidationResult, FieldValidationResult } from './common';
export type { ValidationResult, FieldValidationResult } from './common';

// Validator function
export type Validator<T> = (value: T) => ValidationResult;

// Async validator
export type AsyncValidator<T> = (value: T) => Promise<ValidationResult>;
