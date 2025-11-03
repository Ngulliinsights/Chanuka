/**
 * API Interceptors Module
 *
 * Provides comprehensive request/response interceptor system for API management,
 * including authentication, logging, error handling, and resilience patterns.
 */

import { logger } from '../../observability/logging';

// ==================== Type Definitions ====================

export interface ApiRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, unknown>;
}

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  duration: number;
  cached?: boolean;
  metadata?: Record<string, unknown>;
}

export interface HttpError {
  message: string;
  code: string;
  status?: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export interface InterceptorContext {
  requestId: string;
  attempt: number;
  startTime: number;
  metadata: Record<string, unknown>;
}

export interface RequestInterceptor {
  name: string;
  priority?: number;
  intercept: (request: ApiRequest, context: InterceptorContext) => Promise<ApiRequest> | ApiRequest;
}

export interface ResponseInterceptor {
  name: string;
  priority?: number;
  intercept: <T>(
    response: HttpResponse<T>,
    request: ApiRequest,
    context: InterceptorContext
  ) => Promise<HttpResponse<T>> | HttpResponse<T>;
}

export interface ErrorInterceptor {
  name: string;
  priority?: number;
  intercept: (
    error: HttpError,
    request: ApiRequest,
    context: InterceptorContext
  ) => Promise<HttpError | null> | HttpError | null;
}

// ==================== Built-in Interceptors ====================

/**
 * Authentication interceptor
 */
export const createAuthInterceptor = (options: {
  type: 'bearer' | 'basic' | 'api-key' | 'custom';
  token?: string;
  username?: string;
  password?: string;
  headerName?: string;
  tokenProvider?: () => Promise<string> | string;
}): RequestInterceptor => ({
  name: 'auth',
  priority: 100, // High priority
  intercept: async (request, context) => {
    const headers = { ...request.headers };

    switch (options.type) {
      case 'bearer':
        const token = typeof options.tokenProvider === 'function'
          ? await options.tokenProvider()
          : options.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;

      case 'basic':
        if (options.username && options.password) {
          const credentials = btoa(`${options.username}:${options.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api-key':
        const apiKey = typeof options.tokenProvider === 'function'
          ? await options.tokenProvider()
          : options.token;
        if (apiKey && options.headerName) {
          headers[options.headerName] = apiKey;
        }
        break;

      case 'custom':
        if (options.tokenProvider) {
          const customToken = await options.tokenProvider();
          headers['Authorization'] = customToken;
        }
        break;
    }

    return { ...request, headers };
  },
});

/**
 * Request logging interceptor
 */
export const createLoggingInterceptor = (options: {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  sensitiveHeaders?: string[];
  maxBodyLogSize?: number;
} = {}): { request: RequestInterceptor; response: ResponseInterceptor; error: ErrorInterceptor } => {

  const sanitizeHeaders = (headers: Record<string, string>) => {
    const sensitive = options.sensitiveHeaders || ['authorization', 'x-api-key', 'cookie'];
    const sanitized = { ...headers };
    sensitive.forEach(header => {
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]';
      }
    });
    return sanitized;
  };

  const truncateBody = (body: any) => {
    const maxSize = options.maxBodyLogSize || 1000;
    if (typeof body === 'string' && body.length > maxSize) {
      return body.substring(0, maxSize) + '...';
    }
    return body;
  };

  return {
    request: {
      name: 'request-logging',
      priority: 10,
      intercept: (request, context) => {
        if (options.logRequests !== false) {
          logger.info('API Request', {
            requestId: context.requestId,
            method: request.method,
            url: request.url,
            headers: sanitizeHeaders(request.headers),
            body: request.body ? truncateBody(request.body) : undefined,
            attempt: context.attempt,
            metadata: context.metadata,
          });
        }
        return request;
      },
    },

    response: {
      name: 'response-logging',
      priority: 10,
      intercept: (response, request, context) => {
        if (options.logResponses !== false) {
          logger.info('API Response', {
            requestId: context.requestId,
            method: request.method,
            url: request.url,
            status: response.status,
            statusText: response.statusText,
            duration: response.duration,
            headers: sanitizeHeaders(response.headers),
            data: truncateBody(response.data),
            cached: response.cached,
            attempt: context.attempt,
            metadata: { ...context.metadata, ...response.metadata },
          });
        }
        return response;
      },
    },

    error: {
      name: 'error-logging',
      priority: 10,
      intercept: (error, request, context) => {
        if (options.logErrors !== false) {
          logger.error('API Error', {
            requestId: context.requestId,
            method: request.method,
            url: request.url,
            error: {
              message: error.message,
              code: error.code,
              status: error.status,
              details: error.details,
              retryable: error.retryable,
            },
            attempt: context.attempt,
            duration: Date.now() - context.startTime,
            metadata: context.metadata,
          });
        }
        return error;
      },
    },
  };
};

/**
 * Request ID interceptor
 */
export const createRequestIdInterceptor = (): RequestInterceptor => ({
  name: 'request-id',
  priority: 1000, // Highest priority
  intercept: (request, context) => {
    const requestId = context.requestId;
    return {
      ...request,
      headers: {
        ...request.headers,
        'X-Request-ID': requestId,
      },
      metadata: {
        ...request.metadata,
        requestId,
      },
    };
  },
});

/**
 * User agent interceptor
 */
export const createUserAgentInterceptor = (user_agent: string): RequestInterceptor => ({
  name: 'user-agent',
  priority: 50,
  intercept: (request) => ({
    ...request,
    headers: {
      ...request.headers,
      'User-Agent': user_agent,
    },
  }),
});

/**
 * Timeout interceptor
 */
export const createTimeoutInterceptor = (defaultTimeout: number): RequestInterceptor => ({
  name: 'timeout',
  priority: 50,
  intercept: (request) => ({
    ...request,
    timeout: request.timeout ?? defaultTimeout,
  }),
});

/**
 * Retry interceptor with exponential backoff
 */
export const createRetryInterceptor = (options: {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
} = {}): ErrorInterceptor => {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const retryableStatusCodes = options.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504];
  const retryableErrors = options.retryableErrors ?? ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

  return {
    name: 'retry',
    priority: 200,
    intercept: async (error, request, context) => {
      const shouldRetry =
        context.attempt < maxRetries &&
        (retryableStatusCodes.includes(error.status || 0) ||
         retryableErrors.some(code => error.code?.includes(code)));

      if (shouldRetry) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, context.attempt - 1),
          maxDelay
        );

        logger.warn(`Retrying API request in ${delay}ms`, {
          requestId: context.requestId,
          attempt: context.attempt,
          maxRetries,
          delay,
          error: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return null; // Continue with retry
      }

      return error; // No retry, propagate error
    },
  };
};

/**
 * Response caching interceptor
 */
export const createCacheInterceptor = (options: {
  cache: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
  };
  ttl?: number;
  cacheableStatusCodes?: number[];
  cacheableMethods?: string[];
  keyGenerator?: (request: ApiRequest) => string;
} = { cache: { get: async () => null, set: async () => {} } }): {
  request: RequestInterceptor;
  response: ResponseInterceptor;
} => {

  const cacheableStatusCodes = options.cacheableStatusCodes ?? [200, 201, 202];
  const cacheableMethods = options.cacheableMethods ?? ['GET'];
  const keyGenerator = options.keyGenerator ?? ((request) => `${request.method}:${request.url}`);

  return {
    request: {
      name: 'cache-request',
      priority: 75,
      intercept: async (request, context) => {
        if (cacheableMethods.includes(request.method)) {
          const cacheKey = keyGenerator(request);
          try {
            const cached = await options.cache.get(cacheKey);
            if (cached) {
              // Return cached response directly
              context.metadata.cached = true;
              context.metadata.cacheKey = cacheKey;
              // This would need to be handled by the client
            }
          } catch (error) {
            logger.warn('Cache read error', { error: (error as Error).message, cacheKey });
          }
        }
        return request;
      },
    },

    response: {
      name: 'cache-response',
      priority: 75,
      intercept: async (response, request, context) => {
        if (cacheableMethods.includes(request.method) &&
            cacheableStatusCodes.includes(response.status)) {
          const cacheKey = keyGenerator(request);
          try {
            await options.cache.set(cacheKey, response, options.ttl);
            response.metadata = {
              ...response.metadata,
              cached: false,
              cacheKey,
            };
          } catch (error) {
            logger.warn('Cache write error', { error: (error as Error).message, cacheKey });
          }
        }
        return response;
      },
    },
  };
};

/**
 * Rate limiting interceptor
 */
export const createRateLimitInterceptor = (options: {
  limiter: {
    check: (key: string) => Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
  };
  keyGenerator?: (request: ApiRequest) => string;
  skipOnFailure?: boolean;
}): RequestInterceptor => ({
  name: 'rate-limit',
  priority: 90,
  intercept: async (request, context) => {
    const key = options.keyGenerator ? options.keyGenerator(request) : request.url;

    try {
      const result = await options.limiter.check(key);

      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Resets at ${new Date(result.resetTime).toISOString()}`);
      }

      context.metadata.rateLimit = {
        remaining: result.remaining,
        resetTime: result.resetTime,
      };

    } catch (error) {
      if (!options.skipOnFailure) {
        throw error;
      }
      logger.warn('Rate limit check failed', { error: (error as Error).message, key });
    }

    return request;
  },
});

// ==================== Interceptor Manager ====================

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    this.requestInterceptors.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    this.responseInterceptors.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
    this.errorInterceptors.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove interceptors by name
   */
  removeInterceptor(name: string): void {
    this.requestInterceptors = this.requestInterceptors.filter(i => i.name !== name);
    this.responseInterceptors = this.responseInterceptors.filter(i => i.name !== name);
    this.errorInterceptors = this.errorInterceptors.filter(i => i.name !== name);
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(request: ApiRequest, context: InterceptorContext): Promise<ApiRequest> {
    let currentRequest = request;
    for (const interceptor of this.requestInterceptors) {
      try {
        currentRequest = await interceptor.intercept(currentRequest, context);
      } catch (error) {
        logger.error(`Request interceptor '${interceptor.name}' failed`, { error: (error as Error).message });
        throw error;
      }
    }
    return currentRequest;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors<T>(
    response: HttpResponse<T>,
    request: ApiRequest,
    context: InterceptorContext
  ): Promise<HttpResponse<T>> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      try {
        currentResponse = await interceptor.intercept(currentResponse, request, context);
      } catch (error) {
        logger.error(`Response interceptor '${interceptor.name}' failed`, { error: (error as Error).message });
        throw error;
      }
    }
    return currentResponse;
  }

  /**
   * Apply error interceptors
   */
  async applyErrorInterceptors(
    error: HttpError,
    request: ApiRequest,
    context: InterceptorContext
  ): Promise<HttpError | null> {
    let currentError = error;
    for (const interceptor of this.errorInterceptors) {
      try {
        const result = await interceptor.intercept(currentError, request, context);
        if (result === null) {
          // Interceptor handled the error (e.g., retry)
          return null;
        }
        currentError = result;
      } catch (interceptorError) {
        logger.error(`Error interceptor '${interceptor.name}' failed`, {
          error: (interceptorError as Error).message,
          originalError: currentError.message
        });
        // Continue with other interceptors
      }
    }
    return currentError;
  }

  /**
   * Get interceptor counts
   */
  getInterceptorCounts(): { request: number; response: number; error: number } {
    return {
      request: this.requestInterceptors.length,
      response: this.responseInterceptors.length,
      error: this.errorInterceptors.length,
    };
  }
}

// ==================== Default Interceptor Sets ====================

export const createDefaultInterceptors = (options: {
  user_agent?: string;
  timeout?: number;
  enableLogging?: boolean;
  enableRequestId?: boolean;
} = {}): InterceptorManager => {
  const manager = new InterceptorManager();

  if (options.enableRequestId !== false) {
    manager.addRequestInterceptor(createRequestIdInterceptor());
  }

  if (options.user_agent) {
    manager.addRequestInterceptor(createUserAgentInterceptor(options.user_agent));
  }

  if (options.timeout) {
    manager.addRequestInterceptor(createTimeoutInterceptor(options.timeout));
  }

  if (options.enableLogging !== false) {
    const logging = createLoggingInterceptor();
    manager.addRequestInterceptor(logging.request);
    manager.addResponseInterceptor(logging.response);
    manager.addErrorInterceptor(logging.error);
  }

  return manager;
};
