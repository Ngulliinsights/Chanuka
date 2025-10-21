/**
 * Unified API Response Utilities
 * Cross-cutting concern for consistent API responses
 */

import { Response } from 'express';
import { logger } from '../../observability/logging';

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
      message,
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
        details,
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
}

// Legacy exports for backward compatibility
export const ApiSuccess = UnifiedApiResponse.success;
export const ApiError = UnifiedApiResponse.error;
export const ApiNotFound = (message?: string) => UnifiedApiResponse.notFound('Resource', message);
export const ApiValidationError = (errors: any[]) => UnifiedApiResponse.validation(errors);
export const ApiResponseWrapper = UnifiedApiResponse;

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

export default UnifiedApiResponse;