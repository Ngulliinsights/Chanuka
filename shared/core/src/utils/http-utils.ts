/**
 * HTTP Utilities Module
 *
 * Provides comprehensive utilities for HTTP operations, request/response
 * handling, and HTTP-related data processing.
 *
 * This module consolidates HTTP-related utilities from response-helpers.ts
 * and other sources into a unified, framework-agnostic interface.
 */

import { logger } from '../observability/logging';

// ==================== Type Definitions ====================

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  ok: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config: HttpRequestOptions) => HttpRequestOptions | Promise<HttpRequestOptions>;
    response?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
  };
}

// ==================== HTTP Status Codes ====================

export const HTTP_STATUS = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// ==================== Response Helpers ====================

/**
 * Creates a standardized success response.
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  meta?: ApiResponse['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta
    }
  };
}

/**
 * Creates a standardized error response.
 */
export function createErrorResponse(
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      message,
      code,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
}

/**
 * Generates a unique request ID for tracking.
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== HTTP Client ====================

/**
 * Simple HTTP client for making requests.
 */
export class HttpClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...config
    };
  }

  /**
   * Makes an HTTP request.
   */
  async request<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const config = await this.applyRequestInterceptors({
      method: 'GET',
      headers: { ...this.config.headers },
      timeout: this.config.timeout,
      retries: this.config.retries,
      retryDelay: this.config.retryDelay,
      ...options
    });

    const fullUrl = this.config.baseURL ? `${this.config.baseURL}${url}` : url;

    let lastError: Error;

    for (let attempt = 1; attempt <= (config.retries || 1); attempt++) {
      try {
        const response = await this.makeRequest<T>(fullUrl, config);
        return await this.applyResponseInterceptors(response);
      } catch (error) {
        lastError = error as Error;

        if (attempt === config.retries) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise(resolve =>
          setTimeout(resolve, (config.retryDelay || 1000) * attempt)
        );
      }
    }

    throw lastError!;
  }

  /**
   * Makes a GET request.
   */
  async get<T = any>(url: string, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Makes a POST request.
   */
  async post<T = any>(url: string, data?: any, options: Omit<HttpRequestOptions, 'method'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body: data });
  }

  /**
   * Makes a PUT request.
   */
  async put<T = any>(url: string, data?: any, options: Omit<HttpRequestOptions, 'method'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body: data });
  }

  /**
   * Makes a DELETE request.
   */
  async delete<T = any>(url: string, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  private async makeRequest<T>(url: string, config: HttpRequestOptions): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await this.parseResponseBody<T>(response);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        data,
        ok: response.ok
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async parseResponseBody<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    }

    return response.blob() as unknown as T;
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async applyRequestInterceptors(config: HttpRequestOptions): Promise<HttpRequestOptions> {
    if (this.config.interceptors?.request) {
      return await this.config.interceptors.request(config);
    }
    return config;
  }

  private async applyResponseInterceptors<T>(response: HttpResponse<T>): Promise<HttpResponse<T>> {
    if (this.config.interceptors?.response) {
      return await this.config.interceptors.response(response);
    }
    return response;
  }
}

// ==================== URL Utilities ====================

/**
 * Builds a URL with query parameters.
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  });

  return url.toString();
}

/**
 * Parses query parameters from a URL.
 */
export function parseQueryParams(url: string): Record<string, string | string[]> {
  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const params: Record<string, string | string[]> = {};

  urlObj.searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

/**
 * Encodes a URI component safely.
 */
export function safeEncodeURIComponent(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// ==================== Content Type Utilities ====================

/**
 * Gets the content type from a file extension.
 */
export function getContentTypeFromExtension(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.csv': 'text/csv'
  };

  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Gets the file extension from a content type.
 */
export function getExtensionFromContentType(contentType: string): string {
  const extensions: Record<string, string> = {
    'application/json': '.json',
    'application/xml': '.xml',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'application/javascript': '.js',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'text/csv': '.csv'
  };

  return extensions[contentType.toLowerCase()] || '';
}

// ==================== HTTP Error Classes ====================

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ==================== Global HTTP Client Instance ====================

export const httpClient = new HttpClient({
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
});