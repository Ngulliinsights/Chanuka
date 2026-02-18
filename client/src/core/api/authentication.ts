/**
 * API Authentication Module
 *
 * Handles authentication-related API functionality including token management,
 * automatic token refresh, and authentication interceptors.
 */

import { logger } from '@client/lib/utils/logger';

import { tokenManager } from '../auth';

import { ApiError, BaseClientRequest } from './types/interceptors';

/**
 * Authentication configuration for API clients
 */
export interface AuthConfig {
  tokenRefreshEndpoint: string;
  tokenRefreshThreshold: number; // Minutes before expiry to refresh
  maxRefreshAttempts: number;
  onAuthFailure?: () => void;
}

/**
 * Authentication interceptor that adds bearer tokens to requests
 */
export class AuthenticationInterceptor {
  async intercept(request: BaseClientRequest): Promise<BaseClientRequest> {
    const token = await tokenManager.getAccessToken();
    if (token) {
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    return request;
  }
}

/**
 * Token refresh interceptor that handles 401 errors by refreshing tokens
 */
export class TokenRefreshInterceptor {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(private config: AuthConfig) {}

  async intercept(error: ApiError): Promise<ApiError> {
    if (error.statusCode === 401) {
      // Prevent multiple simultaneous refresh attempts
      if (this.isRefreshing && this.refreshPromise) {
        await this.refreshPromise;
        return error;
      }

      const refreshToken = await tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          this.refreshPromise = this.refreshAuthToken(refreshToken);
          await this.refreshPromise;
          // Request will be retried with the new token
          return error;
        } catch (refreshError) {
          logger.error('Token refresh failed', { refreshError });
          await tokenManager.clearTokens();
          this.handleAuthenticationFailure();
        } finally {
          this.isRefreshing = false;
          this.refreshPromise = null;
        }
      } else {
        // No refresh token available, user must log in
        this.handleAuthenticationFailure();
      }
    }
    return error;
  }

  /**
   * Refreshes the authentication token using the refresh token
   */
  public async refreshAuthToken(refreshToken: string): Promise<void> {
    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.config.tokenRefreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
      };

      await tokenManager.storeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: new Date(data.expiresAt),
        tokenType: 'Bearer',
      });

      logger.info('Authentication token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh authentication token', { error });
      throw error;
    }
  }

  /**
   * Handles authentication failure by notifying the application
   */
  private handleAuthenticationFailure(): void {
    logger.warn('Authentication failed, user needs to login');

    if (this.config.onAuthFailure) {
      this.config.onAuthFailure();
    }

    const event = new CustomEvent('auth:failure', {
      detail: { reason: 'token_expired' },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }
}

/**
 * Checks if a token needs to be refreshed based on expiry time
 */
export async function shouldRefreshToken(thresholdMinutes: number = 5): Promise<boolean> {
  const token = await tokenManager.getAccessToken();
  if (!token) return false;

  const expiresAt = await tokenManager.getTokenExpiration();
  if (!expiresAt) return false;

  const now = new Date();
  const threshold = new Date(now.getTime() + thresholdMinutes * 60 * 1000);

  return expiresAt <= threshold;
}

/**
 * Proactively refreshes token if it's close to expiry
 */
export async function proactiveTokenRefresh(config: AuthConfig): Promise<void> {
  if (await shouldRefreshToken(config.tokenRefreshThreshold)) {
    const refreshToken = await tokenManager.getRefreshToken();
    if (refreshToken) {
      const interceptor = new TokenRefreshInterceptor(config);
      try {
        await (interceptor as TokenRefreshInterceptor).refreshAuthToken(refreshToken);
      } catch (error) {
        logger.warn('Proactive token refresh failed', { error });
      }
    }
  }
}

/**
 * Creates authentication interceptors with the given configuration
 */
export function createAuthInterceptors(config: AuthConfig) {
  return {
    request: new AuthenticationInterceptor(),
    error: new TokenRefreshInterceptor(config),
  };
}

/**
 * Default authentication configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  tokenRefreshEndpoint: '/api/auth/refresh',
  tokenRefreshThreshold: 5, // 5 minutes
  maxRefreshAttempts: 3,
};
