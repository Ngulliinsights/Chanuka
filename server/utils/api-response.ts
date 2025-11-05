/**
 * LEGACY ADAPTER: API Response Utilities
 */

import { UnifiedApiResponse,
  ApiResponse,
  ErrorResponse,
  sendApiResponse
 } from '@shared/core/utils/api-utils';

console.warn(
  '[DEPRECATED] server/utils/api-response.ts is deprecated. ' +
  'Please import from \'@shared/core/src/utils/api-utils\' instead.'
);

export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = (res: any, data: any, metadata?: any, statusCode?: number) =>
  sendApiResponse(res, UnifiedApiResponse.success(data, undefined, metadata), statusCode);
export const ApiError = (res: any, message: string, statusCode = 500) =>
  sendApiResponse(res, UnifiedApiResponse.error(message), statusCode);
export const ApiNotFound = (res: any, message = 'Resource not found') =>
  sendApiResponse(res, UnifiedApiResponse.error(message, 'NOT_FOUND'), 404);
export const ApiValidationError = (res: any, errors: any[]) =>
  sendApiResponse(res, UnifiedApiResponse.validation(errors), 400);

export type { ApiResponse, ErrorResponse };







