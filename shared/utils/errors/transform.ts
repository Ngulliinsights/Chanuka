/**
 * Error Transformation Utilities
 *
 * Utilities for transforming various error types into StandardError format.
 * Ensures consistent error structure across all layers.
 */

import { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from '@shared/constants';
import {
  ErrorClassification,
  getClassificationFromErrorCode,
  type StandardError,
} from '@shared/types/core/errors';
import { ZodError } from 'zod';
import { generateCorrelationId, getCurrentCorrelationId } from './correlation-id';

/**
 * Transform a database error to StandardError format
 */
export function transformDatabaseError(error: unknown): StandardError {
  const correlationId = getCurrentCorrelationId() || generateCorrelationId();

  // PostgreSQL error
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as any;

    // Unique constraint violation
    if (pgError.code === '23505') {
      return {
        code: ERROR_CODES.DUPLICATE_RESOURCE,
        message: ERROR_MESSAGES.DUPLICATE_RESOURCE,
        classification: ErrorClassification.Validation,
        correlationId,
        timestamp: new Date(),
        details: {
          constraint: pgError.constraint,
          table: pgError.table,
          detail: pgError.detail,
        },
      };
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Referenced resource does not exist',
        classification: ErrorClassification.Validation,
        correlationId,
        timestamp: new Date(),
        details: {
          constraint: pgError.constraint,
          table: pgError.table,
          detail: pgError.detail,
        },
      };
    }

    // Not null violation
    if (pgError.code === '23502') {
      return {
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: ERROR_MESSAGES.MISSING_REQUIRED_FIELD,
        classification: ErrorClassification.Validation,
        correlationId,
        timestamp: new Date(),
        details: {
          column: pgError.column,
          table: pgError.table,
        },
      };
    }

    // Check constraint violation
    if (pgError.code === '23514') {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        classification: ErrorClassification.Validation,
        correlationId,
        timestamp: new Date(),
        details: {
          constraint: pgError.constraint,
          table: pgError.table,
        },
      };
    }
  }

  // Generic database error
  return {
    code: ERROR_CODES.DATABASE_ERROR,
    message: ERROR_MESSAGES.DATABASE_ERROR,
    classification: ErrorClassification.Server,
    correlationId,
    timestamp: new Date(),
    details: {
      originalError: error instanceof Error ? error.message : String(error),
    },
  };
}

/**
 * Transform a Zod validation error to StandardError format
 */
export function transformValidationError(error: ZodError): StandardError {
  const correlationId = getCurrentCorrelationId() || generateCorrelationId();

  // Extract field errors
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: ERROR_MESSAGES.VALIDATION_ERROR,
    classification: ErrorClassification.Validation,
    correlationId,
    timestamp: new Date(),
    details: {
      fields: fieldErrors,
      errors: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    },
  };
}

/**
 * Transform a network error to StandardError format
 */
export function transformNetworkError(error: unknown): StandardError {
  const correlationId = getCurrentCorrelationId() || generateCorrelationId();

  // Timeout error
  if (error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))) {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: ERROR_MESSAGES.TIMEOUT,
      classification: ErrorClassification.Network,
      correlationId,
      timestamp: new Date(),
      details: {
        originalError: error.message,
      },
    };
  }

  // Service unavailable
  if (error && typeof error === 'object' && 'status' in error) {
    const statusError = error as any;
    if (statusError.status === 503) {
      return {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        classification: ErrorClassification.Network,
        correlationId,
        timestamp: new Date(),
        details: {
          status: statusError.status,
          statusText: statusError.statusText,
        },
      };
    }
  }

  // Generic network error
  return {
    code: ERROR_CODES.SERVICE_UNAVAILABLE,
    message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    classification: ErrorClassification.Network,
    correlationId,
    timestamp: new Date(),
    details: {
      originalError: error instanceof Error ? error.message : String(error),
    },
  };
}

/**
 * Transform any error to StandardError format
 * This is the main entry point for error transformation
 */
export function toStandardError(error: unknown): StandardError {
  const correlationId = getCurrentCorrelationId() || generateCorrelationId();

  // Already a StandardError
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'classification' in error &&
    'correlationId' in error
  ) {
    return error as StandardError;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return transformValidationError(error);
  }

  // Database error (check for PostgreSQL error codes)
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code;
    if (code.startsWith('23') || code.startsWith('42')) {
      return transformDatabaseError(error);
    }
  }

  // HTTP error with status code
  if (error && typeof error === 'object' && 'status' in error) {
    const statusError = error as any;
    const status = statusError.status;

    if (status === 401) {
      return {
        code: ERROR_CODES.NOT_AUTHENTICATED,
        message: ERROR_MESSAGES.NOT_AUTHENTICATED,
        classification: ErrorClassification.Authorization,
        correlationId,
        timestamp: new Date(),
      };
    }

    if (status === 403) {
      return {
        code: ERROR_CODES.ACCESS_DENIED,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        classification: ErrorClassification.Authorization,
        correlationId,
        timestamp: new Date(),
      };
    }

    if (status === 404) {
      return {
        code: ERROR_CODES.BILL_NOT_FOUND,
        message: 'Resource not found',
        classification: ErrorClassification.Validation,
        correlationId,
        timestamp: new Date(),
      };
    }

    if (status >= 500) {
      return {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        classification: ErrorClassification.Server,
        correlationId,
        timestamp: new Date(),
      };
    }
  }

  // Error with code property
  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = (error as any).code as ErrorCode;
    if (errorCode in ERROR_CODES) {
      return {
        code: errorCode,
        message: ERROR_MESSAGES[errorCode] || (error as any).message || 'An error occurred',
        classification: getClassificationFromErrorCode(errorCode),
        correlationId,
        timestamp: new Date(),
        details: (error as any).details,
      };
    }
  }

  // Generic Error object
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      classification: ErrorClassification.Server,
      correlationId,
      timestamp: new Date(),
      stack: error.stack,
    };
  }

  // Unknown error
  return {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    classification: ErrorClassification.Server,
    correlationId,
    timestamp: new Date(),
    details: {
      originalError: String(error),
    },
  };
}

/**
 * Create a StandardError from an error code
 */
export function createStandardError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): StandardError {
  const correlationId = getCurrentCorrelationId() || generateCorrelationId();

  return {
    code,
    message: message || ERROR_MESSAGES[code],
    classification: getClassificationFromErrorCode(code),
    correlationId,
    timestamp: new Date(),
    details,
  };
}
