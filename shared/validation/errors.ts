/**
 * Validation Error Message Formatter
 * 
 * Provides consistent error message formatting across all validators.
 * Format: "{field}: {rule} - {description}"
 * 
 * Requirements: 5.4, 6.4
 */

import { ErrorContextBuilder } from '../utils/errors/context';
import { ValidationError } from '../utils/errors/types';

export interface ValidationErrorDetail {
  field: string;
  rule: string;
  message: string;
}

/**
 * Escape special characters in error message components
 */
function escapeErrorComponent(value: string): string {
  return value
    .replace(/:/g, '\\:')
    .replace(/;/g, '\\;')
    .replace(/ - /g, ' \\- ');
}

/**
 * Unescape special characters in error message components
 */
function unescapeErrorComponent(value: string): string {
  return value
    .replace(/\\:/g, ':')
    .replace(/\\;/g, ';')
    .replace(/ \\- /g, ' - ');
}

/**
 * Format a single validation error message
 * Format: "{field}: {rule} - {description}"
 * Special characters are escaped to prevent parsing issues
 */
export function formatValidationError(
  field: string,
  rule: string,
  description: string
): string {
  const escapedField = escapeErrorComponent(field);
  const escapedRule = escapeErrorComponent(rule);
  const escapedDescription = escapeErrorComponent(description);
  return `${escapedField}: ${escapedRule} - ${escapedDescription}`;
}

/**
 * Format multiple validation errors into a single message
 */
export function formatValidationErrors(errors: ValidationErrorDetail[]): string {
  return errors
    .map(error => formatValidationError(error.field, error.rule, error.message))
    .join('; ');
}

/**
 * Create a ValidationError with consistent formatting
 */
export function createValidationError(
  operation: string,
  errors: ValidationErrorDetail[]
): ValidationError {
  const context = new ErrorContextBuilder()
    .operation(operation)
    .layer('api')
    .severity('medium')
    .metadata({ errorCount: errors.length })
    .build();

  const message = formatValidationErrors(errors);

  return new ValidationError(message, context, errors);
}

/**
 * Create a single field validation error
 */
export function createFieldValidationError(
  operation: string,
  field: string,
  rule: string,
  description: string,
  value?: unknown
): ValidationError {
  const context = new ErrorContextBuilder()
    .operation(operation)
    .layer('api')
    .field(field)
    .value(value)
    .severity('medium')
    .build();

  const errorDetail: ValidationErrorDetail = {
    field,
    rule,
    message: description,
  };

  const message = formatValidationError(field, rule, description);

  return new ValidationError(message, context, [errorDetail]);
}

/**
 * Validation rule names for consistency
 */
export const ValidationRules = {
  REQUIRED: 'required',
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  PATTERN: 'pattern',
  EMAIL: 'email',
  URL: 'url',
  NUMERIC: 'numeric',
  INTEGER: 'integer',
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  MIN_VALUE: 'min_value',
  MAX_VALUE: 'max_value',
  ENUM: 'enum',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  UNIQUE: 'unique',
  FOREIGN_KEY: 'foreign_key',
  CUSTOM: 'custom',
  NOT_EMPTY: 'not_empty',
  NO_WHITESPACE_ONLY: 'no_whitespace_only',
} as const;

export type ValidationRule = typeof ValidationRules[keyof typeof ValidationRules];

/**
 * Common validation error messages
 */
export const ValidationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be at most ${max} characters`,
  pattern: (field: string, pattern: string) => `${field} must match pattern ${pattern}`,
  email: (field: string) => `${field} must be a valid email address`,
  url: (field: string) => `${field} must be a valid URL`,
  numeric: (field: string) => `${field} must be a number`,
  integer: (field: string) => `${field} must be an integer`,
  positive: (field: string) => `${field} must be positive`,
  negative: (field: string) => `${field} must be negative`,
  minValue: (field: string, min: number) => `${field} must be at least ${min}`,
  maxValue: (field: string, max: number) => `${field} must be at most ${max}`,
  enum: (field: string, values: string[]) => `${field} must be one of: ${values.join(', ')}`,
  date: (field: string) => `${field} must be a valid date`,
  dateRange: (field: string, start: string, end: string) => `${field} must be between ${start} and ${end}`,
  unique: (field: string) => `${field} must be unique`,
  foreignKey: (field: string, table: string) => `${field} must reference an existing ${table}`,
  notEmpty: (field: string) => `${field} cannot be empty`,
  noWhitespaceOnly: (field: string) => `${field} cannot contain only whitespace`,
} as const;
