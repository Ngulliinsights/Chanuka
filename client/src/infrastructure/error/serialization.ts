/**
 * HTTP Boundary Serialization
 *
 * Functions for serializing and deserializing errors across HTTP boundaries.
 * Ensures no data loss when errors cross client/server boundaries.
 *
 * Requirements: 22.5, 22.6
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';
import type { ErrorCode } from '@shared/constants';
import type { ClientError, ApiErrorResponse, ErrorContext } from './unified-types';

/**
 * Serialize ClientError to ApiErrorResponse
 *
 * Converts a client error to the API response format for sending to server.
 * Ensures all error data is preserved in the serialization.
 *
 * @param error - ClientError to serialize
 * @returns ApiErrorResponse format
 */
export function toApiError(error: ClientError): ApiErrorResponse {
  return {
    success: false,
    error: {
      id: error.id,
      code: error.code,
      message: error.message,
      type: error.type,
      timestamp: error.timestamp.toISOString(),
      statusCode: error.statusCode,
      details: {
        ...error.details,
        // Include additional client-specific data
        severity: error.severity,
        context: error.context,
        recoverable: error.recoverable,
        retryable: error.retryable,
        stack: error.stack,
      },
      correlationId: error.correlationId,
    },
  };
}

/**
 * Deserialize ApiErrorResponse to ClientError
 *
 * Converts an API error response back to a ClientError.
 * Reconstructs all error data from the serialized format.
 *
 * @param response - ApiErrorResponse to deserialize
 * @returns ClientError instance
 */
export function fromApiError(response: ApiErrorResponse): ClientError {
  const { error } = response;
  
  // Extract client-specific data from details
  const severity = (error.details?.severity as ErrorSeverity) || ErrorSeverity.MEDIUM;
  const context = (error.details?.context as ErrorContext) || {};
  const recoverable = (error.details?.recoverable as boolean) ?? true;
  const retryable = (error.details?.retryable as boolean) ?? false;
  const stack = error.details?.stack as string | undefined;

  // Remove client-specific data from details to avoid duplication
  const { severity: _, context: __, recoverable: ___, retryable: ____, stack: _____, ...details } = error.details || {};

  return {
    id: error.id,
    code: error.code as ErrorCode,
    type: error.type as ErrorDomain,
    severity,
    message: error.message,
    timestamp: new Date(error.timestamp),
    correlationId: error.correlationId || error.id,
    context,
    statusCode: error.statusCode,
    details,
    stack,
    recoverable,
    retryable,
    recoveryStrategies: [],
  };
}

/**
 * Serialize ClientError to JSON string
 *
 * Converts a ClientError to a JSON string for transmission.
 *
 * @param error - ClientError to serialize
 * @returns JSON string
 */
export function serializeError(error: ClientError): string {
  return JSON.stringify(toApiError(error));
}

/**
 * Deserialize JSON string to ClientError
 *
 * Converts a JSON string back to a ClientError.
 *
 * @param json - JSON string to deserialize
 * @returns ClientError instance
 */
export function deserializeError(json: string): ClientError {
  const response = JSON.parse(json) as ApiErrorResponse;
  return fromApiError(response);
}

/**
 * Validate ApiErrorResponse structure
 *
 * Checks if an object conforms to the ApiErrorResponse format.
 *
 * @param response - Object to validate
 * @returns True if valid ApiErrorResponse
 */
export function isValidApiErrorResponse(response: unknown): response is ApiErrorResponse {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const r = response as Record<string, unknown>;

  return (
    r.success === false &&
    typeof r.error === 'object' &&
    r.error !== null &&
    typeof (r.error as Record<string, unknown>).id === 'string' &&
    typeof (r.error as Record<string, unknown>).code === 'string' &&
    typeof (r.error as Record<string, unknown>).message === 'string' &&
    typeof (r.error as Record<string, unknown>).type === 'string' &&
    typeof (r.error as Record<string, unknown>).timestamp === 'string'
  );
}

/**
 * Convert Error to ClientError
 *
 * Converts a standard JavaScript Error to a ClientError.
 * Useful for handling errors from third-party libraries.
 *
 * @param error - Error to convert
 * @param type - Error domain
 * @param severity - Error severity
 * @param context - Error context
 * @returns ClientError instance
 */
export function errorToClientError(
  error: Error,
  type: ErrorDomain = ErrorDomain.SYSTEM,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: 'UNKNOWN_ERROR' as ErrorCode,
    type,
    severity,
    message: error.message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'unknown',
      operation: context?.operation || 'unknown',
      ...context,
    },
    details: {
      name: error.name,
      originalError: error.toString(),
    },
    stack: error.stack,
    recoverable: true,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Sanitize error for client display
 *
 * Removes sensitive information from error before displaying to user.
 * Keeps only user-safe information.
 *
 * @param error - ClientError to sanitize
 * @returns Sanitized error
 */
export function sanitizeErrorForDisplay(error: ClientError): Partial<ClientError> {
  return {
    id: error.id,
    code: error.code,
    type: error.type,
    severity: error.severity,
    message: error.message,
    timestamp: error.timestamp,
    recoverable: error.recoverable,
    retryable: error.retryable,
    // Exclude: context, details, stack, correlationId
  };
}

/**
 * Enrich error with additional context
 *
 * Adds additional context to an existing error.
 * Useful for adding context as error bubbles up the call stack.
 *
 * @param error - ClientError to enrich
 * @param additionalContext - Additional context to add
 * @returns New ClientError with enriched context
 */
export function enrichErrorContext(
  error: ClientError,
  additionalContext: Partial<ErrorContext>
): ClientError {
  return {
    ...error,
    context: {
      ...error.context,
      ...additionalContext,
    },
  };
}

/**
 * Clone error with modifications
 *
 * Creates a new error with some fields modified.
 * Useful for error transformation.
 *
 * @param error - ClientError to clone
 * @param modifications - Fields to modify
 * @returns New ClientError with modifications
 */
export function cloneError(
  error: ClientError,
  modifications: Partial<ClientError>
): ClientError {
  return {
    ...error,
    ...modifications,
    // Ensure timestamp is a Date object
    timestamp: modifications.timestamp instanceof Date
      ? modifications.timestamp
      : error.timestamp,
  };
}
