/**
 * API Error Types
 * Standardized error handling for API operations
 */

import { AppError, ErrorSeverity } from '../core/errors';

/**
 * API Error Codes
 * Standardized error codes for API operations
 */
export type ApiErrorCode =
  | 'API_BAD_REQUEST'
  | 'API_UNAUTHORIZED'
  | 'API_FORBIDDEN'
  | 'API_NOT_FOUND'
  | 'API_METHOD_NOT_ALLOWED'
  | 'API_NOT_ACCEPTABLE'
  | 'API_REQUEST_TIMEOUT'
  | 'API_CONFLICT'
  | 'API_GONE'
  | 'API_LENGTH_REQUIRED'
  | 'API_PRECONDITION_FAILED'
  | 'API_PAYLOAD_TOO_LARGE'
  | 'API_URI_TOO_LONG'
  | 'API_UNSUPPORTED_MEDIA_TYPE'
  | 'API_RANGE_NOT_SATISFIABLE'
  | 'API_EXPECTATION_FAILED'
  | 'API_I_AM_A_TEAPOT'
  | 'API_UNPROCESSABLE_ENTITY'
  | 'API_TOO_MANY_REQUESTS'
  | 'API_INTERNAL_SERVER_ERROR'
  | 'API_NOT_IMPLEMENTED'
  | 'API_BAD_GATEWAY'
  | 'API_SERVICE_UNAVAILABLE'
  | 'API_GATEWAY_TIMEOUT'
  | 'API_HTTP_VERSION_NOT_SUPPORTED'
  | 'API_NETWORK_AUTHENTICATION_REQUIRED'
  | 'API_VALIDATION_ERROR'
  | 'API_AUTHENTICATION_ERROR'
  | 'API_PERMISSION_ERROR'
  | 'API_RATE_LIMIT_ERROR'
  | 'API_DATABASE_ERROR'
  | 'API_CONFIGURATION_ERROR'
  | 'API_SERIALIZATION_ERROR'
  | 'API_DESERIALIZATION_ERROR'
  | 'API_PARSING_ERROR'
  | 'API_CONNECTION_ERROR'
  | 'API_TIMEOUT_ERROR'
  | 'API_UNKNOWN_ERROR';

/**
 * API Error Context
 * Additional context for API errors
 */
export interface ApiErrorContext {
  /**
   * Request identifier
   */
  readonly requestId?: string;

  /**
   * Response identifier
   */
  readonly responseId?: string;

  /**
   * API endpoint
   */
  readonly endpoint?: string;

  /**
   * HTTP method
   */
  readonly method?: string;

  /**
   * HTTP status code
   */
  readonly httpStatus?: number;

  /**
   * Request body
   */
  readonly requestBody?: unknown;

  /**
   * Response body
   */
  readonly responseBody?: unknown;

  /**
   * Error timestamp
   */
  readonly timestamp: number;

  /**
   * Additional error details
   */
  readonly details?: unknown;
}

/**
 * Base API Error
 * Foundation for all API-related errors
 */
export abstract class ApiError extends AppError {
  /**
   * Error code
   */
  abstract override readonly code: ApiErrorCode;

  /**
   * Error severity
   */
  abstract override readonly severity: ErrorSeverity;

  /**
   * API-specific context
   */
  readonly apiContext: ApiErrorContext;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, context);
    this.apiContext = apiContext;
    this.name = this.constructor.name;
  }

  /**
   * Get error details for logging
   */
  getErrorDetails(): {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly severity: ErrorSeverity;
    readonly apiContext: ApiErrorContext;
    readonly context: Readonly<Record<string, unknown>> | undefined;
    readonly stack: string | undefined;
  } {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      apiContext: this.apiContext,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Convert to safe object for serialization
   */
  toSafeObject(): Readonly<Record<string, unknown>> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      apiContext: this.apiContext,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * API Bad Request Error
 * HTTP 400 - Bad Request
 */
export class ApiBadRequestError extends ApiError {
  readonly code = 'API_BAD_REQUEST' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Unauthorized Error
 * HTTP 401 - Unauthorized
 */
export class ApiUnauthorizedError extends ApiError {
  readonly code = 'API_UNAUTHORIZED' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Forbidden Error
 * HTTP 403 - Forbidden
 */
export class ApiForbiddenError extends ApiError {
  readonly code = 'API_FORBIDDEN' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Not Found Error
 * HTTP 404 - Not Found
 */
export class ApiNotFoundError extends ApiError {
  readonly code = 'API_NOT_FOUND' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Method Not Allowed Error
 * HTTP 405 - Method Not Allowed
 */
export class ApiMethodNotAllowedError extends ApiError {
  readonly code = 'API_METHOD_NOT_ALLOWED' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Request Timeout Error
 * HTTP 408 - Request Timeout
 */
export class ApiRequestTimeoutError extends ApiError {
  readonly code = 'API_REQUEST_TIMEOUT' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Conflict Error
 * HTTP 409 - Conflict
 */
export class ApiConflictError extends ApiError {
  readonly code = 'API_CONFLICT' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Too Many Requests Error
 * HTTP 429 - Too Many Requests
 */
export class ApiTooManyRequestsError extends ApiError {
  readonly code = 'API_TOO_MANY_REQUESTS' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Internal Server Error
 * HTTP 500 - Internal Server Error
 */
export class ApiInternalServerError extends ApiError {
  readonly code = 'API_INTERNAL_SERVER_ERROR' as const;
  readonly severity = 'critical' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Service Unavailable Error
 * HTTP 503 - Service Unavailable
 */
export class ApiServiceUnavailableError extends ApiError {
  readonly code = 'API_SERVICE_UNAVAILABLE' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Gateway Timeout Error
 * HTTP 504 - Gateway Timeout
 */
export class ApiGatewayTimeoutError extends ApiError {
  readonly code = 'API_GATEWAY_TIMEOUT' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Validation Error
 * Validation-specific error
 */
export class ApiValidationError extends ApiError {
  readonly code = 'API_VALIDATION_ERROR' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly validationErrors: readonly {
      readonly field: string;
      readonly message: string;
      readonly code?: string;
    }[],
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Authentication Error
 * Authentication-specific error
 */
export class ApiAuthenticationError extends ApiError {
  readonly code = 'API_AUTHENTICATION_ERROR' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly authType?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Permission Error
 * Permission-specific error
 */
export class ApiPermissionError extends ApiError {
  readonly code = 'API_PERMISSION_ERROR' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly action?: string,
    readonly resource?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Rate Limit Error
 * Rate limit-specific error
 */
export class ApiRateLimitError extends ApiError {
  readonly code = 'API_RATE_LIMIT_ERROR' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly limit?: number,
    readonly remaining?: number,
    readonly resetTime?: number,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Serialization Error
 * Serialization-specific error
 */
export class ApiSerializationError extends ApiError {
  readonly code = 'API_SERIALIZATION_ERROR' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly targetType?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Deserialization Error
 * Deserialization-specific error
 */
export class ApiDeserializationError extends ApiError {
  readonly code = 'API_DESERIALIZATION_ERROR' as const;
  readonly severity = 'medium' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly sourceType?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Unknown Error
 * Fallback for unknown errors
 */
export class ApiUnknownError extends ApiError {
  readonly code = 'API_UNKNOWN_ERROR' as const;
  readonly severity = 'high' as const;

  constructor(
    message: string,
    apiContext: ApiErrorContext,
    readonly originalError?: unknown,
    context?: Readonly<Record<string, unknown>>
  ) {
    super(message, apiContext, context);
  }
}

/**
 * API Error Factory
 * Factory for creating API errors from various sources
 */
export class ApiErrorFactory {
  /**
   * Create API error from HTTP status code
   */
  static fromHttpStatus(
    httpStatus: number,
    message: string,
    apiContext: ApiErrorContext
  ): ApiError {
    const statusCodeMap: Record<number, new (message: string, apiContext: ApiErrorContext) => ApiError> = {
      400: ApiBadRequestError,
      401: ApiUnauthorizedError,
      403: ApiForbiddenError,
      404: ApiNotFoundError,
      405: ApiMethodNotAllowedError,
      408: ApiRequestTimeoutError,
      409: ApiConflictError,
      429: ApiTooManyRequestsError,
      500: ApiInternalServerError,
      503: ApiServiceUnavailableError,
      504: ApiGatewayTimeoutError,
    };

    const ErrorConstructor = statusCodeMap[httpStatus] ?? ApiUnknownError;
    return new ErrorConstructor(message, apiContext);
  }

  /**
   * Create API error from error code
   */
  static fromErrorCode(
    errorCode: ApiErrorCode,
    message: string,
    apiContext: ApiErrorContext
  ): ApiError {
    const errorCodeMap: Partial<Record<ApiErrorCode, new (message: string, apiContext: ApiErrorContext, ...args: any[]) => ApiError>> = {
      API_BAD_REQUEST: ApiBadRequestError,
      API_UNAUTHORIZED: ApiUnauthorizedError,
      API_FORBIDDEN: ApiForbiddenError,
      API_NOT_FOUND: ApiNotFoundError,
      API_METHOD_NOT_ALLOWED: ApiMethodNotAllowedError,
      API_REQUEST_TIMEOUT: ApiRequestTimeoutError,
      API_CONFLICT: ApiConflictError,
      API_TOO_MANY_REQUESTS: ApiTooManyRequestsError,
      API_INTERNAL_SERVER_ERROR: ApiInternalServerError,
      API_SERVICE_UNAVAILABLE: ApiServiceUnavailableError,
      API_GATEWAY_TIMEOUT: ApiGatewayTimeoutError,
      API_VALIDATION_ERROR: ApiValidationError,
      API_AUTHENTICATION_ERROR: ApiAuthenticationError,
      API_PERMISSION_ERROR: ApiPermissionError,
      API_RATE_LIMIT_ERROR: ApiRateLimitError,
      API_SERIALIZATION_ERROR: ApiSerializationError,
      API_DESERIALIZATION_ERROR: ApiDeserializationError,
      API_UNKNOWN_ERROR: ApiUnknownError,
    };

    const ErrorConstructor = errorCodeMap[errorCode] ?? ApiUnknownError;
    return new ErrorConstructor(message, apiContext);
  }

  /**
   * Create API error from unknown error
   */
  static fromUnknownError(
    error: unknown,
    apiContext: ApiErrorContext
  ): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiUnknownError(error.message, apiContext, error);
    }

    return new ApiUnknownError(String(error), apiContext, error);
  }

  /**
   * Create API error from validation errors
   */
  static fromValidationErrors(
    validationErrors: readonly {
      readonly field: string;
      readonly message: string;
      readonly code?: string;
    }[],
    apiContext: ApiErrorContext
  ): ApiValidationError {
    const errorMessages = validationErrors.map(err => `${err.field}: ${err.message}`).join('; ');
    return new ApiValidationError(`Validation failed: ${errorMessages}`, apiContext, validationErrors);
  }

  /**
   * Create API error from authentication failure
   */
  static fromAuthenticationError(
    message: string,
    apiContext: ApiErrorContext,
    authType?: string
  ): ApiAuthenticationError {
    return new ApiAuthenticationError(message, apiContext, authType);
  }

  /**
   * Create API error from permission failure
   */
  static fromPermissionError(
    action: string,
    resource: string,
    apiContext: ApiErrorContext
  ): ApiPermissionError {
    return new ApiPermissionError(`Permission denied for action '${action}' on resource '${resource}'`, apiContext, action, resource);
  }

  /**
   * Create API error from rate limit
   */
  static fromRateLimitError(
    limit: number,
    remaining: number,
    resetTime: number,
    apiContext: ApiErrorContext
  ): ApiRateLimitError {
    return new ApiRateLimitError(
      `Rate limit exceeded: ${limit} requests per period, ${remaining} remaining, reset in ${resetTime}ms`,
      apiContext,
      limit,
      remaining,
      resetTime
    );
  }
}
