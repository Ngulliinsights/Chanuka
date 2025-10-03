import { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: ResponseMetadata;
}

// Error interface for consistent error handling
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
}

// Metadata interface for debugging and monitoring
export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  source: 'database' | 'cache' | 'fallback' | 'static';
  executionTime?: number;
  cacheHit?: boolean;
  version: string;
}

// Response wrapper class for consistent API responses
export class ApiResponseWrapper {
  private static version = '1.0.0';
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data: T,
    metadata: Partial<ResponseMetadata> = {},
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'database',
        version: this.version,
        ...metadata
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    error: string | Error | ApiError,
    statusCode: number = 500,
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    let apiError: ApiError;

    if (typeof error === 'string') {
      apiError = {
        code: 'GENERIC_ERROR',
        message: error
      };
    } else if (error instanceof Error) {
      apiError = {
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        ...(this.isDevelopment && { stack: error.stack })
      };
    } else {
      apiError = error;
    }

    const response: ApiResponse = {
      success: false,
      error: apiError,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'database',
        version: this.version,
        ...metadata
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    resource: string = 'Resource',
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.error(
      res,
      {
        code: 'NOT_FOUND',
        message: `${resource} not found`
      },
      404,
      metadata
    );
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    details: any,
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.error(
      res,
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details
      },
      400,
      metadata
    );
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access',
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.error(
      res,
      {
        code: 'UNAUTHORIZED',
        message
      },
      401,
      metadata
    );
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden',
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.error(
      res,
      {
        code: 'FORBIDDEN',
        message
      },
      403,
      metadata
    );
  }

  /**
   * Send cached response with cache metadata
   */
  static cached<T>(
    res: Response,
    data: T,
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.success(res, data, {
      ...metadata,
      source: 'cache',
      cacheHit: true
    });
  }

  /**
   * Send fallback response when primary data source fails
   */
  static fallback<T>(
    res: Response,
    data: T,
    message: string = 'Using fallback data',
    metadata: Partial<ResponseMetadata> = {}
  ): Response {
    return this.success(res, data, {
      ...metadata,
      source: 'fallback'
    });
  }

  /**
   * Create response metadata with execution timing
   */
  static createMetadata(
    startTime: number,
    source: ResponseMetadata['source'] = 'database',
    additional: Partial<ResponseMetadata> = {}
  ): ResponseMetadata {
    return {
      timestamp: new Date().toISOString(),
      source,
      executionTime: Date.now() - startTime,
      version: this.version,
      ...additional
    };
  }
}

// Convenience functions for common response patterns
export const ApiSuccess = ApiResponseWrapper.success;
export const ApiError = ApiResponseWrapper.error;
export const ApiNotFound = ApiResponseWrapper.notFound;
export const ApiValidationError = ApiResponseWrapper.validationError;
export const ApiUnauthorized = ApiResponseWrapper.unauthorized;
export const ApiForbidden = ApiResponseWrapper.forbidden;
export const ApiCached = ApiResponseWrapper.cached;
export const ApiFallback = ApiResponseWrapper.fallback;

// Error codes enum for consistency
export enum ErrorCodes {
  GENERIC_ERROR = 'GENERIC_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE'
}

// HTTP status codes enum for consistency
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}