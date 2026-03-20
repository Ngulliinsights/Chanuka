/**
 * Authentication Service Initialization - Core Auth
 *
 * Migrated from client/src/services/auth-service-init.ts
 * Handles the initialization and configuration of authentication services
 * for the civic engagement platform.
 */

import { logger } from '@client/lib/utils/logger';

interface AuthConfig {
  apiBaseUrl: string;
  tokenStorageKey: string;
  refreshTokenKey: string;
  sessionTimeout: number; // minutes
  enableRememberMe: boolean;
  enableSocialAuth: boolean;
  socialProviders: string[];
  enableMFA: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: unknown | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

class AuthServiceInitializer {
  private config: AuthConfig;
  private state: AuthState;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.state = {
      isInitialized: false,
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
    };
  }

  /**
   * Initialize the authentication service
   */
  async initialize(customConfig?: Partial<AuthConfig>): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(customConfig);
    return this.initializationPromise;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.state };
  }

  /**
   * Get authentication configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Reinitialize with new configuration
   */
  async reinitialize(config: Partial<AuthConfig>): Promise<void> {
    this.state.isInitialized = false;
    this.initializationPromise = null;
    await this.initialize(config);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async performInitialization(customConfig?: Partial<AuthConfig>): Promise<void> {
    try {
      logger.info('Initializing authentication service', {
        component: 'AuthServiceInitializer',
      });

      // Merge custom config with defaults
      if (customConfig) {
        this.config = { ...this.config, ...customConfig };
      }

      // Validate configuration
      this.validateConfig();

      // Initialize token storage
      await this.initializeTokenStorage();

      // Check for existing session
      await this.checkExistingSession();

      // Setup token refresh timer
      this.setupTokenRefresh();

      // Setup session timeout
      this.setupSessionTimeout();

      this.state.isInitialized = true;

      logger.info('Authentication service initialized successfully', {
        component: 'AuthServiceInitializer',
        isAuthenticated: this.state.isAuthenticated,
        hasUser: !!this.state.user,
      });
    } catch (error) {
      logger.error('Failed to initialize authentication service', {
        component: 'AuthServiceInitializer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private getDefaultConfig(): AuthConfig {
    return {
      apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      tokenStorageKey: 'civic_auth_token',
      refreshTokenKey: 'civic_refresh_token',
      sessionTimeout: 480, // 8 hours
      enableRememberMe: true,
      enableSocialAuth: true,
      socialProviders: ['google', 'facebook', 'twitter'],
      enableMFA: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
    };
  }

  private validateConfig(): void {
    if (!this.config.apiBaseUrl) {
      throw new Error('API base URL is required');
    }

    if (this.config.sessionTimeout < 5) {
      throw new Error('Session timeout must be at least 5 minutes');
    }

    if (this.config.passwordPolicy.minLength < 6) {
      throw new Error('Password minimum length must be at least 6 characters');
    }

    logger.debug('Authentication configuration validated', {
      component: 'AuthServiceInitializer',
      config: {
        apiBaseUrl: this.config.apiBaseUrl,
        sessionTimeout: this.config.sessionTimeout,
        enableSocialAuth: this.config.enableSocialAuth,
        enableMFA: this.config.enableMFA,
      },
    });
  }

  private async initializeTokenStorage(): Promise<void> {
    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined') {
        logger.warn('localStorage not available, using memory storage', {
          component: 'AuthServiceInitializer',
        });
        return;
      }

      // Migrate old token keys if they exist
      await this.migrateOldTokens();

      logger.debug('Token storage initialized', {
        component: 'AuthServiceInitializer',
      });
    } catch (error) {
      logger.error('Failed to initialize token storage', {
        component: 'AuthServiceInitializer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async checkExistingSession(): Promise<void> {
    try {
      const token = localStorage.getItem(this.config.tokenStorageKey);
      const refreshToken = localStorage.getItem(this.config.refreshTokenKey);

      if (!token) {
        logger.debug('No existing session found', {
          component: 'AuthServiceInitializer',
        });
        return;
      }

      // Validate token format and expiration
      const tokenData = this.parseToken(token);
      if (!tokenData || this.isTokenExpired(tokenData)) {
        logger.debug('Existing token is invalid or expired', {
          component: 'AuthServiceInitializer',
        });

        // Try to refresh if refresh token exists
        if (refreshToken) {
          await this.attemptTokenRefresh(refreshToken);
        } else {
          this.clearStoredTokens();
        }
        return;
      }

      // Restore session state
      this.state.token = token;
      this.state.refreshToken = refreshToken;
      this.state.expiresAt = tokenData.exp * 1000; // Convert to milliseconds
      this.state.user = tokenData.user;
      this.state.isAuthenticated = true;

      logger.info('Existing session restored', {
        component: 'AuthServiceInitializer',
        userId: (tokenData?.user as any)?.id || 'unknown',
        expiresAt: new Date(this.state.expiresAt!),
      });
    } catch (error) {
      logger.error('Failed to check existing session', {
        component: 'AuthServiceInitializer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear potentially corrupted tokens
      this.clearStoredTokens();
    }
  }

  private setupTokenRefresh(): void {
    if (!this.state.isAuthenticated || !this.state.expiresAt) {
      return;
    }

    const now = Date.now();
    const expiresAt = this.state.expiresAt;
    const refreshTime = expiresAt - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshTime <= now) {
      // Token expires soon, refresh immediately
      this.refreshTokenIfNeeded();
      return;
    }

    // Schedule refresh
    const timeUntilRefresh = refreshTime - now;
    setTimeout(() => {
      this.refreshTokenIfNeeded();
    }, timeUntilRefresh);

    logger.debug('Token refresh scheduled', {
      component: 'AuthServiceInitializer',
      refreshAt: new Date(refreshTime),
      timeUntilRefresh: Math.round(timeUntilRefresh / 1000 / 60), // minutes
    });
  }

  private setupSessionTimeout(): void {
    if (!this.config.sessionTimeout || !this.state.isAuthenticated) {
      return;
    }

    const timeoutMs = this.config.sessionTimeout * 60 * 1000;

    setTimeout(() => {
      if (this.state.isAuthenticated) {
        logger.info('Session timeout reached, logging out', {
          component: 'AuthServiceInitializer',
        });
        this.logout();
      }
    }, timeoutMs);
  }

  private parseToken(token: string): { exp: number; user?: unknown } | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      logger.debug('Failed to parse token', {
        component: 'AuthServiceInitializer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private isTokenExpired(tokenData: { exp?: number }): boolean {
    if (!tokenData.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return tokenData.exp <= now;
  }

  private async attemptTokenRefresh(refreshToken: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Update stored tokens
      localStorage.setItem(this.config.tokenStorageKey, data.token);
      if (data.refreshToken) {
        localStorage.setItem(this.config.refreshTokenKey, data.refreshToken);
      }

      // Update state
      const tokenData = this.parseToken(data.token);
      this.state.token = data.token;
      this.state.refreshToken = data.refreshToken || refreshToken;
      this.state.expiresAt = tokenData?.exp ? tokenData.exp * 1000 : Date.now() + 3600000;
      this.state.user = tokenData?.user || null;
      this.state.isAuthenticated = true;

      logger.info('Token refreshed successfully', {
        component: 'AuthServiceInitializer',
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        component: 'AuthServiceInitializer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.clearStoredTokens();
    }
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.state.refreshToken) {
      return;
    }

    await this.attemptTokenRefresh(this.state.refreshToken);

    // Schedule next refresh
    this.setupTokenRefresh();
  }

  private async migrateOldTokens(): Promise<void> {
    // Check for old token keys and migrate them
    const oldTokenKeys = ['auth_token', 'user_token', 'access_token'];

    for (const oldKey of oldTokenKeys) {
      const oldToken = localStorage.getItem(oldKey);
      if (oldToken && !localStorage.getItem(this.config.tokenStorageKey)) {
        localStorage.setItem(this.config.tokenStorageKey, oldToken);
        localStorage.removeItem(oldKey);

        logger.info('Migrated old token', {
          component: 'AuthServiceInitializer',
          oldKey,
          newKey: this.config.tokenStorageKey,
        });
      }
    }
  }

  private clearStoredTokens(): void {
    localStorage.removeItem(this.config.tokenStorageKey);
    localStorage.removeItem(this.config.refreshTokenKey);

    this.state.token = null;
    this.state.refreshToken = null;
    this.state.expiresAt = null;
    this.state.user = null;
    this.state.isAuthenticated = false;
  }

  private logout(): void {
    this.clearStoredTokens();

    // Redirect to login page or emit logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));

    logger.info('User logged out', {
      component: 'AuthServiceInitializer',
    });
  }
}

// Export singleton instance
export const authServiceInitializer = new AuthServiceInitializer();

// Export utility functions
export const authUtils = {
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword(
    password: string,
    policy: AuthConfig['passwordPolicy']
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  },
};

export default authServiceInitializer;
