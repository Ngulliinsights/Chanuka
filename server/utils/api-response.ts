/**
 * LEGACY ADAPTER: API Response Utilities
 */

// Simple API response utilities
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  statusCode?: number;
  errors?: any[];
}

class ApiResponseBuilder {
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  static error(message: string, code?: string, statusCode: number = 500): ApiResponse {
    return {
      success: false,
      error: message,
      code,
      statusCode
    };
  }

  static notFound(message: string = 'Resource not found'): ApiResponse {
    return {
      success: false,
      error: message,
      code: 'NOT_FOUND',
      statusCode: 404
    };
  }

  static validation(message: string, errors: any[]): ApiResponse {
    return {
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      errors
    };
  }
}

const ApiResponse = ApiResponseBuilder;

// Updated API response utilities - no longer deprecated

export const ApiSuccess = ApiResponse.success;
export const ApiError = ApiResponse.error;
export const ApiNotFound = ApiResponse.notFound;
export const ApiUnauthorized = (message: string = 'Unauthorized') =>
  ApiResponse.error(message, 'UNAUTHORIZED', 401);
export const ApiForbidden = (message: string = 'Forbidden') =>
  ApiResponse.error(message, 'FORBIDDEN', 403);
export const ApiValidationError = (errors: any[]) =>
  ApiResponse.validation('Validation failed', errors);

// API Response Wrapper class with createMetadata method
export class ApiResponseWrapper {
  static success(res: any, data: any, metadata?: any, statusCode?: number) {
    return ApiResponse.success(data);
  }

  static error(res: any, error: string | Error, statusCode?: number, metadata?: any) {
    const message = typeof error === 'string' ? error : error.message;
    return ApiResponse.error(message, undefined, statusCode);
  }

  static notFound(res: any, resource?: string, metadata?: any) {
    return ApiResponse.notFound(resource || 'Resource not found');
  }

  static validationError(res: any, details: any, metadata?: any) {
    return ApiResponse.validation('Validation failed', details);
  }

  static unauthorized(res: any, message?: string, metadata?: any) {
    return ApiUnauthorized(message || 'Unauthorized');
  }

  static forbidden(res: any, message?: string, metadata?: any) {
    return ApiForbidden(message || 'Forbidden');
  }

  static cached(res: any, data: any, metadata?: any) {
    return ApiResponse.success(data);
  }

  static fallback(res: any, data: any, message?: string, metadata?: any) {
    return ApiResponse.success(data);
  }

  static createMetadata(startTime: number, source?: string, additional?: any) {
    return {
      timestamp: new Date().toISOString(),
      requestId: undefined,
      source: source || 'api',
      executionTime: Date.now() - startTime,
      cacheHit: false,
      version: '1.0.0',
      ...additional
    };
  }
}

export const ErrorCodes = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export type { ApiResponse };
