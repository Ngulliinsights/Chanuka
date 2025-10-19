import { NextFunction, Request, Response } from 'express';
import { logger } from '../../shared/core/logger.js';
import { 
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from '../../shared/core/index.js';

// Simple error domain and severity enums
export enum ErrorDomain {
  SYSTEM = 'system',
  BUSINESS = 'business',
  EXTERNAL = 'external',
  SECURITY = 'security',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Additional error classes
export class ConflictError extends BaseError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database error') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Re-export the unified error classes
export { 
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};

/**
 * Authentication error - extends UnauthorizedError
 */
export class AuthError extends UnauthorizedError {
  constructor(
    message: string,
    statusCode = 401,
    code = 'AUTH_ERROR'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
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
export class UserExistsError extends ConflictError {
  constructor(message = 'User already exists') {
    super(message);
    this.code = 'ALREADY_EXISTS';
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
export class SponsorNotFoundError extends NotFoundError {
  constructor(message = 'Sponsor not found') {
    super(message);
    this.code = 'SPONSOR_NOT_FOUND';
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












































