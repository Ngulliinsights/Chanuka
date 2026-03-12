import { Response } from 'express';
import { logger } from '../infrastructure/observability';
import { 
  ApiResponse as _ApiResponse,
  ApiError as _ApiError,
  ResponseMetadata as _ResponseMetadata,
  PaginationMeta as _PaginationMeta
} from '@shared/types/api';

/**
 * Type Exports for consistency
 */
export type ApiResponse<T = unknown> = _ApiResponse<T>;
export type ApiError = _ApiError;
export type ResponseMetadata = _ResponseMetadata;
export type PaginationMeta = _PaginationMeta;
export type ApiErrorResponse = ApiResponse<never>;
export type ApiSuccessResponse<T> = ApiResponse<T>;
export type ApiValidationErrorResponse = ApiResponse<never>;

/**
 * Result pattern types
 */
import { ServiceResult, AsyncServiceResult } from '../infrastructure/error-handling';
export type { ServiceResult, AsyncServiceResult };

/**
 * Metadata Factory
 */
export const createResponseMetadata = (
  startTime?: number,
  additional?: Partial<ResponseMetadata>
): ResponseMetadata => {
  return {
    timestamp: new Date().toISOString(),
    ...(startTime && { performance: { duration: Date.now() - startTime } }),
    ...additional,
  } as ResponseMetadata;
};

/**
 * API Response Core Utility
 */
export class ApiResponseWrapper {
  static createMetadata = createResponseMetadata;

  static success<T>(
    data: T, 
    message?: string, 
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      ...(message && { message }),
      metadata: createResponseMetadata(undefined, metadata)
    };
  }

  static error(
    message: string, 
    code: string = 'INTERNAL_ERROR', 
    details?: Record<string, any>, 
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      message,
      metadata: createResponseMetadata(undefined, metadata)
    };
  }
}

/**
 * Standard HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Primary Express response sender
 */
export function sendApiResponse<T>(
  res: Response,
  response: ApiResponse<T>,
  statusCode: number = 200
): Response {
  if (!response.success && response.error) {
    logger.error({
      code: response.error.code,
      message: response.error.message,
      statusCode
    }, 'API error response');
  }
  return res.status(statusCode).json(response);
}

/**
 * Legacy/Convenience success helper
 */
export function ApiSuccess<T>(
  res: Response,
  data: T,
  metadata?: Partial<ResponseMetadata>,
  statusCode: number = 200
): Response {
  const response = ApiResponseWrapper.success(data, undefined, metadata);
  return sendApiResponse(res, response, statusCode);
}

/**
 * Legacy mapping for ApiSuccessResponse (type and value)
 */
export const ApiSuccessResponse = ApiSuccess;
export const ApiErrorResponse = sendApiError;
export const ApiValidationErrorResponse = sendApiValidationError;

/**
 * Error helper
 */
export function sendApiError(
  res: Response,
  error: { code: string; message: string; details?: any },
  statusCode: number = 500,
  metadata?: Partial<ResponseMetadata>
): Response {
  const response = ApiResponseWrapper.error(error.message, error.code, error.details, metadata);
  return sendApiResponse(res, response, statusCode);
}

/**
 * Validation error helper
 */
export function sendApiValidationError(
  res: Response,
  errors: any,
  metadata?: Partial<ResponseMetadata>
): Response {
  return sendApiError(res, {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: { errors }
  }, 400, metadata);
}

// Named legacy exports
export const ApiError = sendApiError;
export const ApiValidationError = sendApiValidationError;

/**
 * Specialized helpers
 */
export const ApiUnauthorized = (res: Response, message = 'Unauthorized') => 
  sendApiError(res, { code: 'UNAUTHORIZED', message }, 401);

export const ApiForbidden = (res: Response, message = 'Forbidden') => 
  sendApiError(res, { code: 'FORBIDDEN', message }, 403);

export const ApiNotFound = (res: Response, resource = 'Resource') => 
  sendApiError(res, { code: 'NOT_FOUND', message: `${resource} not found` }, 404);



