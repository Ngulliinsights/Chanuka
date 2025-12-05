/**
 * Token Manager Module
 * 
 * Handles authentication token storage with encryption, automatic expiration,
 * and token refresh capabilities. Provides secure token management.
 */

import { logger } from '../../utils/logger';
import { SecureStorage } from './secure-storage';
import { 
  TokenInfo, 
  TokenValidation, 
  StorageError,
  StorageErrorCode
} from './types';

/**
 * Creates a token-specific storage error
 */
function createTokenError(
  code: StorageErrorCode,
  message: string,
  context?: Record<string, unknown>
): StorageError {
  const error = new Error(message) as StorageError;
  error.code = code;
  error.context = context;
  error.recoverable = code !== 'STORAGE_NOT_AVAILABLE';
  return error;
}

/**
 * TokenManager handles authentication token storage with encryption.
 * Automatically checks token expiration and provides convenient access methods.
 */
export class TokenManager {
  private static instance: TokenManager;
  private storage: SecureStorage;
  private readonly tokenKey = 'auth_tokens';
  private readonly authNamespace = 'auth';
  private currentTokens: TokenInfo | null = null;
  private tokenCheckInterval: NodeJS.Timeout | null = null;
  private refreshCallback: (() => Promise<TokenInfo | null>) | null = null;

  private constructor() {
    this.storage = SecureStorage.getInstance();
    this.loadTokens();
    this.startTokenMonitoring();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Loads tokens from storage
   */
  private async loadTokens(): Promise<void> {
    try {
      const tokens = await this.storage.getItem<TokenInfo>(this.tokenKey, {
        encrypt: true,
        namespace: this.authNamespace
      });

      if (tokens) {
        // Ensure dates are properly converted
        tokens.expiresAt = new Date(tokens.expiresAt);
        if (tokens.issuedAt) {
          tokens.issuedAt = new Date(tokens.issuedAt);
        }

        const validation = this.validateToken(tokens);
        if (validation.isValid) {
          this.currentTokens = tokens;
        } else {
          // Tokens invalid, clean up
          await this.clearTokens();
        }
      }
    } catch (error) {
      logger.error('Failed to load tokens', { error });
    }
  }

  /**
   * Stores authentication tokens with encryption
   */
  async storeTokens(tokenInfo: TokenInfo): Promise<void> {
    try {
      // Ensure dates are Date objects and add metadata
      const tokens: TokenInfo = {
        ...tokenInfo,
        expiresAt: new Date(tokenInfo.expiresAt),
        issuedAt: tokenInfo.issuedAt ? new Date(tokenInfo.issuedAt) : new Date()
      };

      // Calculate TTL from expiration time
      const ttl = tokens.expiresAt.getTime() - Date.now();

      await this.storage.setItem(this.tokenKey, tokens, {
        encrypt: true,
        namespace: this.authNamespace,
        ttl: ttl > 0 ? ttl : undefined
      });

      this.currentTokens = tokens;

      logger.info('Tokens stored', {
        tokenType: tokens.tokenType,
        expiresAt: tokens.expiresAt.toISOString(),
        hasRefreshToken: !!tokens.refreshToken,
        scope: tokens.scope,
        issuer: tokens.issuer
      });
    } catch (error) {
      logger.error('Failed to store tokens', { error });
      throw createTokenError('INVALID_DATA', 'Failed to store authentication tokens', { tokenInfo });
    }
  }

  /**
   * Retrieves tokens if they exist and haven't expired
   */
  async getTokens(): Promise<TokenInfo | null> {
    try {
      // Check in-memory cache first
      if (this.currentTokens) {
        const validation = this.validateToken(this.currentTokens);
        if (validation.isValid) {
          return this.currentTokens;
        } else {
          // Tokens invalid, try to refresh or clear
          if (validation.needsRefresh && this.refreshCallback) {
            const refreshedTokens = await this.attemptTokenRefresh();
            if (refreshedTokens) {
              return refreshedTokens;
            }
          }
          await this.clearTokens();
          return null;
        }
      }

      // Load from storage
      await this.loadTokens();
      return this.currentTokens;
    } catch (error) {
      logger.error('Failed to get tokens', { error });
      return null;
    }
  }

  /**
   * Gets only the access token
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Gets only the refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Gets the token expiration time
   */
  async getTokenExpiry(): Promise<Date | null> {
    const tokens = await this.getTokens();
    return tokens?.expiresAt || null;
  }

  /**
   * Validates tokens and returns detailed validation result
   */
  validateToken(tokens: TokenInfo): TokenValidation {
    if (!tokens) {
      return {
        isValid: false,
        reason: 'not_found'
      };
    }

    try {
      // Check expiration
      const now = new Date();
      const expiresAt = new Date(tokens.expiresAt);
      
      if (expiresAt <= now) {
        return {
          isValid: false,
          reason: 'expired',
          expiresIn: 0,
          needsRefresh: !!tokens.refreshToken
        };
      }

      // Check required fields
      if (!tokens.accessToken || !tokens.tokenType) {
        return {
          isValid: false,
          reason: 'invalid_format'
        };
      }

      const expiresIn = expiresAt.getTime() - now.getTime();
      
      // Check if token needs refresh (within 5 minutes of expiry)
      const needsRefresh = expiresIn < 5 * 60 * 1000 && !!tokens.refreshToken;

      return {
        isValid: true,
        expiresIn,
        needsRefresh
      };
    } catch (error) {
      logger.error('Token validation failed', { error });
      return {
        isValid: false,
        reason: 'corrupted'
      };
    }
  }

  /**
   * Removes tokens from storage
   */
  async clearTokens(): Promise<void> {
    try {
      this.storage.removeItem(this.tokenKey, {
        namespace: this.authNamespace
      });

      this.currentTokens = null;

      logger.info('Tokens cleared');
    } catch (error) {
      logger.error('Failed to clear tokens', { error });
    }
  }

  /**
   * Gets the time in milliseconds until token expiry
   */
  async getTimeUntilExpiry(): Promise<number | null> {
    const tokens = await this.getTokens();
    if (!tokens) return null;
    return tokens.expiresAt.getTime() - Date.now();
  }

  /**
   * Checks if valid tokens exist
   */
  async isTokenValid(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  /**
   * Checks if the token is about to expire (within specified minutes)
   */
  async isTokenExpiringSoon(withinMinutes: number = 5): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens) return false;

    const expiresAt = new Date(tokens.expiresAt).getTime();
    const expiryThreshold = Date.now() + withinMinutes * 60 * 1000;

    return expiresAt <= expiryThreshold;
  }

  /**
   * Sets a callback function for token refresh
   */
  setRefreshCallback(callback: () => Promise<TokenInfo | null>): void {
    this.refreshCallback = callback;
  }

  /**
   * Attempts to refresh tokens using the refresh callback
   */
  async attemptTokenRefresh(): Promise<TokenInfo | null> {
    if (!this.refreshCallback) {
      logger.warn('No refresh callback set, cannot refresh tokens');
      return null;
    }

    try {
      logger.info('Attempting token refresh');
      const newTokens = await this.refreshCallback();
      
      if (newTokens) {
        await this.storeTokens(newTokens);
        logger.info('Token refresh successful');
        return newTokens;
      } else {
        logger.warn('Token refresh returned null');
        return null;
      }
    } catch (error) {
      logger.error('Token refresh failed', { error });
      return null;
    }
  }

  /**
   * Manually refreshes tokens if refresh token is available
   */
  async refreshTokens(): Promise<boolean> {
    const refreshedTokens = await this.attemptTokenRefresh();
    return refreshedTokens !== null;
  }

  /**
   * Updates token metadata without changing the tokens themselves
   */
  async updateTokenMetadata(updates: Partial<Pick<TokenInfo, 'scope' | 'issuer' | 'audience'>>): Promise<void> {
    if (!this.currentTokens) {
      throw createTokenError('ENTRY_NOT_FOUND', 'No tokens to update');
    }

    try {
      this.currentTokens = { ...this.currentTokens, ...updates };
      
      const ttl = this.currentTokens.expiresAt.getTime() - Date.now();
      
      await this.storage.setItem(this.tokenKey, this.currentTokens, {
        encrypt: true,
        namespace: this.authNamespace,
        ttl: ttl > 0 ? ttl : undefined
      });

      logger.debug('Token metadata updated', { 
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to update token metadata', { error });
      throw createTokenError('INVALID_DATA', 'Failed to update token metadata', { updates });
    }
  }

  /**
   * Gets token statistics
   */
  async getTokenStats() {
    const tokens = this.currentTokens;
    if (!tokens) {
      return null;
    }

    const now = new Date();
    const issuedAt = tokens.issuedAt ? new Date(tokens.issuedAt) : null;
    const expiresAt = new Date(tokens.expiresAt);
    const validation = this.validateToken(tokens);

    return {
      isValid: validation.isValid,
      expiresIn: validation.expiresIn,
      needsRefresh: validation.needsRefresh,
      tokenType: tokens.tokenType,
      hasRefreshToken: !!tokens.refreshToken,
      scope: tokens.scope,
      issuer: tokens.issuer,
      audience: tokens.audience,
      age: issuedAt ? now.getTime() - issuedAt.getTime() : null,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Checks if token has a specific scope
   */
  hasScope(scope: string): boolean {
    return this.currentTokens?.scope?.includes(scope) ?? false;
  }

  /**
   * Gets all available scopes
   */
  getScopes(): string[] {
    return this.currentTokens?.scope || [];
  }

  /**
   * Starts monitoring token validity and automatic refresh
   */
  private startTokenMonitoring(): void {
    // Check token validity every 30 seconds
    this.tokenCheckInterval = setInterval(async () => {
      if (this.currentTokens) {
        const validation = this.validateToken(this.currentTokens);
        
        if (!validation.isValid) {
          if (validation.needsRefresh && this.refreshCallback) {
            logger.info('Token expired, attempting refresh');
            const refreshed = await this.attemptTokenRefresh();
            if (!refreshed) {
              logger.warn('Token refresh failed, clearing tokens');
              await this.clearTokens();
            }
          } else {
            logger.info('Token expired, no refresh available');
            await this.clearTokens();
          }
        } else if (validation.needsRefresh && this.refreshCallback) {
          logger.info('Token expiring soon, attempting proactive refresh');
          await this.attemptTokenRefresh();
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stops token monitoring
   */
  stopMonitoring(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Cleanup method for proper shutdown
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.refreshCallback = null;
    // Don't clear tokens on cleanup, just stop monitoring
  }
}