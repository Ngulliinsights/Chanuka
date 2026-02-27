/**
 * Field Validators
 *
 * Common field validation functions for email, phone, URL, etc.
 */

import type { ValidationResult } from './types';

// ============================================================================
// Validation Patterns
// ============================================================================

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  alpha: /^[a-zA-Z\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_.]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

// ============================================================================
// Field Validators
// ============================================================================

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult<string> {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return {
      success: false,
      errors: [{ field: 'email', message: 'Email is required', code: 'REQUIRED' }],
    };
  }

  if (!VALIDATION_PATTERNS.email.test(trimmed)) {
    return {
      success: false,
      errors: [
        { field: 'email', message: 'Please enter a valid email address', code: 'INVALID_FORMAT' },
      ],
    };
  }

  if (trimmed.length > 254) {
    return {
      success: false,
      errors: [{ field: 'email', message: 'Email address is too long', code: 'MAX_LENGTH' }],
    };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult<string> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (!password) {
    return {
      success: false,
      errors: [{ field: 'password', message: 'Password is required', code: 'REQUIRED' }],
    };
  }

  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
      code: 'MIN_LENGTH',
    });
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
      code: 'MISSING_LOWERCASE',
    });
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: 'MISSING_UPPERCASE',
    });
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
      code: 'MISSING_NUMBER',
    });
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character',
      code: 'MISSING_SPECIAL',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: password };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult<string> {
  const trimmed = phone.trim();

  if (!trimmed) {
    return {
      success: false,
      errors: [{ field: 'phone', message: 'Phone number is required', code: 'REQUIRED' }],
    };
  }

  if (!VALIDATION_PATTERNS.phone.test(trimmed)) {
    return {
      success: false,
      errors: [
        { field: 'phone', message: 'Please enter a valid phone number', code: 'INVALID_FORMAT' },
      ],
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      success: false,
      errors: [
        { field: 'phone', message: 'Phone number must be at least 10 digits', code: 'MIN_LENGTH' },
      ],
    };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult<string> {
  const trimmed = url.trim();

  if (!trimmed) {
    return {
      success: false,
      errors: [{ field: 'url', message: 'URL is required', code: 'REQUIRED' }],
    };
  }

  if (!VALIDATION_PATTERNS.url.test(trimmed)) {
    return {
      success: false,
      errors: [{ field: 'url', message: 'Please enter a valid URL', code: 'INVALID_FORMAT' }],
    };
  }

  return { success: true, data: trimmed };
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      success: false,
      errors: [{ field: fieldName, message: 'This field is required', code: 'REQUIRED' }],
    };
  }

  return { success: true, data: value };
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  fieldName: string,
  options: { min?: number; max?: number }
): ValidationResult<string> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (options.min !== undefined && value.length < options.min) {
    errors.push({
      field: fieldName,
      message: `Must be at least ${options.min} characters long`,
      code: 'MIN_LENGTH',
    });
  }

  if (options.max !== undefined && value.length > options.max) {
    errors.push({
      field: fieldName,
      message: `Must be no more than ${options.max} characters long`,
      code: 'MAX_LENGTH',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: value };
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  fieldName: string,
  options: { min?: number; max?: number }
): ValidationResult<number> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  if (options.min !== undefined && value < options.min) {
    errors.push({
      field: fieldName,
      message: `Must be at least ${options.min}`,
      code: 'MIN_VALUE',
    });
  }

  if (options.max !== undefined && value > options.max) {
    errors.push({
      field: fieldName,
      message: `Must be no more than ${options.max}`,
      code: 'MAX_VALUE',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: value };
}

/**
 * Validate pattern match
 */
export function validatePattern(
  value: string,
  fieldName: string,
  pattern: RegExp,
  message = 'Invalid format'
): ValidationResult<string> {
  if (!pattern.test(value)) {
    return {
      success: false,
      errors: [{ field: fieldName, message, code: 'PATTERN_MISMATCH' }],
    };
  }

  return { success: true, data: value };
}

/**
 * Validate UUID
 */
export function validateUuid(uuid: string, fieldName = 'id'): ValidationResult<string> {
  const trimmed = uuid.trim();

  if (!trimmed) {
    return {
      success: false,
      errors: [{ field: fieldName, message: 'UUID is required', code: 'REQUIRED' }],
    };
  }

  if (!VALIDATION_PATTERNS.uuid.test(trimmed)) {
    return {
      success: false,
      errors: [{ field: fieldName, message: 'Invalid UUID format', code: 'INVALID_FORMAT' }],
    };
  }

  return { success: true, data: trimmed };
}
