/**
 * Unified API Response Utilities
 * Cross-cutting concern for consistent API responses
 */

import { Response } from 'express';

import { logger } from '../infrastructure/observability';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMetadata;
  performance?: PerformanceMetadata;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PerformanceMetadata {
  duration: number;
  cached?: boolean;
  cacheHit?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
  message: string;
  metadata: ResponseMetadata;
}

/**
 * Unified API Response Wrapper
 */
export class UnifiedApiResponse {
  static success<T>(
    data: T,
    message?: string,
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      ...(message !== undefined && { message }),
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static error(
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
    metadata?: Partial<ResponseMetadata>
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: new Error().stack })
      },
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static validation(
    errors: Array<{ field: string; message: string }>,
    message: string = 'Validation failed'
  ): ErrorResponse {
    return this.error(message, 'VALIDATION_ERROR', { errors });
  }

  static notFound(
    resource: string = 'Resource',
    message?: string
  ): ErrorResponse {
    return this.error(
      message || `${resource} not found`,
      'NOT_FOUND'
    );
  }

  static unauthorized(message: string = 'Authentication required'): ErrorResponse {
    return this.error(message, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Insufficient permissions'): ErrorResponse {
    return this.error(message, 'FORBIDDEN');
  }

  static conflict(message: string = 'Resource conflict'): ErrorResponse {
    return this.error(message, 'CONFLICT');
  }

  static tooManyRequests(message: string = 'Rate limit exceeded'): ErrorResponse {
    return this.error(message, 'TOO_MANY_REQUESTS');
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable'): ErrorResponse {
    return this.error(message, 'SERVICE_UNAVAILABLE');
  }

  static createMetadata(
    startTime: number,
    _operation: string,
    additionalMetadata?: Partial<ResponseMetadata>
  ): Partial<ResponseMetadata> {
    const duration = Date.now() - startTime;
    return {
      timestamp: new Date().toISOString(),
      performance: {
        duration
      },
      ...additionalMetadata
    };
  }
}

// Legacy exports for backward compatibility
export const ApiResponseWrapper = UnifiedApiResponse;

// Error codes and HTTP status constants
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Express response helper
 */
export function sendApiResponse<T>(
  res: Response,
  response: ApiResponse<T>,
  statusCode?: number
): void {
  const status = statusCode || (response.success ? 200 : 500);

  // Log the response for monitoring
  if (!response.success) {
    logger.error('API Error Response', {
      error: response.error,
      statusCode: status
    });
  }

  res.status(status).json(response);
}

/**
 * Legacy API response helper functions for backward compatibility
 */
export function ApiSuccess<T>(
  res: Response,
  data: T,
  metadata?: Partial<ResponseMetadata>,
  statusCode?: number
): void {
  const response = UnifiedApiResponse.success(data, undefined, metadata);
  sendApiResponse(res, response, statusCode);
}

export function ApiError(
  res: Response,
  error: { code: string; message: string; details?: any },
  statusCode: number = 500,
  metadata?: Partial<ResponseMetadata>
): void {
  const response = UnifiedApiResponse.error(error.message, error.code, error.details, metadata);
  sendApiResponse(res, response, statusCode);
}

export function ApiUnauthorized(
  res: Response,
  message: string = 'Authentication required',
  _metadata?: Partial<ResponseMetadata>
): void {
  const response = UnifiedApiResponse.unauthorized(message);
  sendApiResponse(res, response, 401);
}

export function ApiForbidden(
  res: Response,
  message: string = 'Insufficient permissions',
  _metadata?: Partial<ResponseMetadata>
): void {
  const response = UnifiedApiResponse.forbidden(message);
  sendApiResponse(res, response, 403);
}

export function ApiNotFound(
  res: Response,
  resource: string = 'Resource',
  message?: string,
  _metadata?: Partial<ResponseMetadata>
): void {
  const response = UnifiedApiResponse.notFound(resource, message);
  sendApiResponse(res, response, 404);
}

export function ApiValidationError(
  res: Response,
  errors: Array<{ field: string; message: string }> | { field: string; message: string },
  _metadata?: Partial<ResponseMetadata>
): void {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  const response = UnifiedApiResponse.validation(errorArray, 'Validation failed');
  sendApiResponse(res, response, 400);
}

// Remove duplicate export - UnifiedApiResponse is already exported as named export
// export default UnifiedApiResponse;



