/**
 * Unified API Response Utilities
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  duration?: number;
  source?: string;
}

export class UnifiedApiResponse {
  static success<T>(data: T, message?: string, metadata?: Partial<ResponseMetadata>): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static error(
    message: string, 
    code?: string, 
    details?: Record<string, any>,
    metadata?: Partial<ResponseMetadata>
  ): ErrorResponse {
    return {
      success: false,
      error: { message, code, details },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static validation(errors: Array<{ field: string; message: string }>): ErrorResponse {
    return this.error('Validation failed', 'VALIDATION_ERROR', { errors });
  }
}

// Legacy compatibility exports
export const ApiResponseWrapper = UnifiedApiResponse;
export const ApiSuccess = UnifiedApiResponse.success;
export const ApiError = UnifiedApiResponse.error;
export const ApiNotFound = (message = 'Resource not found') => 
  UnifiedApiResponse.error(message, 'NOT_FOUND');
export const ApiValidationError = (errors: any[]) => 
  UnifiedApiResponse.validation(errors);
export const ApiForbidden = (message = 'Access forbidden') => 
  UnifiedApiResponse.error(message, 'FORBIDDEN');

