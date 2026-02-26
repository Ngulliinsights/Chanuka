/**
 * Unified Error Type System
 *
 * Aligns client error types with server StandardizedError for consistent
 * error handling across HTTP boundaries.
 *
 * Key Alignments:
 * - Uses ErrorDomain from @shared/core (not ErrorCategory or ErrorClassification)
 * - Uses 'type' field (not 'category')
 * - Uses 'statusCode' field (not 'httpStatusCode')
 * - BaseError provides foundation for all errors
 * - ClientError extends BaseError with recovery concerns
 *
 * Requirements: 22.1, 22.2
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';
import type { ErrorCode } from '@shared/constants';
import type { StandardError, ErrorClassification } from '@shared/types/core/errors';

/**
 * BaseError - Core error interface aligned with server StandardizedError
 *
 * This interface provides the foundation for all errors in the system,
 * ensuring consistency between client and server error representations.
 *
 * Key alignments:
 * - Uses ErrorDomain (not ErrorCategory or ErrorClassification)
 * - Uses 'type' field (not 'category')
 * - Uses 'statusCode' field (not 'httpStatusCode')
 */
export interface BaseError {
  /** Unique error identifier */
  readonly id: string;

  /** Error code from ERROR_CODES enum */
  readonly code: ErrorCode;

  /** Error domain (aligned with server) */
  readonly type: ErrorDomain;

  /** Error severity level */
  readonly severity: ErrorSeverity;

  /** Human-readable error message */
  readonly message: string;

  /** Timestamp when error occurred */
  readonly timestamp: Date;

  /** Correlation ID for tracing across layers */
  readonly correlationId: string;

  /** Error context with component, operation, and metadata */
  readonly context: ErrorContext;

  /** HTTP status code (aligned field name) */
  readonly statusCode?: number;

  /** Additional error details */
  readonly details?: Record<string, unknown>;

  /** Stack trace (only in development) */
  readonly stack?: string;
}

/**
 * ClientError - Extended error interface for client-specific concerns
 *
 * Extends BaseError with client-specific fields for recovery and retry logic.
 */
export interface ClientError extends BaseError {
  /** Whether the error can be recovered from */
  readonly recoverable: boolean;

  /** Whether the operation can be retried */
  readonly retryable: boolean;

  /** Available recovery strategies */
  readonly recoveryStrategies: RecoveryStrategy[];
}

/**
 * ErrorContext - Contextual information about where/when error occurred
 */
export interface ErrorContext {
  /** Component where error occurred */
  readonly component?: string;

  /** Operation being performed */
  readonly operation?: string;

  /** User ID (if available) */
  readonly userId?: string;

  /** Session ID (if available) */
  readonly sessionId?: string;

  /** Request ID (if available) */
  readonly requestId?: string;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * RecoveryStrategy - Defines how to recover from an error
 */
export interface RecoveryStrategy {
  /** Strategy identifier */
  readonly id: string;

  /** Human-readable strategy name */
  readonly name: string;

  /** Strategy description */
  readonly description: string;

  /** Function to execute recovery */
  readonly execute: () => Promise<RecoveryResult>;

  /** Whether strategy is automatic or requires user action */
  readonly automatic: boolean;
}

/**
 * RecoveryResult - Result of executing a recovery strategy
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  readonly success: boolean;

  /** Message describing the result */
  readonly message?: string;

  /** Additional data from recovery */
  readonly data?: unknown;
}

/**
 * ApiErrorResponse - HTTP boundary error format
 *
 * This is the format used when serializing errors for API responses.
 * Aligned with server error response format.
 */
export interface ApiErrorResponse {
  /** Success flag (always false for errors) */
  readonly success: false;

  /** Error details */
  readonly error: {
    /** Unique error identifier */
    readonly id: string;

    /** Error code */
    readonly code: string;

    /** Error message */
    readonly message: string;

    /** Error type/domain */
    readonly type: string;

    /** Timestamp (ISO string) */
    readonly timestamp: string;

    /** HTTP status code */
    readonly statusCode?: number;

    /** Additional details */
    readonly details?: Record<string, unknown>;

    /** Correlation ID */
    readonly correlationId?: string;
  };
}

/**
 * Type guard to check if an object is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'id' in error &&
    'code' in error &&
    'type' in error &&
    'severity' in error &&
    'message' in error &&
    'timestamp' in error &&
    'correlationId' in error &&
    'context' in error
  );
}

/**
 * Type guard to check if an object is a ClientError
 */
export function isClientError(error: unknown): error is ClientError {
  return (
    isBaseError(error) &&
    'recoverable' in error &&
    'retryable' in error &&
    'recoveryStrategies' in error
  );
}

/**
 * Type guard to check if an object is an ApiErrorResponse
 */
export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response &&
    typeof response.error === 'object' &&
    response.error !== null &&
    'id' in response.error &&
    'code' in response.error &&
    'message' in response.error &&
    'type' in response.error &&
    'timestamp' in response.error
  );
}

/**
 * Convert StandardError to BaseError
 *
 * Utility function to convert server StandardError format to client BaseError format.
 * Maps ErrorClassification to ErrorDomain for client-side error handling.
 */
export function standardErrorToBaseError(standardError: StandardError): BaseError {
  return {
    id: crypto.randomUUID(),
    code: standardError.code,
    type: mapClassificationToErrorDomain(standardError.classification),
    severity: ErrorSeverity.MEDIUM, // Default, can be enhanced based on classification
    message: standardError.message,
    timestamp: standardError.timestamp,
    correlationId: standardError.correlationId,
    context: {},
    statusCode: undefined,
    details: standardError.details,
    stack: standardError.stack,
  };
}

/**
 * Map ErrorClassification to ErrorDomain
 *
 * Helper function to convert server ErrorClassification to client ErrorDomain.
 * This ensures consistent error type mapping across HTTP boundaries.
 */
function mapClassificationToErrorDomain(classification: ErrorClassification): ErrorDomain {
  switch (classification) {
    case 'validation':
      return ErrorDomain.VALIDATION;
    case 'authorization':
      return ErrorDomain.AUTHORIZATION;
    case 'server':
      return ErrorDomain.SYSTEM;
    case 'network':
      return ErrorDomain.NETWORK;
    default:
      return ErrorDomain.UNKNOWN;
  }
}
