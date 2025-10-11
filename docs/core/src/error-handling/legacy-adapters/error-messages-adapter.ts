/**
 * Legacy Error Messages Adapter
 * 
 * Provides backward compatibility for the old error messages interface
 * while using the new core error handling system underneath
 */

import { ErrorCode } from '../../../../src/shared/error-handling/constants/error-codes';
import { logger } from '../utils/logger';

/**
 * User-friendly error messages mapped to error codes
 * This is a legacy adapter that maintains backward compatibility
 */
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  [ErrorCode.INVALID_CREDENTIALS]: "Invalid username or password",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please log in again",
  [ErrorCode.TOKEN_INVALID]: "Invalid authentication token",
  [ErrorCode.SESSION_EXPIRED]: "Your session has expired. Please log in again",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: "You don't have permission to access this resource",
  [ErrorCode.USERNAME_EXISTS]: "This username is already taken",
  [ErrorCode.REGISTRATION_FAILED]: "Registration failed. Please try again",
  [ErrorCode.LOGIN_FAILED]: "Login failed. Please check your credentials",
  [ErrorCode.LOGOUT_FAILED]: "Logout failed. Please try again",
  [ErrorCode.AUTH_REQUIRED]: "Authentication required to access this resource",
  [ErrorCode.RATE_LIMITED]: "Too many login attempts. Please try again later",
  [ErrorCode.USER_NOT_FOUND]: "User account not found",
  [ErrorCode.INVALID_SESSION]: "Invalid session. Please log in again",
  [ErrorCode.SESSION_CREATION_FAILED]: "Failed to create session. Please try again",
  [ErrorCode.PASSWORD_RESET_REQUIRED]: "Password reset required",
  [ErrorCode.ACCOUNT_LOCKED]: "Account temporarily locked due to multiple failed attempts",
  [ErrorCode.TOKEN_REQUIRED]: "Authentication token required",
  
  // Validation
  [ErrorCode.VALIDATION_FAILED]: "The provided data is invalid. Please check your input",
  [ErrorCode.REQUIRED_FIELD_MISSING]: "Required field is missing",
  [ErrorCode.INVALID_FORMAT]: "Invalid format provided",
  [ErrorCode.INVALID_EMAIL]: "Please enter a valid email address",
  [ErrorCode.INVALID_USERNAME]: "Username can only contain letters, numbers, and underscores",
  [ErrorCode.USERNAME_TOO_SHORT]: "Username must be at least 3 characters long",
  [ErrorCode.USERNAME_TOO_LONG]: "Username must be less than 30 characters long",
  [ErrorCode.PASSWORD_TOO_SHORT]: "Password must be at least 8 characters long",
  [ErrorCode.PASSWORD_TOO_LONG]: "Password must be less than 100 characters long",
  [ErrorCode.PASSWORD_WEAK]: "Password must contain at least one lowercase letter, one uppercase letter, and one number",
  [ErrorCode.INVALID_PROPERTY_ID]: "Invalid property ID",
  [ErrorCode.INVALID_USER_ID]: "Invalid user ID",
  [ErrorCode.INVALID_REVIEW_ID]: "Invalid review ID",
  
  // Database
  [ErrorCode.DATABASE_CONNECTION_FAILED]: "Database service temporarily unavailable",
  [ErrorCode.DATABASE_ERROR]: "Database operation failed",
  [ErrorCode.CONNECTION_FAILED]: "Connection failed. Please try again",
  [ErrorCode.TRANSACTION_FAILED]: "Transaction failed. Please try again",
  [ErrorCode.DUPLICATE_RECORD]: "A record with this information already exists",
  [ErrorCode.DUPLICATE_ENTRY]: "This entry already exists",
  [ErrorCode.CONSTRAINT_VIOLATION]: "Data constraint violation",
  [ErrorCode.FOREIGN_KEY_VIOLATION]: "Referenced record does not exist",
  [ErrorCode.NOT_NULL_VIOLATION]: "Required fields are missing",
  [ErrorCode.RECORD_NOT_FOUND]: "Record not found",
  [ErrorCode.UPDATE_FAILED]: "Failed to update record",
  [ErrorCode.DELETE_FAILED]: "Failed to delete record",
  [ErrorCode.INSERT_FAILED]: "Failed to create record",
  
  // Property Management
  [ErrorCode.PROPERTY_NOT_FOUND]: "Property not found",
  [ErrorCode.PROPERTY_CREATION_FAILED]: "Failed to create property. Please try again",
  [ErrorCode.PROPERTY_UPDATE_FAILED]: "Failed to update property. Please try again",
  [ErrorCode.PROPERTY_DELETE_FAILED]: "Failed to delete property. Please try again",
  [ErrorCode.PROPERTY_SEARCH_FAILED]: "Property search failed. Please try again",
  [ErrorCode.INVALID_PROPERTY_DATA]: "Invalid property data provided",
  [ErrorCode.PROPERTY_ALREADY_EXISTS]: "A property with this information already exists",
  [ErrorCode.PROPERTY_NOT_OWNED]: "You don't have permission to modify this property",
  [ErrorCode.VERIFICATION_FAILED]: "Property verification failed",
  [ErrorCode.VERIFICATION_PENDING]: "Property verification is pending",
  
  // System & General
  [ErrorCode.NOT_FOUND]: "The requested resource was not found",
  [ErrorCode.RESOURCE_CONFLICT]: "This action conflicts with existing data",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Please wait a moment and try again",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: "External service error. Please try again later",
  [ErrorCode.TIMEOUT]: "The request took too long to process. Please try again",
  [ErrorCode.INTERNAL_SERVER_ERROR]: "An unexpected error occurred. Please try again later",
  [ErrorCode.CONFIGURATION_ERROR]: "System configuration error",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
  [ErrorCode.REQUEST_TIMEOUT]: "Request timeout. Please try again",
  [ErrorCode.INVALID_REQUEST]: "Invalid request",
  [ErrorCode.MALFORMED_DATA]: "Invalid data format received",
  [ErrorCode.OPERATION_FAILED]: "Operation failed. Please try again",
  [ErrorCode.UNKNOWN_ERROR]: "An unknown error occurred",
  [ErrorCode.CLIENT_RUNTIME_ERROR]: "Application error occurred",
} as const;

/**
 * Get user-friendly error message for error code
 */
export function getErrorMessage(errorCode: ErrorCode): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Legacy auth error messages for backward compatibility
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: ERROR_MESSAGES[ErrorCode.INVALID_CREDENTIALS],
  TOKEN_EXPIRED: ERROR_MESSAGES[ErrorCode.TOKEN_EXPIRED],
  TOKEN_INVALID: ERROR_MESSAGES[ErrorCode.TOKEN_INVALID],
  SESSION_EXPIRED: ERROR_MESSAGES[ErrorCode.SESSION_EXPIRED],
  INSUFFICIENT_PERMISSIONS: ERROR_MESSAGES[ErrorCode.INSUFFICIENT_PERMISSIONS],
  AUTH_REQUIRED: ERROR_MESSAGES[ErrorCode.AUTH_REQUIRED],
  RATE_LIMITED: ERROR_MESSAGES[ErrorCode.RATE_LIMITED],
  USER_NOT_FOUND: ERROR_MESSAGES[ErrorCode.USER_NOT_FOUND],
  INVALID_SESSION: ERROR_MESSAGES[ErrorCode.INVALID_SESSION],
  ACCOUNT_LOCKED: ERROR_MESSAGES[ErrorCode.ACCOUNT_LOCKED],
  TOKEN_REQUIRED: ERROR_MESSAGES[ErrorCode.TOKEN_REQUIRED],
} as const;






