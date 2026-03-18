/**
 * Authenticated API Client
 * HTTP client with built-in authentication handling
 *
 * @deprecated Use globalApiClient with createAuthRequestInterceptor instead.
 * This client lacks retry logic, caching, circuit breaker, and proper token management.
 * Will be removed in v2.0.0
 *
 * @example
 * // ❌ Don't use this:
 * const client = new AuthenticatedApiClient();
 * await client.get('/api/users');
 *
 * // ✅ Use this instead:
 * import { globalApiClient, createAuthRequestInterceptor } from '@client/infrastructure/api';
 * import { getAuthToken } from '@client/infrastructure/auth';
 *
 * globalApiClient.addRequestInterceptor(
 *   createAuthRequestInterceptor(() => getAuthToken())
 * );
 * await globalApiClient.get('/api/users');
 *
 * @see {@link globalApiClient} for the recommended API client
 * @see {@link createAuthRequestInterceptor} for authentication setup
 */
export interface AuthenticatedApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * @deprecated Use globalApiClient with createAuthRequestInterceptor instead.
 * Will be removed in v2.0.0
 */
export class AuthenticatedApiClient {
  constructor(private _config: AuthenticatedApiClientConfig = {}) {
    // Configuration is stored for potential future use
    this._config = { ..._config };
  }

  /**
   * @deprecated Use globalApiClient.get() instead
   */
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    return response.json() as Promise<T>;
  }

  /**
   * @deprecated Use globalApiClient.post() instead
   */
  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  }

  /**
   * @deprecated Use globalApiClient.put() instead
   */
  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  }

  /**
   * @deprecated Use globalApiClient.delete() instead
   */
  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    return response.json() as Promise<T>;
  }
}
