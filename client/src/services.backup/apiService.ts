/**
 * Unified API Service - Merges robust infrastructure with clean developer interface
 * Provides retry logic, caching, offline support, validation, and comprehensive error handling
 */

import { logger, validationService } from '../utils/logger';
import { processRequestInterceptors } from './apiInterceptors';
import { offlineDataManager } from '../utils/offlineDataManager';
import { backgroundSyncManager } from '../utils/backgroundSyncManager';
import { offlineAnalytics } from '../utils/offlineAnalytics';
import { serviceRecovery } from '../utils/service-recovery';
import {
  createNetworkError,
  createServerError,
  createAuthError
} from '../components/error';
import { envConfig } from '../utils/env-config';
import { authBackendService } from './authBackendService';
import { ZodSchema } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  timestamp: string;
  endpoint?: string;
  retryCount?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: ApiError, attempt: number) => boolean;
  onRetry?: (error: ApiError, attempt: number, delayMs: number) => void;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  fallbackData?: any;
  skipCache?: boolean;
  cacheTTL?: number;
  responseSchema?: ZodSchema<any>; // Added for validation support
  params?: Record<string, any>;
}

// More precise response typing - success and error states are mutually exclusive
export type ApiResponse<T = any> =
  | { data: T; success: true; fromCache?: boolean; fromFallback?: false }
  | { data: T; success: false; error: ApiError; fromCache?: false; fromFallback: true }
  | { data: null; success: false; error: ApiError; fromCache?: false; fromFallback?: false };

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: ApiError, attempt: number) => {
    // Don't retry 4xx errors except timeouts (408) and rate limits (429)
    if (error.status && error.status >= 400 && error.status < 500) {
      return error.status === 408 || error.status === 429;
    }
    // Retry network and 5xx errors, but be selective on final attempt
    if (!error.status || error.status >= 500) {
      if (attempt === 2) { // Last attempt
        return error.status === 503 || error.status === 504 || !error.status;
      }
      return true;
    }
    return false;
  },
  onRetry: (error, attempt, delayMs) => {
    logger.warn(`API retry attempt ${attempt + 1}`, {
      component: 'ApiService',
      error: error.message,
      status: error.status,
      endpoint: error.endpoint,
      delay: `${delayMs}ms`
    });
  }
};

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_CACHE_SIZE = 100;

// ============================================================================
// Enhanced Cache Implementation with LRU and TTL
// ============================================================================

class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSize: number;

  constructor(maxSize: number = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  private startCleanup(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.removeExpiredEntries();
      }, CACHE_CLEANUP_INTERVAL);
    }
  }

  private removeExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Enforce size limit using LRU eviction (remove oldest entries)
  private enforceSizeLimit(): void {
    if (this.cache.size >= this.maxSize) {
      const entriesToRemove = Math.ceil(this.maxSize * 0.1); // Remove 10%
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        if (entry) {
          this.cache.delete(entry[0]);
        }
      }
    }
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.enforceSizeLimit();
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    // Update timestamp for LRU behavior
    entry.timestamp = Date.now();
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// Global cache instance
const apiCache = new ApiCache();

// ============================================================================
// Utility Functions
// ============================================================================

function createApiError(
  message: string,
  status?: number,
  endpoint?: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.endpoint = endpoint;
  error.details = details;
  error.timestamp = new Date().toISOString();
  error.retryCount = 0;
  return error;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * (0.5 + Math.random() * 0.5);
  return Math.floor(jitter);
}

function createCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  if (method === 'GET' && !options?.body) {
    return `${method}:${url}`;
  }
  const body = options?.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : '';
  return `${method}:${url}:${body}`;
}

async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
  }
  return await response.text();
}

// ============================================================================
// Core Fetch Function with All Features
// ============================================================================

/**
 * Enhanced fetch with interceptors, retries, caching, validation, and fallbacks.
 * This is the foundational function that handles all HTTP requests.
 */
export async function fetchWithFallback<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retryConfig = {},
    fallbackData,
    skipCache = false,
    cacheTTL,
    responseSchema,
    ...fetchOptions
  } = options;

  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const cacheKey = createCacheKey(url, fetchOptions);

  // Step 1: Try cache first (GET requests only)
  if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    // Try memory cache
    let cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      await offlineAnalytics.trackCacheAccess(true, cacheKey);
      return { data: cachedData, success: true, fromCache: true };
    }

    // Try offline storage as secondary cache
    cachedData = await offlineDataManager.getOfflineData(cacheKey);
    if (cachedData !== null) {
      await offlineAnalytics.trackCacheAccess(true, cacheKey);
      apiCache.set(cacheKey, cachedData, cacheTTL); // Restore to memory
      return { data: cachedData, success: true, fromCache: true };
    }

    await offlineAnalytics.trackCacheAccess(false, cacheKey);
  }

  let lastError: ApiError | undefined;

  // Step 2: Retry loop with exponential backoff
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Process interceptors (adds auth headers, etc.)
        const processedConfig = await processRequestInterceptors({
          ...fetchOptions,
          url,
          signal: controller.signal,
        });

        // Make the actual request with service recovery
        const response = await serviceRecovery.fetchWithRetry(
          processedConfig.url,
          processedConfig
        );
        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          // Special handling for 401: attempt token refresh before redirecting
          if (response.status === 401 && typeof window !== 'undefined') {
            logger.warn('Received 401 response, attempting token refresh', {
              component: 'ApiService',
              endpoint: url
            });

            // Try to refresh tokens
            try {
              await authBackendService.refreshTokens();
              // If refresh succeeds, retry the original request
              logger.info('Token refresh successful, retrying request', {
                component: 'ApiService',
                endpoint: url
              });
              return fetchWithFallback<T>(url, options);
            } catch (refreshError) {
              logger.warn('Token refresh failed, redirecting to auth', {
                component: 'ApiService',
                endpoint: url,
                refreshError
              });
            }

            // If refresh failed or wasn't attempted, clear session and redirect
            if (window.location.pathname !== '/auth') {
              window.location.href = '/auth';
            }
          }

          let errorDetails: any;
          try {
            errorDetails = await parseResponse(response);
          } catch {
            errorDetails = 'Unable to parse error response';
          }

          lastError = createApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            url,
            errorDetails
          );
          lastError.retryCount = attempt;

          // Decide whether to retry
          if (attempt < config.maxRetries && config.retryCondition?.(lastError, attempt)) {
            const delayMs = calculateBackoffDelay(attempt, config);
            config.onRetry?.(lastError, attempt, delayMs);
            await delay(delayMs);
            continue;
          }
          throw lastError;
        }

        // Parse successful response
        let data = await parseResponse(response);

        // Validate response if schema provided
        if (responseSchema) {
          try {
            data = await validationService.validate(responseSchema, data);
          } catch (validationError) {
            logger.error('API response validation failed', {
              component: 'ApiService',
              endpoint: url,
              error: validationError
            });
            throw validationError;
          }
        }

        // Cache successful GET requests
        if (!skipCache && (!processedConfig.method || processedConfig.method === 'GET')) {
          apiCache.set(cacheKey, data, cacheTTL);
          await offlineDataManager.setOfflineData(cacheKey, data, cacheTTL);
        }

        return { data, success: true };

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      // Handle different error types
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = createApiError('Request timeout', 408, url);
      } else if ((error as ApiError).status) {
        lastError = error as ApiError;
      } else if (error instanceof Error) {
        lastError = createApiError(error.message, undefined, url, error);
      } else {
        lastError = createApiError('Unknown error occurred', undefined, url, error);
      }

      lastError.retryCount = attempt;

      // Track API errors for analytics
      await offlineAnalytics.trackApiError(url, lastError);

      // Queue failed mutations for background sync when offline
      if (fetchOptions.method && fetchOptions.method !== 'GET' && !navigator.onLine) {
        try {
          await backgroundSyncManager.queueApiRequest(
            fetchOptions.method,
            url,
            (fetchOptions as any).body ? JSON.parse((fetchOptions as any).body) : undefined,
            'medium'
          );
        } catch (syncError) {
          logger.warn('Failed to queue request for background sync', {
            component: 'ApiService',
            error: syncError
          });
        }
      }

      // Check if we should retry
      if (attempt < config.maxRetries && config.retryCondition?.(lastError, attempt)) {
        const delayMs = calculateBackoffDelay(attempt, config);
        config.onRetry?.(lastError, attempt, delayMs);
        await delay(delayMs);
        continue;
      }
      break;
    }
  }

  // Step 3: Handle final failure
  logger.error(`API request failed after ${config.maxRetries} retries`, {
    component: 'ApiService',
    error: lastError?.message,
    endpoint: url,
    retryCount: lastError?.retryCount
  });

  // Report error using unified error handler
  if (lastError?.status) {
    if (lastError.status === 401 || lastError.status === 403) {
      createAuthError(
        lastError.message || 'Authentication failed',
        { status: lastError.status, endpoint: url, retryCount: lastError.retryCount },
        { component: 'ApiService', action: 'api_request', url }
      );
    } else if (lastError.status >= 500) {
      createServerError(
        lastError.message || 'Server error',
        { status: lastError.status, endpoint: url, retryCount: lastError.retryCount },
        { component: 'ApiService', action: 'api_request', url }
      );
    } else {
      createNetworkError(
        lastError.message || 'Request failed',
        { status: lastError.status, endpoint: url, retryCount: lastError.retryCount },
        { component: 'ApiService', action: 'api_request', url }
      );
    }
  } else {
    createNetworkError(
      lastError?.message || 'Network error',
      { endpoint: url, retryCount: lastError?.retryCount },
      { component: 'ApiService', action: 'api_request', url }
    );
  }

  // Return fallback data if provided
  if (fallbackData !== undefined) {
    return { data: fallbackData, success: false, error: lastError!, fromFallback: true };
  }

  return { data: null, success: false, error: lastError! };
}

// ============================================================================
// Main API Service Class
// ============================================================================

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use environment config as default, falling back to localhost
    this.baseUrl = (baseUrl || envConfig.apiUrl || 'http://localhost:5000').replace(/\/$/, '');
  }

  private getFullUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }

  private addAuthHeader(options: FetchOptions = {}): FetchOptions {
    // HttpOnly cookies are sent automatically by browser, no need to add Authorization header
    // The server will read tokens from HttpOnly cookies
    return options;
  }

  async get<T = any>(
    endpoint: string,
    options: Omit<FetchOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...this.addAuthHeader(options),
      method: 'GET',
    });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...this.addAuthHeader(options),
      method: 'POST',
      body,
      headers: { ...headers, ...(options.headers || {}) } as HeadersInit,
      skipCache: true, // POST requests should not be cached
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...this.addAuthHeader(options),
      method: 'PUT',
      body,
      headers: { ...headers, ...(options.headers || {}) } as HeadersInit,
      skipCache: true,
    });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...this.addAuthHeader(options),
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } as HeadersInit,
      skipCache: true,
    });
  }

  async delete<T = any>(
    endpoint: string,
    options: Omit<FetchOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...this.addAuthHeader(options),
      method: 'DELETE',
      skipCache: true,
    });
  }

  clearCache(): void {
    apiCache.clear();
  }

  deleteCacheEntry(endpoint: string, method: string = 'GET'): void {
    const cacheKey = createCacheKey(this.getFullUrl(endpoint), { method });
    apiCache.delete(cacheKey);
  }

  getCacheStats(): { size: number; maxSize: number } {
    return apiCache.getStats();
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// ============================================================================
// Global API Service Instance
// ============================================================================

export const api = new ApiService();
export const apiService = api; // Alias for backwards compatibility

// ============================================================================
// Domain-Specific API Endpoints
// ============================================================================

// Auth API
export const authApi = {
  register: (userData: any) => api.post('/api/auth/register', userData),
  login: (credentials: any) => api.post('/api/auth/login', credentials),
  getCurrentUser: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout', {}),
};

// Export individual auth methods for convenience
export const { register, login, getCurrentUser, logout } = authApi;

// User API
export const updateProfile = (profileData: any) => api.put('/api/users/profile', profileData);
export const updatePreferences = (preferences: any) => api.put('/api/users/preferences', preferences);

// Bills API
export const billsApi = {
  getAll: (params?: any) => api.get('/api/bills', params),
  getBills: () => api.get('/api/bills'),
  getById: (id: string | number) => api.get(`/api/bills/${id}`),
  getBill: (id: number) => api.get(`/api/bills/${id}`),
  searchBills: (query: any) => {
    const url = new URL('/api/bills/search', api.getBaseUrl());
    Object.keys(query).forEach(key => {
      if (query[key] !== undefined && query[key] !== null) {
        url.searchParams.append(key, query[key]);
      }
    });
    return api.get(url.pathname + url.search);
  },
  getComments: (bill_id: string | number) => api.get(`/api/bills/${bill_id}/comments`),
  getBillComments: (id: number) => api.get(`/api/bills/${id}/comments`),
  getSponsors: (bill_id: string | number) => api.get(`/api/bills/${bill_id}/sponsors`),
  getAnalysis: (bill_id: string | number) => api.get(`/api/bills/${bill_id}/analysis`),
  getCategories: () => api.get('/api/bills/categories'),
  getBillCategories: () => api.get('/api/bills/meta/categories'),
  getStatuses: () => api.get('/api/bills/statuses'),
  getBillStatuses: () => api.get('/api/bills/meta/statuses'),
  addComment: (bill_id: string | number, comment: any) => 
    api.post(`/api/bills/${bill_id}/comments`, comment),
  createBillComment: (bill_id: number, comment: any) => 
    api.post(`/api/bills/${bill_id}/comments`, comment),
  recordEngagement: (bill_id: string | number, engagement: any) => 
    api.post(`/api/bills/${bill_id}/engagement`, engagement),
};

// Export individual bills methods for convenience
export const { 
  getBills, 
  getBill, 
  searchBills, 
  getBillComments, 
  createBillComment 
} = billsApi;

// System API
export const systemApi = {
  getHealth: () => api.get('/api/system/health'),
  getStats: () => api.get('/api/system/stats'),
  getActivity: () => api.get('/api/system/activity'),
  getSchema: () => api.get('/api/system/schema'),
  getEnvironment: () => api.get('/api/system/environment'),
};

// ============================================================================
// Helper Functions for Error Analysis
// ============================================================================

export function isNetworkError(error: ApiError): boolean {
  return !error.status || error.status === 0;
}

export function isServerError(error: ApiError): boolean {
  return error.status ? error.status >= 500 : false;
}

export function isClientError(error: ApiError): boolean {
  return error.status ? error.status >= 400 && error.status < 500 : false;
}

export function isRetryableError(error: ApiError): boolean {
  return isNetworkError(error) ||
    error.status === 408 ||
    error.status === 429 ||
    error.status === 503 ||
    error.status === 504;
}

export function getErrorMessage(error: ApiError): string {
  if (error.status === 404) return 'The requested resource was not found.';
  if (error.status === 403) return 'You do not have permission to access this resource.';
  if (error.status === 401) return 'Authentication required. Please log in.';
  if (error.status === 408) return 'Request timeout. Please check your connection and try again.';
  if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (error.status === 503) return 'Service temporarily unavailable. Please try again later.';
  if (isServerError(error)) return 'Server error. Please try again later.';
  if (isNetworkError(error)) return 'Network error. Please check your internet connection.';
  return error.message || 'An unexpected error occurred.';
}

// ============================================================================
// Cleanup
// ============================================================================

export function cleanup(): void {
  apiCache.destroy();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}