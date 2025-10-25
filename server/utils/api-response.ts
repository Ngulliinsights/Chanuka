/**
 * LEGACY ADAPTER: API Response Utilities
 */

import { 
  UnifiedApiResponse, 
  ApiResponse, 
  ErrorResponse 
} from '@shared/core/utils/api-utils';

console.warn(
  '[DEPRECATED] server/utils/api-response.ts is deprecated. ' +
  'Please import from @shared/core/utils/api-utils instead.'
);

export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = UnifiedApiResponse.success;
export const ApiError = UnifiedApiResponse.error;
export const ApiNotFound = (message = 'Resource not found') => 
  UnifiedApiResponse.error(message, 'NOT_FOUND');
export const ApiValidationError = (errors: any[]) => 
  UnifiedApiResponse.validation(errors);

export type { ApiResponse, ErrorResponse };
