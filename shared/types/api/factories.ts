/**
 * API Type Factories
 * Factory functions for creating consistent API request and response types
 */

import { v4 as uuidv4 } from 'uuid';
import { ApiRequest, PaginatedApiRequest, FileUploadRequest, GraphQLRequest, WebSocketRequest, RequestFactoryOptions } from './request-types';
import { ApiResponse, PaginatedApiResponse, ErrorApiResponse, FileDownloadResponse, GraphQLResponse, WebSocketResponse, StreamingResponse, ResponseFactoryOptions, HttpStatusCode } from './response-types';
import { ApiError, ApiErrorContext, ApiErrorFactory } from './error-types';
import { Result, ValidationError } from '../core/errors';

/**
 * Request Factory
 * Creates standardized API requests
 */
export class ApiRequestFactory {
  /**
   * Create a basic API request
   */
  static createRequest<T = unknown>(
    endpoint: string,
    method: ApiRequest['method'],
    options: Partial<RequestFactoryOptions<T>> = {}
  ): ApiRequest<T> {
    const now = new Date();

    return {
      id: options.requestData?.id || uuidv4(),
      requestId: options.requestData?.requestId || uuidv4(),
      endpoint,
      method,
      body: options.requestData?.body,
      headers: this.mergeHeaders(options.defaultHeaders, options.requestData?.headers),
      queryParams: options.requestData?.queryParams,
      pathParams: options.requestData?.pathParams,
      contentType: options.requestData?.contentType || 'application/json',
      authType: options.defaultAuth?.type || options.requestData?.authType || 'none',
      authToken: options.defaultAuth?.token || options.requestData?.authToken,
      timeout: options.requestData?.timeout || options.defaultTimeout || 30000,
      priority: options.requestData?.priority || 'normal',
      metadata: options.requestData?.metadata || options.metadata,
      version: options.requestData?.version || '1.0',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a paginated API request
   */
  static createPaginatedRequest<T = unknown>(
    endpoint: string,
    method: ApiRequest['method'] = 'GET',
    options: Partial<RequestFactoryOptions<T>> & {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      filters?: Record<string, unknown>;
      search?: string;
    } = {}
  ): PaginatedApiRequest<T> {
    const baseRequest = this.createRequest<T>(endpoint, method, options);

    return {
      ...baseRequest,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection || 'asc',
      filters: options.filters,
      search: options.search,
    };
  }

  /**
   * Create a file upload request
   */
  static createFileUploadRequest(
    endpoint: string,
    file: File | Blob,
    fileName: string,
    fileType: string,
    options: Partial<RequestFactoryOptions<File | Blob>> & {
      onProgress?: (progress: number) => void;
      chunkSize?: number;
      totalChunks?: number;
      currentChunk?: number;
    } = {}
  ): FileUploadRequest {
    const baseRequest = this.createRequest<File | Blob>(endpoint, 'POST', options);

    return {
      ...baseRequest,
      body: file,
      fileName,
      fileType,
      fileSize: file.size,
      onProgress: options.onProgress,
      chunkSize: options.chunkSize,
      totalChunks: options.totalChunks,
      currentChunk: options.currentChunk,
    };
  }

  /**
   * Create a GraphQL request
   */
  static createGraphQLRequest(
    endpoint: string,
    query: string,
    options: Partial<RequestFactoryOptions<unknown>> & {
      variables?: Record<string, unknown>;
      operationName?: string;
      extensions?: Record<string, unknown>;
    } = {}
  ): GraphQLRequest {
    const baseRequest = this.createRequest<unknown>(endpoint, 'POST', options);

    return {
      ...baseRequest,
      query,
      variables: options.variables,
      operationName: options.operationName,
      extensions: options.extensions,
      contentType: 'application/json',
    };
  }

  /**
   * Create a WebSocket request
   */
  static createWebSocketRequest<T = unknown>(
    endpoint: string,
    eventType: string,
    options: Partial<RequestFactoryOptions<T>> & {
      connectionState?: 'connecting' | 'open' | 'closing' | 'closed';
      messageType?: 'text' | 'binary' | 'ping' | 'pong';
    } = {}
  ): WebSocketRequest<T> {
    const baseRequest = this.createRequest<T>(endpoint, 'GET', options);

    return {
      ...baseRequest,
      eventType,
      connectionState: options.connectionState || 'connecting',
      messageType: options.messageType || 'text',
    };
  }

  /**
   * Merge headers with defaults
   */
  private static mergeHeaders(
    defaultHeaders?: Readonly<Record<string, string>>,
    requestHeaders?: Readonly<Record<string, string>>
  ): Readonly<Record<string, string>> {
    return {
      ...defaultHeaders,
      ...requestHeaders,
    };
  }

  /**
   * Validate request structure
   */
  static validateRequest(request: unknown): Result<ApiRequest<unknown>, ValidationError> {
    if (!request || typeof request !== 'object') {
      return {
        success: false,
        error: new ValidationError('Invalid request: must be an object', 'request'),
      };
    }

    const req = request as Partial<ApiRequest<unknown>>;

    if (!req.endpoint || typeof req.endpoint !== 'string') {
      return {
        success: false,
        error: new ValidationError('Invalid request: endpoint is required and must be a string', 'endpoint'),
      };
    }

    if (!req.method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return {
        success: false,
        error: new ValidationError('Invalid request: method is required and must be a valid HTTP method', 'method'),
      };
    }

    if (!req.requestId || typeof req.requestId !== 'string') {
      return {
        success: false,
        error: new ValidationError('Invalid request: requestId is required and must be a string', 'requestId'),
      };
    }

    return {
      success: true,
      data: request as ApiRequest<unknown>,
    };
  }
}

/**
 * Response Factory
 * Creates standardized API responses
 */
export class ApiResponseFactory {
  /**
   * Create a basic API response
   */
  static createResponse<T = unknown>(
    options: ResponseFactoryOptions<T>
  ): ApiResponse<T> {
    const now = new Date();

    return {
      id: uuidv4(),
      responseId: uuidv4(),
      requestId: options.requestId,
      status: options.status || 'success',
      httpStatus: options.httpStatus || 200,
      data: options.responseData,
      metadata: options.metadata,
      headers: options.headers,
      contentType: options.contentType || 'application/json',
      timestamp: now,
      duration: options.metadata?.duration as number | undefined,
      cacheControl: options.cacheControl,
      pagination: options.pagination,
      version: '1.0',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a paginated API response
   */
  static createPaginatedResponse<T = unknown>(
    data: T[],
    options: ResponseFactoryOptions<T[]> & {
      totalItems: number;
      currentPage: number;
      pageSize: number;
    }
  ): PaginatedApiResponse<T> {
    const totalPages = Math.ceil(options.totalItems / options.pageSize);

    const response = this.createResponse<T[]>({
      ...options,
      responseData: data,
      status: 'success',
      httpStatus: 200,
    });

    return {
      ...response,
      pagination: {
        totalItems: options.totalItems,
        totalPages,
        currentPage: options.currentPage,
        pageSize: options.pageSize,
        hasNextPage: options.currentPage < totalPages,
        hasPreviousPage: options.currentPage > 1,
        nextPage: options.currentPage < totalPages ? options.currentPage + 1 : undefined,
        previousPage: options.currentPage > 1 ? options.currentPage - 1 : undefined,
      },
    };
  }

  /**
   * Create an error API response
   */
  static createErrorResponse(
    error: ApiError | Error | unknown,
    options: Partial<ResponseFactoryOptions<never>> & {
      requestId: string;
    }
  ): ErrorApiResponse {
    const apiError = error instanceof ApiError
      ? error
      : ApiErrorFactory.fromUnknownError(error, {
          requestId: options.requestId,
          timestamp: Date.now(),
        });

    const now = new Date();

    return {
      id: uuidv4(),
      responseId: uuidv4(),
      requestId: options.requestId,
      status: 'error',
      httpStatus: this.getHttpStatusFromError(apiError),
      metadata: options.metadata,
      headers: options.headers,
      contentType: options.contentType || 'application/json',
      timestamp: now,
      duration: options.metadata?.duration as number | undefined,
      version: '1.0',
      createdAt: now,
      updatedAt: now,
      error: {
        code: apiError.code,
        message: apiError.message,
        severity: apiError.severity,
        details: apiError.context,
        stackTrace: apiError.stack,
        timestamp: new Date(),
      },
      validationErrors: apiError instanceof ApiError && 'validationErrors' in apiError
        ? (apiError as any).validationErrors
        : undefined,
    };
  }

  /**
   * Create a file download response
   */
  static createFileDownloadResponse(
    file: Blob,
    fileName: string,
    fileType: string,
    options: Partial<ResponseFactoryOptions<Blob>> & {
      requestId: string;
      downloadUrl?: string;
      contentDisposition?: string;
    }
  ): FileDownloadResponse {
    const response = this.createResponse<Blob>({
      ...options,
      responseData: file,
      status: 'success',
      httpStatus: 200,
    });

    return {
      ...response,
      fileName,
      fileType,
      fileSize: file.size,
      downloadUrl: options.downloadUrl,
      contentDisposition: options.contentDisposition || `attachment; filename="${fileName}"`,
    };
  }

  /**
   * Create a GraphQL response
   */
  static createGraphQLResponse<T = unknown>(
    data: T,
    options: ResponseFactoryOptions<T> & {
      errors?: readonly {
        readonly message: string;
        readonly locations?: readonly { readonly line: number; readonly column: number }[];
        readonly path?: readonly string[];
        readonly extensions?: Readonly<Record<string, unknown>>;
      }[];
      extensions?: Readonly<Record<string, unknown>>;
      operationName?: string;
    }
  ): GraphQLResponse<T> {
    const response = this.createResponse<T>({
      ...options,
      responseData: data,
    });

    return {
      ...response,
      result: {
        data,
        errors: options.errors,
        extensions: options.extensions,
      },
      operationName: options.operationName,
    };
  }

  /**
   * Create a WebSocket response
   */
  static createWebSocketResponse<T = unknown>(
    data: T,
    options: ResponseFactoryOptions<T> & {
      eventType: string;
      connectionState: 'connecting' | 'open' | 'closing' | 'closed';
      messageType: 'text' | 'binary' | 'ping' | 'pong';
      sequenceNumber?: number;
    }
  ): WebSocketResponse<T> {
    const response = this.createResponse<T>({
      ...options,
      responseData: data,
    });

    return {
      ...response,
      eventType: options.eventType,
      connectionState: options.connectionState,
      messageType: options.messageType,
      sequenceNumber: options.sequenceNumber,
    };
  }

  /**
   * Create a streaming response
   */
  static createStreamingResponse<T = unknown>(
    data: T,
    options: ResponseFactoryOptions<T> & {
      streamId: string;
      chunkSequence: number;
      totalChunks?: number;
      isFinal: boolean;
      streamMetadata?: Readonly<Record<string, unknown>>;
    }
  ): StreamingResponse<T> {
    const response = this.createResponse<T>({
      ...options,
      responseData: data,
    });

    return {
      ...response,
      streamId: options.streamId,
      chunkSequence: options.chunkSequence,
      totalChunks: options.totalChunks,
      isFinal: options.isFinal,
      streamMetadata: options.streamMetadata,
    };
  }

  /**
   * Get HTTP status code from API error
   */
  private static getHttpStatusFromError(error: ApiError): HttpStatusCode {
    const statusCodeMap: Partial<Record<ApiError['code'], HttpStatusCode>> = {
      API_BAD_REQUEST: 400,
      API_UNAUTHORIZED: 401,
      API_FORBIDDEN: 403,
      API_NOT_FOUND: 404,
      API_METHOD_NOT_ALLOWED: 405,
      API_REQUEST_TIMEOUT: 408,
      API_CONFLICT: 409,
      API_TOO_MANY_REQUESTS: 429,
      API_INTERNAL_SERVER_ERROR: 500,
      API_SERVICE_UNAVAILABLE: 503,
      API_GATEWAY_TIMEOUT: 504,
      API_VALIDATION_ERROR: 400,
      API_AUTHENTICATION_ERROR: 401,
      API_PERMISSION_ERROR: 403,
      API_RATE_LIMIT_ERROR: 429,
      API_SERIALIZATION_ERROR: 500,
      API_DESERIALIZATION_ERROR: 500,
      API_UNKNOWN_ERROR: 500,
    };

    return statusCodeMap[error.code] || 500;
  }

  /**
   * Validate response structure
   */
  static validateResponse(response: unknown): Result<ApiResponse<unknown>, ValidationError> {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: new ValidationError('Invalid response: must be an object', 'response'),
      };
    }

    const res = response as Partial<ApiResponse<unknown>>;

    if (!res.responseId || typeof res.responseId !== 'string') {
      return {
        success: false,
        error: new ValidationError('Invalid response: responseId is required and must be a string', 'responseId'),
      };
    }

    if (!res.requestId || typeof res.requestId !== 'string') {
      return {
        success: false,
        error: new ValidationError('Invalid response: requestId is required and must be a string', 'requestId'),
      };
    }

    if (!res.status || !['success', 'error', 'warning', 'info', 'redirect'].includes(res.status)) {
      return {
        success: false,
        error: new ValidationError('Invalid response: status is required and must be a valid response status', 'status'),
      };
    }

    return {
      success: true,
      data: response as ApiResponse<unknown>,
    };
  }
}

/**
 * API Type Factory
 * Unified factory for creating API-related types
 */
export class ApiTypeFactory {
  /**
   * Create API error context
   */
  static createApiErrorContext(
    requestId: string,
    options: Partial<ApiErrorContext> = {}
  ): ApiErrorContext {
    return {
      requestId,
      responseId: options.responseId,
      endpoint: options.endpoint,
      method: options.method,
      httpStatus: options.httpStatus,
      requestBody: options.requestBody,
      responseBody: options.responseBody,
      timestamp: Date.now(),
      details: options.details,
    };
  }

  /**
   * Create API error from context
   */
  static createApiError(
    errorCode: ApiError['code'],
    message: string,
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromErrorCode(errorCode, message, context);
  }

  /**
   * Create API error from HTTP status
   */
  static createApiErrorFromHttpStatus(
    httpStatus: number,
    message: string,
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromHttpStatus(httpStatus, message, context);
  }

  /**
   * Create API error from unknown error
   */
  static createApiErrorFromUnknown(
    error: unknown,
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromUnknownError(error, context);
  }

  /**
   * Create validation error
   */
  static createValidationError(
    validationErrors: readonly {
      readonly field: string;
      readonly message: string;
      readonly code?: string;
    }[],
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromValidationErrors(validationErrors, context);
  }

  /**
   * Create authentication error
   */
  static createAuthenticationError(
    message: string,
    context: ApiErrorContext,
    authType?: string
  ): ApiError {
    return ApiErrorFactory.fromAuthenticationError(message, context, authType);
  }

  /**
   * Create permission error
   */
  static createPermissionError(
    action: string,
    resource: string,
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromPermissionError(action, resource, context);
  }

  /**
   * Create rate limit error
   */
  static createRateLimitError(
    limit: number,
    remaining: number,
    resetTime: number,
    context: ApiErrorContext
  ): ApiError {
    return ApiErrorFactory.fromRateLimitError(limit, remaining, resetTime, context);
  }
}