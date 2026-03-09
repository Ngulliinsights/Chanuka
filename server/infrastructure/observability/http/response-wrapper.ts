/**
 * Response Wrapper
 *
 * Thin re-export of shared API utilities for observability context.
 * This provides a consistent interface for HTTP response handling
 * within the observability infrastructure.
 */

// Export types
export type {
  ApiResponse,
  ErrorApiResponse,
  PaginatedApiResponse,
  ResponseStatus,
  HttpStatusCode,
} from '../../../../shared/types/api.js';

// Export factory classes
export {
  ApiResponseFactory,
  ApiRequestFactory,
  ApiTypeFactory,
} from '../../../../shared/types/api.js';

// Export error types
export type {
  ApiErrorCode,
  ApiErrorSeverity,
  ApiErrorContext,
  ValidationErrorDetail,
} from '../../../../shared/types/api.js';
