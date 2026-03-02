/**
 * Government API Client
 * 
 * HTTP client for interacting with Kenya government APIs.
 * Handles authentication, rate limiting, retries, and error handling.
 * 
 * @module infrastructure/external-data/government-api-client
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { RateLimiter } from 'limiter';
import { logger } from '../observability/logging-config';
import {
  GovernmentAPIConfig,
  GovernmentAPIProvider,
  AuthMethod,
  loadAPIConfig,
} from './government-api-config';
import { AsyncServiceResult, safeAsync } from '../error-handling/result-types';

/**
 * API Response Type
 */
export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  provider: GovernmentAPIProvider;
  requestId?: string;
}

/**
 * API Error Type
 */
export interface APIError {
  message: string;
  status?: number;
  code?: string;
  provider: GovernmentAPIProvider;
  requestId?: string;
  retryable: boolean;
}

/**
 * Rate Limiter Manager
 * 
 * Manages rate limiters for each API provider to prevent exceeding API limits.
 */
class RateLimiterManager {
  private limiters: Map<GovernmentAPIProvider, RateLimiter> = new Map();
  
  /**
   * Get or create rate limiter for provider
   */
  getLimiter(config: GovernmentAPIConfig): RateLimiter {
    const existing = this.limiters.get(config.provider);
    if (existing) {
      return existing;
    }
    
    // Create new rate limiter (requests per minute)
    const limiter = new RateLimiter({
      tokensPerInterval: config.rateLimit.requestsPerMinute,
      interval: 'minute',
    });
    
    this.limiters.set(config.provider, limiter);
    return limiter;
  }
  
  /**
   * Wait for rate limit token
   */
  async waitForToken(config: GovernmentAPIConfig): Promise<void> {
    const limiter = this.getLimiter(config);
    await limiter.removeTokens(1);
  }
}

const rateLimiterManager = new RateLimiterManager();

/**
 * Government API Client
 * 
 * HTTP client for government APIs with authentication, rate limiting, and retry logic.
 */
export class GovernmentAPIClient {
  private config: GovernmentAPIConfig;
  private axiosInstance: AxiosInstance;
  private requestCount: number = 0;
  private errorCount: number = 0;
  
  constructor(provider: GovernmentAPIProvider) {
    this.config = loadAPIConfig(provider);
    this.axiosInstance = this.createAxiosInstance();
  }
  
  /**
   * Create configured Axios instance
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chanuka-Platform/1.0',
      },
    });
    
    // Add request interceptor for authentication
    instance.interceptors.request.use(
      (config) => this.addAuthentication(config),
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for logging
    instance.interceptors.response.use(
      (response) => {
        this.requestCount++;
        logger.debug('Government API request successful', {
          provider: this.config.provider,
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        this.errorCount++;
        logger.error('Government API request failed', {
          provider: this.config.provider,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
    
    return instance;
  }
  
  /**
   * Add authentication to request
   */
  private addAuthentication(config: AxiosRequestConfig): AxiosRequestConfig {
    const { authMethod, credentials } = this.config;
    
    switch (authMethod) {
      case AuthMethod.API_KEY:
        config.headers = {
          ...config.headers,
          'X-API-Key': credentials.apiKey,
        };
        break;
        
      case AuthMethod.BEARER_TOKEN:
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${credentials.bearerToken}`,
        };
        break;
        
      case AuthMethod.BASIC_AUTH:
        const basicAuth = Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString('base64');
        config.headers = {
          ...config.headers,
          'Authorization': `Basic ${basicAuth}`,
        };
        break;
        
      case AuthMethod.OAUTH2:
        // OAuth2 token should be obtained separately and stored
        // For now, use client credentials if available
        if (credentials.bearerToken) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${credentials.bearerToken}`,
          };
        }
        break;
    }
    
    return config;
  }
  
  /**
   * Execute request with rate limiting and retry logic
   */
  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount: number = 0
  ): Promise<APIResponse<T>> {
    // Wait for rate limit token
    await rateLimiterManager.waitForToken(this.config);
    
    try {
      const response = await requestFn();
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        provider: this.config.provider,
        requestId: response.headers['x-request-id'],
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Check if error is retryable
      const isRetryable = this.isRetryableError(axiosError);
      
      // Retry if configured and error is retryable
      if (isRetryable && retryCount < this.config.retryConfig.maxRetries) {
        const delay = this.config.retryConfig.retryDelay * 
          Math.pow(this.config.retryConfig.backoffMultiplier, retryCount);
        
        logger.warn('Retrying government API request', {
          provider: this.config.provider,
          retryCount: retryCount + 1,
          delay,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest(requestFn, retryCount + 1);
      }
      
      // Convert to API error
      throw this.convertToAPIError(axiosError);
    }
  }
  
  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors are retryable
    if (!error.response) {
      return true;
    }
    
    // 5xx errors are retryable
    if (error.response.status >= 500) {
      return true;
    }
    
    // 429 (rate limit) is retryable
    if (error.response.status === 429) {
      return true;
    }
    
    // 408 (timeout) is retryable
    if (error.response.status === 408) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Convert Axios error to API error
   */
  private convertToAPIError(error: AxiosError): APIError {
    return {
      message: error.message,
      status: error.response?.status,
      code: error.code,
      provider: this.config.provider,
      requestId: error.response?.headers['x-request-id'],
      retryable: this.isRetryableError(error),
    };
  }
  
  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): AsyncServiceResult<APIResponse<T>> {
    return safeAsync(
      async () => {
        return this.executeRequest(() =>
          this.axiosInstance.get<T>(endpoint, { params })
        );
      },
      {
        operation: 'government_api_get',
        provider: this.config.provider,
        endpoint,
      }
    );
  }
  
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any
  ): AsyncServiceResult<APIResponse<T>> {
    return safeAsync(
      async () => {
        return this.executeRequest(() =>
          this.axiosInstance.post<T>(endpoint, data)
        );
      },
      {
        operation: 'government_api_post',
        provider: this.config.provider,
        endpoint,
      }
    );
  }
  
  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any
  ): AsyncServiceResult<APIResponse<T>> {
    return safeAsync(
      async () => {
        return this.executeRequest(() =>
          this.axiosInstance.put<T>(endpoint, data)
        );
      },
      {
        operation: 'government_api_put',
        provider: this.config.provider,
        endpoint,
      }
    );
  }
  
  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string
  ): AsyncServiceResult<APIResponse<T>> {
    return safeAsync(
      async () => {
        return this.executeRequest(() =>
          this.axiosInstance.delete<T>(endpoint)
        );
      },
      {
        operation: 'government_api_delete',
        provider: this.config.provider,
        endpoint,
      }
    );
  }
  
  /**
   * Get client statistics
   */
  getStats() {
    return {
      provider: this.config.provider,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
    };
  }
  
  /**
   * Test API connection
   */
  async testConnection(): AsyncServiceResult<boolean> {
    return safeAsync(
      async () => {
        // Try to make a simple request to test connectivity
        const result = await this.get('/health');
        return result.success;
      },
      {
        operation: 'government_api_test_connection',
        provider: this.config.provider,
      }
    );
  }
}

/**
 * Client Factory
 * 
 * Creates and manages API clients for different providers.
 */
class ClientFactory {
  private clients: Map<GovernmentAPIProvider, GovernmentAPIClient> = new Map();
  
  /**
   * Get or create client for provider
   */
  getClient(provider: GovernmentAPIProvider): GovernmentAPIClient {
    const existing = this.clients.get(provider);
    if (existing) {
      return existing;
    }
    
    const client = new GovernmentAPIClient(provider);
    this.clients.set(provider, client);
    return client;
  }
  
  /**
   * Get all clients
   */
  getAllClients(): GovernmentAPIClient[] {
    return Array.from(this.clients.values());
  }
  
  /**
   * Get statistics for all clients
   */
  getAllStats() {
    return this.getAllClients().map(client => client.getStats());
  }
}

export const clientFactory = new ClientFactory();

/**
 * Get API client for provider
 */
export function getGovernmentAPIClient(provider: GovernmentAPIProvider): GovernmentAPIClient {
  return clientFactory.getClient(provider);
}
