/**
 * Core Storage Module - Modular Storage System
 * 
 * This module provides comprehensive storage functionality including:
 * - Secure encrypted storage with AES-GCM
 * - Session lifecycle management
 * - Token handling with automatic refresh
 * - Intelligent caching with eviction policies
 * - Cross-storage backend support
 */

// Core storage types
export * from './types';

// Secure storage
export {
  SecureStorage
} from './secure-storage';

// Session management
export {
  SessionManager
} from './session-manager';

// Token management
export {
  TokenManager
} from './token-manager';

// Cache storage
export {
  CacheStorageManager,
  type EvictionPolicy,
  type CacheConfig
} from './cache-storage';

// Convenience re-exports for common use cases
export {
  type StorageOptions,
  type SessionInfo,
  type TokenInfo,
  type CacheEntry,
  type StorageStats,
  type CacheStats,
  type SessionValidation,
  type TokenValidation,
  type CleanupOptions,
  type StorageError,
  type StorageErrorCode,
  type StorageBackend
} from './types';

// Create singleton instances
const secureStorage = SecureStorage.getInstance();
const sessionManager = SessionManager.getInstance();
const tokenManager = TokenManager.getInstance();
const cacheManager = CacheStorageManager.getInstance();

// Export singleton instances
export {
  secureStorage,
  sessionManager,
  tokenManager,
  cacheManager
};

// Convenience functions for common operations
export async function storeSecurely<T>(
  key: string, 
  value: T, 
  options?: Partial<StorageOptions>
): Promise<void> {
  return secureStorage.setItem(key, value, { encrypt: true, ...options });
}

export async function retrieveSecurely<T>(
  key: string, 
  options?: Partial<StorageOptions>
): Promise<T | null> {
  return secureStorage.getItem<T>(key, { encrypt: true, ...options });
}

export function getCurrentSession(): SessionInfo | null {
  return sessionManager.getCurrentSession();
}

export function isAuthenticated(): boolean {
  return sessionManager.isSessionValid();
}

export async function getAuthToken(): Promise<string | null> {
  return tokenManager.getAccessToken();
}

export async function getRefreshToken(): Promise<string | null> {
  return tokenManager.getRefreshToken();
}

export async function isTokenValid(): Promise<boolean> {
  return tokenManager.isTokenValid();
}

export async function cacheData<T>(
  key: string, 
  data: T, 
  ttlMinutes?: number
): Promise<void> {
  const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : undefined;
  return cacheManager.set(key, data, { ttl });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  return cacheManager.get<T>(key);
}

export async function clearCache(): Promise<void> {
  return cacheManager.clear();
}

export async function clearSession(): Promise<void> {
  return sessionManager.clearSession();
}

export async function clearTokens(): Promise<void> {
  return tokenManager.clearTokens();
}

export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    cacheManager.clear(),
    sessionManager.clearSession(),
    tokenManager.clearTokens(),
    secureStorage.clear()
  ]);
}

// Storage statistics
export function getStorageStats() {
  return {
    secure: secureStorage.getStats(),
    cache: cacheManager.getStats(),
    session: sessionManager.getSessionStats(),
    tokens: tokenManager.getTokenStats()
  };
}

// Legacy export object for backward compatibility
export const storageUtils = {
  // Classes
  SecureStorage,
  SessionManager,
  TokenManager,
  CacheStorageManager,
  
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
  getRefreshToken,
  isTokenValid,
  cacheData,
  getCachedData,
  clearCache,
  clearSession,
  clearTokens,
  clearAllStorage,
  getStorageStats
};

export default storageUtils;