/**
 * JWT Token Manager
 * Secure token storage and management with automatic refresh
 */

import { logger } from './logger';
import { authBackendService, JWTTokens } from '../services/authBackendService';

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  payload?: any;
}

export interface SecureStorageOptions {
  useSessionStorage?: boolean;
  encryptionKey?: string;
  prefix?: string;
}

class TokenManager {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly EXPIRES_AT_KEY = 'token_expires_at';
  private readonly USER_KEY = 'user_data';
  
  private refreshPromise: Promise<boolean> | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private options: SecureStorageOptions;

  constructor(options: SecureStorageOptions = {}) {
    this.options = {
      useSessionStorage: false,
      prefix: 'chanuka_',
      ...options
    };
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  private getStorage(): Storage {
    return this.options.useSessionStorage ? sessionStorage : localStorage;
  }

  private getKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  private setItem(key: string, value: string): void {
    try {
      const storage = this.getStorage();
      const fullKey = this.getKey(key);
      
      // Simple encryption if key provided
      const finalValue = this.options.encryptionKey 
        ? this.simpleEncrypt(value, this.options.encryptionKey)
        : value;
        
      storage.setItem(fullKey, finalValue);
    } catch (error) {
      logger.error('Failed to store item:', { component: 'TokenManager', key }, error);
    }
  }

  private getItem(key: string): string | null {
    try {
      const storage = this.getStorage();
      const fullKey = this.getKey(key);
      const value = storage.getItem(fullKey);
      
      if (!value) return null;
      
      // Simple decryption if key provided
      return this.options.encryptionKey 
        ? this.simpleDecrypt(value, this.options.encryptionKey)
        : value;
    } catch (error) {
      logger.error('Failed to retrieve item:', { component: 'TokenManager', key }, error);
      return null;
    }
  }

  private removeItem(key: string): void {
    try {
      const storage = this.getStorage();
      const fullKey = this.getKey(key);
      storage.removeItem(fullKey);
    } catch (error) {
      logger.error('Failed to remove item:', { component: 'TokenManager', key }, error);
    }
  }

  // Simple XOR encryption for basic obfuscation (not cryptographically secure)
  private simpleEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  private simpleDecrypt(encrypted: string, key: string): string {
    try {
      const text = atob(encrypted);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      logger.error('Failed to decrypt value:', { component: 'TokenManager' }, error);
      return '';
    }
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Store JWT tokens securely - HttpOnly cookies handled by server
   */
  storeTokens(tokens: JWTTokens, userData?: any): void {
    try {
      // Tokens are now stored in HttpOnly cookies by the server
      // Only store user data and expiration info for client-side logic
      if (userData) {
        this.setItem(this.USER_KEY, JSON.stringify(userData));
      }

      // Store expiration time for client-side refresh scheduling
      this.setItem(this.EXPIRES_AT_KEY, tokens.expiresAt.toString());

      // Schedule automatic refresh
      this.scheduleTokenRefresh(tokens.expiresAt);

      logger.info('Token metadata stored successfully (tokens in HttpOnly cookies)', {
        component: 'TokenManager',
        expiresAt: new Date(tokens.expiresAt).toISOString()
      });
    } catch (error) {
      logger.error('Failed to store token metadata:', { component: 'TokenManager' }, error);
    }
  }

  /**
   * Get stored token metadata - tokens themselves are in HttpOnly cookies
   */
  getTokens(): JWTTokens | null {
    try {
      // Tokens are stored in HttpOnly cookies, not accessible to client
      // Only return metadata for client-side logic
      const expiresAt = this.getItem(this.EXPIRES_AT_KEY);

      if (!expiresAt) {
        return null;
      }

      return {
        accessToken: '', // Not accessible to client
        refreshToken: '', // Not accessible to client
        expiresAt: parseInt(expiresAt, 10),
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to get token metadata:', { component: 'TokenManager' }, error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  getUserData(): any | null {
    try {
      const userData = this.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      logger.error('Failed to get user data:', { component: 'TokenManager' }, error);
      return null;
    }
  }

  /**
   * Clear stored token metadata - HttpOnly cookies cleared by server
   */
  clearTokens(): void {
    try {
      // Tokens in HttpOnly cookies are cleared by the server
      // Only clear client-side metadata
      this.removeItem(this.EXPIRES_AT_KEY);
      this.removeItem(this.USER_KEY);

      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
      }

      this.refreshPromise = null;

      logger.info('Token metadata cleared successfully (HttpOnly cookies cleared by server)', { component: 'TokenManager' });
    } catch (error) {
      logger.error('Failed to clear token metadata:', { component: 'TokenManager' }, error);
    }
  }

  // ============================================================================
  // Token Validation
  // ============================================================================

  /**
   * Validate JWT token - HttpOnly cookies validation via API
   */
  validateToken(token?: string): TokenValidationResult {
    try {
      // Since tokens are in HttpOnly cookies, we can't validate them directly
      // Check if we have expiration metadata stored
      const expiresAt = this.getItem(this.EXPIRES_AT_KEY);

      if (!expiresAt) {
        return {
          isValid: false,
          isExpired: true,
          needsRefresh: true
        };
      }

      const expirationTime = parseInt(expiresAt, 10);
      const now = Date.now();
      const isExpired = expirationTime <= now;
      const needsRefresh = expirationTime <= (now + 5 * 60 * 1000); // 5 minutes buffer

      return {
        isValid: !isExpired,
        isExpired: isExpired,
        needsRefresh: needsRefresh,
        payload: null // Can't access payload from HttpOnly cookie
      };
    } catch (error) {
      logger.error('Token validation failed:', { component: 'TokenManager' }, error);
      return {
        isValid: false,
        isExpired: true,
        needsRefresh: true
      };
    }
  }

  /**
   * Parse JWT payload without verification (for client-side use only)
   */
  private parseJWTPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      logger.error('JWT payload parsing failed:', { component: 'TokenManager' }, error);
      return null;
    }
  }

  // ============================================================================
  // Automatic Token Refresh
  // ============================================================================

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshTokenSilently();
      }, refreshTime);
      
      logger.info('Token refresh scheduled', { 
        component: 'TokenManager',
        refreshIn: `${Math.round(refreshTime / 1000)}s`
      });
    }
  }

  /**
   * Refresh token silently
   */
  private async refreshTokenSilently(): Promise<void> {
    try {
      const success = await this.refreshToken();
      if (success) {
        logger.info('Token refreshed silently', { component: 'TokenManager' });
      } else {
        logger.warn('Silent token refresh failed', { component: 'TokenManager' });
      }
    } catch (error) {
      logger.error('Silent token refresh error:', { component: 'TokenManager' }, error);
    }
  }

  /**
   * Refresh token with deduplication
   */
  async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const result = await authBackendService.refreshToken();
      
      if (result.success && result.tokens) {
        this.storeTokens(result.tokens, result.user);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'TokenManager' }, error);
      this.clearTokens();
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get authorization header value - not applicable for HttpOnly cookies
   */
  getAuthHeader(): string | null {
    // HttpOnly cookies are sent automatically by browser
    // No need to manually construct authorization header
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const validation = this.validateToken();
    return validation.isValid;
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry(): number | null {
    const tokens = this.getTokens();
    if (!tokens) return null;
    
    const now = Date.now();
    const timeLeft = Math.max(0, tokens.expiresAt - now);
    return Math.floor(timeLeft / 1000);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.refreshPromise = null;
  }
}

// Export singleton instance
export const tokenManager = new TokenManager({
  prefix: 'chanuka_auth_',
  encryptionKey: 'chanuka_civic_platform_2024' // Simple obfuscation key
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tokenManager.cleanup();
  });
}