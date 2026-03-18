/**
 * Consolidated Error Factory
 * Merges legacy and unified factory functions
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';
import { ERROR_CODES } from '@shared/constants';
import type { ErrorCode } from '@shared/constants';
import type { ClientError, ErrorContext } from './types';
import { isClientError } from './types';

/**
 * ErrorFactory - Pure factory functions for creating errors
 */
export class ErrorFactory {
  /**
   * Create validation error
   */
  static createValidationError(
    fields: Array<{ field: string; message: string }>,
    context?: Partial<ErrorContext>
  ): ClientError {
    const message =
      fields.length === 1
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
        fields: fields.reduce(
          (acc, { field, message }) => {
            acc[field] = message;
            return acc;
          },
          {} as Record<string, string>
        ),
      },
      recoverable: true,
      retryable: false,
    };
  }

  /**
   * Create network error
   */
  static createNetworkError(
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
    };
  }

  /**
   * Create authentication error
   */
  static createAuthenticationError(message: string, context?: Partial<ErrorContext>): ClientError {
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
    };
  }

  /**
   * Create authorization error
   */
  static createAuthorizationError(
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
      details: { requiredPermissions },
      recoverable: false,
      retryable: false,
    };
  }

  /**
   * Create not found error
   */
  static createNotFoundError(resource: string, context?: Partial<ErrorContext>): ClientError {
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
      details: { resource },
      recoverable: false,
      retryable: false,
    };
  }

  /**
   * Create timeout error
   */
  static createTimeoutError(
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
      details: { operation, timeout },
      recoverable: true,
      retryable: true,
    };
  }

  /**
   * Create system error
   */
  static createSystemError(
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
        cause: cause
          ? {
              name: cause.name,
              message: cause.message,
              stack: cause.stack,
            }
          : undefined,
      },
      stack: cause?.stack,
      recoverable: true,
      retryable: false,
    };
  }

  /**
   * Create generic client error
   */
  static createClientError(
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
    };
  }

  /**
   * Create error from unknown error
   */
  static createFromError(error: unknown, context?: Partial<ErrorContext>): ClientError {
    if (isClientError(error)) {
      return error;
    }

    const errorObj = error as Error;
    return {
      id: crypto.randomUUID(),
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: errorObj.message || 'Unknown error',
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
      context: {
        component: context?.component || 'unknown',
        operation: context?.operation || 'unknown',
        ...context,
      },
      statusCode: 500,
      details: {
        originalError: {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack,
        },
      },
      stack: errorObj.stack,
      recoverable: true,
      retryable: false,
    };
  }
}
