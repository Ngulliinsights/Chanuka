// Re-export unified error management system
export {
  BaseError as BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError as AuthenticationError,
  ForbiddenError as AuthorizationError,
  ConflictError,
  DatabaseError,
  TooManyRequestsError,
  ServiceUnavailableError,
  NetworkError,
  CacheError,
  ErrorDomain,
  ErrorSeverity,
  CircuitBreaker
} from '../core/src/observability/error-management';

// Re-export server-specific errors
export {
  AuthError,
  InvalidCredentialsError,
  UserExistsError,
  OAuthError,
  SponsorNotFoundError,
  asyncHandler
} from '../server/utils/errors.js';

// Legacy type for backward compatibility
export type ErrorType = 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'database' | 'network' | 'system';

// Legacy factory functions for backward compatibility
export function createValidationError(message: string, field?: string): ValidationError {
  return new ValidationError(message, undefined, { field });
}

export function createAuthenticationError(message: string = 'Authentication required'): UnauthorizedError {
  return new UnauthorizedError(message);
}

export function createAuthorizationError(message: string = 'Insufficient permissions'): ForbiddenError {
  return new ForbiddenError(message);
}

export function createNotFoundError(message: string = 'Resource not found'): NotFoundError {
  return new NotFoundError('Resource', undefined, { message });
}

export function createConflictError(message: string = 'Resource conflict'): ConflictError {
  return new ConflictError(message);
}

export function createDatabaseError(message: string = 'Database operation failed'): DatabaseError {
  return new DatabaseError(message);
}

// Re-export middleware functions
export { errorHandler } from '../server/middleware/error-handler.js';
export { asyncHandler as asyncErrorHandler } from '../server/utils/errors.js';

// Placeholder for global error handlers setup
export function setupGlobalErrorHandlers() {
  // This would set up global error handlers for unhandled rejections, etc.
  console.log('Global error handlers setup - implement as needed');
}











































