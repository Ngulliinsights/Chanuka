/**
 * Specialized Error Classes
 * 
 * Consolidated from both error-handling and errors directories,
 * providing a comprehensive set of domain-specific error types.
 */

import { BaseError, ErrorDomain, ErrorSeverity, BaseErrorOptions } from './base-error.js';

/**
 * Validation Error - for input validation failures
 * Implements unified validation error interface for compatibility
 */
export class ValidationError extends BaseError {
  public readonly errors: Array<{
    field?: string;
    code: string;
    message: string;
    value?: unknown;
  }>;

  // Unified interface properties for compatibility
  public readonly field?: string;
  public readonly errorId?: string;

  constructor(messageOrZodError: string | any, errors?: any[], details?: Record<string, any>) {
    let message: string;
    let validationErrors: Array<{
      field?: string;
      code: string;
      message: string;
      value?: unknown;
    }>;

    // Handle ZodError input
    if (typeof messageOrZodError === 'object' && messageOrZodError?.issues) {
      message = 'Validation failed';
      validationErrors = messageOrZodError.issues.map((issue: any) => ({
        field: issue.path?.join('.') || '',
        code: issue.code || 'invalid',
        message: issue.message || 'Invalid value',
        value: issue.received
      }));
    } else {
      // Handle string message + errors array
      message = messageOrZodError;
      validationErrors = errors || [];
    }

    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {
        errors: validationErrors,
        ...details
      },
      isOperational: true,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
    });

    this.errors = validationErrors;

    // Set unified interface properties for compatibility
    this.field = validationErrors.length === 1 ? validationErrors[0].field : undefined;
    this.errorId = details?.errorId;
  }
}

/**
 * Not Found Error - for missing resources
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, identifier?: string, details?: Record<string, any>) {
    const message = identifier 
      ? `${resource} with id '${identifier}' not found` 
      : `${resource} not found`;
      
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { 
        resource, 
        identifier,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.LOW,
    });
  }
}

/**
 * Unauthorized Error - for authentication failures
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      details,
      isOperational: true,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

/**
 * Forbidden Error - for authorization failures
 */
export class ForbiddenError extends BaseError {
  constructor(
    message: string = 'Insufficient permissions', 
    requiredPermissions?: string[], 
    details?: Record<string, any>
  ) {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
      details: { 
        requiredPermissions,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

/**
 * Conflict Error - for resource conflicts
 */
export class ConflictError extends BaseError {
  constructor(
    message: string, 
    conflictingResource?: string, 
    details?: Record<string, any>
  ) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      details: { 
        conflictingResource,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

/**
 * Too Many Requests Error - for rate limiting
 */
export class TooManyRequestsError extends BaseError {
  constructor(
    message: string = 'Too many requests', 
    retryAfter?: number, 
    details?: Record<string, any>
  ) {
    super(message, {
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      details: { 
        retryAfter,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}

/**
 * Service Unavailable Error - for temporary service issues
 */
export class ServiceUnavailableError extends BaseError {
  constructor(
    message: string = 'Service temporarily unavailable', 
    retryAfter?: number, 
    details?: Record<string, any>
  ) {
    super(message, {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      details: { 
        retryAfter,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}

/**
 * Database Error - for database-related issues
 */
export class DatabaseError extends BaseError {
  constructor(message: string, operation?: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      details: { 
        operation,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable: false,
    });
  }
}

/**
 * External Service Error - for third-party service failures
 */
export class ExternalServiceError extends BaseError {
  constructor(
    message: string, 
    service?: string, 
    statusCode?: number, 
    details?: Record<string, any>
  ) {
    super(message, {
      statusCode: statusCode || 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      details: { 
        service,
        externalStatusCode: statusCode,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}

/**
 * Network Error - for network-related issues
 */
export class NetworkError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 503,
      code: 'NETWORK_ERROR',
      details,
      isOperational: true,
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  }
}

/**
 * Cache Error - for caching-related issues
 */
export class CacheError extends BaseError {
  constructor(message: string, operation?: string, details?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: 'CACHE_ERROR',
      details: { 
        operation,
        ...details 
      },
      isOperational: true,
      domain: ErrorDomain.CACHE,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
    });
  }
}

/**
 * Legacy Error for backward compatibility
 */
export class LegacyError extends BaseError {
  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message, {
      statusCode,
      code: code || 'APP_ERROR',
      details,
      isOperational,
      domain: ErrorDomain.SYSTEM,
      severity: statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    });
  }
}





































