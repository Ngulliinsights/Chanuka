/**
 * API Request Types
 * Standardized request interfaces following the unified type system
 */

import { BaseEntity } from '../core/base';

/**
 * HTTP Method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request Content Type
 */
export type RequestContentType =
  | 'application/json'
  | 'application/xml'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'text/html';

/**
 * Request Authentication Type
 */
export type RequestAuthType =
  | 'bearer'
  | 'basic'
  | 'api-key'
  | 'oauth2'
  | 'jwt'
  | 'none';

/**
 * Base API Request interface
 * Foundation for all API requests with consistent structure
 */
export interface ApiRequest<T = unknown> extends BaseEntity {
  /**
   * Unique request identifier
   */
  readonly requestId: string;

  /**
   * API endpoint path
   */
  readonly endpoint: string;

  /**
   * HTTP method
   */
  readonly method: HttpMethod;

  /**
   * Request headers
   */
  readonly headers?: Readonly<Record<string, string>>;

  /**
   * Request body/payload
   */
  readonly body?: T;

  /**
   * Query parameters
   */
  readonly queryParams?: Readonly<Record<string, string | number | boolean>>;

  /**
   * Path parameters
   */
  readonly pathParams?: Readonly<Record<string, string>>;

  /**
   * Content type
   */
  readonly contentType?: RequestContentType;

  /**
   * Authentication type
   */
  readonly authType?: RequestAuthType;

  /**
   * Authentication token/credentials
   */
  readonly authToken?: string;

  /**
   * Request timeout in milliseconds
   */
  readonly timeout?: number;

  /**
   * Request priority
   */
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';

  /**
   * Request metadata
   */
  readonly metadata?: Readonly<Record<string, unknown>>;

  /**
   * Timestamp when request was created
   */
  readonly createdAt: Date;

  /**
   * Timestamp when request was last updated
   */
  readonly updatedAt: Date;

  /**
   * Request version for backward compatibility
   */
  readonly version?: string;
}

/**
 * Paginated API Request interface
 * Standardized pagination parameters
 */
export interface PaginatedApiRequest<T = unknown> extends ApiRequest<T> {
  /**
   * Page number (1-based)
   */
  readonly page?: number;

  /**
   * Items per page
   */
  readonly pageSize?: number;

  /**
   * Sort field
   */
  readonly sortBy?: string;

  /**
   * Sort direction
   */
  readonly sortDirection?: 'asc' | 'desc';

  /**
   * Filter criteria
   */
  readonly filters?: Readonly<Record<string, unknown>>;

  /**
   * Search query
   */
  readonly search?: string;
}

/**
 * File Upload Request interface
 * Specialized for file upload operations
 */
export interface FileUploadRequest extends ApiRequest<File | Blob> {
  /**
   * File name
   */
  readonly fileName: string;

  /**
   * File type/MIME type
   */
  readonly fileType: string;

  /**
   * File size in bytes
   */
  readonly fileSize: number;

  /**
   * Upload progress callback
   */
  readonly onProgress?: (progress: number) => void;

  /**
   * Chunked upload configuration
   */
  readonly chunkSize?: number;

  /**
   * Total chunks for chunked uploads
   */
  readonly totalChunks?: number;

  /**
   * Current chunk index for chunked uploads
   */
  readonly currentChunk?: number;
}

/**
 * GraphQL Request interface
 * Specialized for GraphQL operations
 */
export interface GraphQLRequest<T = unknown> extends ApiRequest<T> {
  /**
   * GraphQL query string
   */
  readonly query: string;

  /**
   * GraphQL variables
   */
  readonly variables?: Readonly<Record<string, unknown>>;

  /**
   * GraphQL operation name
   */
  readonly operationName?: string;

  /**
   * GraphQL extensions
   */
  readonly extensions?: Readonly<Record<string, unknown>>;
}

/**
 * WebSocket Request interface
 * Specialized for WebSocket operations
 */
export interface WebSocketRequest<T = unknown> extends ApiRequest<T> {
  /**
   * WebSocket event type
   */
  readonly eventType: string;

  /**
   * WebSocket connection state
   */
  readonly connectionState?: 'connecting' | 'open' | 'closing' | 'closed';

  /**
   * WebSocket message type
   */
  readonly messageType?: 'text' | 'binary' | 'ping' | 'pong';
}

/**
 * Request validation result
 * For runtime validation of API requests
 */
export interface RequestValidationResult {
  /**
   * Whether the request is valid
   */
  readonly valid: boolean;

  /**
   * Validation errors if any
   */
  readonly errors?: readonly string[];

  /**
   * Validated request if successful
   */
  readonly validatedRequest?: ApiRequest<unknown>;
}

/**
 * Request factory options
 * Configuration for creating API requests
 */
export interface RequestFactoryOptions<T = unknown> {
  /**
   * Base endpoint URL
   */
  readonly baseUrl?: string;

  /**
   * Default headers
   */
  readonly defaultHeaders?: Readonly<Record<string, string>>;

  /**
   * Default authentication
   */
  readonly defaultAuth?: {
    readonly type: RequestAuthType;
    readonly token: string;
  };

  /**
   * Default timeout
   */
  readonly defaultTimeout?: number;

  /**
   * Request-specific data
   */
  readonly requestData: T;

  /**
   * Request metadata
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}