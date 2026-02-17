/**
 * LEGACY ADAPTER: API Response Utilities
 */

import { 
  ApiErrorResponse as ErrorResponse,
  ApiResponse,
  ApiSuccessResponse as sendApiResponse
 } from './shared-core-fallback.js';

// For backward compatibility
export const UnifiedApiResponse = ApiResponse;

console.warn(
  '[DEPRECATED] server/utils/api-response.ts is deprecated. ' +
  'Please import from \'@shared/core/src/utils/api-utils\' instead.'
);

export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = (res: unknown, data: unknown, metadata?: unknown, statusCode?: number) =>
  sendApiResponse(res, UnifiedApiResponse.success(data, undefined, metadata), statusCode);
export const ApiError = (res: unknown, message: string, statusCode = 500) =>
  sendApiResponse(res, UnifiedApiResponse.error(message), statusCode);
export const ApiNotFound = (res: unknown, message = 'Resource not found') =>
  sendApiResponse(res, UnifiedApiResponse.error(message, 'NOT_FOUND'), 404);
export const ApiValidationError = (res: unknown, errors: unknown[]) =>
  sendApiResponse(res, UnifiedApiResponse.validation(errors), 400);

export type { ApiResponse, ErrorResponse };








