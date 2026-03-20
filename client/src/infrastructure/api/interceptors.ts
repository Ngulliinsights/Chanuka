/**
 * Request and Response Interceptor System
 *
 * This module provides a flexible interceptor pipeline for modifying HTTP requests
 * and responses. Interceptors can be used for authentication, logging, error handling,
 * request transformation, and more.
 *
 * Key features:
 * - Type-safe interceptor interfaces
 * - Sequential processing with error handling
 * - Composable interceptor functions
 * - Built-in common interceptors (auth, logging, headers)
 */

import { logger } from '@client/lib/utils/logger';

import { BaseError, ErrorDomain, ErrorSeverity } from '../error';
import { circuitBreaker, getCircuitBreakerStats } from './circuit-breaker/core';
import type { CircuitBreakerState } from './circuit-breaker/types';

// Define interceptor types locally since @client/lib/types is not available
type RequestInterceptor = (
  config: RequestInit & { url: string }
) => Promise<RequestInit & { url: string }> | (RequestInit & { url: string });
type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

// ============================================================================
// Interceptor Configuration
// ============================================================================

// Removed unused interfaces InterceptorConfig and InterceptorContext

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique request ID using a combination of timestamp and random values.
 * This ID is used for request tracking, correlation, and debugging.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Safely retrieves a meta tag content from the DOM.
 * Returns null if running in a non-browser environment or if the tag doesn't exist.
 */
function getMetaTagContent(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const element = document.querySelector(`meta[name="${name}"]`);
  return element?.getAttribute('content') ?? null;
}

/**
 * Extracts service name from URL for circuit breaker monitoring
 */
function getServiceNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Map common API paths to service names
    if (pathname.startsWith('/api/government')) return 'government-data';
    if (pathname.startsWith('/api/social')) return 'social-media';
    if (pathname.startsWith('/api/external')) return 'external-api';
    if (pathname.startsWith('/api/admin')) return 'admin-api';
    if (pathname.startsWith('/api/auth')) return 'auth-api';
    if (pathname.startsWith('/api/')) return 'internal-api';

    // For external URLs, use the hostname
    if (urlObj.hostname !== window.location.hostname) {
      return urlObj.hostname.replace(/\./g, '-');
    }

    return 'default';
  } catch {
    return 'default';
  }
}

/**
 * Creates a Headers object from various input types.
 * Handles Headers objects, plain objects, and undefined values.
 */
function normalizeHeaders(headers: HeadersInit | undefined): Headers {
  if (headers instanceof Headers) {
    return new Headers(headers);
  }
  return new Headers(headers);
}

// ============================================================================
// Core Request Interceptors
// ============================================================================

/**
 * Header Interceptor
 *
 * Adds essential headers to every outgoing request:
 * 1. X-CSRF-Token: Security token for preventing CSRF attacks
 * 2. X-Request-ID: Unique identifier for request tracking and correlation
 * 3. Content-Type: Default JSON content type for POST/PUT/PATCH requests
 * 4. Accept: Default accepted response type
 *
 * Note: Authentication is handled via HttpOnly cookies sent automatically by the browser.
 * This approach is more secure than storing tokens in localStorage or sessionStorage.
 */
export const headerInterceptor: RequestInterceptor = config => {
  const headers = normalizeHeaders(config.headers);

  // Add CSRF token if available in the DOM (Rails/Django style)
  const csrfToken = getMetaTagContent('csrf-token');
  if (csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  // Add unique request ID for tracking and debugging
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', generateRequestId());
  }

  // Set default Content-Type for requests with bodies
  const method = config.method?.toUpperCase();
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Set default Accept header if not present
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return {
    ...config,
    headers,
  };
};

/**
 * Logging Interceptor
 *
 * Logs all outgoing requests for debugging and monitoring purposes.
 * Includes method, URL, and request ID for correlation with server logs.
 *
 * In production, this should be configured to only log errors or
 * can be disabled entirely for performance.
 */
export const loggingInterceptor: RequestInterceptor = config => {
  const headers = config.headers instanceof Headers ? config.headers : new Headers(config.headers);

  const requestId = headers.get('X-Request-ID') || 'unknown';

  logger.debug('Outgoing API Request', {
    component: 'RequestInterceptor',
    requestId,
    url: config.url,
    method: config.method || 'GET',
    hasBody: !!config.body,
  });

  return config;
};

/**
 * Timeout Interceptor
 *
 * Adds AbortSignal-based timeout to requests if not already present.
 * This ensures all requests have a maximum execution time.
 */
export const timeoutInterceptor = (defaultTimeout: number = 10000): RequestInterceptor => {
  return config => {
    // Don't override existing signal
    if (config.signal) {
      return config;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, defaultTimeout);

    // Store timeout ID for potential cleanup
    (controller.signal as AbortSignal & { __timeoutId?: NodeJS.Timeout }).__timeoutId = timeoutId;

    return {
      ...config,
      signal: controller.signal,
    };
  };
};

/**
 * Request Sanitization Interceptor
 *
 * Removes sensitive information from requests before they're sent.
 * This is useful for preventing accidental exposure of sensitive data.
 */
export const sanitizationInterceptor: RequestInterceptor = config => {
  // Remove any potential password fields from URL params
  const url = new URL(config.url, window.location.origin);
  const sensitiveParams = ['password', 'token', 'secret', 'key'];

  sensitiveParams.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      logger.warn('Removed sensitive parameter from URL', {
        component: 'RequestInterceptor',
        parameter: param,
      });
    }
  });

  return {
    ...config,
    url: url.toString(),
  };
};

/**
 * Request Compression Interceptor
 *
 * Adds compression headers to indicate the client supports compressed responses.
 * This can significantly reduce bandwidth usage for large responses.
 */
export const compressionInterceptor: RequestInterceptor = config => {
  const headers = normalizeHeaders(config.headers);

  if (!headers.has('Accept-Encoding')) {
    headers.set('Accept-Encoding', 'gzip, deflate, br');
  }

  return {
    ...config,
    headers,
  };
};

/**
 * Circuit Breaker Interceptor
 *
 * Implements circuit breaker pattern to prevent cascading failures.
 * Monitors service health and temporarily blocks requests to failing services.
 */
export const circuitBreakerInterceptor: RequestInterceptor = config => {
  const { allowed, reason } = circuitBreaker.canExecute(config.url);

  if (!allowed) {
    logger.warn('Circuit breaker blocked request', {
      component: 'CircuitBreakerInterceptor',
      url: config.url,
      reason,
    });

    // Throw a BaseError with circuit breaker information
    throw new BaseError('Service temporarily unavailable', {
      statusCode: 503,
      code: 'CIRCUIT_BREAKER_OPEN',
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      context: {
        url: config.url,
        reason,
        circuitBreakerStats: circuitBreaker.getStats(),
      },
    });
  }

  return config;
};

// ============================================================================
// Core Response Interceptors
// ============================================================================

/**
 * Response Logging Interceptor
 *
 * Logs all incoming responses for debugging and monitoring.
 * Includes status, timing, and correlation information.
 */
export const responseLoggingInterceptor: ResponseInterceptor = async response => {
  const requestId = response.headers.get('X-Request-ID') || 'unknown';
  const duration = response.headers.get('X-Response-Time') || 'unknown';

  logger.debug('Incoming API Response', {
    component: 'ResponseInterceptor',
    requestId,
    status: response.status,
    statusText: response.statusText,
    duration,
    url: response.url,
  });

  return response;
};

/**
 * Error Response Interceptor
 *
 * Handles error responses and provides additional context.
 * Transforms error responses into a consistent format.
 */
export const errorResponseInterceptor: ResponseInterceptor = async response => {
  if (!response.ok) {
    const requestId = response.headers.get('X-Request-ID') || 'unknown';

    logger.warn('API Request Failed', {
      component: 'ResponseInterceptor',
      requestId,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });

    // Clone response before reading body (can only be read once)
    const clonedResponse = response.clone();

    try {
      const errorData = await clonedResponse.json();
      logger.debug('Error Response Body', {
        component: 'ResponseInterceptor',
        requestId,
        errorData,
      });
    } catch (error) {
      // Body is not JSON or couldn't be parsed
      logger.debug('Error Response Body (non-JSON)', {
        component: 'ResponseInterceptor',
        requestId,
      });
    }
  }

  return response;
};

/**
 * Cache Header Interceptor
 *
 * Processes cache-related headers and adds metadata to the response.
 * This helps the cache layer make decisions about storing responses.
 */
export const cacheHeaderInterceptor: ResponseInterceptor = response => {
  const cacheControl = response.headers.get('Cache-Control');
  const etag = response.headers.get('ETag');
  const lastModified = response.headers.get('Last-Modified');

  // Add cache metadata as a custom header for internal use
  if (cacheControl || etag || lastModified) {
    const metadata = {
      cacheControl,
      etag,
      lastModified,
      timestamp: Date.now(),
    };

    // Store metadata on the response object for later use
    (response as Response & { __cacheMetadata?: typeof metadata }).__cacheMetadata = metadata;
  }

  return response;
};

/**
 * Circuit Breaker Response Interceptor
 *
 * Records success/failure results for circuit breaker monitoring.
 * Updates circuit breaker state based on response status.
 */
export const circuitBreakerResponseInterceptor: ResponseInterceptor = response => {
  const serviceName = getServiceNameFromUrl(response.url);
  const correlationId =
    response.headers.get('X-Correlation-ID') || response.headers.get('X-Request-ID') || undefined;

  if (response.ok) {
    circuitBreaker.recordSuccess(response.url);
    logger.debug('Circuit breaker recorded success', {
      component: 'CircuitBreakerResponseInterceptor',
      url: response.url,
      status: response.status,
      serviceName,
      correlationId,
    });

    // Record success event for monitoring
    if (typeof window !== 'undefined') {
      import('./circuit-breaker-monitor').then(({ recordCircuitBreakerEvent }) => {
        const stats = circuitBreaker.getStats();
        const serviceStats = stats[serviceName];

        if (serviceStats) {
          recordCircuitBreakerEvent({
            serviceName,
            state: serviceStats.state as 'open' | 'closed' | 'half-open',
            timestamp: new Date(),
            metrics: {
              failures: serviceStats.failures,
              successes: serviceStats.successes,
              rejected: serviceStats.rejected,
              failureRate: serviceStats.failureRate,
              averageResponseTime: serviceStats.averageResponseTime,
            },
            correlationId,
          });
        }
      });
    }
  } else if (response.status >= 500) {
    // Only record server errors as circuit breaker failures
    circuitBreaker.recordFailure(response.url);
    logger.warn('Circuit breaker recorded failure', {
      component: 'CircuitBreakerResponseInterceptor',
      url: response.url,
      status: response.status,
      serviceName,
      correlationId,
    });

    // Record failure event for monitoring
    if (typeof window !== 'undefined') {
      import('./circuit-breaker-monitor').then(({ recordCircuitBreakerEvent }) => {
        const stats = circuitBreaker.getStats();
        const serviceStats = stats[serviceName];

        if (serviceStats) {
          recordCircuitBreakerEvent({
            serviceName,
            state: serviceStats.state as 'open' | 'closed' | 'half-open',
            timestamp: new Date(),
            metrics: {
              failures: serviceStats.failures,
              successes: serviceStats.successes,
              rejected: serviceStats.rejected,
              failureRate: serviceStats.failureRate,
              averageResponseTime: serviceStats.averageResponseTime,
            },
            correlationId,
          });
        }
      });
    }
  }

  return response;
};

// ============================================================================
// Interceptor Management
// ============================================================================

/**
 * List of all active request interceptors.
 * These are executed in order for every outgoing request.
 *
 * To add custom interceptors, simply push them to this array.
 * To disable an interceptor, remove it from the array.
 */
export const requestInterceptors: RequestInterceptor[] = [
  circuitBreakerInterceptor, // Check circuit breaker first
  headerInterceptor,
  sanitizationInterceptor,
  compressionInterceptor,
  loggingInterceptor,
  // Add more interceptors here as needed
];

/**
 * List of all active response interceptors.
 * These are executed in order for every incoming response.
 *
 * Response interceptors can transform responses, handle errors,
 * or perform side effects like logging or caching.
 */
export const responseInterceptors: ResponseInterceptor[] = [
  circuitBreakerResponseInterceptor, // Record circuit breaker results first
  cacheHeaderInterceptor,
  errorResponseInterceptor,
  responseLoggingInterceptor,
  // Add more interceptors here as needed
];

// ============================================================================
// Interceptor Processing Pipeline
// ============================================================================

/**
 * Processes all request interceptors sequentially.
 *
 * Each interceptor receives the config from the previous interceptor,
 * allowing for composition and transformation. If an interceptor throws
 * an error, the pipeline stops and the error is propagated.
 *
 * @param config - Initial request configuration
 * @returns Processed request configuration after all interceptors
 */
export async function processRequestInterceptors(
  config: RequestInit & { url: string }
): Promise<RequestInit & { url: string }> {
  let processedConfig = config;

  for (const interceptor of requestInterceptors) {
    try {
      processedConfig = await interceptor(processedConfig);
    } catch (error) {
      logger.error('Request interceptor failed', {
        component: 'InterceptorPipeline',
        error: error instanceof Error ? error.message : 'Unknown error',
        url: config.url,
      });
      throw error;
    }
  }

  return processedConfig;
}

/**
 * Processes all response interceptors sequentially.
 *
 * Each interceptor receives the response from the previous interceptor,
 * allowing for composition and transformation. If an interceptor throws
 * an error, the pipeline stops and the error is propagated.
 *
 * @param response - Initial response object
 * @returns Processed response after all interceptors
 */
export async function processResponseInterceptors(response: Response): Promise<Response> {
  let processedResponse = response;

  for (const interceptor of responseInterceptors) {
    try {
      processedResponse = await interceptor(processedResponse);
    } catch (error) {
      logger.error('Response interceptor failed', {
        component: 'InterceptorPipeline',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: response.status,
        url: response.url,
      });
      throw error;
    }
  }

  return processedResponse;
}

// ============================================================================
// Interceptor Utilities
// ============================================================================

/**
 * Creates a conditional interceptor that only runs when a condition is met.
 *
 * @param condition - Function that determines if the interceptor should run
 * @param interceptor - The interceptor to conditionally execute
 * @returns A new interceptor that conditionally executes
 */
export function conditionalRequestInterceptor(
  condition: (config: RequestInit & { url: string }) => boolean,
  interceptor: RequestInterceptor
): RequestInterceptor {
  return async config => {
    if (condition(config)) {
      return interceptor(config);
    }
    return config;
  };
}

/**
 * Creates a conditional response interceptor that only runs when a condition is met.
 *
 * @param condition - Function that determines if the interceptor should run
 * @param interceptor - The interceptor to conditionally execute
 * @returns A new interceptor that conditionally executes
 */
export function conditionalResponseInterceptor(
  condition: (response: Response) => boolean,
  interceptor: ResponseInterceptor
): ResponseInterceptor {
  return async response => {
    if (condition(response)) {
      return interceptor(response);
    }
    return response;
  };
}

/**
 * Combines multiple request interceptors into a single interceptor.
 * The interceptors are executed in the order they are provided.
 *
 * @param interceptors - Array of interceptors to combine
 * @returns A single interceptor that executes all provided interceptors
 */
export function combineRequestInterceptors(
  ...interceptors: RequestInterceptor[]
): RequestInterceptor {
  return async config => {
    let result = config;
    for (const interceptor of interceptors) {
      result = await interceptor(result);
    }
    return result;
  };
}

/**
 * Combines multiple response interceptors into a single interceptor.
 * The interceptors are executed in the order they are provided.
 *
 * @param interceptors - Array of interceptors to combine
 * @returns A single interceptor that executes all provided interceptors
 */
export function combineResponseInterceptors(
  ...interceptors: ResponseInterceptor[]
): ResponseInterceptor {
  return async response => {
    let result = response;
    for (const interceptor of interceptors) {
      result = await interceptor(result);
    }
    return result;
  };
}

// ============================================================================
// Interceptor Registration API
// ============================================================================

/**
 * Adds a request interceptor to the pipeline.
 * The interceptor will be executed for all future requests.
 *
 * @param interceptor - The interceptor to add
 * @param position - Optional position to insert the interceptor (default: end)
 */
export function addRequestInterceptor(interceptor: RequestInterceptor, position?: number): void {
  if (position !== undefined) {
    requestInterceptors.splice(position, 0, interceptor);
  } else {
    requestInterceptors.push(interceptor);
  }
}

/**
 * Adds a response interceptor to the pipeline.
 * The interceptor will be executed for all future responses.
 *
 * @param interceptor - The interceptor to add
 * @param position - Optional position to insert the interceptor (default: end)
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor, position?: number): void {
  if (position !== undefined) {
    responseInterceptors.splice(position, 0, interceptor);
  } else {
    responseInterceptors.push(interceptor);
  }
}

/**
 * Removes a request interceptor from the pipeline.
 *
 * @param interceptor - The interceptor to remove
 */
export function removeRequestInterceptor(interceptor: RequestInterceptor): void {
  const index = requestInterceptors.indexOf(interceptor);
  if (index > -1) {
    requestInterceptors.splice(index, 1);
  }
}

/**
 * Removes a response interceptor from the pipeline.
 *
 * @param interceptor - The interceptor to remove
 */
export function removeResponseInterceptor(interceptor: ResponseInterceptor): void {
  const index = responseInterceptors.indexOf(interceptor);
  if (index > -1) {
    responseInterceptors.splice(index, 1);
  }
}

/**
 * Clears all request interceptors.
 * Use with caution as this will remove all interceptors including built-in ones.
 */
export function clearRequestInterceptors(): void {
  requestInterceptors.length = 0;
}

/**
 * Clears all response interceptors.
 * Use with caution as this will remove all interceptors including built-in ones.
 */
export function clearResponseInterceptors(): void {
  responseInterceptors.length = 0;
}

// ============================================================================
// Circuit Breaker Exports
// ============================================================================

/**
 * Export circuit breaker instance and stats for monitoring and manual control
 */
export { circuitBreaker, getCircuitBreakerStats };
