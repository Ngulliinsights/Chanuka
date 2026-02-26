/**
 * Unified Error Factory Functions
 *
 * Pure factory functions for creating errors without side effects.
 * Side effects (logging, tracking) are handled separately by ErrorHandler.
 *
 * This aligns with server-side factory pattern where error construction
 * is separate from error handling.
 *
 * Requirements: 22.3, 22.4
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';
import type { ErrorCode } from '@shared/constants';
import { ERROR_CODES } from '@shared/constants';
import type { ClientError, ErrorContext } from './unified-types';

/**
 * Create a validation error
 *
 * Pure function - no side effects (no logging, no tracking)
 * Use ErrorHandler.handleError() to process the error with side effects
 *
 * @param fields - Validation field errors
 * @param context - Error context
 * @returns ClientError instance
 */
export function createValidationError(
  fields: Array<{ field: string; message: string }>,
  context?: Partial<ErrorContext>
): ClientError {
  const message = fields.length === 1
    ? `Validation failed: ${fields[0].message}`
    : `Validation failed for ${fields.length} fields`;

  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.VALIDATION_ERROR,
    type: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'validation',
      operation: context?.operation || 'validate',
      ...context,
    },
    statusCode: 400,
    details: {
      fields: fields.reduce((acc, { field, message }) => {
        acc[field] = message;
        return acc;
      }, {} as Record<string, string>),
    },
    recoverable: true,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create a network error
 *
 * Pure function - no side effects
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param context - Error context
 * @returns ClientError instance
 */
export function createNetworkError(
  message: string,
  statusCode?: number,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.NETWORK_ERROR,
    type: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'network',
      operation: context?.operation || 'request',
      ...context,
    },
    statusCode: statusCode || 0,
    details: {},
    recoverable: true,
    retryable: true,
    recoveryStrategies: [],
  };
}

/**
 * Create an authentication error
 *
 * Pure function - no side effects
 *
 * @param message - Error message
 * @param context - Error context
 * @returns ClientError instance
 */
export function createAuthenticationError(
  message: string,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.NOT_AUTHENTICATED,
    type: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'auth',
      operation: context?.operation || 'authenticate',
      ...context,
    },
    statusCode: 401,
    details: {},
    recoverable: true,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create an authorization error
 *
 * Pure function - no side effects
 *
 * @param message - Error message
 * @param requiredPermissions - Required permissions
 * @param context - Error context
 * @returns ClientError instance
 */
export function createAuthorizationError(
  message: string,
  requiredPermissions?: string[],
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.AUTHORIZATION_FAILED,
    type: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'authorization',
      operation: context?.operation || 'authorize',
      ...context,
    },
    statusCode: 403,
    details: {
      requiredPermissions,
    },
    recoverable: false,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create a business logic error
 *
 * Pure function - no side effects
 *
 * @param code - Error code
 * @param message - Error message
 * @param context - Error context
 * @returns ClientError instance
 */
export function createBusinessError(
  code: ErrorCode,
  message: string,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code,
    type: ErrorDomain.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'business',
      operation: context?.operation || 'process',
      ...context,
    },
    statusCode: 400,
    details: {},
    recoverable: false,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create a system error
 *
 * Pure function - no side effects
 *
 * @param message - Error message
 * @param cause - Original error cause
 * @param context - Error context
 * @returns ClientError instance
 */
export function createSystemError(
  message: string,
  cause?: Error,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    type: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'system',
      operation: context?.operation || 'unknown',
      ...context,
    },
    statusCode: 500,
    details: {
      cause: cause ? {
        name: cause.name,
        message: cause.message,
        stack: cause.stack,
      } : undefined,
    },
    stack: cause?.stack,
    recoverable: true,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create a not found error
 *
 * Pure function - no side effects
 *
 * @param resource - Resource that was not found
 * @param context - Error context
 * @returns ClientError instance
 */
export function createNotFoundError(
  resource: string,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    type: ErrorDomain.RESOURCE,
    severity: ErrorSeverity.LOW,
    message: `${resource} not found`,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'resource',
      operation: context?.operation || 'find',
      ...context,
    },
    statusCode: 404,
    details: {
      resource,
    },
    recoverable: false,
    retryable: false,
    recoveryStrategies: [],
  };
}

/**
 * Create a timeout error
 *
 * Pure function - no side effects
 *
 * @param operation - Operation that timed out
 * @param timeout - Timeout duration in milliseconds
 * @param context - Error context
 * @returns ClientError instance
 */
export function createTimeoutError(
  operation: string,
  timeout: number,
  context?: Partial<ErrorContext>
): ClientError {
  return {
    id: crypto.randomUUID(),
    code: ERROR_CODES.TIMEOUT,
    type: ErrorDomain.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: `Operation '${operation}' timed out after ${timeout}ms`,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: context?.component || 'timeout',
      operation: context?.operation || operation,
      ...context,
    },
    statusCode: 408,
    details: {
      operation,
      timeout,
    },
    recoverable: true,
    retryable: true,
    recoveryStrategies: [],
  };
}

/**
 * Create a generic client error
 *
 * Pure function - no side effects
 * Use this for custom error scenarios
 *
 * @param code - Error code
 * @param message - Error message
 * @param type - Error domain
 * @param severity - Error severity
 * @param options - Additional error options
 * @returns ClientError instance
 */
export function createClientError(
  code: ErrorCode,
  message: string,
  type: ErrorDomain,
  severity: ErrorSeverity,
  options?: {
    statusCode?: number;
    context?: Partial<ErrorContext>;
    details?: Record<string, unknown>;
    recoverable?: boolean;
    retryable?: boolean;
    stack?: string;
  }
): ClientError {
  return {
    id: crypto.randomUUID(),
    code,
    type,
    severity,
    message,
    timestamp: new Date(),
    correlationId: crypto.randomUUID(),
    context: {
      component: options?.context?.component || 'unknown',
      operation: options?.context?.operation || 'unknown',
      ...options?.context,
    },
    statusCode: options?.statusCode,
    details: options?.details || {},
    stack: options?.stack,
    recoverable: options?.recoverable ?? true,
    retryable: options?.retryable ?? false,
    recoveryStrategies: [],
  };
}
