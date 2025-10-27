/**
 * Validation Types and Interfaces
 * 
 * Comprehensive type definitions for the validation framework
 */

import { ZodError, ZodSchema } from 'zod';
import { logger } from '../observability/logging';

/**
 * Detailed validation error information for a specific field
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  context?: Record<string, any>;
}

/**
 * Custom validation error class with detailed field-level error information
 * Implements unified validation error interface for compatibility
 */
export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];
  public readonly statusCode = 422;
  public readonly isOperational = true;

  // Unified interface properties for compatibility
  public readonly field?: string;
  public readonly code?: string;
  public readonly errorId?: string;

  constructor(zodErrorOrMessage: ZodError | string, customErrors?: ValidationErrorDetail[]) {
    let errors: ValidationErrorDetail[];
    let message: string;

    if (typeof zodErrorOrMessage === 'string') {
      message = zodErrorOrMessage;
      errors = customErrors || [];
    } else {
      errors = zodErrorOrMessage.errors.map((error) => ({
        field: error.path.join('.'),
        message: error.message,
        code: error.code,
        received: 'received' in error ? error.received : undefined,
      }));
      message = `Validation failed: ${errors.map(e => e.field).join(', ')}`;
    }

    super(message);
    this.name = 'ValidationError';
    this.errors = errors;

    // Set unified interface properties for compatibility
    this.field = errors.length === 1 ? errors[0].field : undefined;
    this.code = 'VALIDATION_ERROR';
    this.errorId = undefined; // Can be set via customErrors if needed

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Get validation errors for a specific field
   */
  getFieldErrors(field: string): ValidationErrorDetail[] {
    return this.errors.filter(error => error.field === field);
  }

  /**
   * Check if a specific field has validation errors
   */
  hasFieldError(field: string): boolean {
    return this.errors.some(error => error.field === field);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errors: this.errors,
    };
  }
}

/**
 * Validation options for customizing validation behavior
 */
export interface ValidationOptions {
  /** Whether to preprocess data before validation */
  preprocess?: boolean;
  /** Whether to use validation caching */
  useCache?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Custom cache key generator */
  cacheKeyGenerator?: (schema: ZodSchema, data: unknown) => string;
  /** Whether to strip unknown properties */
  stripUnknown?: boolean;
  /** Whether to abort early on first error */
  abortEarly?: boolean;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

/**
 * Legacy validation result for backward compatibility
 */
export interface LegacyValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Result of batch validation operation
 */
export interface BatchValidationResult<T> {
  valid: T[];
  invalid: Array<{
    index: number;
    data: unknown;
    error: ValidationError;
  }>;
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Cached validation result
 */
export interface CachedValidationResult<T> {
  result: ValidationResult<T>;
  timestamp: number;
  ttl: number;
}

/**
 * Schema registration information
 */
export interface SchemaRegistration {
  name: string;
  schema: ZodSchema;
  version?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validation metrics for monitoring and performance tracking
 */
export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  cacheHits: number;
  cacheMisses: number;
  avgValidationTime: number;
  schemaUsageCount: Record<string, number>;
  errorsByField: Record<string, number>;
  errorsByCode: Record<string, number>;
}

/**
 * Preprocessing configuration
 */
export interface PreprocessingConfig {
  /** Whether to trim string values */
  trimStrings?: boolean;
  /** Whether to convert string numbers to numbers */
  coerceNumbers?: boolean;
  /** Whether to convert string booleans to booleans */
  coerceBooleans?: boolean;
  /** Whether to convert empty strings to null */
  emptyStringToNull?: boolean;
  /** Whether to convert undefined to null */
  undefinedToNull?: boolean;
  /** Custom preprocessing functions */
  customPreprocessors?: Array<(data: unknown) => unknown>;
}

/**
 * Validation service configuration
 */
export interface ValidationServiceConfig {
  /** Default validation options */
  defaultOptions?: ValidationOptions;
  /** Preprocessing configuration */
  preprocessing?: PreprocessingConfig;
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
  };
  /** Metrics configuration */
  metrics?: {
    enabled: boolean;
    trackSchemaUsage: boolean;
    trackErrorPatterns: boolean;
  };
}

/**
 * Schema validation context for advanced validation scenarios
 */
export interface ValidationContext {
  /** User ID for user-specific validation */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context data */
  metadata?: Record<string, any>;
  /** Validation timestamp */
  timestamp?: Date;
}











































