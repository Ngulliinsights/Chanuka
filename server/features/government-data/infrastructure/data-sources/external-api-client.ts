/**
 * External API Client for Government Data Sources
 * Handles communication with external government APIs
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';

// ==========================================================================
// Types
// ==========================================================================

export interface APIClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  headers?: Record<string, string>;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  metadata?: {
    totalCount?: number;
    hasMore?: boolean;
    nextPage?: string;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

// ==========================================================================
// External API Client
// ==========================================================================

export class ExternalAPIClient {
  private config: APIClientConfig;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(config: APIClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
  }

  /**
   * Make a GET request to the external API
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): AsyncServiceResult<APIResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, params);
  }

  /**
   * Make a POST request to the external API
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): AsyncServiceResult<APIResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, params);
  }

  /**
   * Make an HTTP request with retry logic and rate limiting
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): AsyncServiceResult<APIResponse<T>> {
    return safeAsync(async () => {
      const logContext = {
        component: 'ExternalAPIClient',
        operation: 'makeRequest',
        method,
        endpoint,
        baseUrl: this.config.baseUrl,
      };

      // Check rate limits
      await this.checkRateLimit();

      // Build URL
      const url = new URL(endpoint, this.config.baseUrl);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Chanuka-Government-Data-Client/1.0',
        ...this.config.headers,
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      // Build request options
      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(this.config.timeout!),
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      logger.debug(logContext, 'Making external API request');

      // Make request with retry logic
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
        try {
          const response = await fetch(url.toString(), requestOptions);

          // Update rate limit info
          this.updateRateLimitInfo(response);

          // Handle HTTP errors
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          // Parse response
          const responseData = await response.json();

          // Extract metadata from headers
          const metadata = this.extractMetadata(response);

          const apiResponse: APIResponse<T> = {
            data: responseData,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            metadata,
          };

          logger.debug({
            ...logContext,
            status: response.status,
            attempt,
          }, 'External API request successful');

          return apiResponse;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          logger.warn({
            ...logContext,
            attempt,
            error: lastError.message,
          }, 'External API request failed, retrying');

          // Wait before retry (exponential backoff)
          if (attempt < this.config.retryAttempts!) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error('All retry attempts failed');
    }, {
      service: 'ExternalAPIClient',
      operation: 'makeRequest',
      context: { method, endpoint, baseUrl: this.config.baseUrl },
    });
  }

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const rateLimitKey = this.config.baseUrl;
    const rateLimitInfo = this.rateLimitInfo.get(rateLimitKey);

    if (rateLimitInfo && rateLimitInfo.remaining <= 0) {
      const now = new Date();
      if (now < rateLimitInfo.resetTime) {
        const waitTime = rateLimitInfo.resetTime.getTime() - now.getTime();
        logger.warn({
          component: 'ExternalAPIClient',
          baseUrl: this.config.baseUrl,
          waitTime,
        }, 'Rate limit exceeded, waiting');

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const rateLimitKey = this.config.baseUrl;
    
    const limit = response.headers.get('X-RateLimit-Limit') || 
                  response.headers.get('X-Rate-Limit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining') || 
                      response.headers.get('X-Rate-Limit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset') || 
                  response.headers.get('X-Rate-Limit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo.set(rateLimitKey, {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(reset) * 1000),
      });
    }
  }

  /**
   * Extract pagination and other metadata from response headers
   */
  private extractMetadata(response: Response): APIResponse['metadata'] {
    const metadata: APIResponse['metadata'] = {};

    // Common pagination headers
    const totalCount = response.headers.get('X-Total-Count') || 
                       response.headers.get('Total-Count');
    if (totalCount) {
      metadata.totalCount = parseInt(totalCount);
    }

    const hasMore = response.headers.get('X-Has-More') || 
                    response.headers.get('Has-More');
    if (hasMore) {
      metadata.hasMore = hasMore.toLowerCase() === 'true';
    }

    const nextPage = response.headers.get('X-Next-Page') || 
                     response.headers.get('Next-Page');
    if (nextPage) {
      metadata.nextPage = nextPage;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo | null {
    return this.rateLimitInfo.get(this.config.baseUrl) || null;
  }

  /**
   * Test connection to the API
   */
  async testConnection(): AsyncServiceResult<boolean> {
    return safeAsync(async () => {
      const response = await this.get('/health');
      return response.isOk() && response.value.status < 400;
    }, {
      service: 'ExternalAPIClient',
      operation: 'testConnection',
      context: { baseUrl: this.config.baseUrl },
    });
  }
}

// ==========================================================================
// Predefined API Clients
// ==========================================================================

/**
 * Parliament of Kenya API Client
 */
export class ParliamentKenyaAPIClient extends ExternalAPIClient {
  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://api.parliament.go.ke/v1',
      apiKey,
      timeout: 45000,
      retryAttempts: 3,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async getBills(params?: {
    page?: number;
    limit?: number;
    status?: string;
    house?: string;
  }): AsyncServiceResult<APIResponse> {
    return this.get('/bills', params);
  }

  async getBill(billId: string): AsyncServiceResult<APIResponse> {
    return this.get(`/bills/${billId}`);
  }

  async getMembers(params?: {
    page?: number;
    limit?: number;
    house?: string;
  }): AsyncServiceResult<APIResponse> {
    return this.get('/members', params);
  }
}

/**
 * Kenya Law API Client
 */
export class KenyaLawAPIClient extends ExternalAPIClient {
  constructor(apiKey?: string) {
    super({
      baseUrl: 'https://api.kenyalaw.org/v1',
      apiKey,
      timeout: 30000,
      retryAttempts: 2,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async getDocuments(params?: {
    page?: number;
    limit?: number;
    type?: string;
    year?: number;
  }): AsyncServiceResult<APIResponse> {
    return this.get('/documents', params);
  }

  async getDocument(documentId: string): AsyncServiceResult<APIResponse> {
    return this.get(`/documents/${documentId}`);
  }
}

/**
 * Mzalendo Trust API Client
 */
export class MzalendoAPIClient extends ExternalAPIClient {
  constructor() {
    super({
      baseUrl: 'https://api.mzalendo.com/v1',
      timeout: 20000,
      retryAttempts: 2,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async getParliamentaryData(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): AsyncServiceResult<APIResponse> {
    return this.get('/parliamentary-data', params);
  }

  async getHansardRecords(params?: {
    page?: number;
    limit?: number;
    sitting_date?: string;
  }): AsyncServiceResult<APIResponse> {
    return this.get('/hansard', params);
  }
}