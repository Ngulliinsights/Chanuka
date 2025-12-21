/**
 * Authenticated API Client Module
 * 
 * Extends the base API client with authentication capabilities including
 * automatic token injection, token refresh, and authentication error handling.
 */

import { logger } from '../../utils/logger';
import { tokenManager } from '../auth';

import { /* AuthenticationInterceptor, */ TokenRefreshInterceptor, DEFAULT_AUTH_CONFIG, AuthConfig } from './authentication';
import { BaseApiClient, ApiClientConfig, ApiRequest, RequestBody } from './base-client';

/**
 * Configuration for authenticated API client
 */
export interface AuthenticatedApiClientConfig extends ApiClientConfig {
  auth?: AuthConfig;
}

/**
 * Authenticated API Client class
 */
export class AuthenticatedApiClient extends BaseApiClient {
  private authConfig: AuthConfig;
  private tokenRefreshInterceptor!: TokenRefreshInterceptor;

  constructor(config: Partial<AuthenticatedApiClientConfig> = {}) {
    super(config);

    this.authConfig = {
      ...DEFAULT_AUTH_CONFIG,
      ...config.auth,
      tokenRefreshEndpoint: config.auth?.tokenRefreshEndpoint || `${this.config.baseURL}/auth/refresh`
    };

    this.setupAuthInterceptors();
  }

  /**
   * Sets up authentication interceptors
   */
  private setupAuthInterceptors(): void {
    // Create interceptors
    // const _authInterceptor = new AuthenticationInterceptor();
    this.tokenRefreshInterceptor = new TokenRefreshInterceptor(this.authConfig);

    // Add request interceptor for token injection
    this.addRequestInterceptor(async (request) => {
      const token = await tokenManager.getAccessToken();
      if (token) {
        return {
          ...request,
          headers: {
            ...request.headers,
            'Authorization': `Bearer ${token}`
          }
        };
      }
      return request;
    });

    // Add error interceptor for token refresh
    this.addErrorInterceptor(this.tokenRefreshInterceptor.intercept.bind(this.tokenRefreshInterceptor));

    logger.debug('Authentication interceptors configured', {
      component: 'AuthenticatedApiClient',
      tokenRefreshEndpoint: this.authConfig.tokenRefreshEndpoint
    });
  }

  /**
   * Updates authentication configuration
   */
  updateAuthConfig(config: Partial<AuthConfig>): void {
    this.authConfig = { ...this.authConfig, ...config };

    // Update token refresh interceptor with new config
    this.tokenRefreshInterceptor = new TokenRefreshInterceptor(this.authConfig);

    logger.info('Authentication configuration updated', {
      component: 'AuthenticatedApiClient',
      config: this.authConfig
    });
  }

  /**
   * Gets current authentication configuration
   */
  getAuthConfig(): Readonly<AuthConfig> {
    return { ...this.authConfig };
  }

  /**
   * Makes an authenticated request (convenience method)
   */
  async authenticatedRequest<T = unknown>(request: ApiRequest) {
    return this.request<T>(request);
  }

  /**
   * Authenticated GET request
   */
  async secureGet<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ) {
    return this.get<T>(url, headers);
  }

  /**
   * Authenticated POST request
   */
  async securePost<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ) {
    return this.post<T>(url, body, headers);
  }

  /**
   * Authenticated PUT request
   */
  async securePut<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ) {
    return this.put<T>(url, body, headers);
  }

  /**
   * Authenticated DELETE request
   */
  async secureDelete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ) {
    return this.delete<T>(url, headers);
  }

  /**
   * Authenticated PATCH request
   */
  async securePatch<T = unknown>(
    url: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ) {
    return this.patch<T>(url, body, headers);
  }
}