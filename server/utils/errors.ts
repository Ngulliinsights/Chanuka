/**
 * Server Error Utilities (DEPRECATED)
 * 
 * ⚠️ THIS FILE IS DEPRECATED AND WILL BE REMOVED IN FUTURE VERSIONS ⚠️
 * 
 * @deprecated This file contains legacy error classes.
 * New code should use @server/infrastructure/error-handling
 * 
 * Migration guide:
 * - Use createError() from @server/infrastructure/error-handling/error-factory
 * - Use ErrorCategory enum for error types
 * - Use StandardizedError interface for error handling
 * - Use AsyncServiceResult for service methods
 * 
 * See docs/ERROR_HANDLING_MIGRATION_GUIDE.md for complete migration instructions.
 */

import type { NextFunction, Request, Response } from 'express';

// Runtime deprecation warning
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️  DEPRECATION WARNING: server/utils/errors.ts is deprecated.\n' +
    '   Use @server/infrastructure/error-handling instead.\n' +
    '   See docs/ERROR_HANDLING_MIGRATION_GUIDE.md for migration guide.'
  );
}

// Re-export shared error types for backward compatibility
export { 
  ValidationError,
  TransformationError,
  NetworkError,
} from '@shared/utils/errors/types';

// Re-export error context utilities
export type { ErrorContext } from '@shared/utils/errors/context';
export { ErrorContextBuilder } from '@shared/utils/errors/context';

/**
 * Base error class for application errors
 * @deprecated Use createError() from error-factory instead
 * Migration: new BaseError(msg, opts) → createSystemError(new Error(msg), context)
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

/**
 * Authentication error
 * @deprecated Use ErrorCategory.AUTHENTICATION with createError()
 */
export class AuthError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 401);
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Error for invalid credentials during login
 * @deprecated Use ErrorCategory.AUTHENTICATION with createError()
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message);
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/**
 * Unauthorized error
 * @deprecated Use ErrorCategory.AUTHENTICATION with createError()
 */
export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error
 * @deprecated Use ErrorCategory.AUTHORIZATION with createError()
 */
export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error
 * @deprecated Use ErrorCategory.NOT_FOUND with createError()
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string, details?: Record<string, unknown>) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error
 * @deprecated Use ErrorCategory.CONFLICT with createError()
 */
export class ConflictError extends BaseError {
  constructor(message: string, resource?: string, details?: Record<string, unknown>) {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error when user already exists during registration
 * @deprecated Use ErrorCategory.CONFLICT with createError()
 */
export class UserExistsError extends ConflictError {
  constructor(message = 'User already exists') {
    super(message, 'user');
    Object.setPrototypeOf(this, UserExistsError.prototype);
  }
}

/**
 * OAuth specific error class
 * @deprecated Use ErrorCategory.AUTHENTICATION with createError()
 */
export class OAuthError extends AuthError {
  constructor(message: string, statusCode = 401) {
    super(message);
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

/**
 * Error for when a sponsor is not found in the database
 * @deprecated Use ErrorCategory.NOT_FOUND with createError()
 */
export class SponsorNotFoundError extends NotFoundError {
  constructor(message = 'Sponsor not found') {
    super('sponsor', undefined);
    Object.setPrototypeOf(this, SponsorNotFoundError.prototype);
  }
}

/**
 * Async handler wrapper for Express routes to catch errors
 * 
 * @example
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}














































