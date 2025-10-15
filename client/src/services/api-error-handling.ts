import { ApiErrorFallback } from '@/components/error-handling';
import { logger } from '../utils/logger';

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
    // But be more conservative on later attempts
    if (!error.status || error.status >= 500) {
      // On the last attempt, only retry 503 (Service Unavailable) and 504 (Gateway Timeout)
      if (attempt === 2) {
        return error.status === 503 || error.status === 504 || !error.status;
      }
      return true;
    }
    
    return false;
  },
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

  /**
   * Starts automatic cleanup of expired cache entries.
   * This prevents memory leaks in long-running applications.
   */
  private startCleanup(): void {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.removeExpiredEntries();
      }, CACHE_CLEANUP_INTERVAL);
    }
  }

  /**
   * Removes all expired entries from the cache.
   * This is called periodically to prevent memory buildup.
   */
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

  /**
   * Enforces cache size limit using LRU (Least Recently Used) strategy.
   * When cache is full, removes the oldest entries.
   */
  private enforceSizeLimit(): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest 10% of entries to avoid frequent evictions
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
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // Update timestamp for LRU behavior (move to "recently used")
    entry.timestamp = Date.now();
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Cleanup resources when the cache is no longer needed.
   * Important for preventing memory leaks.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get cache statistics for monitoring and debugging.
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global API cache instance
const apiCache = new ApiCache();

// Utility functions with better error handling
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

/**
 * Calculates exponential backoff delay with jitter.
 * Jitter helps prevent thundering herd problems when multiple clients retry simultaneously.
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter: randomize between 50% and 100% of the calculated delay
  // This prevents all clients from retrying at the exact same time
  const jitter = cappedDelay * (0.5 + Math.random() * 0.5);
  return Math.floor(jitter);
}

/**
 * Creates a cache key from URL and options.
 * Optimized to handle different input formats efficiently.
 */
function createCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  
  // For GET requests without body, use simple key
  if (method === 'GET' && !options?.body) {
    return `${method}:${url}`;
  }
  
  // For requests with body, include it in the key
  const body = options?.body 
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : '';
  
  return `${method}:${url}:${body}`;
}

/**
 * Safely parses JSON response with error handling.
 * Falls back to text if JSON parsing fails.
 */
async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  // Check if response is JSON
  if (contentType?.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      // JSON parsing failed, try text
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
  }
  
  // For non-JSON responses, return as text
  return await response.text();
}

/**
 * Enhanced fetch with comprehensive error handling, retries, caching, and fallbacks.
 * This is the core function that handles all HTTP requests with resilience patterns.
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

  // Try cache first (only for GET requests)
  if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        success: true,
        fromCache: true,
      };
    }
  }

  let lastError: ApiError | undefined;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
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

          // Check if we should retry this error
          if (attempt < config.maxRetries && config.retryCondition?.(lastError, attempt)) {
            const delayMs = calculateBackoffDelay(attempt, config);
            
            // Call retry callback if provided (useful for logging/monitoring)
            config.onRetry?.(lastError, attempt, delayMs);
            
            await delay(delayMs);
            continue;
          }

          throw lastError;
        }

        // Parse successful response
        const data = await parseResponse(response);

        // Cache successful GET requests
        if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
          apiCache.set(cacheKey, data, cacheTTL);
        }

        return {
          data,
          success: true,
        };

      } finally {
        // Always clear timeout to prevent memory leaks
        clearTimeout(timeoutId);
      }

    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = createApiError('Request timeout', 408, url);
      } else if ((error as ApiError).status) {
        // Already an ApiError, preserve it
        lastError = error as ApiError;
      } else if (error instanceof Error) {
        lastError = createApiError(error.message, undefined, url, error);
      } else {
        lastError = createApiError('Unknown error occurred', undefined, url, error);
      }

      lastError.retryCount = attempt;

      // Check if we should retry
      if (attempt < config.maxRetries && config.retryCondition?.(lastError, attempt)) {
        const delayMs = calculateBackoffDelay(attempt, config);
        config.onRetry?.(lastError, attempt, delayMs);
        await delay(delayMs);
        continue;
      }

      // No more retries, exit loop
      break;
    }
  }

  // If we have fallback data, return it with the error information
  if (fallbackData !== undefined) {
    return {
      data: fallbackData,
      success: false,
      error: lastError!,
      fromFallback: true,
    };
  }

  // No fallback data available, throw the error
  throw lastError!;
}

/**
 * Enhanced API service with comprehensive HTTP methods and error handling.
 * Provides a clean interface for making API calls with automatic retries and caching.
 */
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Constructs full URL from endpoint, handling both absolute and relative paths.
   */
  private getFullUrl(endpoint: string): string {
    // If endpoint is already a full URL, return it as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    
    // Ensure endpoint starts with /
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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      skipCache: true,
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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

  /**
   * Clears all cached responses. Useful when you need fresh data or on logout.
   */
  clearCache(): void {
    apiCache.clear();
  }

  /**
   * Deletes a specific cache entry. Useful for invalidating stale data.
   */
  deleteCacheEntry(endpoint: string, method: string = 'GET'): void {
    const cacheKey = createCacheKey(this.getFullUrl(endpoint), { method });
    apiCache.delete(cacheKey);
  }

  /**
   * Gets cache statistics for monitoring.
   */
  getCacheStats(): { size: number; maxSize: number } {
    return apiCache.getStats();
  }

  /**
   * Updates the base URL. Useful for switching between environments.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Gets the current base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Global API service instance
export const apiService = new ApiService();

// Additional exports for backward compatibility with tests
export const ApiErrorHandler = {
  handleError: (error: any) => {
    console.error('API Error:', error);
    return error;
  },
  isRetryableError: (error: any) => {
    return error?.status >= 500 || !error?.status;
  },
  getErrorMessage: (error: any) => {
    return error?.message || 'An error occurred';
  }
};

/**
 * Manages fallback data for API endpoints.
 * Useful for offline-first applications or providing default data.
 */
export class FallbackDataManager {
  private fallbackData = new Map<string, any>();

  setFallbackData(key: string, data: any): void {
    this.fallbackData.set(key, data);
  }

  getFallbackData(key: string): any | undefined {
    return this.fallbackData.get(key);
  }

  hasFallbackData(key: string): boolean {
    return this.fallbackData.has(key);
  }

  clearFallbackData(key?: string): void {
    if (key) {
      this.fallbackData.delete(key);
    } else {
      this.fallbackData.clear();
    }
  }

  /**
   * Gets all fallback data keys. Useful for debugging.
   */
  getAllKeys(): string[] {
    return Array.from(this.fallbackData.keys());
  }
}

// Global fallback data manager
export const fallbackDataManager = new FallbackDataManager();

// Error handling utility functions
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

/**
 * Gets a user-friendly error message based on the error status and type.
 * This provides better UX by showing meaningful messages instead of technical errors.
 */
export function getErrorMessage(error: ApiError): string {
  // Handle specific HTTP status codes
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.status === 403) {
    return 'You do not have permission to access this resource.';
  }
  if (error.status === 401) {
    return 'Authentication required. Please log in.';
  }
  if (error.status === 408) {
    return 'Request timeout. Please check your connection and try again.';
  }
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.status === 503) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  if (isServerError(error)) {
    return 'Server error. Please try again later.';
  }
  if (isNetworkError(error)) {
    return 'Network error. Please check your internet connection.';
  }
  
  // Fall back to the original error message
  return error.message || 'An unexpected error occurred.';
}

/**
 * Cleanup function to be called when the application unmounts.
 * Prevents memory leaks by clearing intervals and cached data.
 */
export function cleanup(): void {
  apiCache.destroy();
}

// Cleanup on page unload in browser environments
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}






