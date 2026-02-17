import { logger } from '@server/infrastructure/observability';
import { 
  BaseError,
  CacheError,
  ConflictError,
  DatabaseError,
  ErrorDomain,
  ErrorSeverity,
  ExternalServiceError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError} from '@shared/core';
import { NextFunction, Request, Response } from 'express';

// Re-export the unified error classes from shared/core
export { 
  BaseError,
  ErrorDomain,
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  NetworkError,
  CacheError,
  TooManyRequestsError,
  ServiceUnavailableError
};

/**
 * Authentication error - extends UnauthorizedError using shared BaseError system
 */
export class AuthError extends UnauthorizedError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
    this.name = 'AuthError';
  }
}

/**
 * Error for invalid credentials during login
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message, { code: 'AUTH_INVALID' });
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Error when user already exists during registration
 */
export class UserExistsError extends ConflictError {
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
    super(message, { 
      code: 'AUTH_OAUTH_ERROR',
      statusCode 
    });
    this.name = 'OAuthError';
  }
}

/**
 * Error for when a sponsor is not found in the database
 */
export class SponsorNotFoundError extends NotFoundError {
  constructor(message = 'Sponsor not found') {
    super('sponsor', undefined, { 
      code: 'SPONSOR_NOT_FOUND',
      message 
    });
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














































