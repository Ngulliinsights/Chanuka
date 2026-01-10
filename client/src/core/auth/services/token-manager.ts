/**
 * Consolidated Token Manager
 *
 * Unified implementation that consolidates:
 * - TokenManager from utils/storage.ts
 * - tokenManager references in authentication.ts
 * - All token-related functionality
 */

import { logger } from '@client/shared/utils/logger';

import { createError } from '../../error';
import { ErrorDomain, ErrorSeverity } from '../../error/constants';
import { SecureStorage } from '../../storage/secure-storage';
import { TOKEN_KEY, TOKEN_STORAGE_NAMESPACE } from '../constants/auth-constants';
import type { AuthTokens, TokenInfo } from '../types';

/**
 * TokenManager handles authentication token storage with encryption.
 * Automatically checks token expiration and provides convenient access methods.
 */
export class TokenManager {
  private static instance: TokenManager;
  private storage: SecureStorage;
  private readonly tokenKey = TOKEN_KEY;
  private readonly authNamespace = TOKEN_STORAGE_NAMESPACE;
  private currentTokens: TokenInfo | null = null;

  private constructor() {
    this.storage = SecureStorage.getInstance();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Stores authentication tokens with encryption
   */
  async storeTokens(tokenInfo: TokenInfo | AuthTokens): Promise<void> {
    try {
      // Normalize the token format
      const tokens: TokenInfo = this.normalizeTokenInfo(tokenInfo);

      // Calculate TTL from expiration time
      const ttl = tokens.expiresAt.getTime() - Date.now();

      await this.storage.setItem(this.tokenKey, tokens, {
        encrypt: true,
        namespace: this.authNamespace,
        ttl: ttl > 0 ? ttl : undefined,
      });

      this.currentTokens = tokens;

      logger.info('Tokens stored', {
        tokenType: tokens.tokenType,
        expiresAt: tokens.expiresAt.toISOString(),
        hasRefreshToken: !!tokens.refreshToken,
        scope: tokens.scope,
      });
    } catch (error) {
      logger.error('Failed to store tokens', { error });
      throw createError(
        ErrorDomain.DATABASE,
        ErrorSeverity.HIGH,
        'Failed to store authentication tokens',
        { details: { tokenInfo, error } }
      );
    }
  }

  /**
   * Retrieves tokens if they exist and haven't expired
   */
  async getTokens(): Promise<TokenInfo | null> {
    try {
      // Check in-memory cache first
      if (this.currentTokens && this.currentTokens.expiresAt > new Date()) {
        return this.currentTokens;
      }

      const tokens = await this.storage.getItem<TokenInfo>(this.tokenKey, {
        encrypt: true,
        namespace: this.authNamespace,
      });

      if (!tokens) {
        this.currentTokens = null;
        return null;
      }

      // Ensure expiresAt is a Date object
      tokens.expiresAt = new Date(tokens.expiresAt);

      // Check if tokens have expired
      if (tokens.expiresAt > new Date()) {
        this.currentTokens = tokens;
        return tokens;
      } else {
        // Tokens expired, clean up
        await this.clearTokens();
        return null;
      }
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
  async getTokenExpiration(): Promise<Date | null> {
    const tokens = await this.getTokens();
    return tokens?.expiresAt || null;
  }

  /**
   * Removes tokens from storage
   */
  async clearTokens(): Promise<void> {
    try {
      this.storage.removeItem(this.tokenKey, {
        namespace: this.authNamespace,
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
  getTimeUntilExpiry(): number | null {
    if (!this.currentTokens) return null;
    return this.currentTokens.expiresAt.getTime() - Date.now();
  }

  /**
   * Checks if valid tokens exist
   */
  async isTokenValid(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  /**
   * Validates stored tokens and returns validation result
   */
  async validateToken(): Promise<{ isValid: boolean; expiresIn?: number }> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return { isValid: false };
    }

    const expiresIn = tokens.expiresAt.getTime() - Date.now();
    return {
      isValid: expiresIn > 0,
      expiresIn: Math.max(0, expiresIn),
    };
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
   * Updates token expiration time (useful after refresh)
   */
  async updateTokenExpiration(newExpiresAt: Date): Promise<void> {
    if (!this.currentTokens) {
      throw createError(ErrorDomain.AUTHENTICATION, ErrorSeverity.MEDIUM, 'No tokens to update');
    }

    const updatedTokens = {
      ...this.currentTokens,
      expiresAt: newExpiresAt,
    };

    await this.storeTokens(updatedTokens);
  }

  /**
   * Gets token metadata for debugging/monitoring
   */
  async getTokenMetadata(): Promise<{
    hasTokens: boolean;
    isValid: boolean;
    expiresIn: number | null;
    tokenType: string | null;
    hasRefreshToken: boolean;
    scope: string[] | null;
  }> {
    const tokens = await this.getTokens();

    if (!tokens) {
      return {
        hasTokens: false,
        isValid: false,
        expiresIn: null,
        tokenType: null,
        hasRefreshToken: false,
        scope: null,
      };
    }

    const expiresIn = tokens.expiresAt.getTime() - Date.now();

    return {
      hasTokens: true,
      isValid: expiresIn > 0,
      expiresIn,
      tokenType: tokens.tokenType,
      hasRefreshToken: !!tokens.refreshToken,
      scope: tokens.scope || null,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Normalizes different token formats into a consistent TokenInfo structure
   */
  private normalizeTokenInfo(tokenInfo: TokenInfo | AuthTokens): TokenInfo {
    // Handle AuthTokens format (from API responses)
    if ('expiresIn' in tokenInfo && typeof tokenInfo.expiresIn === 'number') {
      const authTokens = tokenInfo as AuthTokens;
      return {
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
        expiresAt: new Date(Date.now() + authTokens.expiresIn * 1000),
        tokenType: (authTokens.tokenType as 'Bearer' | 'Basic') || 'Bearer',
        scope: [],
      };
    }

    // Handle TokenInfo format (internal format)
    const tokens = tokenInfo as TokenInfo;
    return {
      ...tokens,
      expiresAt: new Date(tokens.expiresAt),
      tokenType: tokens.tokenType || 'Bearer',
    };
  }
}

// ==========================================================================
// Singleton Instance and Utilities
// ==========================================================================

export const tokenManager = TokenManager.getInstance();

/**
 * Convenience function to check if tokens should be refreshed
 */
export async function shouldRefreshToken(thresholdMinutes: number = 5): Promise<boolean> {
  return await tokenManager.isTokenExpiringSoon(thresholdMinutes);
}

/**
 * Convenience function to get current access token
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  return await tokenManager.getAccessToken();
}

/**
 * Convenience function to check if user has valid authentication
 */
export async function hasValidToken(): Promise<boolean> {
  return await tokenManager.isTokenValid();
}

export default tokenManager;
