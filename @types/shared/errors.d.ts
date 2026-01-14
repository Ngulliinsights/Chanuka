/**
 * Shared Error Types - Phase 3
 * Unified error type definitions for client and server
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Error code enumeration
 * Standardized error codes across the application
 */
export enum ErrorCodeEnum {
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  
  // Authentication Errors
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Authorization Errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_FORBIDDEN = 'RESOURCE_FORBIDDEN',
  
  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Business Logic Errors
  INVALID_STATE = 'INVALID_STATE',
  INVALID_OPERATION = 'INVALID_OPERATION',
  PRECONDITION_FAILED = 'PRECONDITION_FAILED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_API_TIMEOUT = 'EXTERNAL_API_TIMEOUT',
  EXTERNAL_API_UNAVAILABLE = 'EXTERNAL_API_UNAVAILABLE'
}

// ============================================================================
// Error Type Mapping
// ============================================================================

/**
 * Mapping from error code to domain and severity
 */
export const ERROR_TYPE_MAP: Record<
  ErrorCodeEnum,
  {
    domain: ErrorDomain;
    severity: ErrorSeverity;
    statusCode: number;
    retryable: boolean;
  }
> = {
  [ErrorCodeEnum.INTERNAL_SERVER_ERROR]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
    retryable: true
  },
  [ErrorCodeEnum.SERVICE_UNAVAILABLE]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    statusCode: 503,
    retryable: true
  },
  [ErrorCodeEnum.TIMEOUT]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 504,
    retryable: true
  },
  [ErrorCodeEnum.NOT_IMPLEMENTED]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 501,
    retryable: false
  },
  [ErrorCodeEnum.VALIDATION_ERROR]: {
    domain: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400,
    retryable: false
  },
  [ErrorCodeEnum.INVALID_REQUEST]: {
    domain: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400,
    retryable: false
  },
  [ErrorCodeEnum.INVALID_PARAMETER]: {
    domain: ErrorDomain.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400,
    retryable: false
  },
  [ErrorCodeEnum.NOT_AUTHENTICATED]: {
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401,
    retryable: false
  },
  [ErrorCodeEnum.INVALID_CREDENTIALS]: {
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401,
    retryable: false
  },
  [ErrorCodeEnum.TOKEN_EXPIRED]: {
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.LOW,
    statusCode: 401,
    retryable: false
  },
  [ErrorCodeEnum.TOKEN_INVALID]: {
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401,
    retryable: false
  },
  [ErrorCodeEnum.SESSION_EXPIRED]: {
    domain: ErrorDomain.AUTHENTICATION,
    severity: ErrorSeverity.LOW,
    statusCode: 401,
    retryable: false
  },
  [ErrorCodeEnum.ACCESS_DENIED]: {
    domain: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403,
    retryable: false
  },
  [ErrorCodeEnum.INSUFFICIENT_PERMISSIONS]: {
    domain: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403,
    retryable: false
  },
  [ErrorCodeEnum.RESOURCE_FORBIDDEN]: {
    domain: ErrorDomain.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403,
    retryable: false
  },
  [ErrorCodeEnum.RESOURCE_NOT_FOUND]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    statusCode: 404,
    retryable: false
  },
  [ErrorCodeEnum.RESOURCE_CONFLICT]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    statusCode: 409,
    retryable: false
  },
  [ErrorCodeEnum.RESOURCE_DELETED]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    statusCode: 410,
    retryable: false
  },
  [ErrorCodeEnum.DATABASE_ERROR]: {
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
    retryable: true
  },
  [ErrorCodeEnum.QUERY_ERROR]: {
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
    retryable: true
  },
  [ErrorCodeEnum.CONSTRAINT_VIOLATION]: {
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 409,
    retryable: false
  },
  [ErrorCodeEnum.DUPLICATE_ENTRY]: {
    domain: ErrorDomain.DATABASE,
    severity: ErrorSeverity.LOW,
    statusCode: 409,
    retryable: false
  },
  [ErrorCodeEnum.INVALID_STATE]: {
    domain: ErrorDomain.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 422,
    retryable: false
  },
  [ErrorCodeEnum.INVALID_OPERATION]: {
    domain: ErrorDomain.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 422,
    retryable: false
  },
  [ErrorCodeEnum.PRECONDITION_FAILED]: {
    domain: ErrorDomain.BUSINESS_LOGIC,
    severity: ErrorSeverity.LOW,
    statusCode: 412,
    retryable: false
  },
  [ErrorCodeEnum.RATE_LIMIT_EXCEEDED]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    statusCode: 429,
    retryable: true
  },
  [ErrorCodeEnum.TOO_MANY_REQUESTS]: {
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    statusCode: 429,
    retryable: true
  },
  [ErrorCodeEnum.EXTERNAL_SERVICE_ERROR]: {
    domain: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 502,
    retryable: true
  },
  [ErrorCodeEnum.EXTERNAL_API_TIMEOUT]: {
    domain: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 504,
    retryable: true
  },
  [ErrorCodeEnum.EXTERNAL_API_UNAVAILABLE]: {
    domain: ErrorDomain.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 503,
    retryable: true
  }
};

// ============================================================================
// User-Facing Error Message
// ============================================================================

/**
 * User-friendly error message mapping
 * Hide implementation details in production
 */
export const ERROR_MESSAGES: Record<ErrorCodeEnum, string> = {
  [ErrorCodeEnum.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later.',
  [ErrorCodeEnum.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [ErrorCodeEnum.TIMEOUT]: 'The request took too long. Please try again.',
  [ErrorCodeEnum.NOT_IMPLEMENTED]: 'This feature is not yet implemented.',
  
  [ErrorCodeEnum.VALIDATION_ERROR]: 'The request contains invalid data.',
  [ErrorCodeEnum.INVALID_REQUEST]: 'The request is invalid.',
  [ErrorCodeEnum.INVALID_PARAMETER]: 'One or more parameters are invalid.',
  
  [ErrorCodeEnum.NOT_AUTHENTICATED]: 'You must be logged in to perform this action.',
  [ErrorCodeEnum.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCodeEnum.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodeEnum.TOKEN_INVALID]: 'Your session is invalid. Please log in again.',
  [ErrorCodeEnum.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  
  [ErrorCodeEnum.ACCESS_DENIED]: 'You do not have permission to access this resource.',
  [ErrorCodeEnum.INSUFFICIENT_PERMISSIONS]: 'You do not have sufficient permissions to perform this action.',
  [ErrorCodeEnum.RESOURCE_FORBIDDEN]: 'You do not have permission to access this resource.',
  
  [ErrorCodeEnum.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCodeEnum.RESOURCE_CONFLICT]: 'The resource already exists or conflicts with existing data.',
  [ErrorCodeEnum.RESOURCE_DELETED]: 'The resource has been deleted and is no longer available.',
  
  [ErrorCodeEnum.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ErrorCodeEnum.QUERY_ERROR]: 'A database query error occurred. Please try again later.',
  [ErrorCodeEnum.CONSTRAINT_VIOLATION]: 'The operation violates data constraints.',
  [ErrorCodeEnum.DUPLICATE_ENTRY]: 'This entry already exists.',
  
  [ErrorCodeEnum.INVALID_STATE]: 'The resource is in an invalid state for this operation.',
  [ErrorCodeEnum.INVALID_OPERATION]: 'This operation is not allowed.',
  [ErrorCodeEnum.PRECONDITION_FAILED]: 'A precondition for this operation is not met.',
  
  [ErrorCodeEnum.RATE_LIMIT_EXCEEDED]: 'You have made too many requests. Please wait before trying again.',
  [ErrorCodeEnum.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  
  [ErrorCodeEnum.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred. Please try again later.',
  [ErrorCodeEnum.EXTERNAL_API_TIMEOUT]: 'An external service request timed out. Please try again later.',
  [ErrorCodeEnum.EXTERNAL_API_UNAVAILABLE]: 'An external service is unavailable. Please try again later.'
};
