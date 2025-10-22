import { logger } from '@shared/core';
import { processRequestInterceptors } from './apiInterceptors'; // <-- Import interceptors
import { offlineDataManager } from '../utils/offlineDataManager';
import { backgroundSyncManager } from '../utils/backgroundSyncManager';
import { cacheInvalidation } from '../utils/cacheInvalidation';
import { offlineAnalytics } from '../utils/offlineAnalytics';

// API Error Types - Enhanced with better type safety
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  timestamp: string;
  endpoint?: string;
  retryCount?: number; // Track how many times we retried
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: ApiError, attempt: number) => boolean;
  onRetry?: (error: ApiError, attempt: number, delayMs: number) => void; // Callback for monitoring
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  fallbackData?: any;
  skipCache?: boolean;
  cacheTTL?: number; // Allow per-request cache TTL customization
}

// Improved type safety: success and error states are mutually exclusive
export type ApiResponse<T = any> =
  | {
      data: T;
      success: true;
      fromCache?: boolean;
      fromFallback?: false;
    }
  | {
      data: T;
      success: false;
      error: ApiError;
      fromCache?: false;
      fromFallback: true;
    }
  | { // Added a dedicated error state for non-fallback failures
      data: null;
      success: false;
      error: ApiError;
      fromCache?: false;
      fromFallback?: false;
    };

// Default configurations with smarter retry logic
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: ApiError, attempt: number) => {
    // Don't retry client errors (4xx) except for specific cases
    if (error.status && error.status >= 400 && error.status < 500) {
      // Only retry these specific client errors
      return error.status === 408 || error.status === 429; // Timeout or rate limit
    }
    
    // Retry network errors and server errors (5xx)
    if (!error.status || error.status >= 500) {
      // On the last attempt, only retry 503 (Service Unavailable) and 504 (Gateway Timeout)
      if (attempt === 2) {
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
      delay: `${delayMs.toFixed(0)}ms`
    });
  }
};

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const CACHE_CLEANUP_INTERVAL = 60000; // Clean cache every 60 seconds
const MAX_CACHE_SIZE = 100; // Prevent unbounded cache growth

// Enhanced cache with automatic cleanup and size limits
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

  private enforceSizeLimit(): void {
    if (this.cache.size >= this.maxSize) {
      const entriesToRemove = Math.ceil(this.maxSize * 0.1);
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0]);
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
    entry.timestamp = Date.now(); // Update timestamp for LRU
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

// Global API cache instance
const apiCache = new ApiCache();

// Utility functions
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

/**
 * Enhanced fetch with interceptors, retries, caching, and fallbacks.
 * This is the new core function that handles all HTTP requests.
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
    ...fetchOptions
  } = options;

  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const cacheKey = createCacheKey(url, fetchOptions);

  // 1. Try cache first (only for GET requests)
  if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    // Try memory cache first
    let cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      await offlineAnalytics.trackCacheAccess(true, cacheKey);
      return { data: cachedData, success: true, fromCache: true };
    }

    // Try offline cache as fallback
    cachedData = await offlineDataManager.getOfflineData(cacheKey);
    if (cachedData !== null) {
      await offlineAnalytics.trackCacheAccess(true, cacheKey);
      // Restore to memory cache
      apiCache.set(cacheKey, cachedData, cacheTTL);
      return { data: cachedData, success: true, fromCache: true };
    }

    await offlineAnalytics.trackCacheAccess(false, cacheKey);
  }

  let lastError: ApiError | undefined;

  // 2. Retry loop
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // 3. PROCESS INTERCEPTORS (from api.ts)
        const processedConfig = await processRequestInterceptors({
          ...fetchOptions,
          url,
          signal: controller.signal,
        });
        
        const response = await fetch(processedConfig.url, processedConfig);
        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle auth error (from api.ts interceptor logic)
          if (response.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/auth'; // or use a navigation service
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

          if (attempt < config.maxRetries && config.retryCondition?.(lastError, attempt)) {
            const delayMs = calculateBackoffDelay(attempt, config);
            config.onRetry?.(lastError, attempt, delayMs);
            await delay(delayMs);
            continue;
          }
          throw lastError;
        }

        const data = await parseResponse(response);

        // Cache successful GET requests
        if (!skipCache && (!processedConfig.method || processedConfig.method === 'GET')) {
          apiCache.set(cacheKey, data, cacheTTL);
          // Also cache in offline storage for persistence
          await offlineDataManager.setOfflineData(cacheKey, data, cacheTTL);
        }

        return { data, success: true };

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
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

      // Queue failed requests for background sync (for non-GET requests)
      if (fetchOptions.method && fetchOptions.method !== 'GET' && !navigator.onLine) {
        try {
          await backgroundSyncManager.queueApiRequest(
            fetchOptions.method,
            url,
            (fetchOptions as any).body ? JSON.parse((fetchOptions as any).body) : undefined,
            'medium'
          );
        } catch (syncError) {
          logger.warn('Failed to queue request for background sync', { component: 'ApiService', error: syncError });
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

  // 4. Handle final failure
  logger.error(`API request failed after ${config.maxRetries} retries: ${lastError?.message}`, {
    component: 'ApiService',
    error: lastError,
    endpoint: url,
  });

  if (fallbackData !== undefined) {
    return { data: fallbackData, success: false, error: lastError!, fromFallback: true };
  }
  
  // Return a standard error response
  return { data: null, success: false, error: lastError! };
}

/**
 * Enhanced API service with comprehensive HTTP methods and error handling.
 */
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private getFullUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }

  async get<T = any>(
    endpoint: string, 
    options: Omit<FetchOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...options,
      method: 'GET',
    });
  }

  async post<T = any>(
    endpoint: string, 
    data: any, 
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      skipCache: true, // POST requests should not be cached by default
    });
  }

  async put<T = any>(
    endpoint: string, 
    data: any, 
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      skipCache: true,
    });
  }

  async patch<T = any>(
    endpoint: string, 
    data: any, 
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
      skipCache: true,
    });
  }

  async delete<T = any>(
    endpoint: string, 
    options: Omit<FetchOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return fetchWithFallback<T>(this.getFullUrl(endpoint), {
      ...options,
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

// Global API service singleton instance
export const apiService = new ApiService();

// --- Re-exporting APIs from api.ts to maintain compatibility ---

// Auth API
export const authApi = {
  async register(userData: any) {
    return apiService.post('/api/auth/register', userData);
  },
  async login(credentials: any) {
    return apiService.post('/api/auth/login', credentials);
  },
  async getCurrentUser() {
    return apiService.get('/api/auth/me');
  },
  async logout() {
    return apiService.post('/api/auth/logout', {});
  }
};
export const { register, login, getCurrentUser, logout } = authApi;

// User API methods
export const updateProfile = async (profileData: any) => {
  return apiService.put('/api/users/profile', profileData);
};
export const updatePreferences = async (preferences: any) => {
  return apiService.put('/api/users/preferences', preferences);
};

// Bills API
export const billsApi = {
  async getBills() {
    return apiService.get('/api/bills');
  },
  async getBill(id: number) {
    return apiService.get(`/api/bills/${id}`);
  },
  async searchBills(query: any) {
    const url = new URL('/api/bills/search', apiService.getBaseUrl());
    Object.keys(query).forEach(key => {
      if (query[key] !== undefined && query[key] !== null) {
        url.searchParams.append(key, query[key]);
      }
    });
    return apiService.get(url.pathname + url.search);
  },
  async getBillComments(id: number) {
    return apiService.get(`/api/bills/${id}/comments`);
  },
  async createBillComment(billId: number, comment: any) {
    return apiService.post(`/api/bills/${billId}/comments`, comment);
  },
  async recordEngagement(billId: number, engagement: any) {
    return apiService.post(`/api/bills/${billId}/engagement`, engagement);
  },
  async getBillCategories() {
    return apiService.get('/api/bills/meta/categories');
  },
  async getBillStatuses() {
    return apiService.get('/api/bills/meta/statuses');
  }
};
export const { getBills, getBill, searchBills, getBillComments, createBillComment } = billsApi;

// System API
export const systemApi = {
  async getHealth() {
    return apiService.get('/api/health');
  },
  async getStats() {
    return apiService.get('/api/health/stats');
  },
  async getActivity() {
    return apiService.get('/api/health/activity');
  },
  async getSchema() {
    return apiService.get('/api/system/schema');
  }
};

// --- Helper Functions from api-error-handling.ts ---

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

export function cleanup(): void {
  apiCache.destroy();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}