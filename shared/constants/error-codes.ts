/**
 * API Error Codes
 *
 * Centralized error code definitions used across client and server.
 * These codes ensure consistent error handling and messaging.
 */

/**
 * Error code enumeration
 * Categories: Validation (4xx), Authentication (5xx), Authorization (6xx), Business Logic (7xx), Server (9xx)
 */
export const ERROR_CODES = {
  // Validation Errors (400-499)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_ID: 'INVALID_ID',

  // Authentication Errors (500-599)
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',

  // Authorization Errors (600-699)
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_ACCESSIBLE: 'RESOURCE_NOT_ACCESSIBLE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  ADMIN_ONLY: 'ADMIN_ONLY',

  // Business Logic Errors (700-799)
  BILL_NOT_FOUND: 'BILL_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // Server Errors (900-999)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * HTTP Status Code Mapping
 * Maps error codes to standard HTTP status codes
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // Validation Errors (400)
  VALIDATION_ERROR: 400,
  INVALID_EMAIL: 400,
  INVALID_PASSWORD: 400,
  USERNAME_TAKEN: 409,
  EMAIL_TAKEN: 409,
  INVALID_INPUT: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_FORMAT: 400,
  INVALID_ID: 400,

  // Authentication Errors (401)
  AUTHENTICATION_FAILED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_REVOKED: 401,
  INVALID_REFRESH_TOKEN: 401,
  SESSION_EXPIRED: 401,
  NOT_AUTHENTICATED: 401,

  // Authorization Errors (403)
  AUTHORIZATION_FAILED: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  RESOURCE_NOT_ACCESSIBLE: 403,
  ACCESS_DENIED: 403,
  ADMIN_ONLY: 403,

  // Business Logic Errors (404 or 422)
  BILL_NOT_FOUND: 404,
  COMMENT_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  DUPLICATE_RESOURCE: 422,
  RESOURCE_LOCKED: 422,
  OPERATION_NOT_ALLOWED: 422,
  INVALID_STATE_TRANSITION: 422,
  INSUFFICIENT_FUNDS: 422,

  // Server Errors (500, 503, 429)
  INTERNAL_SERVER_ERROR: 500,
  DATABASE_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  EXTERNAL_SERVICE_ERROR: 502,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  CIRCUIT_BREAKER_OPEN: 503,
} as const;

/**
 * Error Messages
 * User-friendly error messages corresponding to error codes
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Validation Errors
  VALIDATION_ERROR: 'The submitted data is invalid',
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  USERNAME_TAKEN: 'This username is already in use',
  EMAIL_TAKEN: 'This email is already registered',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'A required field is missing',
  INVALID_FORMAT: 'Data format is invalid',
  INVALID_ID: 'Invalid identifier provided',

  // Authentication Errors
  AUTHENTICATION_FAILED: 'Authentication failed',
  INVALID_CREDENTIALS: 'Invalid username or password',
  INVALID_TOKEN: 'The token is invalid or malformed',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_REVOKED: 'Your token has been revoked',
  INVALID_REFRESH_TOKEN: 'Your refresh token is invalid',
  SESSION_EXPIRED: 'Your session has expired',
  NOT_AUTHENTICATED: 'You must be logged in to access this resource',

  // Authorization Errors
  AUTHORIZATION_FAILED: 'Authorization failed',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  RESOURCE_NOT_ACCESSIBLE: 'You do not have access to this resource',
  ACCESS_DENIED: 'Access denied',
  ADMIN_ONLY: 'This action requires administrator privileges',

  // Business Logic Errors
  BILL_NOT_FOUND: 'The requested bill does not exist',
  COMMENT_NOT_FOUND: 'The requested comment does not exist',
  USER_NOT_FOUND: 'The requested user does not exist',
  DUPLICATE_RESOURCE: 'A resource with this information already exists',
  RESOURCE_LOCKED: 'This resource is locked and cannot be modified',
  OPERATION_NOT_ALLOWED: 'This operation is not allowed',
  INVALID_STATE_TRANSITION: 'This state transition is not allowed',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this operation',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred on the server',
  DATABASE_ERROR: 'A database error occurred',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable',
  EXTERNAL_SERVICE_ERROR: 'An external service error occurred',
  TIMEOUT: 'The request timed out',
  RATE_LIMITED: 'Too many requests. Please try again later',
  CIRCUIT_BREAKER_OPEN: 'Service is temporarily unavailable. Please try again later',
} as const;
