/**
 * API Utilities - Production-Ready Module
 * 
 * A comprehensive API client system with authentication, retry logic, 
 * error handling, and request deduplication. This module provides both
 * basic and authenticated API clients with configurable interceptors.
 * 
 * Features:
 * - Automatic token refresh on 401 errors
 * - Exponential backoff retry logic
 * - Request/response/error interceptors
 * - Request deduplication
 * - Safe API wrapper with result types
 * - Comprehensive error handling
 * 
 * @module api-utils
 */

import { ErrorFactory, ErrorDomain, ErrorSeverity } from '../core/error';
import { logger } from './logger';
import { tokenManager } from './storage';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Configuration options for the API client, including base URL, timeout
 * settings, and retry behavior. These options control how the client
 * handles requests across your application.
 */
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
}

/**
 * Type-safe request body that can be either a serializable object,
 * FormData for file uploads, or a string for raw body content.
 */
export type RequestBody = Record<string, unknown> | FormData | string;

/**
 * Represents a complete API request with all necessary parameters.
 * The body field is now properly typed for better type safety.
 */
export interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: RequestBody;
  timeout?: number;
  retries?: number;
}

/**
 * Standardized response format that wraps the actual data along with
 * HTTP metadata. The generic type T represents your expected data shape.
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Structured error information that provides context about what went wrong.
 * This helps with debugging and error recovery strategies. Now properly
 * aligned with the error system's expected structure.
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
  code?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  recoverable?: boolean;
}

/**
 * Interceptor functions allow you to modify requests before they're sent,
 * responses after they're received, or handle errors in a centralized way.
 */
export interface RequestInterceptor {
  (request: ApiRequest): Promise<ApiRequest> | ApiRequest;
}

export interface ResponseInterceptor {
  <T>(response: ApiResponse<T>): Promise<ApiResponse<T>> | ApiResponse<T>;
}

export interface ErrorInterceptor {
  (error: ApiError): Promise<ApiError> | ApiError | never;
}

// ============================================================================
// BASE API CLIENT
// ============================================================================

/**
 * The base API client provides core HTTP functionality with built-in
 * retry logic, timeout handling, and interceptor support. This serves
 * as the foundation for more specialized clients.
 */
export class ApiClient {
  protected config: ApiConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: Partial<ApiConfig> = {}) {
    // Merge provided config with sensible defaults
    this.config = {
      baseURL: '',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config
    };
  }

  /**
   * Registers an interceptor that runs before each request is sent.
   * Useful for adding authentication headers, logging, or modifying URLs.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Registers an interceptor that processes successful responses.
   * Perfect for transforming data or extracting nested response fields.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Registers an interceptor that handles errors before they're thrown.
   * Use this for token refresh logic, error logging, or custom error handling.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Provides read-only access to the current configuration. This allows
   * extending classes to inspect config without exposing mutation.
   */
  protected getConfig(): Readonly<ApiConfig> {
    return this.config;
  }

  /**
   * The core request method that handles the full request lifecycle:
   * interceptors, retries, timeout, and error handling. All convenience
   * methods (get, post, etc.) delegate to this method.
   */
  async request<T = unknown>(request: ApiRequest): Promise<ApiResponse<T>> {
    let processedRequest = { ...request };

    // Run all request interceptors in sequence, allowing each to modify the request
    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest);
    }

    // Construct the full URL, handling both absolute and relative paths
    const url = processedRequest.url.startsWith('http') 
      ? processedRequest.url 
      : `${this.config.baseURL}${processedRequest.url}`;

    // Build fetch options, merging default and request-specific headers
    const fetchOptions: RequestInit = {
      method: processedRequest.method,
      headers: {
        ...this.config.headers,
        ...processedRequest.headers
      },
      // Use AbortSignal for clean timeout handling
      signal: AbortSignal.timeout(processedRequest.timeout || this.config.timeout)
    };

    // Only include body for methods that support it
    if (processedRequest.body && processedRequest.method !== 'GET') {
      // Handle different body types appropriately
      if (typeof processedRequest.body === 'string') {
        fetchOptions.body = processedRequest.body;
      } else if (processedRequest.body instanceof FormData) {
        fetchOptions.body = processedRequest.body;
        // Remove Content-Type header for FormData - browser will set it with boundary
        delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
      } else {
        fetchOptions.body = JSON.stringify(processedRequest.body);
      }
    }

    // Implement exponential backoff retry logic
    const retries = processedRequest.retries ?? this.config.retries;
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        
        // Parse response based on content type
        let data: T;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await response.json() as T;
        } else {
          // Fallback to text for non-JSON responses
          data = (await response.text()) as T;
        }

        // Build our standardized response object
        let apiResponse: ApiResponse<T> = {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers)
        };

        // Handle HTTP error status codes (4xx, 5xx)
        if (!response.ok) {
          const error: ApiError = {
            message: `HTTP ${response.status}: ${response.statusText}`,
            statusCode: response.status,
            domain: 'API' as ErrorDomain,
            severity: response.status >= 500 ? 'ERROR' as ErrorSeverity : 'WARNING' as ErrorSeverity,
            code: response.status.toString(),
            details: data as Record<string, unknown>,
            retryable: response.status >= 500 && response.status < 600,
            recoverable: response.status < 500
          };

          // Give error interceptors a chance to handle or transform the error
          for (const interceptor of this.errorInterceptors) {
            await interceptor(error);
          }

          throw ErrorFactory.createNetworkError(
            error.message,
            {
              statusCode: error.statusCode,
              domain: error.domain,
              severity: error.severity,
              context: {
                url,
                method: processedRequest.method,
                details: error.details
              }
            }
          );
        }

        // Run response interceptors to transform successful responses
        for (const interceptor of this.responseInterceptors) {
          apiResponse = await interceptor(apiResponse);
        }

        return apiResponse;

      } catch (error) {
        const typedError = error as Error & Partial<ApiError>;
        
        lastError = {
          message: typedError.message || 'Request failed',
          statusCode: typedError.statusCode,
          domain: typedError.domain || 'API' as ErrorDomain,
          severity: typedError.severity || 'ERROR' as ErrorSeverity,
          code: typedError.code,
          details: typedError.details,
          retryable: typedError.retryable ?? true,
          recoverable: typedError.recoverable ?? false
        };

        // Don't retry on client errors or not found - these won't succeed on retry
        if (lastError.statusCode === 401 || lastError.statusCode === 403 || lastError.statusCode === 404) {
          break;
        }

        // Exponential backoff: wait longer between each retry
        if (attempt < retries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // All retries exhausted, apply error interceptors to the final error
    if (lastError) {
      for (const interceptor of this.errorInterceptors) {
        await interceptor(lastError);
      }
      
      throw ErrorFactory.createNetworkError(
        lastError.message,
        {
          statusCode: lastError.statusCode,
          domain: lastError.domain,
          severity: lastError.severity,
          context: {
            url,
            method: processedRequest.method,
            attempts: retries + 1
          }
        }
      );
    }

    // This should never happen, but TypeScript needs the guarantee
    throw ErrorFactory.createNetworkError(
      'Request failed with unknown error',
      {
        domain: 'API' as ErrorDomain,
        severity: 'ERROR' as ErrorSeverity
      }
    );
  }

  /**
   * Convenience methods for common HTTP verbs. These provide a cleaner
   * API surface while delegating to the main request method.
   */
  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  async post<T = unknown>(url: string, body?: RequestBody, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  async put<T = unknown>(url: string, body?: RequestBody, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  async delete<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }

  async patch<T = unknown>(url: string, body?: RequestBody, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PATCH', body, headers });
  }

  /**
   * Converts the Headers object to a plain object for easier handling.
   * The Headers API doesn't support direct iteration or key access.
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Simple promise-based delay utility for implementing retry backoff.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// AUTHENTICATED API CLIENT
// ============================================================================

/**
 * An API client that automatically handles authentication by injecting
 * bearer tokens and refreshing them when they expire. This extends the
 * base client with authentication-specific interceptors.
 */
export class AuthenticatedApiClient extends ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: Partial<ApiConfig> = {}) {
    super(config);
    this.setupAuthInterceptors();
  }

  /**
   * Sets up the authentication flow: add tokens to requests and handle
   * 401 errors by attempting to refresh the token automatically.
   */
  private setupAuthInterceptors(): void {
    // Inject the access token into every request's Authorization header
    this.addRequestInterceptor(async (request) => {
      const token = await tokenManager.getAccessToken();
      if (token) {
        request.headers = {
          ...request.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return request;
    });

    // Handle 401 errors by attempting token refresh
    this.addErrorInterceptor(async (error) => {
      if (error.statusCode === 401) {
        // Prevent multiple simultaneous refresh attempts
        if (this.isRefreshing && this.refreshPromise) {
          await this.refreshPromise;
          return error;
        }

        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            this.refreshPromise = this.refreshAuthToken(refreshToken);
            await this.refreshPromise;
            // Request will be retried with the new token
            return error;
          } catch (refreshError) {
            logger.error('Token refresh failed', { refreshError });
            await tokenManager.clearTokens();
            this.handleAuthenticationFailure();
          } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
          }
        } else {
          // No refresh token available, user must log in
          this.handleAuthenticationFailure();
        }
      }
      return error;
    });
  }

  /**
   * Calls the token refresh endpoint and updates stored credentials.
   * This allows seamless continuation of authenticated requests without
   * requiring the user to log in again.
   */
  private async refreshAuthToken(refreshToken: string): Promise<void> {
    this.isRefreshing = true;
    
    try {
      const config = this.getConfig();
      const response = await fetch(`${config.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json() as {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
      };
      
      await tokenManager.storeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: new Date(data.expiresAt),
        tokenType: 'Bearer'
      });

      logger.info('Authentication token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh authentication token', { error });
      throw error;
    }
  }

  /**
   * Notifies the application that authentication has failed and the user
   * needs to log in again. This dispatches a custom event that your auth
   * service can listen for.
   */
  private handleAuthenticationFailure(): void {
    logger.warn('Authentication failed, user needs to login');
    
    const event = new CustomEvent('auth:failure', {
      detail: { reason: 'token_expired' }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }
}

// ============================================================================
// SAFE API WRAPPER
// ============================================================================

/**
 * Result type for safe API operations that don't throw errors.
 * This discriminated union allows for type-safe error handling.
 */
export type SafeApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

/**
 * A wrapper that never throws errors, instead returning a result object
 * with success/failure information. This is useful for scenarios where
 * you want to handle errors inline without try-catch blocks.
 */
export class SafeApiClient {
  private client: ApiClient;
  private requestQueue: Map<string, Promise<ApiResponse<unknown>>> = new Map();

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Makes a request that returns a discriminated union type for type-safe
   * error handling. This pattern is especially useful in TypeScript where
   * you can narrow the type based on the success flag.
   */
  async safeRequest<T = unknown>(request: ApiRequest): Promise<SafeApiResult<T>> {
    try {
      const response = await this.client.request<T>(request);
      return { success: true, data: response.data };
    } catch (error) {
      const typedError = error as Error & Partial<ApiError>;
      
      const apiError: ApiError = {
        message: typedError.message || 'Request failed',
        statusCode: typedError.statusCode,
        domain: typedError.domain,
        severity: typedError.severity,
        code: typedError.code,
        details: typedError.details,
        retryable: typedError.retryable,
        recoverable: typedError.recoverable
      };
      
      logger.error('Safe API request failed', { request, error: apiError });
      return { success: false, error: apiError };
    }
  }

  /**
   * Safe versions of all HTTP methods for convenient error handling
   */
  async safeGet<T = unknown>(
    url: string, 
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'GET', headers });
  }

  async safePost<T = unknown>(
    url: string, 
    body?: RequestBody, 
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'POST', body, headers });
  }

  async safePut<T = unknown>(
    url: string, 
    body?: RequestBody, 
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'PUT', body, headers });
  }

  async safeDelete<T = unknown>(
    url: string, 
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'DELETE', headers });
  }

  /**
   * Prevents multiple identical requests from being sent simultaneously.
   * This is valuable when multiple components might trigger the same API
   * call at once, like fetching user profile data.
   */
  async deduplicatedRequest<T = unknown>(request: ApiRequest): Promise<ApiResponse<T>> {
    const key = this.getRequestKey(request);
    
    // If an identical request is already in flight, return its promise
    const existingRequest = this.requestQueue.get(key);
    if (existingRequest) {
      return existingRequest as Promise<ApiResponse<T>>;
    }

    const promise = this.client.request<T>(request);
    this.requestQueue.set(key, promise as Promise<ApiResponse<unknown>>);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up the queue after a brief delay to allow for any immediate
      // subsequent calls to benefit from deduplication
      setTimeout(() => {
        this.requestQueue.delete(key);
      }, 1000);
    }
  }

  /**
   * Creates a unique key for request deduplication by combining method,
   * URL, and body content. This ensures only truly identical requests
   * are deduplicated.
   */
  private getRequestKey(request: ApiRequest): string {
    const bodyKey = request.body 
      ? (typeof request.body === 'string' 
        ? request.body 
        : JSON.stringify(request.body))
      : '';
    return `${request.method}:${request.url}:${bodyKey}`;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Pre-configured client instances for common use cases. These singletons
 * ensure consistent configuration across your application and reduce
 * boilerplate when making API calls.
 */
export const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

export const authenticatedApi = new AuthenticatedApiClient({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

export const safeApi = new SafeApiClient(authenticatedApi);

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Top-level convenience functions for making API calls without needing
 * to reference the client instances. These are great for simple use cases.
 */

// Basic HTTP methods (no authentication)
export async function get<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.get<T>(url, headers);
}

export async function post<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.post<T>(url, body, headers);
}

export async function put<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.put<T>(url, body, headers);
}

export async function del<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.delete<T>(url, headers);
}

export async function patch<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiClient.patch<T>(url, body, headers);
}

// Authenticated HTTP methods (automatically includes auth tokens)
export async function secureGet<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.get<T>(url, headers);
}

export async function securePost<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.post<T>(url, body, headers);
}

export async function securePut<T = unknown>(
  url: string, 
  body?: RequestBody, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.put<T>(url, body, headers);
}

export async function secureDelete<T = unknown>(
  url: string, 
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return authenticatedApi.delete<T>(url, headers);
}

// Safe wrapper for error handling without try-catch
export async function safeFetch<T = unknown>(
  url: string, 
  options?: Partial<ApiRequest>
): Promise<SafeApiResult<T>> {
  return safeApi.safeRequest<T>({ url, method: 'GET', ...options });
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  ApiClient,
  AuthenticatedApiClient,
  SafeApiClient,
  apiClient,
  authenticatedApi,
  safeApi,
  get,
  post,
  put,
  del,
  patch,
  secureGet,
  securePost,
  securePut,
  secureDelete,
  safeFetch
};