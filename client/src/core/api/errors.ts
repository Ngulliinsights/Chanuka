/**
 * API Error Compatibility Bridge
 *
 * DEPRECATED: This module is a compatibility bridge for legacy API error handling.
 * New code should use @client/core/error instead.
 *
 * This file re-exports and adapts the centralized error system to maintain
 * backward compatibility with existing API code.
 */

export type APIErrorCode = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

// Alias for backward compatibility with code that imports ErrorCode
export type ErrorCode = APIErrorCode;

export interface APIErrorDetails {
  code: APIErrorCode;
  status?: number;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  timestamp: Date;
  path?: string;
  method?: string;
}

export interface APIError extends Error, APIErrorDetails {
  toJSON(): Record<string, any>;
}

export class NetworkError extends Error implements APIError {
  code: APIErrorCode = 'NETWORK_ERROR';
  status = 0;
  message: string;
  details?: Record<string, any>;
  retryable = true;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class TimeoutError extends Error implements APIError {
  code: APIErrorCode = 'TIMEOUT';
  status = 408;
  message: string;
  details?: Record<string, any>;
  retryable = true;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class ValidationError extends Error implements APIError {
  code: APIErrorCode = 'VALIDATION_ERROR';
  status = 400;
  message: string;
  details?: Record<string, any>;
  retryable = false;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class UnauthorizedError extends Error implements APIError {
  code: APIErrorCode = 'UNAUTHORIZED';
  status = 401;
  message: string;
  details?: Record<string, any>;
  retryable = false;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class ForbiddenError extends Error implements APIError {
  code: APIErrorCode = 'FORBIDDEN';
  status = 403;
  message: string;
  details?: Record<string, any>;
  retryable = false;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class NotFoundError extends Error implements APIError {
  code: APIErrorCode = 'NOT_FOUND';
  status = 404;
  message: string;
  details?: Record<string, any>;
  retryable = false;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class ServerError extends Error implements APIError {
  code: APIErrorCode = 'SERVER_ERROR';
  status = 500;
  message: string;
  details?: Record<string, any>;
  retryable = true;
  timestamp = new Date();
  path?: string;
  method?: string;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.message = message;
    this.details = details || {};
    Object.setPrototypeOf(this, ServerError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export function createAPIError(
  code: APIErrorCode,
  message: string,
  status?: number,
  details?: Record<string, any>
): APIError {
  switch (code) {
    case 'NETWORK_ERROR':
      return new NetworkError(message, details);
    case 'TIMEOUT':
      return new TimeoutError(message, details);
    case 'VALIDATION_ERROR':
      return new ValidationError(message, details);
    case 'UNAUTHORIZED':
      return new UnauthorizedError(message, details);
    case 'FORBIDDEN':
      return new ForbiddenError(message, details);
    case 'NOT_FOUND':
      return new NotFoundError(message, details);
    case 'SERVER_ERROR':
    default:
      return new ServerError(message, details);
  }
}

/**
 * Global error handler for API errors
 * @param error The error to handle
 */
export const globalErrorHandler = (error: unknown): void => {
  if (error instanceof Error) {
    console.error('API Error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
};

/**
 * Factory for creating typed API errors
 */
export const ErrorFactory = {
  network: (message: string, details?: Record<string, any>) => new NetworkError(message, details),
  timeout: (message: string, details?: Record<string, any>) => new TimeoutError(message, details),
  validation: (message: string, details?: Record<string, any>) => new ValidationError(message, details),
  unauthorized: (message: string, details?: Record<string, any>) => new UnauthorizedError(message, details),
  forbidden: (message: string, details?: Record<string, any>) => new ForbiddenError(message, details),
  notFound: (message: string, details?: Record<string, any>) => new NotFoundError(message, details),
  server: (message: string, details?: Record<string, any>) => new ServerError(message, details),
};
