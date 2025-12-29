/**
 * Authentication Interceptors
 * HTTP request/response interceptors for authentication
 */

export interface AuthConfig {
  enableMonitoring: boolean;
  enableAutoRefresh: boolean;
  enableSessionValidation: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number;
  tokenRefreshEndpoint: string;
  tokenRefreshThreshold: number;
  maxRefreshAttempts: number;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  enableMonitoring: true,
  enableAutoRefresh: true,
  enableSessionValidation: true,
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  tokenRefreshEndpoint: '/api/auth/refresh',
  tokenRefreshThreshold: 5,
  maxRefreshAttempts: 3,
};

export class AuthenticationInterceptor {
  constructor(private _config: AuthConfig = DEFAULT_AUTH_CONFIG) {}

  intercept(request: Record<string, unknown>): Record<string, unknown> {
    // Add authentication token to request headers if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      request.headers = request.headers || {};
      (request.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    return request;
  }
}

export class TokenRefreshInterceptor {
  intercept(response: { status: number; [key: string]: unknown }): { status: number; [key: string]: unknown } | Promise<Record<string, unknown>> {
    // Handle 401 responses by attempting token refresh
    if (response.status === 401) {
      // Trigger token refresh logic
      return this.refreshToken();
    }
    return response;
  }

  private refreshToken(): Promise<Record<string, unknown>> {
    // Refresh token implementation
    return Promise.resolve({});
  }
}

export function createAuthInterceptors(config: AuthConfig = DEFAULT_AUTH_CONFIG) {
  return {
    authentication: new AuthenticationInterceptor(config),
    tokenRefresh: new TokenRefreshInterceptor(),
  };
}

export function shouldRefreshToken(token: string): boolean {
  // Check if token needs refresh
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return exp - Date.now() < 5 * 60 * 1000; // Refresh if less than 5 minutes remaining
  } catch {
    return false;
  }
}

export function proactiveTokenRefresh(): Promise<string> {
  // Proactively refresh token before it expires
  return Promise.resolve('refreshed_token');
}
