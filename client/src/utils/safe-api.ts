/**
 * Safe API utilities with race condition protection
 * Provides request deduplication, cancellation, and timeout handling
 */

interface RequestOptions extends RequestInit {
  timeout?: number;
  deduplicate?: boolean;
}

interface PendingRequest {
  promise: Promise<Response>;
  controller: AbortController;
  timestamp: number;
}

class SafeApiClient {
  private requestCache = new Map<string, PendingRequest>();
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Make a safe API request with automatic cancellation and deduplication
   */
  async request(url: string, options: RequestOptions = {}): Promise<Response> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      deduplicate = true,
      ...fetchOptions
    } = options;

    // Create cache key for deduplication
    const cacheKey = deduplicate ? this.createCacheKey(url, fetchOptions) : `${url}:${Date.now()}:${Math.random()}`;

    // Check for existing request if deduplication is enabled
    if (deduplicate && this.requestCache.has(cacheKey)) {
      const existing = this.requestCache.get(cacheKey)!;
      
      // Return existing request if it's still fresh (within 1 second)
      if (Date.now() - existing.timestamp < 1000) {
        return existing.promise;
      } else {
        // Cancel stale request
        existing.controller.abort();
        this.requestCache.delete(cacheKey);
      }
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    // Create the request promise
    const promise = fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    }).finally(() => {
      // Cleanup
      clearTimeout(timeoutId);
      this.requestCache.delete(cacheKey);
    });

    // Cache the request
    const pendingRequest: PendingRequest = {
      promise,
      controller,
      timestamp: Date.now()
    };

    this.requestCache.set(cacheKey, pendingRequest);

    return promise;
  }

  /**
   * Make a safe JSON API request
   */
  async json<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [key, request] of this.requestCache.entries()) {
      request.controller.abort();
      this.requestCache.delete(key);
    }
  }

  /**
   * Cancel requests matching a URL pattern
   */
  cancelRequestsMatching(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const [key, request] of this.requestCache.entries()) {
      if (regex.test(key)) {
        request.controller.abort();
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Get number of pending requests
   */
  getPendingRequestCount(): number {
    return this.requestCache.size;
  }

  /**
   * Create a cache key for request deduplication
   */
  private createCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const headers = options.headers ? JSON.stringify(options.headers) : '';
    
    return `${method}:${url}:${body}:${headers}`;
  }

  /**
   * Clean up expired requests from cache
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    for (const [key, request] of this.requestCache.entries()) {
      if (now - request.timestamp > maxAge) {
        request.controller.abort();
        this.requestCache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const safeApi = new SafeApiClient();

// Convenience functions
export const safeRequest = (url: string, options?: RequestOptions) => 
  safeApi.request(url, options);

export const safeJson = <T = any>(url: string, options?: RequestOptions) => 
  safeApi.json<T>(url, options);

// React hook for safe API requests
import { useEffect, useRef } from 'react';

export function useSafeApi() {
  const controllerRef = useRef<AbortController | null>(null);

  // Create a new controller for this component instance
  useEffect(() => {
    controllerRef.current = new AbortController();
    
    return () => {
      // Cancel all requests when component unmounts
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const request = async (url: string, options: RequestOptions = {}) => {
    if (!controllerRef.current) {
      throw new Error('Component has been unmounted');
    }

    // Combine component-level signal with request-level signal
    const combinedSignal = options.signal 
      ? AbortSignal.any([controllerRef.current.signal, options.signal])
      : controllerRef.current.signal;

    return safeApi.request(url, {
      ...options,
      signal: combinedSignal
    });
  };

  const json = async <T = any>(url: string, options: RequestOptions = {}) => {
    const response = await request(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  };

  return {
    request,
    json,
    cancel: () => controllerRef.current?.abort(),
    isActive: () => controllerRef.current && !controllerRef.current.signal.aborted
  };
}

// Axios-style wrapper for compatibility
export class SafeAxios {
  static async get<T = any>(url: string, config: RequestOptions = {}): Promise<{ data: T }> {
    const data = await safeApi.json<T>(url, { ...config, method: 'GET' });
    return { data };
  }

  static async post<T = any>(url: string, data?: any, config: RequestOptions = {}): Promise<{ data: T }> {
    const responseData = await safeApi.json<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    return { data: responseData };
  }

  static async put<T = any>(url: string, data?: any, config: RequestOptions = {}): Promise<{ data: T }> {
    const responseData = await safeApi.json<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    return { data: responseData };
  }

  static async delete<T = any>(url: string, config: RequestOptions = {}): Promise<{ data: T }> {
    const data = await safeApi.json<T>(url, { ...config, method: 'DELETE' });
    return { data };
  }
}

export default safeApi;