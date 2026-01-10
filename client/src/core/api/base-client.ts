/**
 * Base API Client Module
 *
 * Core HTTP client with interceptors, retry logic, caching, and error handling.
 * This is the foundation for all API communication in the application.
 */

import { logger } from '@client/shared/utils/logger';
import { ErrorFactory, ErrorDomain, ErrorSeverity } from '../error';

import { ApiCacheManager, CacheKeyGenerator } from './cache-manager';
import { RetryHandler } from './retry';

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request body types
 */
export type RequestBody = Record<string, unknown> | FormData | string | null;

/**
 * API request configuration
 */
export interface ApiRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: RequestBody;
  timeout?: number;
  retries?: number;
}

/**
 * Standardized API response
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cached?: boolean;
  duration?: number;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

/**
 * Request interceptor interface
 */
export interface RequestInterceptor {
  (request: ApiRequest): Promise<ApiRequest> | ApiRequest;
}

/**
 * Response interceptor interface
 */
export interface ResponseInterceptor {
  <T>(response: ApiResponse<T>): Promise<ApiResponse<T>> | ApiResponse<T>;
}

/**
 * Error interceptor interface
 */
export interface ErrorInterceptor {
  (error: ApiError): Promise<ApiError> | ApiError | never;
}

/**
 * API error interface
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
 * Default API client configuration
 */
export const DEFAULT_API_CONFIG: ApiClientConfig = {
  baseURL: '',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
};

/**
 * Base API Client class
 */
export class BaseApiClient {
  protected config: ApiClientConfig;
  protected requestInterceptors: RequestInterceptor[] = [];
  protected responseInterceptors: ResponseInterceptor[] = [];
  protected errorInterceptors: ErrorInterceptor[] = [];
  protected retryHandler: RetryHandler;
  protected cache: ApiCacheManager;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.retryHandler = new RetryHandler({
      maxRetries: this.config.retries,
      baseDelay: this.config.retryDelay,
      maxDelay: 30000,
      backoffMultiplier: 2,
    });
    this.cache = new ApiCacheManager({
      defaultTTL: this.config.cache?.ttl || 5 * 60 * 1000,
    });
  }

  /**
   * Adds a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Adds a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Adds an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Readonly<ApiClientConfig> {
    return this.config;
  }

  /**
   * Updates the configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Main request method
   */
  async request<T = unknown>(request: ApiRequest): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    try {
      // Apply request interceptors
      let processedRequest = { ...request };
      for (const interceptor of this.requestInterceptors) {
        processedRequest = await interceptor(processedRequest);
      }

      // Check cache for GET requests
      if (processedRequest.method === 'GET' && this.config.cache?.enabled) {
        const cacheKey = CacheKeyGenerator.generate(
          processedRequest.url,
          undefined,
          processedRequest.method
        );

        const cachedData = await this.cache.get<T>(cacheKey);
        if (cachedData !== null) {
          logger.debug('Cache hit for request', {
            component: 'BaseApiClient',
            url: processedRequest.url,
            method: processedRequest.method,
          });

          return {
            data: cachedData,
            status: 200,
            statusText: 'OK',
            headers: {},
            cached: true,
            duration: Date.now() - startTime,
          };
        }
      }

      // Execute request with retry logic
      const response = await this.retryHandler.execute(() =>
        this.executeRequest<T>(processedRequest)
      );

      // Cache successful GET responses
      if (
        processedRequest.method === 'GET' &&
        this.config.cache?.enabled &&
        response.status >= 200 &&
        response.status < 300
      ) {
        const cacheKey = CacheKeyGenerator.generate(
          processedRequest.url,
          undefined,
          processedRequest.method
        );

        await this.cache.set(cacheKey, response.data, {
          ttl: this.config.cache.ttl,
        });
      }

      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      processedResponse.duration = Date.now() - startTime;
      return processedResponse;
    } catch (error) {
      // Apply error interceptors
      let apiError = this.normalizeError(error);
      for (const interceptor of this.errorInterceptors) {
        apiError = await interceptor(apiError);
      }

      throw ErrorFactory.createNetworkError(apiError.message, {
        statusCode: apiError.statusCode,
        domain: apiError.domain || ('API' as ErrorDomain),
        severity: apiError.severity || ('ERROR' as ErrorSeverity),
        context: {
          url: request.url,
          method: request.method,
          duration: Date.now() - startTime,
        },
      });
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PATCH', body, headers });
  }

  /**
   * Executes a single HTTP request
   */
  private async executeRequest<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const url = request.url.startsWith('http')
      ? request.url
      : `${this.config.baseURL}${request.url}`;

    const fetchOptions: RequestInit = {
      method: request.method,
      headers: {
        ...this.config.headers,
        ...request.headers,
      },
      signal: AbortSignal.timeout(request.timeout || this.config.timeout),
    };

    // Add body for non-GET requests
    if (request.body && request.method !== 'GET') {
      if (typeof request.body === 'string') {
        fetchOptions.body = request.body;
      } else if (request.body instanceof FormData) {
        fetchOptions.body = request.body;
        // Remove Content-Type header for FormData
        delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
      } else if (request.body) {
        fetchOptions.body = JSON.stringify(request.body);
      }
    }

    const response = await fetch(url, fetchOptions);

    // Parse response data
    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } else {
      data = (await response.text()) as T;
    }

    // Handle HTTP error status codes
    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        domain: 'API' as ErrorDomain,
        severity:
          response.status >= 500 ? ('ERROR' as ErrorSeverity) : ('WARNING' as ErrorSeverity),
        code: response.status.toString(),
        details: data as Record<string, unknown>,
        retryable: response.status >= 500 && response.status < 600,
        recoverable: response.status < 500,
      };

      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: this.parseHeaders(response.headers),
    };
  }

  /**
   * Converts Headers object to plain object
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Normalizes different error types to ApiError
   */
  private normalizeError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return error as ApiError;
    }

    const err = error as Error;
    return {
      message: err.message || 'Request failed',
      domain: 'API' as ErrorDomain,
      severity: 'ERROR' as ErrorSeverity,
      retryable: true,
      recoverable: false,
    };
  }

  /**
   * Clears the cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Invalidates cache entries
   */
  async invalidateCache(pattern?: RegExp): Promise<number> {
    return this.cache.invalidate({ pattern });
  }
}
