/**
 * Response Wrapper
 *
 * Thin re-export of shared API utilities for observability context.
 * This provides a consistent interface for HTTP response handling
 * within the observability infrastructure.
 */

export {
  ApiResponse,
  ApiSuccess,
  ApiError,
  ApiValidationError,
  handleApiError,
  createApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from '@shared/core/utils/api-utils';

export type {
  ApiResponseType,
  ApiErrorType,
  ApiValidationErrorType,
} from '@shared/core/utils/api-utils';
