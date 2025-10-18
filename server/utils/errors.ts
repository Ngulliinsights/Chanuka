import { NextFunction, Request, Response } from 'express';
import { logger } from '../../shared/core/src/observability/logging';
import { 
  BaseError,
  ValidationError as BaseValidationError,
  NotFoundError as BaseNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError as BaseConflictError,
  DatabaseError as BaseDatabaseError,
  ErrorDomain,
  ErrorSeverity
} from '../../shared/core/src/observability/error-management';

// Re-export the unified error classes
export { 
  BaseError as AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError
} from '../../shared/core/src/observability/error-management';

/**
 * Authentication error - extends UnauthorizedError
 */
export class AuthError extends UnauthorizedError {
  constructor(
    message: string,
    statusCode = 401,
    code = 'AUTH_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, { 
      statusCode, 
      code, 
      details,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM
    });
    this.name = 'AuthError';
  }
}

/**
 * Error for invalid credentials during login
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message, 401, 'AUTH_INVALID');
  }
}

/**
 * Error when user already exists during registration
 */
export class UserExistsError extends BaseConflictError {
  constructor(message = 'User already exists') {
    super(message, 'user', { code: 'ALREADY_EXISTS' });
    this.name = 'UserExistsError';
  }
}

/**
 * OAuth specific error class
 */
export class OAuthError extends AuthError {
  constructor(message: string, statusCode = 401) {
    super(message, statusCode, 'AUTH_OAUTH_ERROR');
    this.name = 'OAuthError';
  }
}

/**
 * Error for when a sponsor is not found in the database
 */
export class SponsorNotFoundError extends BaseNotFoundError {
  constructor(message = 'Sponsor not found') {
    super('sponsor', undefined, { code: 'SPONSOR_NOT_FOUND' });
    this.name = 'SponsorNotFoundError';
  }
}

/**
 * Async handler wrapper for Express routes to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}







