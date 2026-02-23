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

// Core storage types (excluding cache types to avoid duplication with api/cache-manager)
export {
  type StorageOptions,
  type SessionInfo,
  type TokenInfo,
  type StorageStats,
  type SessionValidation,
  type TokenValidation,
  type CleanupOptions,
  type StorageError,
  type StorageErrorCode,
  type StorageBackend,
} from './types';

// Secure storage
export { SecureStorage } from './secure-storage';

// Session management (re-exported from consolidated auth module)
export { SessionManager, sessionManager } from '../auth/services/session-manager';

// Token management (re-exported from consolidated auth module)
export { TokenManager, tokenManager } from '../auth/services/token-manager';

// Cache storage (types are exported from api/cache-manager to avoid duplication)
export { CacheStorageManager } from './cache-storage';

// Import classes first
import { SessionManager, sessionManager } from '../auth/services/session-manager';
import { TokenManager, tokenManager } from '../auth/services/token-manager';

import { CacheStorageManager } from './cache-storage';
import { SecureStorage } from './secure-storage';

// Create singleton instances
const secureStorage = SecureStorage.getInstance();
const cacheStorageManager = CacheStorageManager.getInstance();

// Export singleton instances
export {
  secureStorage,
  cacheStorageManager,
  // sessionManager and tokenManager are re-exported above
};

// Convenience functions for common operations
export async function storeSecurely<T>(
  key: string,
  value: T,
  options?: Partial<import('./types').StorageOptions>
): Promise<void> {
  return secureStorage.setItem(key, value, { encrypt: true, ...options });
}

export async function retrieveSecurely<T>(
  key: string,
  options?: Partial<import('./types').StorageOptions>
): Promise<T | null> {
  return secureStorage.getItem<T>(key, { encrypt: true, ...options });
}

export function getCurrentSession(): import('./types').SessionInfo | null {
  const authSession = sessionManager.getCurrentSession();
  if (!authSession) return null;

  // Convert auth SessionInfo to storage SessionInfo format
  return {
    userId: authSession.userId,
    sessionId: authSession.sessionId,
    expiresAt: new Date(authSession.expiresAt), // Convert string to Date
    refreshToken: authSession.refreshToken,
    permissions: authSession.permissions,
    metadata: authSession.metadata,
    createdAt: authSession.createdAt ? new Date(authSession.createdAt) : undefined,
    lastAccessedAt: authSession.lastAccessedAt ? new Date(authSession.lastAccessedAt) : undefined,
    ipAddress: authSession.ipAddress,
    userAgent: authSession.userAgent,
  };
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

export async function cacheData<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
  const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : undefined;
  return cacheStorageManager.set(key, data, { ttl });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  return cacheStorageManager.get<T>(key);
}

export async function clearCache(): Promise<void> {
  return cacheStorageManager.clear();
}

export async function clearSession(): Promise<void> {
  return sessionManager.clearSession();
}

export async function clearTokens(): Promise<void> {
  return tokenManager.clearTokens();
}

export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    cacheStorageManager.clear(),
    sessionManager.clearSession(),
    tokenManager.clearTokens(),
    secureStorage.clear(),
  ]);
}

// Storage statistics
export async function getStorageStats() {
  return {
    secure: secureStorage.getStats(),
    cache: cacheStorageManager.getStats(),
    session: sessionManager.getSessionStats(),
    tokens: await tokenManager.getTokenMetadata(),
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
  cacheStorageManager,

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
  getStorageStats,
};

export default storageUtils;
