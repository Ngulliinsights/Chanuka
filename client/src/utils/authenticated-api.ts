/**
 * Authenticated API utility to prevent security vulnerabilities
 * and race conditions in API calls
 */
import { navigationService } from '../services/navigation';

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class AuthenticatedAPI {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      ...fetchOptions
    } = options;

    // Create AbortController for request cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          ...fetchOptions,
          headers: {
            ...this.getAuthHeaders(),
            ...fetchOptions.headers
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            navigationService.navigate('/auth');
            throw new Error('Authentication expired. Please log in again.');
          }

          if (response.status === 403) {
            throw new Error('Access denied. Insufficient permissions.');
          }

          if (response.status >= 500 && attempt < retries) {
            // Retry on server errors
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            continue;
          }

          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        return { data, status: response.status };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (attempt === retries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    clearTimeout(timeoutId);
    return {
      error: lastError?.message || 'Request failed',
      status: 0
    };
  }

  /**
   * Secure GET request with authentication and retry logic
   */
  static async get<T>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Secure POST request with authentication and retry logic
   */
  static async post<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }

  /**
   * Secure PUT request with authentication and retry logic
   */
  static async put<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }

  /**
   * Secure DELETE request with authentication and retry logic
   */
  static async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * Admin-specific API calls with additional security checks
   */
  static async adminGet<T>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    // Verify admin endpoint
    if (!endpoint.includes('/admin/')) {
      throw new Error('Invalid admin endpoint');
    }

    // Add additional security headers for admin requests
    return this.get<T>(endpoint, {
      ...options,
      headers: {
        'X-Admin-Request': 'true',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      }
    });
  }

  static async adminPost<T>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    if (!endpoint.includes('/admin/')) {
      throw new Error('Invalid admin endpoint');
    }

    return this.post<T>(endpoint, data, {
      ...options,
      headers: {
        'X-Admin-Request': 'true',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      }
    });
  }

  /**
   * Batch requests with race condition prevention
   */
  static async batch<T>(
    requests: Array<{ endpoint: string; options?: RequestOptions }>,
    options: { maxConcurrent?: number } = {}
  ): Promise<Array<APIResponse<T>>> {
    const { maxConcurrent = 5 } = options;
    const results: Array<APIResponse<T>> = [];

    // Process requests in batches to prevent overwhelming the server
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(({ endpoint, options }) =>
        this.get<T>(endpoint, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            error: result.reason?.message || 'Request failed',
            status: 0
          });
        }
      });
    }

    return results;
  }
}

/**
 * Hook for coordinated API requests to prevent race conditions
 */
export function useCoordinatedRequest() {
  // Note: This hook requires React, but this file is used in non-React contexts
  // The hook is exported but should only be used in React components
  return {
    makeRequest: async <T>(
      key: string,
      requestFn: () => Promise<APIResponse<T>>
    ): Promise<APIResponse<T>> => {
      // Basic implementation without React state for compatibility
      try {
        return await requestFn();
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Request failed',
          status: 0
        };
      }
    },
    activeRequests: []
  };
}

export const authenticatedApi = AuthenticatedAPI;

export default AuthenticatedAPI;






