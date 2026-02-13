/**
 * Standard Error Types
 *
 * Centralized error type definitions for consistent error handling across all layers.
 * These types ensure uniform error structure from database through server to client.
 */

import { ERROR_CODES, type ErrorCode } from '@shared/constants';

/**
 * Error Classification
 * Categorizes errors by their nature for consistent handling
 */
export enum ErrorClassification {
  Validation = 'validation',
  Authorization = 'authorization',
  Server = 'server',
  Network = 'network',
}

/**
 * Standard Error Interface
 * All errors in the system should conform to this structure
 */
export interface StandardError {
  /** Error code from ERROR_CODES enum */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Error classification for handling strategy */
  classification: ErrorClassification;
  /** Unique correlation ID for tracing across layers */
  correlationId: string;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Additional error details (field errors, context, etc.) */
  details?: Record<string, unknown>;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Type guard to check if an object is a StandardError
 */
export function isStandardError(error: unknown): error is StandardError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'classification' in error &&
    'correlationId' in error &&
    'timestamp' in error
  );
}

/**
 * Get HTTP status code from error classification
 */
export function getHttpStatusFromClassification(classification: ErrorClassification): number {
  switch (classification) {
    case ErrorClassification.Validation:
      return 400;
    case ErrorClassification.Authorization:
      return 403;
    case ErrorClassification.Server:
      return 500;
    case ErrorClassification.Network:
      return 503;
    default:
      return 500;
  }
}

/**
 * Get error classification from error code
 */
export function getClassificationFromErrorCode(code: ErrorCode): ErrorClassification {
  // Validation errors
  if (
    code === ERROR_CODES.VALIDATION_ERROR ||
    code === ERROR_CODES.INVALID_EMAIL ||
    code === ERROR_CODES.INVALID_PASSWORD ||
    code === ERROR_CODES.INVALID_INPUT ||
    code === ERROR_CODES.MISSING_REQUIRED_FIELD ||
    code === ERROR_CODES.INVALID_FORMAT ||
    code === ERROR_CODES.INVALID_ID
  ) {
    return ErrorClassification.Validation;
  }

  // Authorization errors (includes authentication)
  if (
    code === ERROR_CODES.AUTHENTICATION_FAILED ||
    code === ERROR_CODES.INVALID_CREDENTIALS ||
    code === ERROR_CODES.INVALID_TOKEN ||
    code === ERROR_CODES.TOKEN_EXPIRED ||
    code === ERROR_CODES.TOKEN_REVOKED ||
    code === ERROR_CODES.INVALID_REFRESH_TOKEN ||
    code === ERROR_CODES.SESSION_EXPIRED ||
    code === ERROR_CODES.NOT_AUTHENTICATED ||
    code === ERROR_CODES.AUTHORIZATION_FAILED ||
    code === ERROR_CODES.INSUFFICIENT_PERMISSIONS ||
    code === ERROR_CODES.RESOURCE_NOT_ACCESSIBLE ||
    code === ERROR_CODES.ACCESS_DENIED ||
    code === ERROR_CODES.ADMIN_ONLY
  ) {
    return ErrorClassification.Authorization;
  }

  // Network errors
  if (
    code === ERROR_CODES.SERVICE_UNAVAILABLE ||
    code === ERROR_CODES.TIMEOUT ||
    code === ERROR_CODES.CIRCUIT_BREAKER_OPEN
  ) {
    return ErrorClassification.Network;
  }

  // Default to server error
  return ErrorClassification.Server;
}
