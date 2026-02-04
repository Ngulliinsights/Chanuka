/**
 * Safe API Client Module
 *
 * Provides a wrapper around API clients that never throws errors,
 * instead returning result objects for type-safe error handling.
 */

import { logger } from '@client/lib/utils/logger';

import { BaseApiClient, BaseClientRequest, BaseClientResponse, RequestBody } from './base-client';
import { ApiError } from './base-client';

/**
 * Result type for safe API operations
 */
export type SafeApiResult<T> =
  | { success: true; data: T; response: BaseClientResponse<T> }
  | { success: false; error: ApiError };

/**
 * Safe API Client class
 */
export class SafeApiClient {
  private client: BaseApiClient;
  private requestQueue: Map<string, Promise<BaseClientResponse<unknown>>> = new Map();

  constructor(client: BaseApiClient) {
    this.client = client;
  }

  /**
   * Makes a safe request that returns a result object
   */
  async safeRequest<T = unknown>(request: BaseClientRequest): Promise<SafeApiResult<T>> {
    try {
      const response = await this.client.request<T>(request);
      return {
        success: true,
        data: response.data,
        response,
      };
    } catch (error) {
      const apiError = this.normalizeError(error);

      logger.error('Safe API request failed', {
        request,
        error: apiError,
      });

      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Safe GET request
   */
  async safeGet<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'GET', headers });
  }

  /**
   * Safe POST request
   */
  async safePost<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'POST', body, headers });
  }

  /**
   * Safe PUT request
   */
  async safePut<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'PUT', body, headers });
  }

  /**
   * Safe DELETE request
   */
  async safeDelete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'DELETE', headers });
  }

  /**
   * Safe PATCH request
   */
  async safePatch<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<SafeApiResult<T>> {
    return this.safeRequest<T>({ url, method: 'PATCH', body, headers });
  }

  /**
   * Makes a deduplicated request to prevent multiple identical requests
   */
  async deduplicatedRequest<T = unknown>(request: BaseClientRequest): Promise<BaseClientResponse<T>> {
    const key = this.getRequestKey(request);

    // If an identical request is already in flight, return its promise
    const existingRequest = this.requestQueue.get(key);
    if (existingRequest) {
      logger.debug('Request deduplicated', {
        component: 'SafeApiClient',
        key,
        url: request.url,
        method: request.method,
      });
      return existingRequest as Promise<BaseClientResponse<T>>;
    }

    const promise = this.client.request<T>(request);
    this.requestQueue.set(key, promise as Promise<BaseClientResponse<unknown>>);

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
   * Safe deduplicated request
   */
  async safeDeduplicatedRequest<T = unknown>(request: BaseClientRequest): Promise<SafeApiResult<T>> {
    try {
      const response = await this.deduplicatedRequest<T>(request);
      return {
        success: true,
        data: response.data,
        response,
      };
    } catch (error) {
      const apiError = this.normalizeError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Batch multiple requests and return results
   */
  async batchRequests<T = unknown>(requests: BaseClientRequest[]): Promise<SafeApiResult<T>[]> {
    const promises = requests.map(request => this.safeRequest<T>(request));
    return Promise.all(promises);
  }

  /**
   * Batch requests with concurrency limit
   */
  async batchRequestsWithLimit<T = unknown>(
    requests: BaseClientRequest[],
    concurrencyLimit: number = 5
  ): Promise<SafeApiResult<T>[]> {
    const results: SafeApiResult<T>[] = [];

    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);
      const batchResults = await this.batchRequests<T>(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Makes a request with timeout
   */
  async requestWithTimeout<T = unknown>(
    request: BaseClientRequest,
    timeoutMs: number
  ): Promise<SafeApiResult<T>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([this.client.request<T>(request), timeoutPromise]);

      return {
        success: true,
        data: response.data,
        response,
      };
    } catch (error) {
      const apiError = this.normalizeError(error);
      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Makes a request with fallback data
   */
  async requestWithFallback<T = unknown>(
    request: BaseClientRequest,
    fallbackData: T
  ): Promise<SafeApiResult<T>> {
    const result = await this.safeRequest<T>(request);

    if (!result.success) {
      logger.warn('Request failed, using fallback data', {
        component: 'SafeApiClient',
        url: request.url,
        method: request.method,
        error: result.error,
      });

      return {
        success: true,
        data: fallbackData,
        response: {
          data: fallbackData,
          status: 0,
          statusText: 'Fallback',
          headers: {},
          cached: false,
        },
      };
    }

    return result;
  }

  /**
   * Retries a request with exponential backoff
   */
  async retryRequest<T = unknown>(
    request: BaseClientRequest,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<SafeApiResult<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.safeRequest<T>(request);

      if (result.success) {
        if (attempt > 0) {
          logger.info('Request succeeded after retry', {
            component: 'SafeApiClient',
            url: request.url,
            method: request.method,
            attempts: attempt + 1,
          });
        }
        return result;
      }

      lastError = result.error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!this.isRetryableError(result.error)) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await this.delay(delay);

      logger.warn('Retrying request after failure', {
        component: 'SafeApiClient',
        url: request.url,
        method: request.method,
        attempt: attempt + 1,
        delay,
      });
    }

    return {
      success: false,
      error: lastError!,
    };
  }

  /**
   * Gets the underlying API client
   */
  getClient(): BaseApiClient {
    return this.client;
  }

  /**
   * Clears the request queue
   */
  clearRequestQueue(): void {
    this.requestQueue.clear();
  }

  /**
   * Gets request queue statistics
   */
  getQueueStats() {
    return {
      queueSize: this.requestQueue.size,
      activeRequests: Array.from(this.requestQueue.keys()),
    };
  }

  /**
   * Creates a unique key for request deduplication
   */
  private getRequestKey(request: BaseClientRequest): string {
    const bodyKey = request.body
      ? typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body)
      : '';
    return `${request.method}:${request.url}:${bodyKey}`;
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
      retryable: true,
      recoverable: false,
    };
  }

  /**
   * Checks if an error is retryable
   */
  private isRetryableError(error: ApiError): boolean {
    // Don't retry client errors (4xx) except specific cases
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return error.statusCode === 408 || error.statusCode === 429;
    }

    // Retry server errors (5xx) and network errors
    return error.retryable !== false;
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
