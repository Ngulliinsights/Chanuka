/**
 * API Response Types
 * Standardized response interfaces following the unified type system
 */

import { BaseEntity } from '../core/base';
import { Result } from '../core/errors';

/**
 * Response Status codes
 * Aligned with HTTP standards
 */
export type ResponseStatus =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'redirect';

/**
 * HTTP Status codes
 * Standard HTTP status codes for API responses
 */
export type HttpStatusCode =
  | 100 | 101 | 102 | 103
  | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
  | 300 | 301 | 302 | 303 | 304 | 305 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451
  | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

/**
 * Response Content Type
 */
export type ResponseContentType =
  | 'application/json'
  | 'application/xml'
  | 'text/plain'
  | 'text/html'
  | 'application/octet-stream'
  | 'multipart/form-data';

/**
 * Base API Response interface
 * Foundation for all API responses with consistent structure
 */
export interface ApiResponse<T = unknown> extends BaseEntity {
  /**
    * Unique response identifier
    */
  readonly responseId: string;

  /**
    * Corresponding request identifier
    */
  readonly requestId: string;

  /**
    * Response status
    */
  readonly status: ResponseStatus;

  /**
    * HTTP status code
    */
  readonly httpStatus: HttpStatusCode;

  /**
    * Response data payload
    */
  readonly data?: T;

  /**
    * Response metadata
    */
  readonly metadata?: Readonly<Record<string, unknown>>;

  /**
    * Response headers
    */
  readonly headers?: Readonly<Record<string, string>>;

  /**
    * Content type
    */
  readonly contentType?: ResponseContentType;

  /**
    * Response timestamp
    */
  readonly timestamp: Date;

  /**
    * Processing duration in milliseconds
    */
  readonly duration?: number;

  /**
    * Cache control information
    */
  readonly cacheControl?: {
    readonly maxAge?: number;
    readonly staleWhileRevalidate?: number;
    readonly staleIfError?: number;
    readonly mustRevalidate?: boolean;
    readonly noCache?: boolean;
    readonly noStore?: boolean;
  };

  /**
    * Pagination information for paginated responses
    */
  readonly pagination?: {
    readonly totalItems: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly pageSize: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };

  /**
    * Response version for backward compatibility
    */
  readonly version?: string | undefined;

  /**
    * Timestamp when response was created
    */
  readonly expiresAt?: Date | undefined;

  /**
    * Timestamp when response was created
    */
  readonly createdAt: Date;

  /**
    * Timestamp when response was last updated
    */
  readonly updatedAt: Date;
}

/**
 * Paginated API Response interface
 * Standardized pagination response structure
 */
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  /**
    * Pagination metadata
    */
  readonly pagination: {
    readonly totalItems: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly pageSize: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly nextPage?: number | undefined;
    readonly previousPage?: number | undefined;
  };
}

/**
 * Error API Response interface
 * Standardized error response structure
 */
export interface ErrorApiResponse extends ApiResponse<never> {
  /**
    * Error details
    */
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly severity: 'low' | 'medium' | 'high' | 'critical' | 'blocker';
    readonly details?: unknown | undefined;
    readonly stackTrace?: string | undefined;
    readonly timestamp: Date;
  };

  /**
    * Validation errors if applicable
    */
  readonly validationErrors?: readonly {
    readonly field: string;
    readonly message: string;
    readonly code?: string | undefined;
  }[] | undefined;
}

/**
 * File Download Response interface
 * Specialized for file download operations
 */
export interface FileDownloadResponse extends ApiResponse<Blob> {
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
    * Download URL
    */
  readonly downloadUrl?: string | undefined;

  /**
    * Content disposition
    */
  readonly contentDisposition?: string | undefined;
}

/**
 * GraphQL Response interface
 * Specialized for GraphQL operations
 */
export interface GraphQLResponse<T = unknown> extends ApiResponse<T> {
  /**
    * GraphQL execution result
    */
  readonly result: {
    readonly data?: T | undefined;
    readonly errors?: readonly {
      readonly message: string;
      readonly locations?: readonly { readonly line: number; readonly column: number }[] | undefined;
      readonly path?: readonly string[] | undefined;
      readonly extensions?: Readonly<Record<string, unknown>> | undefined;
    }[] | undefined;
    readonly extensions?: Readonly<Record<string, unknown>> | undefined;
  };

  /**
    * GraphQL operation name
    */
  readonly operationName?: string | undefined;
}

/**
 * WebSocket Response interface
 * Specialized for WebSocket operations
 */
export interface WebSocketResponse<T = unknown> extends ApiResponse<T> {
  /**
    * WebSocket event type
    */
  readonly eventType: string;

  /**
    * WebSocket connection state
    */
  readonly connectionState: 'connecting' | 'open' | 'closing' | 'closed';

  /**
    * WebSocket message type
    */
  readonly messageType: 'text' | 'binary' | 'ping' | 'pong';

  /**
    * WebSocket sequence number
    */
  readonly sequenceNumber?: number | undefined;
}

/**
 * Streaming Response interface
 * Specialized for streaming operations
 */
export interface StreamingResponse<T = unknown> extends ApiResponse<T> {
  /**
    * Stream identifier
    */
  readonly streamId: string;

  /**
    * Chunk sequence number
    */
  readonly chunkSequence: number;

  /**
    * Total chunks
    */
  readonly totalChunks?: number | undefined;

  /**
    * Is final chunk
    */
  readonly isFinal: boolean;

  /**
    * Stream metadata
    */
  readonly streamMetadata?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Response validation result
 * For runtime validation of API responses
 */
export interface ResponseValidationResult {
  /**
    * Whether the response is valid
    */
  readonly valid: boolean;

  /**
    * Validation errors if any
    */
  readonly errors?: readonly string[];

  /**
    * Validated response if successful
    */
  readonly validatedResponse?: ApiResponse<unknown>;
}

/**
 * Response factory options
 * Configuration for creating API responses
 */
export interface ResponseFactoryOptions<T = unknown> {
  /**
    * Request identifier
    */
  readonly requestId: string;

  /**
    * Response data
    */
  readonly responseData: T;

  /**
    * Response status
    */
  readonly status?: ResponseStatus;

  /**
    * HTTP status code
    */
  readonly httpStatus?: HttpStatusCode;

  /**
    * Response metadata
    */
  readonly metadata?: Readonly<Record<string, unknown>>;

  /**
    * Response headers
    */
  readonly headers?: Readonly<Record<string, string>>;

  /**
    * Content type
    */
  readonly contentType?: ResponseContentType;

  /**
    * Cache control
    */
  readonly cacheControl?: {
    readonly maxAge?: number;
    readonly staleWhileRevalidate?: number;
    readonly staleIfError?: number;
    readonly mustRevalidate?: boolean;
    readonly noCache?: boolean;
    readonly noStore?: boolean;
  };

  /**
    * Pagination information
    */
  readonly pagination?: {
    readonly totalItems: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly pageSize: number;
  };

  /**
    * Error information
    */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly severity: 'low' | 'medium' | 'high' | 'critical' | 'blocker';
    readonly details?: unknown;
  };
}