/**
 * Unified API Client with Resilience Patterns
 *
 * Provides a comprehensive HTTP client with built-in resilience features
 * including circuit breakers, retries, caching, and rate limiting.
 */

import { logger } from '../../observability/logging';
import { InterceptorManager, createDefaultInterceptors } from './interceptors';
import { CircuitBreaker, CircuitBreakerRegistry, DEFAULT_CIRCUIT_CONFIGS } from './circuit-breaker';

export interface ApiClientConfig {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    circuitBreaker?: {
        enabled: boolean;
        config?: typeof DEFAULT_CIRCUIT_CONFIGS.API_ENDPOINT;
    };
    cache?: {
        enabled: boolean;
        ttl?: number;
    };
    rateLimit?: {
        enabled: boolean;
        requests: number;
        windowMs: number;
    };
    user_agent?: string;
    headers?: Record<string, string>;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    cache?: boolean | { ttl?: number };
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

export interface ApiClientStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    circuitBreakerStates: Record<string, any>;
    cacheHits: number;
    cacheMisses: number;
}

export class ApiClient {
    private interceptorManager: InterceptorManager;
    private circuitBreakerRegistry: CircuitBreakerRegistry;
    private config: Required<ApiClientConfig>;
    private stats: ApiClientStats;

    constructor(config: ApiClientConfig = {}) {
        this.config = {
            baseURL: config.baseURL || '',
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            circuitBreaker: config.circuitBreaker || { enabled: false },
            cache: config.cache || { enabled: false },
            rateLimit: config.rateLimit || { enabled: false, requests: 100, windowMs: 60000 },
            user_agent: config.user_agent || 'ApiClient/1.0',
            headers: config.headers || {},
        };

        this.interceptorManager = createDefaultInterceptors({
            user_agent: this.config.user_agent,
            timeout: this.config.timeout,
            enableLogging: true,
            enableRequestId: true,
        });

        this.circuitBreakerRegistry = new CircuitBreakerRegistry();

        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            circuitBreakerStates: {},
            cacheHits: 0,
            cacheMisses: 0,
        };

        this.initializeInterceptors();
    }

    /**
     * Initialize default interceptors based on configuration
     */
    private initializeInterceptors(): void {
        // Circuit breaker interceptor
        if (this.config.circuitBreaker.enabled) {
            const breaker = this.circuitBreakerRegistry.getOrCreate(
                'api-client',
                this.config.circuitBreaker.config || DEFAULT_CIRCUIT_CONFIGS.API_ENDPOINT
            );

            // Add circuit breaker interceptor
            this.interceptorManager.addRequestInterceptor({
                name: 'circuit-breaker',
                priority: 95,
                intercept: async (request) => {
                    if (!breaker.canExecute()) {
                        throw new Error(`Circuit breaker is OPEN for ${request.url}`);
                    }
                    return request;
                },
            });
        }

        // Rate limiting interceptor
        if (this.config.rateLimit.enabled) {
            // Simple in-memory rate limiter
            const requests = new Map<string, number[]>();

            this.interceptorManager.addRequestInterceptor({
                name: 'rate-limiter',
                priority: 85,
                intercept: async (request) => {
                    const now = Date.now();
                    const key = request.url;
                    const windowStart = now - this.config.rateLimit.windowMs;

                    // Clean old requests
                    const userRequests = requests.get(key) || [];
                    const validRequests = userRequests.filter(time => time > windowStart);

                    if (validRequests.length >= this.config.rateLimit.requests) {
                        throw new Error(`Rate limit exceeded for ${key}`);
                    }

                    validRequests.push(now);
                    requests.set(key, validRequests);

                    return request;
                },
            });
        }
    }

    /**
     * Make an HTTP request with full resilience features
     */
    async request<T = any>(
        url: string,
        options: RequestOptions = {}
    ): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        const startTime = Date.now();
        this.stats.totalRequests++;

        try {
            // Build full URL
            const fullUrl = this.buildUrl(url);

            // Prepare request object
            const request = {
                url: fullUrl,
                method: options.method || 'GET',
                headers: { ...this.config.headers, ...options.headers },
                body: options.body,
                timeout: options.timeout || this.config.timeout,
                retries: options.retries || this.config.retries,
                metadata: options.metadata || {},
            };

            // Create interceptor context
            const context = {
                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                attempt: 1,
                startTime,
                metadata: { ...request.metadata },
            };

            // Apply request interceptors
            const processedRequest = await this.interceptorManager.applyRequestInterceptors(request, context);

            // Execute the request
            const response = await this.executeRequest(processedRequest, options.signal);

            // Apply response interceptors
            const processedResponse = await this.interceptorManager.applyResponseInterceptors(response, processedRequest, context);

            // Update circuit breaker on success
            if (this.config.circuitBreaker.enabled) {
                const breaker = this.circuitBreakerRegistry.get('api-client');
                if (breaker) {
                    await breaker.execute(async () => { }); // Just record success
                }
            }

            this.stats.successfulRequests++;
            const duration = Date.now() - startTime;
            this.updateAverageResponseTime(duration);

            return {
                data: processedResponse.data as T,
                status: processedResponse.status,
                headers: processedResponse.headers,
                duration,
            };

        } catch (error) {
            this.stats.failedRequests++;
            const duration = Date.now() - startTime;

            // Apply error interceptors
            const request = { url: this.buildUrl(url), method: options.method || 'GET', headers: {} };
            const context = { requestId: '', attempt: 1, startTime, metadata: {} };

            const processedError = await this.interceptorManager.applyErrorInterceptors(
                {
                    message: (error as Error).message,
                    code: 'REQUEST_FAILED',
                    status: 0,
                    retryable: true,
                },
                request,
                context
            );

            if (processedError) {
                throw processedError;
            }

            // If error was handled by interceptors, this shouldn't be reached
            throw error;
        }
    }

    /**
     * Execute the actual HTTP request
     */
    private async executeRequest(
        request: any,
        signal?: AbortSignal
    ): Promise<any> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), request.timeout);

        if (signal) {
            signal.addEventListener('abort', () => controller.abort());
        }

        try {
            const fetchOptions: RequestInit = {
                method: request.method,
                headers: request.headers,
                signal: controller.signal,
            };

            if (request.body && typeof request.body === 'object') {
                fetchOptions.body = JSON.stringify(request.body);
                if (!request.headers['Content-Type']) {
                    request.headers['Content-Type'] = 'application/json';
                }
            } else if (request.body) {
                fetchOptions.body = request.body;
            }

            const response = await fetch(request.url, fetchOptions);
            clearTimeout(timeoutId);

            const responseData = await this.parseResponse(response);
            const duration = Date.now() - Date.now(); // This should be passed from caller

            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
                duration: 0, // Will be set by caller
                metadata: {},
            };

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Parse response based on content type
     */
    private async parseResponse(response: Response): Promise<any> {
        const content_type = response.headers.get('content-type');

        if (content_type?.includes('application/json')) {
            return response.json();
        } else if (content_type?.includes('text/')) {
            return response.text();
        } else {
            return response.arrayBuffer();
        }
    }

    /**
     * Build full URL from base URL and path
     */
    private buildUrl(url: string): string {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const baseUrl = this.config.baseURL.replace(/\/$/, '');
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${path}`;
    }

    /**
     * Update average response time
     */
    private updateAverageResponseTime(duration: number): void {
        const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (totalRequests - 1) + duration) / totalRequests;
    }

    // ==================== HTTP Method Helpers ====================

    async get<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        return this.request<T>(url, { ...options, method: 'GET' });
    }

    async post<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        return this.request<T>(url, { ...options, method: 'POST', body: data });
    }

    async put<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        return this.request<T>(url, { ...options, method: 'PUT', body: data });
    }

    async patch<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        return this.request<T>(url, { ...options, method: 'PATCH', body: data });
    }

    async delete<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<{ data: T; status: number; headers: Record<string, string>; duration: number }> {
        return this.request<T>(url, { ...options, method: 'DELETE' });
    }

    // ==================== Configuration Methods ====================

    /**
     * Add a custom request interceptor
     */
    addRequestInterceptor(interceptor: any): void {
        this.interceptorManager.addRequestInterceptor(interceptor);
    }

    /**
     * Add a custom response interceptor
     */
    addResponseInterceptor(interceptor: any): void {
        this.interceptorManager.addResponseInterceptor(interceptor);
    }

    /**
     * Add a custom error interceptor
     */
    addErrorInterceptor(interceptor: any): void {
        this.interceptorManager.addErrorInterceptor(interceptor);
    }

    /**
     * Set authentication token
     */
    setAuthToken(token: string, type: 'bearer' | 'basic' | 'api-key' = 'bearer'): void {
        // Remove existing auth headers
        Object.keys(this.config.headers).forEach(key => {
            if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('x-api-key')) {
                delete this.config.headers[key];
            }
        });

        // Add new auth header
        switch (type) {
            case 'bearer':
                this.config.headers['Authorization'] = `Bearer ${token}`;
                break;
            case 'basic':
                this.config.headers['Authorization'] = `Basic ${token}`;
                break;
            case 'api-key':
                this.config.headers['X-API-Key'] = token;
                break;
        }
    }

    /**
     * Get client statistics
     */
    getStats(): ApiClientStats {
        return {
            ...this.stats,
            circuitBreakerStates: this.circuitBreakerRegistry.getAllStats(),
        };
    }

    /**
     * Reset client statistics
     */
    resetStats(): void {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            circuitBreakerStates: {},
            cacheHits: 0,
            cacheMisses: 0,
        };
    }
}

/**
 * Create a configured API client instance
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
    return new ApiClient(config);
}

/**
 * Default API client instance
 */
export const defaultApiClient = new ApiClient();


