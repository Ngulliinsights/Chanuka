/**
 * Error handling utilities and custom error classes
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class NavigationError extends AppError {
  constructor(message: string, path?: string) {
    super(message, 'NAVIGATION_ERROR', 400);
    this.name = 'NavigationError';
    if (path) {
      this.message = `Navigation error for path "${path}": ${message}`;
    }
  }
}

export class InvalidNavigationPathError extends NavigationError {
  constructor(path: string) {
    super(`Invalid navigation path: ${path}`, path);
    this.name = 'InvalidNavigationPathError';
  }
}

export class NavigationAccessDeniedError extends AuthorizationError {
  constructor(path: string, reason?: string) {
    super(`Access denied to ${path}${reason ? `: ${reason}` : ''}`);
    this.name = 'NavigationAccessDeniedError';
  }
}

export class NavigationValidationError extends ValidationError {
  constructor(message: string, path?: string) {
    super(message, path);
    this.name = 'NavigationValidationError';
  }
}

// Error handling utilities
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

export function handleError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  console.error(`Error in ${context || 'unknown context'}:`, {
    message,
    code,
    error,
  });

  // Report to external service if available
  if (typeof window !== 'undefined' && (window as any).errorReporting) {
    (window as any).errorReporting.report(error, { context });
  }
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  NetworkError,
  NavigationError,
  isAppError,
  getErrorMessage,
  getErrorCode,
  handleError,
};