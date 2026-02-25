/**
 * API Response Helpers
 * Standardized response utilities for Express endpoints
 */

import { Response } from 'express';

// Response type definitions
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Response helper functions
export const sendSuccess = <T>(
  res: Response,
  data: T,
  metadata?: Record<string, unknown>
): Response<ApiSuccessResponse<T>> => {
  return res.status(200).json({
    success: true,
    data,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  metadata?: Record<string, unknown>
): Response<ApiErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    error: { message, statusCode },
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const sendValidationError = (
  res: Response,
  errors: unknown,
  metadata?: Record<string, unknown>
): Response<ApiErrorResponse> => {
  return res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: errors,
    },
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found',
  metadata?: Record<string, unknown>
): Response<ApiErrorResponse> => {
  return res.status(404).json({
    success: false,
    error: { message, statusCode: 404, code: 'NOT_FOUND' },
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized',
  metadata?: Record<string, unknown>
): Response<ApiErrorResponse> => {
  return res.status(401).json({
    success: false,
    error: { message, statusCode: 401, code: 'UNAUTHORIZED' },
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden',
  metadata?: Record<string, unknown>
): Response<ApiErrorResponse> => {
  return res.status(403).json({
    success: false,
    error: { message, statusCode: 403, code: 'FORBIDDEN' },
    metadata,
    timestamp: new Date().toISOString(),
  });
};

// Legacy aliases for backward compatibility
export const ApiSuccessResponse = sendSuccess;
export const ApiErrorResponse = sendError;
export const ApiValidationErrorResponse = sendValidationError;
export const ApiNotFoundResponse = sendNotFound;
export const ApiUnauthorizedResponse = sendUnauthorized;
export const ApiForbiddenResponse = sendForbidden;

// Additional aliases
export const ApiNotFound = sendNotFound;
export const ApiUnauthorized = sendUnauthorized;
export const ApiForbidden = sendForbidden;

// Error codes and HTTP status constants
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Response builder classes
export class ApiResponse {
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      message: message || 'Success',
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, code?: string, statusCode?: number) {
    return {
      success: false,
      error: {
        message,
        code: code || 'UNKNOWN_ERROR',
        statusCode: statusCode || 500,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static validation(message: string, errors: unknown) {
    return {
      success: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: errors,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'API_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class ApiValidationError extends ApiError {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ApiValidationError';
  }

  override toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
