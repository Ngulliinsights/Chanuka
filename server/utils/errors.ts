import { NextFunction, Request, Response } from 'express';

/**
 * Base error class for authentication related errors
 */
export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    statusCode = 401,
    code = 'AUTH_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, statusCode, code, details);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, code = 'VALIDATION_ERROR') {
    super(message, 400, code, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, code = 'NOT_FOUND') {
    super(message, 404, code, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, code = 'CONFLICT') {
    super(message, 409, code, details);
    this.name = 'ConflictError';
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
export class UserExistsError extends AuthError {
  constructor(message = 'User already exists') {
    super(message, 409, 'ALREADY_EXISTS');
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
 * Async handler wrapper for Express routes to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
