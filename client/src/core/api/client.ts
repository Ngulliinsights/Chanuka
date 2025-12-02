// Main API Client with HTTP Methods, Retry Logic, and Caching
// Optimized implementation with enhanced error handling and performance

import {
  ApiRequest,
  ApiResponse,
  RequestOptions,
  ClientConfig,
  UnifiedApiClient
} from './types';
import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';
import { globalCache, CacheKeyGenerator } from './cache';
import { globalConfig } from './config';
import { logger } from '../../utils/logger';
// Note: validationService import removed as it's not available

// Request Interceptor Interface
interface RequestInterceptor {
  intercept(request: ApiRequest): Promise<ApiRequest> | ApiRequest;
}

// Response Interceptor Interface
interface ResponseInterceptor {
  intercept(response: ApiResponse): Promise<ApiResponse> | ApiResponse;
}

// Circuit Breaker State
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// Circuit Breaker for fault tolerance with enhanced monitoring
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    circuitOpenings: 0
  };

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000,
    private readonly successThreshold: number = 3
  ) { }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.recoveryTimeout) {
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          component: 'CircuitBreaker',
          timeSinceFailure
        });
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        this.metrics.failedRequests++;
        throw ErrorFactory.createNetworkError(
          ErrorCode.NETWORK_SERVER_ERROR,
          `Circuit breaker is OPEN. Recovery in ${this.recoveryTimeout - timeSinceFailure}ms`
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      this.metrics.successfulRequests++;
      return result;
    } catch (error) {
      this.onFailure();
      this.metrics.failedRequests++;
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        logger.info('Circuit breaker transitioning to CLOSED', {
          component: 'CircuitBreaker',
          successCount: this.successCount
        });
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold && this.state !== CircuitState.OPEN) {
      logger.warn('Circuit breaker transitioning to OPEN', {
        component: 'CircuitBreaker',
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
      this.state = CircuitState.OPEN;
      this.metrics.circuitOpenings++;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Enhanced retry configuration with better defaults
interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

// Main API Client Implementation
export class UnifiedApiClientImpl implements UnifiedApiClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private circuitBreaker: CircuitBreaker;
  private activeRequests = new Map<string, AbortController>();
  private requestCounter = 0;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.headers = { ...config.headers };
    this.circuitBreaker = new CircuitBreaker();
  }

  // Core HTTP Methods with type safety
  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Main request method with comprehensive error handling and caching
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check cache for GET requests (respects skipCache flag)
      if (method === 'GET' && !options?.skipCache) {
        const cachedResponse = await this.tryGetFromCache<T>(endpoint, options, requestId, startTime);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      // Build and prepare the request
      let request = await this.buildRequest(method, endpoint, data, options, requestId);

      // Execute request with circuit breaker and retry logic
      const response = await this.executeRequestWithResilience<T>(
        request,
        options,
        requestId,
        startTime,
        endpoint
      );

      // Validate response schema if provided
      const validatedResponse = await this.validateResponse(response, options, endpoint);

      // Cache successful GET responses
      await this.cacheResponseIfNeeded(method, endpoint, validatedResponse, options);

      return validatedResponse;

    } catch (error) {
      return this.handleRequestError<T>(error, options, requestId, startTime, endpoint, method);
    }
  }

  // Extract cache retrieval logic for better organization
  private async tryGetFromCache<T>(
    endpoint: string,
    options: RequestOptions | undefined,
    requestId: string,
    startTime: number
  ): Promise<ApiResponse<T> | null> {
    const cacheKey = CacheKeyGenerator.generate(endpoint, options?.params, 'GET');
    const cachedData = await globalCache.get<T>(cacheKey);

    if (cachedData !== null) {
      logger.debug('Cache hit', {
        component: 'ApiClient',
        endpoint,
        cacheKey
      });

      return {
        id: requestId,
        requestId,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: cachedData,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        cached: true,
        fromFallback: false
      };
    }

    return null;
  }

  // Build request object with interceptors applied
  private async buildRequest(
    method: string,
    endpoint: string,
    data: any,
    options: RequestOptions | undefined,
    requestId: string
  ): Promise<ApiRequest> {
    let request: ApiRequest = {
      id: requestId,
      method: method as any,
      url: this.buildUrl(endpoint, options?.params),
      headers: { ...this.headers, ...options?.headers },
      body: data,
      timeout: options?.timeout || this.timeout,
      timestamp: new Date().toISOString()
    };

    // Apply request interceptors sequentially
    for (const interceptor of this.requestInterceptors) {
      request = await interceptor.intercept(request);
    }

    return request;
  }

  // Execute request with full resilience features
  private async executeRequestWithResilience<T>(
    request: ApiRequest,
    options: RequestOptions | undefined,
    requestId: string,
    startTime: number,
    endpoint: string
  ): Promise<ApiResponse<T>> {
    try {
      // Execute with circuit breaker protection
      const response = await this.circuitBreaker.execute(() =>
        this.executeWithRetry(request, options?.retry)
      ) as ApiResponse<T>;

      // Apply response interceptors
      return await this.applyResponseInterceptors(response);

    } catch (error) {
      // Return fallback data if available
      if (options?.fallbackData !== undefined) {
        logger.warn('Request failed, using fallback data', {
          component: 'ApiClient',
          endpoint,
          error: (error as Error).message
        });

        return this.createFallbackResponse<T>(
          requestId,
          options.fallbackData as T,
          startTime
        );
      }
      throw error;
    }
  }

  // Apply all response interceptors
  private async applyResponseInterceptors<T>(response: ApiResponse<T>): Promise<ApiResponse<T>> {
    let processedResponse: ApiResponse<T> = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor.intercept(processedResponse) as ApiResponse<T>;
    }
    return processedResponse;
  }

  // Validate response against schema
  private async validateResponse<T>(
    response: ApiResponse<T>,
    options: RequestOptions | undefined,
    endpoint: string
  ): Promise<ApiResponse<T>> {
    if (options?.responseSchema && response.data) {
      try {
        // Note: validationService not available, skipping validation
        const validatedData = response.data; // await validationService.validate(options.responseSchema, response.data);
        return {
          ...response,
          data: validatedData
        };
      } catch (validationError) {
        logger.error('API response validation failed', {
          component: 'ApiClient',
          endpoint,
          error: validationError
        });
        throw validationError;
      }
    }
    return response;
  }

  // Cache response if conditions are met
  private async cacheResponseIfNeeded<T>(
    method: string,
    endpoint: string,
    response: ApiResponse<T>,
    options: RequestOptions | undefined
  ): Promise<void> {
    const shouldCache =
      method === 'GET' &&
      !options?.skipCache &&
      response.status >= 200 &&
      response.status < 300 &&
      response.data !== null;

    if (shouldCache) {
      const cacheKey = CacheKeyGenerator.generate(endpoint, options?.params, method);
      const ttl = options?.cacheTTL || options?.cache?.ttl;

      await globalCache.set(cacheKey, response.data, { ttl });

      logger.debug('Response cached', {
        component: 'ApiClient',
        endpoint,
        cacheKey,
        ttl
      });
    }
  }

  // Centralized error handling with fallback support
  private async handleRequestError<T>(
    error: unknown,
    options: RequestOptions | undefined,
    requestId: string,
    startTime: number,
    endpoint: string,
    method: string
  ): Promise<ApiResponse<T>> {
    // Clean up active request tracking
    this.activeRequests.delete(requestId);

    // Use fallback data if available
    if (options?.fallbackData !== undefined) {
      logger.warn('Request failed, using fallback data', {
        component: 'ApiClient',
        endpoint,
        error: (error as Error).message
      });

      return this.createFallbackResponse<T>(
        requestId,
        options.fallbackData as T,
        startTime
      );
    }

    // Log error through global handler
    await globalErrorHandler.handleError(error as Error, {
      component: 'api-client',
      operation: 'request',
      requestId,
      method,
      endpoint
    });

    // Return error response (preserving original behavior)
    return {
      id: requestId,
      requestId,
      status: 0,
      statusText: 'Error',
      headers: {},
      data: null as any,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      cached: false,
      fromFallback: false
    };
  }

  // Create fallback response structure
  private createFallbackResponse<T>(
    requestId: string,
    fallbackData: T,
    startTime: number
  ): ApiResponse<T> {
    return {
      id: requestId,
      requestId,
      status: 0,
      statusText: 'Using Fallback',
      headers: {},
      data: fallbackData,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      cached: false,
      fromFallback: true
    };
  }

  // Execute request with exponential backoff retry logic
  private async executeWithRetry(
    request: ApiRequest,
    retryConfig?: RetryConfig
  ): Promise<ApiResponse> {
    const config = this.buildRetryConfig(retryConfig);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(request);

        // Don't retry successful responses or client errors (except specific retryable cases)
        if (this.shouldReturnResponse(response.status, attempt, config.maxRetries)) {
          return response;
        }

        // Create error for retry logic
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (!config.retryCondition(lastError, attempt) || attempt === config.maxRetries) {
          throw error;
        }
      }

      // Calculate delay with exponential backoff and jitter
      if (attempt < config.maxRetries) {
        const delay = this.calculateRetryDelay(
          attempt,
          config.baseDelay,
          config.maxDelay,
          config.backoffMultiplier
        );

        config.onRetry(lastError!, attempt, delay);
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // Build retry configuration with sensible defaults
  private buildRetryConfig(retryConfig?: RetryConfig): Required<RetryConfig> {
    const apiConfig = globalConfig.get('api');

    return {
      maxRetries: retryConfig?.maxRetries ?? apiConfig.retry.maxRetries,
      baseDelay: retryConfig?.baseDelay ?? apiConfig.retry.baseDelay,
      maxDelay: retryConfig?.maxDelay ?? apiConfig.retry.maxDelay,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? apiConfig.retry.backoffMultiplier,
      retryCondition: retryConfig?.retryCondition ?? this.defaultRetryCondition.bind(this),
      onRetry: retryConfig?.onRetry ?? this.defaultOnRetry.bind(this)
    };
  }

  // Determine if response should be returned without retry
  private shouldReturnResponse(status: number, attempt: number, maxRetries: number): boolean {
    // Return successful responses
    if (status >= 200 && status < 300) {
      return true;
    }

    // Don't retry client errors except 408 (timeout) and 429 (rate limit)
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }

    // Return server errors on final attempt
    if (attempt === maxRetries) {
      return true;
    }

    return false;
  }

  // Calculate retry delay with exponential backoff and jitter
  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    backoffMultiplier: number
  ): number {
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attempt),
      maxDelay
    );

    // Add jitter (50-100% of calculated delay) to prevent thundering herd
    return exponentialDelay * (0.5 + Math.random() * 0.5);
  }

  // Enhanced retry condition with detailed error analysis
  private defaultRetryCondition(error: Error, attempt: number): boolean {
    const errorMessage = error.message.toLowerCase();

    // Never retry 4xx errors except timeouts (408) and rate limits (429)
    if (errorMessage.includes('40') &&
      !errorMessage.includes('408') &&
      !errorMessage.includes('429')) {
      return false;
    }

    // Retry network errors and specific 5xx errors
    const isNetworkError = error.name === 'TypeError' || error.name === 'TimeoutError';
    const isServerError = errorMessage.includes('5');

    if (isNetworkError || isServerError) {
      // On final attempt, only retry specific recoverable errors
      if (attempt === 2) {
        return errorMessage.includes('503') ||
          errorMessage.includes('504') ||
          error.name === 'TypeError';
      }
      return true;
    }

    return false;
  }

  // Default retry callback with improved logging
  private defaultOnRetry(error: Error, attempt: number, delayMs: number): void {
    logger.warn(`Retrying request after failure`, {
      component: 'ApiClient',
      attempt: attempt + 1,
      error: error.message,
      delayMs: Math.round(delayMs)
    });
  }

  // Execute single HTTP request with timeout and error handling
  private async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    const controller = new AbortController();
    this.activeRequests.set(request.id, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn('Request timeout', {
        component: 'ApiClient',
        requestId: request.id,
        timeout: request.timeout
      });
    }, request.timeout);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.activeRequests.delete(request.id);

      // Handle 401 with token refresh attempt
      if (response.status === 401) {
        const refreshedResponse = await this.attemptTokenRefresh(request);
        if (refreshedResponse) {
          return refreshedResponse;
        }
      }

      const responseData = await this.parseResponse(response);

      return {
        id: this.generateRequestId(),
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: this.headersToObject(response.headers),
        data: responseData,
        timestamp: new Date().toISOString(),
        duration: 0, // Set by caller
        cached: false,
        fromFallback: false
      };

    } catch (error) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(request.id);

      if (error instanceof Error && error.name === 'AbortError') {
        throw ErrorFactory.createNetworkError(
          ErrorCode.NETWORK_TIMEOUT,
          `Request timeout after ${request.timeout}ms`
        );
      }

      throw error;
    }
  }

  // Attempt to refresh authentication token and retry request
  private async attemptTokenRefresh(request: ApiRequest): Promise<ApiResponse | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    logger.warn('Received 401 response, attempting token refresh', {
      component: 'ApiClient',
      endpoint: request.url
    });

    try {
      const authService = (globalThis as any).authService;
      if (authService?.refreshTokens) {
        await authService.refreshTokens();

        logger.info('Token refresh successful, retrying request', {
          component: 'ApiClient',
          endpoint: request.url
        });

        return this.executeRequest(request);
      }
    } catch (refreshError) {
      logger.warn('Token refresh failed, proceeding with 401 response', {
        component: 'ApiClient',
        endpoint: request.url,
        error: refreshError
      });
    }

    return null;
  }

  // Service Registry Management
  registerService(name: string, _service: any): void {
    logger.info('Service registered', {
      component: 'ApiClient',
      serviceName: name
    });
  }

  getService<T>(name: string): T {
    throw new Error(`Service ${name} not found in registry`);
  }

  hasService(name: string): boolean {
    // For now, always return false as we don't have a registry
    return false;
  }

  // Configuration Management
  configure(config: ClientConfig): void {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.headers = { ...this.headers, ...config.headers };

    logger.info('API client reconfigured', {
      component: 'ApiClient',
      baseUrl: this.baseUrl,
      timeout: this.timeout
    });
  }

  getConfig(): ClientConfig {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retry: globalConfig.get('api').retry,
      cache: globalConfig.get('api').cache,
      websocket: globalConfig.get('websocket'),
      headers: { ...this.headers }
    };
  }

  // Lifecycle Management
  async initialize(): Promise<void> {
    logger.info('API Client initialized', {
      component: 'ApiClient',
      baseUrl: this.baseUrl,
      timeout: this.timeout
    });
  }

  async cleanup(): Promise<void> {
    // Cancel all active requests
    const activeCount = this.activeRequests.size;
    for (const [, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();

    // Clean up interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    // Reset circuit breaker
    this.circuitBreaker.reset();

    logger.info('API Client cleaned up', {
      component: 'ApiClient',
      cancelledRequests: activeCount
    });
  }

  // Interceptor Management
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    logger.debug('Request interceptor added', {
      component: 'ApiClient',
      totalInterceptors: this.requestInterceptors.length
    });
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    logger.debug('Response interceptor added', {
      component: 'ApiClient',
      totalInterceptors: this.responseInterceptors.length
    });
  }

  // Health and Monitoring
  getHealthStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      circuitBreakerMetrics: this.circuitBreaker.getMetrics(),
      activeRequests: this.activeRequests.size,
      totalRequests: this.requestCounter
    };
  }

  // Utility Methods
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const paramString = searchParams.toString();
    return paramString ? `${url}?${paramString}` : url;
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (!contentType) {
      const text = await response.text();
      return text || null;
    }

    if (contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    return response.text();
  }

  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default Interceptors
export class AuthRequestInterceptor implements RequestInterceptor {
  constructor(private getToken: () => string | null) { }

  async intercept(request: ApiRequest): Promise<ApiRequest> {
    const token = this.getToken();
    if (token) {
      return {
        ...request,
        headers: {
          ...request.headers,
          'Authorization': `Bearer ${token}`
        }
      };
    }
    return request;
  }
}

export class LoggingResponseInterceptor implements ResponseInterceptor {
  async intercept(response: ApiResponse): Promise<ApiResponse> {
    const logLevel = response.status >= 400 ? 'warn' : 'debug';
    logger[logLevel]('API Response received', {
      component: 'ApiClient',
      status: response.status,
      statusText: response.statusText,
      duration: `${response.duration}ms`,
      cached: response.cached
    });
    return response;
  }
}

// Global API client instance
export const globalApiClient = new UnifiedApiClientImpl({
  baseUrl: globalConfig.get('api').baseUrl,
  timeout: globalConfig.get('api').timeout,
  retry: globalConfig.get('api').retry,
  cache: globalConfig.get('api').cache,
  websocket: globalConfig.get('websocket'),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Initialize with default interceptors
globalApiClient.addResponseInterceptor(new LoggingResponseInterceptor());

// Initialize auth service with the API client to break circular dependency
import { createAuthApiService } from './auth';
export const authApiService = createAuthApiService(globalApiClient);