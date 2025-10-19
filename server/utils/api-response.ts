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

export const ApiResponseWrapper = ApiResponse;
export const ApiSuccess = ApiResponse.success;
export const ApiError = ApiResponse.error;
export const ApiNotFound = ApiResponse.notFound;
export const ApiUnauthorized = (message: string = 'Unauthorized') =>
  ApiResponse.error(message, 'UNAUTHORIZED', 401);
export const ApiForbidden = (message: string = 'Forbidden') =>
  ApiResponse.error(message, 'FORBIDDEN', 403);
export const ApiValidationError = (errors: any[]) =>
  ApiResponse.validation('Validation failed', errors);

export const ErrorCodes = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
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
