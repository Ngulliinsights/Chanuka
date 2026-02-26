/**
 * API Type Serialization
 * Serialization and deserialization support for API types
 */

import { ApiRequest, PaginatedApiRequest, FileUploadRequest, GraphQLRequest, WebSocketRequest } from './request-types';
import { ApiResponse, PaginatedApiResponse, ErrorApiResponse, FileDownloadResponse, GraphQLResponse, WebSocketResponse, StreamingResponse, HttpStatusCode } from './response-types';
import { ApiError, ApiErrorContext } from './error-types';
import { Result, ok, err } from '../core/errors';
import { ValidationError } from '../../utils/errors/types';
import { ErrorContextBuilder } from '../../utils/errors/context';

/**
 * Serializable API Request
 * JSON-serializable version of ApiRequest
 */
export interface SerializableApiRequest<T = unknown> {
  readonly id: string;
  readonly requestId: string;
  readonly endpoint: string;
  readonly method: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: T;
  readonly queryParams?: Readonly<Record<string, string | number | boolean>>;
  readonly pathParams?: Readonly<Record<string, string>>;
  readonly contentType?: string;
  readonly authType?: string;
  readonly authToken?: string;
  readonly timeout?: number;
  readonly priority?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly version?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Serializable API Response
 * JSON-serializable version of ApiResponse
 */
export interface SerializableApiResponse<T = unknown> {
  readonly id: string;
  readonly responseId: string;
  readonly requestId: string;
  readonly status: string;
  readonly httpStatus: number;
  readonly data?: T;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly contentType?: string;
  readonly timestamp: string;
  readonly duration?: number;
  readonly cacheControl?: {
    readonly maxAge?: number;
    readonly staleWhileRevalidate?: number;
    readonly staleIfError?: number;
    readonly mustRevalidate?: boolean;
    readonly noCache?: boolean;
    readonly noStore?: boolean;
  };
  readonly pagination?: {
    readonly totalItems: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly pageSize: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
  readonly version?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Serializable API Error
 * JSON-serializable version of ApiError
 */
export interface SerializableApiError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly severity: string;
  readonly apiContext: ApiErrorContext;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly stack?: string;
}

/**
 * API Serializer
 * Handles serialization of API types to JSON
 */
export class ApiSerializer {
  /**
   * Serialize API request to JSON
   */
  static serializeRequest<T = unknown>(request: ApiRequest<T>): SerializableApiRequest<T> {
    return {
      id: request.id,
      requestId: request.requestId,
      endpoint: request.endpoint,
      method: request.method,
      headers: request.headers,
      body: request.body,
      queryParams: request.queryParams,
      pathParams: request.pathParams,
      contentType: request.contentType,
      authType: request.authType,
      authToken: request.authToken,
      timeout: request.timeout,
      priority: request.priority,
      metadata: request.metadata,
      version: request.version,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize API request from JSON
   */
  static deserializeRequest<T = unknown>(serialized: SerializableApiRequest<T>): Result<ApiRequest<T>, ValidationError> {
    try {
      return ok({
        id: serialized.id,
        requestId: serialized.requestId,
        endpoint: serialized.endpoint,
        method: serialized.method as ApiRequest['method'],
        headers: serialized.headers,
        body: serialized.body,
        queryParams: serialized.queryParams,
        pathParams: serialized.pathParams,
        contentType: serialized.contentType as ApiRequest['contentType'],
        authType: serialized.authType as ApiRequest['authType'],
        authToken: serialized.authToken,
        timeout: serialized.timeout,
        priority: serialized.priority as ApiRequest['priority'],
        metadata: serialized.metadata,
        version: serialized.version,
        createdAt: new Date(serialized.createdAt),
        updatedAt: new Date(serialized.updatedAt),
      });
    } catch (error) {
      const context = new ErrorContextBuilder()
        .operation('deserialize-request')
        .layer('api')
        .field('request')
        .severity('medium')
        .build();
      return err(new ValidationError(`Failed to deserialize API request: ${error instanceof Error ? error.message : String(error)}`, context, []));
    }
  }

  /**
   * Serialize API response to JSON
   */
  static serializeResponse<T = unknown>(response: ApiResponse<T>): SerializableApiResponse<T> {
    return {
      id: response.id,
      responseId: response.responseId,
      requestId: response.requestId,
      status: response.status,
      httpStatus: response.httpStatus,
      data: response.data,
      metadata: response.metadata,
      headers: response.headers,
      contentType: response.contentType,
      timestamp: response.timestamp.toISOString(),
      duration: response.duration,
      cacheControl: response.cacheControl,
      pagination: response.pagination,
      version: response.version,
      createdAt: response.createdAt.toISOString(),
      updatedAt: response.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize API response from JSON
   */
  static deserializeResponse<T = unknown>(serialized: SerializableApiResponse<T>): Result<ApiResponse<T>, ValidationError> {
    try {
      return ok({
        id: serialized.id,
        responseId: serialized.responseId,
        requestId: serialized.requestId,
        status: serialized.status as ApiResponse['status'],
        httpStatus: serialized.httpStatus as HttpStatusCode,
        data: serialized.data,
        metadata: serialized.metadata,
        headers: serialized.headers,
        contentType: serialized.contentType as ApiResponse['contentType'],
        timestamp: new Date(serialized.timestamp),
        duration: serialized.duration,
        cacheControl: serialized.cacheControl,
        pagination: serialized.pagination,
        version: serialized.version,
        createdAt: new Date(serialized.createdAt),
        updatedAt: new Date(serialized.updatedAt),
      });
    } catch (error) {
      const context = new ErrorContextBuilder()
        .operation('deserialize-response')
        .layer('api')
        .field('response')
        .severity('medium')
        .build();
      return err(new ValidationError(`Failed to deserialize API response: ${error instanceof Error ? error.message : String(error)}`, context, []));
    }
  }

  /**
   * Serialize API error to JSON
   */
  static serializeError(error: ApiError): SerializableApiError {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      severity: error.severity,
      apiContext: error.apiContext,
      context: error.context,
      stack: error.stack,
    };
  }

  /**
   * Deserialize API error from JSON
   */
  static deserializeError(serialized: SerializableApiError): Result<ApiError, ValidationError> {
    try {
      // Create a generic ApiError with the serialized data
      class DeserializedApiError extends ApiError {
        readonly code: ApiError['code'] = serialized.code as ApiError['code'];
        readonly severity: ApiError['severity'] = serialized.severity as ApiError['severity'];

        constructor() {
          super(serialized.message, serialized.apiContext, serialized.context);
          this.name = serialized.name;
          if (serialized.stack) {
            this.stack = serialized.stack;
          }
        }
      }

      return ok(new DeserializedApiError());
    } catch (error) {
      const context = new ErrorContextBuilder()
        .operation('deserialize-error')
        .layer('api')
        .field('error')
        .severity('medium')
        .build();
      return err(new ValidationError(`Failed to deserialize API error: ${error instanceof Error ? error.message : String(error)}`, context, []));
    }
  }

  /**
   * Serialize to JSON string
   */
  static serializeToJson<T>(data: T): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Deserialize from JSON string
   */
  static deserializeFromJson<T>(json: string): Result<T, ValidationError> {
    try {
      return ok(JSON.parse(json));
    } catch (error) {
      const context = new ErrorContextBuilder()
        .operation('deserialize-json')
        .layer('api')
        .field('json')
        .severity('medium')
        .build();
      return err(new ValidationError(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`, context, []));
    }
  }

  /**
   * Serialize paginated request
   */
  static serializePaginatedRequest<T = unknown>(request: PaginatedApiRequest<T>): SerializableApiRequest<T> & {
    readonly page?: number;
    readonly pageSize?: number;
    readonly sortBy?: string;
    readonly sortDirection?: string;
    readonly filters?: Readonly<Record<string, unknown>>;
    readonly search?: string;
  } {
    const base = this.serializeRequest(request);
    return {
      ...base,
      page: request.page,
      pageSize: request.pageSize,
      sortBy: request.sortBy,
      sortDirection: request.sortDirection,
      filters: request.filters,
      search: request.search,
    };
  }

  /**
   * Serialize paginated response
   */
  static serializePaginatedResponse<T = unknown>(response: PaginatedApiResponse<T>): SerializableApiResponse<T[]> {
    return this.serializeResponse(response);
  }

  /**
   * Serialize error response
   */
  static serializeErrorResponse(response: ErrorApiResponse): SerializableApiResponse<never> & {
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly severity: string;
      readonly details?: unknown;
      readonly stackTrace?: string;
      readonly timestamp: string;
    };
    readonly validationErrors?: readonly {
      readonly field: string;
      readonly message: string;
      readonly code?: string;
    }[];
  } {
    const base = this.serializeResponse(response);
    return {
      ...base,
      error: {
        code: response.error.code,
        message: response.error.message,
        severity: response.error.severity,
        details: response.error.details,
        stackTrace: response.error.stackTrace,
        timestamp: response.error.timestamp.toISOString(),
      },
      validationErrors: response.validationErrors,
    };
  }

  /**
   * Serialize file upload request
   */
  static serializeFileUploadRequest(request: FileUploadRequest): SerializableApiRequest<File | Blob> & {
    readonly fileName: string;
    readonly fileType: string;
    readonly fileSize: number;
  } {
    const base = this.serializeRequest(request);
    return {
      ...base,
      fileName: request.fileName,
      fileType: request.fileType,
      fileSize: request.fileSize,
    };
  }

  /**
   * Serialize file download response
   */
  static serializeFileDownloadResponse(response: FileDownloadResponse): SerializableApiResponse<Blob> & {
    readonly fileName: string;
    readonly fileType: string;
    readonly fileSize: number;
    readonly downloadUrl?: string;
    readonly contentDisposition?: string;
  } {
    const base = this.serializeResponse(response);
    return {
      ...base,
      fileName: response.fileName,
      fileType: response.fileType,
      fileSize: response.fileSize,
      downloadUrl: response.downloadUrl,
      contentDisposition: response.contentDisposition,
    };
  }

  /**
   * Serialize GraphQL request
   */
  static serializeGraphQLRequest(request: GraphQLRequest): SerializableApiRequest<unknown> & {
    readonly query: string;
    readonly variables?: Readonly<Record<string, unknown>>;
    readonly operationName?: string;
    readonly extensions?: Readonly<Record<string, unknown>>;
  } {
    const base = this.serializeRequest(request);
    return {
      ...base,
      query: request.query,
      variables: request.variables,
      operationName: request.operationName,
      extensions: request.extensions,
    };
  }

  /**
   * Serialize GraphQL response
   */
  static serializeGraphQLResponse<T = unknown>(response: GraphQLResponse<T>): SerializableApiResponse<T> & {
    readonly result: {
      readonly data?: T;
      readonly errors?: readonly {
        readonly message: string;
        readonly locations?: readonly { readonly line: number; readonly column: number }[];
        readonly path?: readonly string[];
        readonly extensions?: Readonly<Record<string, unknown>>;
      }[];
      readonly extensions?: Readonly<Record<string, unknown>>;
    };
    readonly operationName?: string;
  } {
    const base = this.serializeResponse(response);
    return {
      ...base,
      result: {
        data: response.result.data,
        errors: response.result.errors,
        extensions: response.result.extensions,
      },
      operationName: response.operationName,
    };
  }

  /**
   * Serialize WebSocket request
   */
  static serializeWebSocketRequest<T = unknown>(request: WebSocketRequest<T>): SerializableApiRequest<T> & {
    readonly eventType: string;
    readonly connectionState?: string;
    readonly messageType?: string;
  } {
    const base = this.serializeRequest(request);
    return {
      ...base,
      eventType: request.eventType,
      connectionState: request.connectionState,
      messageType: request.messageType,
    };
  }

  /**
   * Serialize WebSocket response
   */
  static serializeWebSocketResponse<T = unknown>(response: WebSocketResponse<T>): SerializableApiResponse<T> & {
    readonly eventType: string;
    readonly connectionState: string;
    readonly messageType: string;
    readonly sequenceNumber?: number;
  } {
    const base = this.serializeResponse(response);
    return {
      ...base,
      eventType: response.eventType,
      connectionState: response.connectionState,
      messageType: response.messageType,
      sequenceNumber: response.sequenceNumber,
    };
  }

  /**
   * Serialize streaming response
   */
  static serializeStreamingResponse<T = unknown>(response: StreamingResponse<T>): SerializableApiResponse<T> & {
    readonly streamId: string;
    readonly chunkSequence: number;
    readonly totalChunks?: number;
    readonly isFinal: boolean;
    readonly streamMetadata?: Readonly<Record<string, unknown>>;
  } {
    const base = this.serializeResponse(response);
    return {
      ...base,
      streamId: response.streamId,
      chunkSequence: response.chunkSequence,
      totalChunks: response.totalChunks,
      isFinal: response.isFinal,
      streamMetadata: response.streamMetadata,
    };
  }

  /**
   * Create serialization context for tracking
   */
  static createSerializationContext(): {
    readonly id: string;
    readonly timestamp: string;
    readonly operations: string[];
  } {
    return {
      id: `serialization-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      operations: [],
    };
  }

  /**
   * Add operation to serialization context
   */
  static addOperationToContext(
    context: { operations: string[] },
    operation: string
  ): void {
    context.operations.push(operation);
  }

  /**
   * Get serialization context summary
   */
  static getSerializationContextSummary(context: { operations: string[] }): string {
    return `Serialization context: ${context.operations.length} operations (${context.operations.join(', ')})`;
  }
}