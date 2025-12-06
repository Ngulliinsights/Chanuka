/**
 * Storage Utilities - Migrated to Modular Core System
 * 
 * MIGRATION NOTICE: This file has been migrated to use the modular storage system.
 * All functionality is now available through @client/core/storage
 * 
 * This file maintains backward compatibility during the migration period.
 * 
 * @deprecated Use @client/core/storage instead
 */

// Import everything from the new modular system
export * from '../core/storage';

// Legacy imports for backward compatibility
import {
  SecureStorage as CoreSecureStorage,
  SessionManager as CoreSessionManager,
  TokenManager as CoreTokenManager,
  CacheStorageManager as CoreCacheManager,
  secureStorage,
  sessionManager,
  tokenManager,
  cacheManager,
  storeSecurely,
  retrieveSecurely,
  getCurrentSession,
  isAuthenticated,
  getAuthToken,
  cacheData,
  getCachedData,
  type StorageOptions,
  type SessionInfo,
  type TokenInfo,
  type CacheEntry
} from '../core/storage';

/**
 * Legacy SecureStorage class (maps to core SecureStorage)
 * @deprecated Use SecureStorage from @client/core/storage instead
 */
export class SecureStorage extends CoreSecureStorage {
  static getInstance() {
    return CoreSecureStorage.getInstance();
  }
}

/**
 * Legacy SessionManager class
 * @deprecated Use SessionManager from @client/core/storage instead
 */
export class SessionManager extends CoreSessionManager {
  static getInstance() {
    return CoreSessionManager.getInstance();
  }
}

/**
 * Legacy TokenManager class
 * @deprecated Use TokenManager from @client/core/storage instead
 */
export class TokenManager extends CoreTokenManager {
  static getInstance() {
    return CoreTokenManager.getInstance();
  }
}

/**
 * Legacy CacheManager class
 * @deprecated Use CacheStorageManager from @client/core/storage instead
 */
export class CacheManager extends CoreCacheManager {
  static getInstance() {
    return CoreCacheManager.getInstance();
  }
}

// Legacy type aliases
export type JWTTokens = TokenInfo;
export type StorageEntry<T> = CacheEntry<T>;

// Legacy singleton instances (re-export from core)
export { secureStorage, sessionManager, tokenManager };
export const cacheManager = cacheManager;

// Legacy convenience functions (re-export from core)
export {
  storeSecurely,
  retrieveSecurely,
  getCurrentSession,
  isAuthenticated,
  getAuthToken,
  cacheData,
  getCachedData
};

// Additional legacy functions for backward compatibility
export async function getAuthTokens(): Promise<TokenInfo | null> {
  return tokenManager.getTokens();
}

export async function storeAuthTokens(tokens: TokenInfo): Promise<void> {
  return tokenManager.storeTokens(tokens);
}

export async function clearAuthTokens(): Promise<void> {
  return tokenManager.clearTokens();
}

export async function createUserSession(session: SessionInfo): Promise<void> {
  return sessionManager.createSession(session);
}

export async function updateUserSession(updates: Partial<SessionInfo>): Promise<void> {
  return sessionManager.updateSession(updates);
}

export async function clearUserSession(): Promise<void> {
  return sessionManager.clearSession();
}

export function isUserAuthenticated(): boolean {
  return sessionManager.isSessionValid();
}

export function getUserSession(): SessionInfo | null {
  return sessionManager.getCurrentSession();
}

// Legacy export object
export const storageUtils = {
  // Classes
  SecureStorage: CoreSecureStorage,
  SessionManager: CoreSessionManager,
  TokenManager: CoreTokenManager,
  CacheManager: CoreCacheManager,
  
  // Instances
  secureStorage,
  sessionManager,
  tokenManager,
  cacheManager,
  
  // Convenience functions
  storeSecurely,
  retrieveSecurely,
  getCurrentSession,
  isAuthenticated,
  getAuthToken,
  cacheData,
  getCachedData,
  
  // Legacy functions
  getAuthTokens,
  storeAuthTokens,
  clearAuthTokens,
  createUserSession,
  updateUserSession,
  clearUserSession,
  isUserAuthenticated,
  getUserSession
};

export default storageUtils;