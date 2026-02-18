/**
 * LEGACY ADAPTER: API Response Utilities
 */

import { 
  ApiErrorResponse as ErrorResponse,
  ApiResponse,
  ApiSuccessResponse as sendApiResponse,
  ApiValidationErrorResponse
 } from './shared-core-fallback';

// For backward compatibility
export const UnifiedApiResponse = ApiResponse;

console.warn(
  '[DEPRECATED] server/utils/api-response.ts is deprecated. ' +
  'Please import from \'@shared/core/src/utils/api-utils\' instead.'
);

export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = (res: unknown, data: unknown, metadata?: unknown) =>
  sendApiResponse(res, data, metadata);
export const ApiError = (res: unknown, message: string, statusCode = 500, metadata?: unknown) =>
  ErrorResponse(res, message, statusCode, metadata);
export const ApiNotFound = (res: unknown, message = 'Resource not found', metadata?: unknown) =>
  ErrorResponse(res, message, 404, metadata);
export const ApiValidationError = (res: unknown, errors: unknown, metadata?: unknown) =>
  ApiValidationErrorResponse(res, errors, metadata);

export type { ApiResponse, ErrorResponse };








