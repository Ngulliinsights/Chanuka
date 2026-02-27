/**
 * Validation Module
 *
 * Unified validation infrastructure integrated with error handling.
 * Consolidates validation logic from across the client application.
 */

// Core validator
export { Validator, validator } from './validator';

// Convenience functions
export {
  validateField,
  validateForm,
  validateSchema,
  validateAsync,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUrl,
  validateRequired,
  validateLength,
  validateRange,
  validatePattern,
  validateUuid,
} from './validator';

// Field validators
export { VALIDATION_PATTERNS } from './validators';

// Form helpers
export {
  createRHFValidator,
  createRHFAsyncValidator,
  schemaToRHFRules,
  validateFormForRHF,
  errorsToFieldMap,
  errorsToMessages,
  hasErrors,
  getFieldError,
  getFieldErrors,
  mergeErrors,
  filterErrorsByField,
  groupErrorsByField,
  createFormState,
  updateFormField,
  touchField,
  setFormErrors,
  clearFormErrors,
  resetForm,
  shouldShowFieldError,
} from './form-helpers';

export type { FormState } from './form-helpers';

// Sanitization
export {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeHtml,
  sanitizePlainText,
  escapeHtml,
  unescapeHtml,
  hasSqlInjection,
  hasXss,
  sanitizeFilename,
  sanitizeUsername,
  sanitizeSearchQuery,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeCurrency,
  sanitizeCreditCard,
  sanitizePostalCode,
  checkSecurity,
  SECURITY_PATTERNS,
} from './sanitization';

export type { SanitizeOptions } from './sanitization';

// Types
export type {
  ValidationResult,
  ValidationFieldError,
  ValidationError,
  ValidationRule,
  FieldValidationRules,
  FormValidationSchema,
  IValidator,
  ZodSchema,
  ZodError,
  ZodIssue,
} from './types';

export { z } from './types';
