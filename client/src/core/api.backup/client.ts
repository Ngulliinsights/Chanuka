// Main API Client with HTTP Methods, Retry Logic, and Caching
// Based on the consolidated API client design specifications

import { globalCache, CacheKeyGenerator } from './cache';
import { globalConfig } from './config';
import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';
import {
  ApiRequest,
  ApiResponse,
  RequestOptions,
  ClientConfig,
  UnifiedApiClient
} from './types';

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

// Circuit Breaker for fault tolerance
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000,
    private readonly successThreshold: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw ErrorFactory.createNetworkError(
          ErrorCode.NETWORK_SERVER_ERROR,
          'Circuit breaker is OPEN'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
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

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.headers = { ...config.headers };
    this.circuitBreaker = new CircuitBreaker();
  }

  // Core HTTP Methods
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

  // Main request method with all features
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check cache first for GET requests
      if (method === 'GET') {
        const cacheKey = CacheKeyGenerator.generate(endpoint, options?.params, method);
        const cachedData = await globalCache.get<T>(cacheKey);

        if (cachedData !== null) {
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
      }

      // Create request object
      let request: ApiRequest = {
        id: requestId,
        method: method as any,
        url: this.buildUrl(endpoint, options?.params),
        headers: { ...this.headers, ...options?.headers },
        body: data,
        timeout: options?.timeout || this.timeout,
        timestamp: new Date().toISOString()
      };

      // Apply request interceptors
      for (const interceptor of this.requestInterceptors) {
        request = await interceptor.intercept(request);
      }

      // Execute request with circuit breaker and retry logic
      const response = await this.circuitBreaker.execute(() =>
        this.executeWithRetry(request, options?.retry)
      );

      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor.intercept(processedResponse);
      }

      // Cache successful GET responses
      if (method === 'GET' && processedResponse.status >= 200 && processedResponse.status < 300) {
        const cacheKey = CacheKeyGenerator.generate(endpoint, options?.params, method);
        await globalCache.set(cacheKey, processedResponse.data, options?.cache);
      }

      return processedResponse;
    } catch (error) {
      // Clean up active request
      this.activeRequests.delete(requestId);

      // Handle error
      await globalErrorHandler.handleError(error as Error, {
        component: 'api-client',
        operation: 'request',
        requestId,
        method,
        endpoint
      });

      // Return error response
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
  }

  // Execute request with retry logic
  private async executeWithRetry(
    request: ApiRequest,
    retryConfig?: { maxRetries?: number; baseDelay?: number; maxDelay?: number; backoffMultiplier?: number }
  ): Promise<ApiResponse> {
    const config = {
      maxRetries: retryConfig?.maxRetries || globalConfig.get('api').retry.maxRetries,
      baseDelay: retryConfig?.baseDelay || globalConfig.get('api').retry.baseDelay,
      maxDelay: retryConfig?.maxDelay || globalConfig.get('api').retry.maxDelay,
      backoffMultiplier: retryConfig?.backoffMultiplier || globalConfig.get('api').retry.backoffMultiplier
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(request);

        // Don't retry on successful responses or client errors
        if (response.status < 500 && response.status !== 429) {
          return response;
        }

        // If this is the last attempt, return the response
        if (attempt === config.maxRetries) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (!this.isRetryableError(error as Error) || attempt === config.maxRetries) {
          throw error;
        }
      }

      // Wait before retrying
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  // Execute single HTTP request
  private async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    const controller = new AbortController();
    this.activeRequests.set(request.id, controller);

    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
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

      const responseData = await this.parseResponse(response);

      return {
        id: this.generateRequestId(),
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: this.headersToObject(response.headers),
        data: responseData,
        timestamp: new Date().toISOString(),
        duration: 0, // Will be set by caller
        cached: false,
        fromFallback: false
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(request.id);

      if (error instanceof Error && error.name === 'AbortError') {
        throw ErrorFactory.createNetworkError(
          ErrorCode.NETWORK_TIMEOUT,
          'Request timeout'
        );
      }

      throw error;
    }
  }

  // Service Management
  registerService(name: string, service: any): void {
    // Implementation would register service with registry
    console.log(`Registered service: ${name}`);
  }

  getService<T>(name: string): T {
    // Implementation would get service from registry
    throw new Error(`Service ${name} not found`);
  }

  // Configuration
  configure(config: ClientConfig): void {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.headers = { ...this.headers, ...config.headers };
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

  // Lifecycle
  async initialize(): Promise<void> {
    // Initialize interceptors, circuit breaker, etc.
    console.log('API Client initialized');
  }

  cleanup(): void {
    // Cancel all active requests
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();

    // Clean up interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    console.log('API Client cleaned up');
  }

  // Interceptor management
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Utility methods
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    if (!params) return url;

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

    if (contentType?.includes('application/json')) {
      return response.json();
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

  private isRetryableError(error: Error): boolean {
    // Retry on network errors, timeouts, and server errors
    return error.name === 'TypeError' || // Network errors
           error.name === 'TimeoutError' ||
           error.message.includes('5') || // 5xx errors
           error.message.includes('429'); // Rate limiting
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default interceptors
export class AuthRequestInterceptor implements RequestInterceptor {
  constructor(private getToken: () => string | null) {}

  async intercept(request: ApiRequest): Promise<ApiRequest> {
    const token = this.getToken();
    if (token) {
      request.headers = {
        ...request.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    return request;
  }
}

export class LoggingResponseInterceptor implements ResponseInterceptor {
  async intercept(response: ApiResponse): Promise<ApiResponse> {
    console.log(`API Response: ${response.status} ${response.statusText} (${response.duration}ms)`);
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