/**
 * Circuit Breaker API Client
 * 
 * Enhanced API client that integrates circuit breaker patterns with retry logic
 * and error correlation for robust external service communication.
 */

import { BaseError, ErrorDomain, ErrorSeverity } from '@client/utils/logger';
import { logger } from '@client/utils/logger';

import { processRequestInterceptors, processResponseInterceptors } from './interceptors';
import { RetryHandler, createRetryHandler, RetryConfig } from './retry-handler';

export interface CircuitBreakerClientConfig {
  serviceName: string;
  baseUrl?: string;
  timeout: number;
  retryConfig?: Partial<RetryConfig>;
  defaultHeaders?: Record<string, string>;
  correlationIdHeader?: string;
}

export interface RequestConfig extends RequestInit {
  url?: string;
  timeout?: number;
  correlationId?: string;
  skipCircuitBreaker?: boolean;
  skipRetry?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  correlationId?: string;
}

/**
 * Enhanced API client with circuit breaker and retry integration
 */
export class CircuitBreakerClient {
  private config: CircuitBreakerClientConfig;
  private retryHandler: RetryHandler;

  constructor(config: CircuitBreakerClientConfig) {
    this.config = {
      correlationIdHeader: 'X-Correlation-ID',
      ...config,
      timeout: config.timeout || 10000
    };

    this.retryHandler = createRetryHandler(
      this.config.serviceName,
      this.config.retryConfig
    );
  }

  /**
   * Makes an HTTP request with circuit breaker and retry logic
   */
  async request<T = unknown>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const correlationId = config.correlationId || this.generateCorrelationId();
    
    logger.debug('Making API request', {
      component: 'CircuitBreakerClient',
      serviceName: this.config.serviceName,
      url: fullUrl,
      method: config.method || 'GET',
      correlationId
    });

    // Skip circuit breaker and retry if requested
    if (config.skipCircuitBreaker && config.skipRetry) {
      return this.makeDirectRequest<T>(fullUrl, config, correlationId);
    }

    // Use retry handler which will work with circuit breaker interceptors
    const result = await this.retryHandler.execute(async () => {
      return this.makeDirectRequest<T>(fullUrl, config, correlationId);
    }, correlationId);

    if (result.success) {
      return result.data!;
    } else {
      throw result.error!;
    }
  }

  /**
   * Makes a direct HTTP request without retry logic
   */
  private async makeDirectRequest<T>(
    url: string,
    config: RequestConfig,
    correlationId: string
  ): Promise<ApiResponse<T>> {
    // Prepare request configuration
    const requestConfig: RequestInit & { url: string } = {
      url,
      method: config.method || 'GET',
      headers: {
        ...this.config.defaultHeaders,
        [this.config.correlationIdHeader!]: correlationId,
        ...config.headers
      },
      body: config.body,
      credentials: config.credentials || 'same-origin',
      mode: config.mode || 'cors',
      cache: config.cache || 'default',
      redirect: config.redirect || 'follow',
      referrerPolicy: config.referrerPolicy || 'strict-origin-when-cross-origin'
    };

    // Set up timeout
    const controller = new AbortController();
    const timeout = config.timeout || this.config.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestConfig.signal = controller.signal;

    try {
      // Process request interceptors (includes circuit breaker check)
      const processedConfig = config.skipCircuitBreaker 
        ? requestConfig 
        : await processRequestInterceptors(requestConfig);

      // Make the actual request
      const response = await fetch(processedConfig.url, processedConfig);
      
      clearTimeout(timeoutId);

      // Process response interceptors (includes circuit breaker recording)
      const processedResponse = config.skipCircuitBreaker
        ? response
        : await processResponseInterceptors(response);

      // Handle HTTP errors
      if (!processedResponse.ok) {
        const httpError = this.createHttpError(processedResponse, correlationId);
        
        // Record error for monitoring if in browser environment
        if (typeof window !== 'undefined') {
          import('./circuit-breaker-monitor').then(({ recordError }) => {
            recordError(httpError);
          }).catch(() => {
            // Ignore import errors in test environment
          });
        }
        
        throw httpError;
      }

      // Parse response data
      const data = await this.parseResponseData<T>(processedResponse);

      logger.debug('API request successful', {
        component: 'CircuitBreakerClient',
        serviceName: this.config.serviceName,
        url,
        status: processedResponse.status,
        correlationId
      });

      return {
        data,
        status: processedResponse.status,
        headers: processedResponse.headers,
        correlationId
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BaseError('Request timeout', {
          statusCode: 408,
          code: 'TIMEOUT_ERROR',
          domain: ErrorDomain.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          correlationId,
          context: {
            url,
            timeout,
            serviceName: this.config.serviceName
          },
          retryable: true
        });
      }

      if (error instanceof BaseError) {
        throw error;
      }

      // Handle network errors
      const networkError = new BaseError(
        error instanceof Error ? error.message : 'Network request failed',
        {
          statusCode: 0,
          code: 'NETWORK_ERROR',
          domain: ErrorDomain.NETWORK,
          severity: ErrorSeverity.HIGH,
          cause: error instanceof Error ? error : undefined,
          correlationId,
          context: {
            url,
            serviceName: this.config.serviceName
          },
          retryable: true
        }
      );

      // Record error for monitoring if in browser environment
      if (typeof window !== 'undefined') {
        import('./circuit-breaker-monitor').then(({ recordError }) => {
          recordError(networkError);
        }).catch(() => {
          // Ignore import errors in test environment
        });
      }

      throw networkError;
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get<T = unknown>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = unknown>(url: string, data?: unknown, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
  }

  async put<T = unknown>(url: string, data?: unknown, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
  }

  async patch<T = unknown>(url: string, data?: unknown, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
  }

  async delete<T = unknown>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * Utility methods
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (this.config.baseUrl) {
      const base = this.config.baseUrl.endsWith('/') 
        ? this.config.baseUrl.slice(0, -1) 
        : this.config.baseUrl;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${base}${cleanPath}`;
    }

    return path;
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `${this.config.serviceName}-${timestamp}-${random}`;
  }

  private createHttpError(response: Response, correlationId: string): BaseError {
    const isServerError = response.status >= 500;
    // const _isClientError = response.status >= 400 && response.status < 500;

    let domain = ErrorDomain.EXTERNAL_SERVICE;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    if (isServerError) {
      severity = ErrorSeverity.HIGH;
      retryable = true;
    } else if (response.status === 429) {
      // Rate limiting
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
    } else if (response.status === 401 || response.status === 403) {
      domain = ErrorDomain.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
    }

    return new BaseError(
      `HTTP ${response.status}: ${response.statusText}`,
      {
        statusCode: response.status,
        code: isServerError ? 'HTTP_SERVER_ERROR' : 'HTTP_CLIENT_ERROR',
        domain,
        severity,
        correlationId,
        context: {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
          serviceName: this.config.serviceName
        },
        retryable
      }
    );
  }

  private async parseResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.includes('text/')) {
      const text = await response.text();
      // Try to parse as JSON if it looks like JSON
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          return JSON.parse(text);
        } catch {
          return text as unknown as T;
        }
      }
      return text as unknown as T;
    }

    // For other content types, return as blob
    return await response.blob() as unknown as T;
  }

  /**
   * Configuration management
   */
  updateConfig(newConfig: Partial<CircuitBreakerClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.retryConfig) {
      this.retryHandler.updateConfig(newConfig.retryConfig);
    }

    logger.info('Circuit breaker client configuration updated', {
      component: 'CircuitBreakerClient',
      serviceName: this.config.serviceName,
      newConfig: this.config
    });
  }

  getConfig(): CircuitBreakerClientConfig {
    return { ...this.config };
  }

  getRetryHandler(): RetryHandler {
    return this.retryHandler;
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.get('/health', { 
        timeout: 5000,
        skipCircuitBreaker: true,
        skipRetry: true 
      });
      
      const latency = Date.now() - startTime;
      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        healthy: false, 
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Factory function to create circuit breaker clients
 */
export function createCircuitBreakerClient(
  config: CircuitBreakerClientConfig
): CircuitBreakerClient {
  return new CircuitBreakerClient(config);
}

/**
 * Pre-configured clients for common services
 */
export const apiClients = {
  governmentData: createCircuitBreakerClient({
    serviceName: 'government-data',
    baseUrl: '/api/government',
    timeout: 15000,
    retryConfig: {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 60000
    }
  }),

  socialMedia: createCircuitBreakerClient({
    serviceName: 'social-media',
    baseUrl: '/api/social',
    timeout: 8000,
    retryConfig: {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 10000
    }
  }),

  internalApi: createCircuitBreakerClient({
    serviceName: 'internal-api',
    baseUrl: '/api',
    timeout: 10000,
    retryConfig: {
      maxAttempts: 4,
      baseDelay: 500,
      maxDelay: 15000
    }
  }),

  externalApi: createCircuitBreakerClient({
    serviceName: 'external-api',
    timeout: 12000,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 20000
    }
  })
};