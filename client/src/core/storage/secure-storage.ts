/**
 * Secure Storage Module
 * 
 * Provides encrypted local storage with automatic expiration, compression,
 * and comprehensive error handling. Uses AES-GCM encryption when available.
 */

import { logger } from '../../utils/logger';
import { 
  StorageOptions, 
  StoredData, 
  StorageStats, 
  StorageError, 
  StorageErrorCode,
  StorageBackend,
  EncryptionConfig
} from './types';

/**
 * Creates a standardized storage error
 */
function createStorageError(
  code: StorageErrorCode, 
  message: string, 
  context?: Record<string, unknown>
): StorageError {
  const error = new Error(message) as StorageError;
  error.code = code;
  error.context = context;
  error.recoverable = code !== 'STORAGE_NOT_AVAILABLE' && code !== 'QUOTA_EXCEEDED';
  return error;
}

/**
 * Default encryption configuration
 */
const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 128
};

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
  private encryptionConfig: EncryptionConfig;

  private constructor(config: Partial<EncryptionConfig> = {}) {
    this.encryptionConfig = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
    // Defer initialization to avoid blocking constructor
    this.initializationPromise = this.initializeEncryption();
  }

  static getInstance(config?: Partial<EncryptionConfig>): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage(config);
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
   * Creates a new AES-GCM key if none exists.
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
          { name: this.encryptionConfig.algorithm },
          true,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await window.crypto.subtle.generateKey(
          { 
            name: this.encryptionConfig.algorithm, 
            length: this.encryptionConfig.keyLength 
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        // Persist key for future use
        const keyBuffer = await window.crypto.subtle.exportKey('raw', this.encryptionKey);
        const keyArray = Array.from(new Uint8Array(keyBuffer));
        localStorage.setItem(`${this.storagePrefix}${this.keyStorageKey}`, JSON.stringify(keyArray));
      }

      logger.info('Encryption initialized', {
        component: 'SecureStorage',
        algorithm: this.encryptionConfig.algorithm,
        keyLength: this.encryptionConfig.keyLength
      });
    } catch (error) {
      logger.error('Failed to initialize encryption', { error });
      this.encryptionKey = null;
      throw createStorageError('ENCRYPTION_FAILED', 'Failed to initialize encryption', { error });
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
        namespace: options.namespace,
        encrypted: options.encrypt && !!this.encryptionKey,
        version: '1.0'
      };

      let serialized = JSON.stringify(storedData);

      // Encrypt if requested and encryption is available
      if (options.encrypt && this.encryptionKey) {
        serialized = await this.encrypt(serialized);
        storedData.encrypted = true;
      } else if (options.encrypt && !this.encryptionKey) {
        logger.warn('Encryption requested but not available', { key });
      }

      const storageKey = this.buildStorageKey(key, options.namespace);
      const storage = this.getStorageBackend(options.backend);
      
      if (storage) {
        storage.setItem(storageKey, serialized);
        
        logger.debug('Storage item set', {
          component: 'SecureStorage',
          key,
          namespace: options.namespace,
          encrypted: storedData.encrypted,
          ttl: options.ttl
        });
      } else {
        throw createStorageError('STORAGE_NOT_AVAILABLE', 'Storage backend not available');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw createStorageError('QUOTA_EXCEEDED', `Storage quota exceeded for key: ${key}`, { key });
      }
      
      logger.error('Failed to set secure storage item', { key, error });
      throw createStorageError('INVALID_DATA', `Failed to store item: ${key}`, { key, error });
    }
  }

  /**
   * Retrieves an item, handling decryption and TTL expiration automatically
   */
  async getItem<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    await this.ensureInitialized();

    try {
      const storageKey = this.buildStorageKey(key, options.namespace);
      const storage = this.getStorageBackend(options.backend);
      
      if (!storage) {
        return null;
      }

      const stored = storage.getItem(storageKey);
      if (!stored) {
        return null;
      }

      // Try to decrypt if it looks like encrypted data
      let decrypted = stored;
      if (options.encrypt && this.encryptionKey) {
        try {
          decrypted = await this.decrypt(stored);
        } catch (error) {
          logger.error('Decryption failed, removing corrupted data', { key, error });
          this.removeItem(key, options);
          throw createStorageError('DECRYPTION_FAILED', 'Failed to decrypt stored data', { key });
        }
      }

      const parsed: StoredData = JSON.parse(decrypted);
      
      // Check TTL expiration
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        this.removeItem(key, options);
        return null;
      }

      logger.debug('Storage item retrieved', {
        component: 'SecureStorage',
        key,
        namespace: options.namespace,
        encrypted: parsed.encrypted
      });

      return parsed.data as T;
    } catch (error) {
      if (error instanceof Error && (error as StorageError).code) {
        throw error; // Re-throw storage errors
      }
      
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
      const storage = this.getStorageBackend(options.backend);
      
      if (storage) {
        storage.removeItem(storageKey);
        
        logger.debug('Storage item removed', {
          component: 'SecureStorage',
          key,
          namespace: options.namespace
        });
      }
    } catch (error) {
      logger.error('Failed to remove secure storage item', { key, error });
    }
  }

  /**
   * Checks if an item exists and hasn't expired
   */
  async has(key: string, options: StorageOptions = {}): Promise<boolean> {
    try {
      const value = await this.getItem(key, options);
      return value !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clears all items in a namespace (or default namespace if none specified)
   */
  clear(namespace?: string, backend?: StorageBackend): void {
    try {
      const storage = this.getStorageBackend(backend);
      if (!storage) return;

      const prefix = this.buildStorageKey('', namespace);
      const keysToRemove: string[] = [];

      // Collect all keys matching the namespace prefix
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all collected keys
      keysToRemove.forEach(key => storage.removeItem(key));
      
      logger.info('Storage cleared', {
        component: 'SecureStorage',
        namespace,
        itemsRemoved: keysToRemove.length
      });
    } catch (error) {
      logger.error('Failed to clear secure storage', { namespace, error });
    }
  }

  /**
   * Lists all keys in a namespace
   */
  listKeys(namespace?: string, backend?: StorageBackend): string[] {
    try {
      const storage = this.getStorageBackend(backend);
      if (!storage) return [];

      const prefix = this.buildStorageKey('', namespace);
      const keys: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
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
   * Gets storage statistics
   */
  getStats(namespace?: string, backend?: StorageBackend): StorageStats {
    try {
      const storage = this.getStorageBackend(backend);
      if (!storage) {
        return {
          totalEntries: 0,
          totalSize: 0,
          namespaces: [],
          encryptedEntries: 0,
          expiredEntries: 0
        };
      }

      const prefix = namespace ? this.buildStorageKey('', namespace) : this.storagePrefix;
      let totalEntries = 0;
      let totalSize = 0;
      let encryptedEntries = 0;
      let expiredEntries = 0;
      const namespaces = new Set<string>();
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) {
          totalEntries++;
          
          try {
            const value = storage.getItem(key);
            if (value) {
              totalSize += value.length;
              
              // Try to parse the stored data to get metadata
              const parsed: StoredData = JSON.parse(value);
              
              if (parsed.encrypted) {
                encryptedEntries++;
              }
              
              if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
                expiredEntries++;
              }
              
              if (parsed.namespace) {
                namespaces.add(parsed.namespace);
              }
              
              const entryDate = new Date(parsed.timestamp);
              if (!oldestEntry || entryDate < oldestEntry) {
                oldestEntry = entryDate;
              }
              if (!newestEntry || entryDate > newestEntry) {
                newestEntry = entryDate;
              }
            }
          } catch (error) {
            // Skip corrupted entries
          }
        }
      }

      return {
        totalEntries,
        totalSize,
        namespaces: Array.from(namespaces),
        oldestEntry,
        newestEntry,
        encryptedEntries,
        expiredEntries
      };
    } catch (error) {
      logger.error('Failed to get storage stats', { error });
      return {
        totalEntries: 0,
        totalSize: 0,
        namespaces: [],
        encryptedEntries: 0,
        expiredEntries: 0
      };
    }
  }

  /**
   * Rotates the encryption key
   */
  async rotateEncryptionKey(): Promise<void> {
    if (!this.encryptionKey) {
      throw createStorageError('ENCRYPTION_FAILED', 'No encryption key to rotate');
    }

    try {
      // Generate new key
      const newKey = await window.crypto.subtle.generateKey(
        { 
          name: this.encryptionConfig.algorithm, 
          length: this.encryptionConfig.keyLength 
        },
        true,
        ['encrypt', 'decrypt']
      );

      // TODO: Re-encrypt all existing encrypted data with new key
      // This is a complex operation that would require:
      // 1. Decrypt all encrypted entries with old key
      // 2. Encrypt them with new key
      // 3. Update storage

      // For now, just update the key
      this.encryptionKey = newKey;

      // Persist new key
      const keyBuffer = await window.crypto.subtle.exportKey('raw', newKey);
      const keyArray = Array.from(new Uint8Array(keyBuffer));
      localStorage.setItem(`${this.storagePrefix}${this.keyStorageKey}`, JSON.stringify(keyArray));

      logger.info('Encryption key rotated', {
        component: 'SecureStorage'
      });
    } catch (error) {
      logger.error('Failed to rotate encryption key', { error });
      throw createStorageError('ENCRYPTION_FAILED', 'Failed to rotate encryption key', { error });
    }
  }

  /**
   * Builds the full storage key with prefix and namespace
   */
  private buildStorageKey(key: string, namespace?: string): string {
    return `${this.storagePrefix}${namespace || 'default'}_${key}`;
  }

  /**
   * Gets the appropriate storage backend
   */
  private getStorageBackend(backend?: StorageBackend): Storage | null {
    if (typeof window === 'undefined') return null;

    switch (backend) {
      case 'sessionStorage':
        return window.sessionStorage;
      case 'localStorage':
      default:
        return window.localStorage;
    }
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
    const iv = window.crypto.getRandomValues(new Uint8Array(this.encryptionConfig.ivLength || 12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.encryptionConfig.algorithm, iv },
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
    const ivLength = this.encryptionConfig.ivLength || 12;
    const iv = combined.slice(0, ivLength);
    const encrypted = combined.slice(ivLength);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.encryptionConfig.algorithm, iv },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}