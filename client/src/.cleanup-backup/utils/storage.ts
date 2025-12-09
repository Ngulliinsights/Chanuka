/**
 * Storage Utilities - Consolidated Module
 * 
 * A comprehensive storage management system providing:
 * - Encrypted secure storage with AES-GCM
 * - Session lifecycle management
 * - Token handling with automatic expiration
 * - In-memory cache with TTL support
 * 
 * @module storage-utils
 */

import { logger } from './logger';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Creates a standardized error object with context information
 */
function createError(code: string, message: string, context?: unknown): Error {
  const error = new Error(message);
  (error as Error & { code: string; context?: unknown }).code = code;
  (error as Error & { code: string; context?: unknown }).context = context;
  return error;
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface StorageOptions {
  /** Enable AES-GCM encryption for stored data */
  encrypt?: boolean;
  /** Time to live in milliseconds - data expires after this duration */
  ttl?: number;
  /** Logical grouping namespace for storage keys */
  namespace?: string;
}

export interface SessionInfo {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  refreshToken?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer' | 'Basic';
  scope?: string[];
}

// Alias for backward compatibility
export type JWTTokens = TokenInfo;

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number;
  metadata?: Record<string, unknown>;
}

interface StoredData {
  data: unknown;
  timestamp: number;
  ttl?: number;
  namespace?: string;
}

// ============================================================================
// SECURE STORAGE
// ============================================================================

/**
 * SecureStorage provides encrypted local storage with automatic expiration.
 * Uses AES-GCM encryption when available and falls back to plain storage otherwise.
 */
export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: CryptoKey | null = null;
  private readonly storagePrefix = 'chanuka_secure_';
  private readonly keyStorageKey = 'encryption_key';
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Defer initialization to avoid blocking constructor
    this.initializationPromise = this.initializeEncryption();
  }

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Ensures encryption is initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
  }

  /**
   * Initializes or retrieves the encryption key from localStorage.
   * Creates a new AES-GCM 256-bit key if none exists.
   */
  private async initializeEncryption(): Promise<void> {
    // Check if we're in a browser environment with crypto support
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      logger.warn('Crypto API not available, encryption disabled');
      return;
    }

    try {
      const keyData = localStorage.getItem(`${this.storagePrefix}${this.keyStorageKey}`);
      
      if (keyData) {
        // Import existing key
        const keyBuffer = Uint8Array.from(JSON.parse(keyData));
        this.encryptionKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        
        // Persist key for future use
        const keyBuffer = await window.crypto.subtle.exportKey('raw', this.encryptionKey);
        const keyArray = Array.from(new Uint8Array(keyBuffer));
        localStorage.setItem(`${this.storagePrefix}${this.keyStorageKey}`, JSON.stringify(keyArray));
      }
    } catch (error) {
      logger.error('Failed to initialize encryption', { error });
      this.encryptionKey = null;
    }
  }

  /**
   * Stores an item with optional encryption and TTL
   */
  async setItem(key: string, value: unknown, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();

    try {
      const storedData: StoredData = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl,
        namespace: options.namespace
      };

      const serialized = JSON.stringify(storedData);
      let finalValue = serialized;

      // Encrypt if requested and encryption is available
      if (options.encrypt && this.encryptionKey) {
        finalValue = await this.encrypt(serialized);
      } else if (options.encrypt && !this.encryptionKey) {
        logger.warn('Encryption requested but not available', { key });
      }

      const storageKey = this.buildStorageKey(key, options.namespace);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, finalValue);
      }
    } catch (error) {
      logger.error('Failed to set secure storage item', { key, error });
      throw createError('STORAGE_WRITE_ERROR', `Failed to store item: ${key}`, { key });
    }
  }

  /**
   * Retrieves an item, handling decryption and TTL expiration automatically
   */
  async getItem<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const storageKey = this.buildStorageKey(key, options.namespace);
      
      if (typeof window === 'undefined') {
        return null;
      }

      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return null;
      }

      // Decrypt if needed
      let decrypted = stored;
      if (options.encrypt && this.encryptionKey) {
        try {
          decrypted = await this.decrypt(stored);
        } catch (error) {
          logger.error('Decryption failed, removing corrupted data', { key });
          this.removeItem(key, options);
          return null;
        }
      }

      const parsed: StoredData = JSON.parse(decrypted);
      
      // Check TTL expiration
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        this.removeItem(key, options);
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      logger.error('Failed to get secure storage item', { key, error });
      return null;
    }
  }

  /**
   * Removes a specific item from storage
   */
  removeItem(key: string, options: StorageOptions = {}): void {
    try {
      const storageKey = this.buildStorageKey(key, options.namespace);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      logger.error('Failed to remove secure storage item', { key, error });
    }
  }

  /**
   * Clears all items in a namespace (or default namespace if none specified)
   */
  clear(namespace?: string): void {
    try {
      if (typeof window === 'undefined') return;

      const prefix = this.buildStorageKey('', namespace);
      const keysToRemove: string[] = [];

      // Collect all keys matching the namespace prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all collected keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      logger.info('Storage cleared', { namespace, itemsRemoved: keysToRemove.length });
    } catch (error) {
      logger.error('Failed to clear secure storage', { namespace, error });
    }
  }

  /**
   * Lists all keys in a namespace
   */
  listKeys(namespace?: string): string[] {
    try {
      if (typeof window === 'undefined') return [];

      const prefix = this.buildStorageKey('', namespace);
      const keys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          // Extract the actual key by removing the prefix
          const actualKey = key.substring(prefix.length);
          keys.push(actualKey);
        }
      }

      return keys;
    } catch (error) {
      logger.error('Failed to list storage keys', { namespace, error });
      return [];
    }
  }

  /**
   * Builds the full storage key with prefix and namespace
   */
  private buildStorageKey(key: string, namespace?: string): string {
    return `${this.storagePrefix}${namespace || 'default'}_${key}`;
  }

  /**
   * Encrypts data using AES-GCM with a random IV
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...Array.from(combined)));
  }

  /**
   * Decrypts AES-GCM encrypted data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}

// ============================================================================
// SESSION MANAGER
// ============================================================================

/**
 * SessionManager handles user session lifecycle with automatic expiration.
 * Sessions are stored encrypted and validated on access.
 */
export class SessionManager {
  private static instance: SessionManager;
  private storage: SecureStorage;
  private currentSession: SessionInfo | null = null;
  private readonly sessionKey = 'current_session';
  private readonly sessionNamespace = 'session';

  private constructor() {
    this.storage = SecureStorage.getInstance();
    this.loadSession();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Loads the current session from storage and validates it
   */
  private async loadSession(): Promise<void> {
    try {
      const session = await this.storage.getItem<SessionInfo>(this.sessionKey, {
        encrypt: true,
        namespace: this.sessionNamespace
      });

      if (session) {
        // Ensure expiresAt is a Date object
        session.expiresAt = new Date(session.expiresAt);
        
        if (session.expiresAt > new Date()) {
          this.currentSession = session;
        } else {
          // Session expired, clean up
          await this.clearSession();
        }
      }
    } catch (error) {
      logger.error('Failed to load session', { error });
    }
  }

  /**
   * Creates a new session and stores it encrypted
   */
  async createSession(sessionInfo: SessionInfo): Promise<void> {
    try {
      // Ensure expiresAt is a Date object
      const session = {
        ...sessionInfo,
        expiresAt: new Date(sessionInfo.expiresAt)
      };

      this.currentSession = session;
      
      // Calculate TTL from expiration time
      const ttl = session.expiresAt.getTime() - Date.now();
      
      await this.storage.setItem(this.sessionKey, session, {
        encrypt: true,
        namespace: this.sessionNamespace,
        ttl: ttl > 0 ? ttl : undefined
      });

      logger.info('Session created', { 
        userId: session.userId,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt.toISOString()
      });
    } catch (error) {
      logger.error('Failed to create session', { error });
      throw createError('SESSION_CREATE_ERROR', 'Failed to create session', { sessionInfo });
    }
  }

  /**
   * Updates the current session with new information
   */
  async updateSession(updates: Partial<SessionInfo>): Promise<void> {
    if (!this.currentSession) {
      throw createError('SESSION_NOT_FOUND', 'No active session to update');
    }

    try {
      // Handle Date conversion for expiresAt
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }

      this.currentSession = { ...this.currentSession, ...updates };
      
      await this.storage.setItem(this.sessionKey, this.currentSession, {
        encrypt: true,
        namespace: this.sessionNamespace
      });

      logger.info('Session updated', { sessionId: this.currentSession.sessionId });
    } catch (error) {
      logger.error('Failed to update session', { error });
      throw createError('SESSION_UPDATE_ERROR', 'Failed to update session', { updates });
    }
  }

  /**
   * Returns the current session or null if no valid session exists
   */
  getCurrentSession(): SessionInfo | null {
    // Validate session is still current before returning
    if (this.currentSession && new Date(this.currentSession.expiresAt) <= new Date()) {
      this.clearSession();
      return null;
    }
    return this.currentSession;
  }

  /**
   * Checks if a valid session exists and hasn't expired
   */
  isSessionValid(): boolean {
    return this.currentSession !== null && new Date(this.currentSession.expiresAt) > new Date();
  }

  /**
   * Clears the current session from memory and storage
   */
  async clearSession(): Promise<void> {
    try {
      this.currentSession = null;
      this.storage.removeItem(this.sessionKey, {
        namespace: this.sessionNamespace
      });

      logger.info('Session cleared');
    } catch (error) {
      logger.error('Failed to clear session', { error });
    }
  }

  /**
   * Extends the current session expiration time
   */
  async extendSession(additionalMinutes: number = 60): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
      await this.updateSession({ expiresAt: newExpiresAt });
      return true;
    } catch (error) {
      logger.error('Failed to extend session', { error });
      return false;
    }
  }

  /**
   * Checks if the session has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.currentSession?.permissions?.includes(permission) ?? false;
  }

  /**
   * Gets metadata from the current session
   */
  getMetadata(key: string): unknown {
    return this.currentSession?.metadata?.[key];
  }

  /**
   * Sets metadata on the current session
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.currentSession) {
      throw createError('SESSION_NOT_FOUND', 'No active session');
    }

    const metadata = { ...this.currentSession.metadata, [key]: value };
    await this.updateSession({ metadata });
  }
}

// ============================================================================
// TOKEN MANAGER
// ============================================================================

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
  async storeTokens(tokenInfo: TokenInfo): Promise<void> {
    try {
      // Ensure expiresAt is a Date object
      const tokens = {
        ...tokenInfo,
        expiresAt: new Date(tokenInfo.expiresAt)
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
        scope: tokens.scope
      });
    } catch (error) {
      logger.error('Failed to store tokens', { error });
      throw createError('TOKEN_STORE_ERROR', 'Failed to store authentication tokens', { tokenInfo });
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
        namespace: this.authNamespace
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
  async validateToken(): Promise<{ isValid: boolean }> {
    const tokens = await this.getTokens();
    return { isValid: tokens !== null };
  }

  /**
   * Gets the token expiration time
   */
  async getTokenExpiration(): Promise<Date | null> {
    const tokens = await this.getTokens();
    return tokens?.expiresAt || null;
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
   * Refreshes authentication tokens using the refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens || !tokens.refreshToken) {
        return false;
      }

      // TODO: Implement actual token refresh API call
      // For now, return false as placeholder
      logger.info('Token refresh attempted', { hasRefreshToken: true });
      return false;
    } catch (error) {
      logger.error('Failed to refresh token', { error });
      return false;
    }
  }
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

/**
 * CacheManager provides in-memory and persistent caching with TTL support.
 * Ideal for API responses, computed values, and temporary data storage.
 */
export class CacheManager {
  private static instance: CacheManager;
  private storage: SecureStorage;
  private readonly cacheNamespace = 'cache';
  private memoryCache: Map<string, CacheEntry> = new Map();

  private constructor() {
    this.storage = SecureStorage.getInstance();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Stores data in cache with optional TTL
   */
  async set<T>(key: string, data: T, ttl?: number, persist: boolean = true): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        metadata: {}
      };

      // Always store in memory for fast access
      this.memoryCache.set(key, entry);

      // Optionally persist to storage
      if (persist) {
        await this.storage.setItem(key, entry, {
          namespace: this.cacheNamespace,
          ttl
        });
      }
    } catch (error) {
      logger.error('Failed to set cache entry', { key, error });
    }
  }

  /**
   * Retrieves data from cache, checking memory first then storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      let entry = this.memoryCache.get(key);

      // If not in memory, check persistent storage
      if (!entry) {
        entry = await this.storage.getItem<CacheEntry<T>>(key, {
          namespace: this.cacheNamespace
        }) || undefined;

        // If found in storage, add to memory cache
        if (entry) {
          this.memoryCache.set(key, entry);
        }
      }

      if (!entry) return null;

      // Check if entry has expired
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      logger.error('Failed to get cache entry', { key, error });
      return null;
    }
  }

  /**
   * Removes a specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      this.storage.removeItem(key, {
        namespace: this.cacheNamespace
      });
    } catch (error) {
      logger.error('Failed to delete cache entry', { key, error });
    }
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.storage.clear(this.cacheNamespace);
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Checks if a key exists in cache and hasn't expired
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Gets or sets a cache entry using a factory function
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number,
    persist: boolean = true
  ): Promise<T> {
    let data = await this.get<T>(key);
    
    if (data === null) {
      data = await factory();
      await this.set(key, data, ttl, persist);
    }
    
    return data;
  }

  /**
   * Clears expired entries from both memory and storage
   */
  async cleanup(): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Clean memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      // Delete expired entries
      for (const key of keysToDelete) {
        await this.delete(key);
      }

      logger.info('Cache cleanup completed', { entriesRemoved: keysToDelete.length });
    } catch (error) {
      logger.error('Failed to cleanup cache', { error });
    }
  }

  /**
   * Gets cache statistics
   */
  getStats(): { memoryEntries: number; persistedKeys: string[] } {
    return {
      memoryEntries: this.memoryCache.size,
      persistedKeys: this.storage.listKeys(this.cacheNamespace)
    };
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const secureStorage = SecureStorage.getInstance();
export const sessionManager = SessionManager.getInstance();
export const tokenManager = TokenManager.getInstance();
export const cacheManager = CacheManager.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Stores data with encryption enabled by default
 */
export async function storeSecurely<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
  return secureStorage.setItem(key, value, { encrypt: true, ...options });
}

/**
 * Retrieves encrypted data
 */
export async function retrieveSecurely<T>(key: string, options?: StorageOptions): Promise<T | null> {
  return secureStorage.getItem<T>(key, { encrypt: true, ...options });
}

/**
 * Gets the current user session
 */
export function getCurrentSession(): SessionInfo | null {
  return sessionManager.getCurrentSession();
}

/**
 * Checks if user is authenticated with a valid session
 */
export function isAuthenticated(): boolean {
  return sessionManager.isSessionValid();
}

/**
 * Gets the current authentication token
 */
export async function getAuthToken(): Promise<string | null> {
  return tokenManager.getAccessToken();
}

/**
 * Caches data with optional TTL in minutes
 */
export async function cacheData<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
  const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : undefined;
  return cacheManager.set(key, data, ttl);
}

/**
 * Retrieves cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  return cacheManager.get<T>(key);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Classes
  SecureStorage,
  SessionManager,
  TokenManager,
  CacheManager,
  
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
  getCachedData
};
