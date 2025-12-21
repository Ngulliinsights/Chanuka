/**
 * Authenticated API Client
 * HTTP client with built-in authentication handling
 */

export interface AuthenticatedApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
}

export class AuthenticatedApiClient {
  constructor(private config: AuthenticatedApiClientConfig = {}) {
    // Configuration is stored for potential future use
    this.config = { ...config };
  }

  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    return response.json() as Promise<T>;
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });
    return response.json() as Promise<T>;
  }
}
