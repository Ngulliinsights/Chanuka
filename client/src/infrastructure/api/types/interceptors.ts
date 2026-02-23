/**
 * Interceptor Type Definitions
 *
 * Type definitions for request, response, and error interceptors.
 * These types are used throughout the API client system to enable
 * middleware-style request/response processing.
 */

import type { HttpMethod } from '@shared/types/api/request-types';

/**
 * Request body types
 */
export type RequestBody = Record<string, unknown> | FormData | string | null;

/**
 * API request configuration
 * Used by interceptors to modify requests before they are sent
 */
export interface BaseClientRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string> | undefined;
  body?: RequestBody | undefined;
  timeout?: number | undefined;
  retries?: number | undefined;
}

/**
 * Standardized API response
 * Used by interceptors to modify responses after they are received
 */
export interface BaseClientResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cached?: boolean;
  duration?: number;
}

/**
 * API error interface
 * Used by error interceptors to handle and transform errors
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  domain?: string;
  severity?: string;
  code?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  recoverable?: boolean;
}

/**
 * Request interceptor interface
 * Allows modification of requests before they are sent
 *
 * @example
 * ```typescript
 * const authInterceptor: RequestInterceptor = async (request) => {
 *   return {
 *     ...request,
 *     headers: {
 *       ...request.headers,
 *       'Authorization': `Bearer ${token}`
 *     }
 *   };
 * };
 * ```
 */
export interface RequestInterceptor {
  (request: BaseClientRequest): Promise<BaseClientRequest> | BaseClientRequest;
}

/**
 * Response interceptor interface
 * Allows modification of responses after they are received
 *
 * @example
 * ```typescript
 * const loggingInterceptor: ResponseInterceptor = async (response) => {
 *   console.log('Response received:', response.status);
 *   return response;
 * };
 * ```
 */
export interface ResponseInterceptor {
  <T>(response: BaseClientResponse<T>): Promise<BaseClientResponse<T>> | BaseClientResponse<T>;
}

/**
 * Error interceptor interface
 * Allows handling and transformation of errors
 *
 * @example
 * ```typescript
 * const errorInterceptor: ErrorInterceptor = async (error) => {
 *   if (error.statusCode === 401) {
 *     // Handle unauthorized error
 *     await refreshToken();
 *     throw error; // Re-throw to trigger retry
 *   }
 *   return error;
 * };
 * ```
 */
export interface ErrorInterceptor {
  (error: ApiError): Promise<ApiError> | ApiError | never;
}
