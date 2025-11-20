/**
 * Browser Cache Adapter
 *
 * Browser-specific cache implementation using localStorage, sessionStorage, or IndexedDB
 * with automatic fallback and storage quota management
 */

import { BaseCacheAdapter } from '/core/base-adapter';
import { CacheAdapterConfig } from '/core/interfaces';

export interface BrowserAdapterConfig extends CacheAdapterConfig {
  storageType?: 'localStorage' | 'sessionStorage' | 'indexedDB';
  maxSize?: number;
  keyPrefix?: string;
  defaultTtlSec?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
}

interface CacheEntry {
  value: any;
  expires_at?: number;
  created_at: number;
  accessedAt: number;
  size: number;
}

export class BrowserAdapter extends BaseCacheAdapter {
  private storage: Storage | null = null;
  private indexedDB: IDBDatabase | null = null;
  private storageType: 'localStorage' | 'sessionStorage' | 'indexedDB';
  private readonly maxSize: number;
  private isInitialized = false;

  constructor(config: BrowserAdapterConfig = {}) {
    super('BrowserAdapter', '1.0.0', config);

    this.storageType = config.storageType || 'localStorage';
    this.maxSize = config.maxSize || 1000; // Max entries

    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      if (this.storageType === 'indexedDB') {
        await this.initializeIndexedDB();
      } else {
        this.initializeWebStorage();
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize browser storage:', error);
      // Fallback to memory storage
      this.storageType = 'localStorage';
      this.initializeWebStorage();
      this.isInitialized = true;
    }
  }

  private initializeWebStorage(): void {
    try {
      if (this.storageType === 'sessionStorage') {
        this.storage = window.sessionStorage;
      } else {
        this.storage = window.localStorage;
      }

      // Test storage access
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
    } catch (error) {
      console.warn('Web storage not available:', error);
      throw error;
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BrowserCache', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.indexedDB = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expires_at', 'expires_at', { unique: false });
        }
      };
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    this.validateKey(key);

    return this.measureOperation(async () => {
      try {
        const formattedKey = this.formatKey(key);
        let entry: CacheEntry | null = null;

        if (this.storageType === 'indexedDB' && this.indexedDB) {
          entry = await this.getFromIndexedDB(formattedKey);
        } else if (this.storage) {
          const data = this.storage.getItem(formattedKey);
          if (data) {
            entry = JSON.parse(data);
          }
        }

        if (!entry) {
          this.recordMiss(key);
          return null;
        }

        // Check expiration
        if (entry.expires_at && Date.now() > entry.expires_at) {
          await this.del(key); // Remove expired entry
          this.recordMiss(key);
          return null;
        }

        // Update access time
        entry.accessedAt = Date.now();
        await this.saveEntry(formattedKey, entry);

        this.recordHit(key);
        return entry.value as T;
      } catch (error) {
        this.metrics.errors++;
        console.warn('Browser cache get error:', error);
        return null;
      }
    }, 'get', key);
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    this.validateKey(key);
    const validatedTtl = this.validateTtl(ttlSeconds);

    return this.measureOperation(async () => {
      try {
        const formattedKey = this.formatKey(key);
        const now = Date.now();
        const size = this.calculateSize(value);

        // Check storage quota
        await this.ensureStorageQuota();

        const entry: CacheEntry = {
          value,
          ...(validatedTtl > 0 && { expires_at: now + (validatedTtl * 1000) }),
          created_at: now,
          accessedAt: now,
          size,
        };

        await this.saveEntry(formattedKey, entry);
        this.recordSet(key, size);
      } catch (error) {
        this.metrics.errors++;
        console.warn('Browser cache set error:', error);
        throw error;
      }
    }, 'set', key);
  }

  async del(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    this.validateKey(key);

    return this.measureOperation(async () => {
      try {
        const formattedKey = this.formatKey(key);

        if (this.storageType === 'indexedDB' && this.indexedDB) {
          return await this.deleteFromIndexedDB(formattedKey);
        } else if (this.storage) {
          const existed = this.storage.getItem(formattedKey) !== null;
          if (existed) {
            this.storage.removeItem(formattedKey);
            this.recordDelete(key);
          }
          return existed;
        }

        return false;
      } catch (error) {
        this.metrics.errors++;
        console.warn('Browser cache delete error:', error);
        return false;
      }
    }, 'delete', key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    this.validateKey(key);

    try {
      const formattedKey = this.formatKey(key);
      let entry: CacheEntry | null = null;

      if (this.storageType === 'indexedDB' && this.indexedDB) {
        entry = await this.getFromIndexedDB(formattedKey);
      } else if (this.storage) {
        const data = this.storage.getItem(formattedKey);
        if (data) {
          entry = JSON.parse(data);
        }
      }

      if (!entry) return false;

      // Check expiration
      if (entry.expires_at && Date.now() > entry.expires_at) {
        await this.del(key); // Clean up expired entry
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Browser cache exists error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    try {
      if (this.storageType === 'indexedDB' && this.indexedDB) {
        await this.clearIndexedDB();
      } else if (this.storage) {
        // Clear only our prefixed keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && key.startsWith(this.config.keyPrefix || '')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => this.storage!.removeItem(key));
      }

      this.metrics.keyCount = 0;
      this.metrics.memoryUsage = 0;
    } catch (error) {
      this.metrics.errors++;
      console.warn('Browser cache clear error:', error);
      throw error;
    }
  }

  async size(): Promise<number> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    try {
      if (this.storageType === 'indexedDB' && this.indexedDB) {
        return await this.getIndexedDBSize();
      } else if (this.storage) {
        let count = 0;
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && key.startsWith(this.config.keyPrefix || '')) {
            count++;
          }
        }
        return count;
      }

      return 0;
    } catch (error) {
      console.warn('Browser cache size error:', error);
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initializeStorage();
    }

    try {
      const keys: string[] = [];

      if (this.storageType === 'indexedDB' && this.indexedDB) {
        const allKeys = await this.getAllIndexedDBKeys();
        keys.push(...allKeys);
      } else if (this.storage) {
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && key.startsWith(this.config.keyPrefix || '')) {
            keys.push(key);
          }
        }
      }

      // Remove prefix and filter by pattern
      let result = keys.map(key => key.replace(this.config.keyPrefix || '', ''));

      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        result = result.filter(key => regex.test(key));
      }

      return result;
    } catch (error) {
      console.warn('Browser cache keys error:', error);
      return [];
    }
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      let deleted = 0;

      for (const key of keys) {
        if (await this.del(key)) {
          deleted++;
        }
      }

      return deleted;
    } catch (error) {
      console.warn('Browser cache invalidateByPattern error:', error);
      return 0;
    }
  }

  // Browser-specific methods

  async getStorageInfo(): Promise<{
    type: string;
    quota?: number;
    usage?: number;
    available?: number;
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          type: this.storageType,
          ...(estimate.quota && { quota: estimate.quota }),
          ...(estimate.usage && { usage: estimate.usage }),
          ...(estimate.quota && estimate.usage && { available: estimate.quota - estimate.usage }),
        };
      }

      return { type: this.storageType };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return { type: this.storageType };
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      let cleaned = 0;
      const now = Date.now();

      if (this.storageType === 'indexedDB' && this.indexedDB) {
        cleaned = await this.cleanupExpiredIndexedDB(now);
      } else if (this.storage) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key && key.startsWith(this.config.keyPrefix || '')) {
            try {
              const data = this.storage.getItem(key);
              if (data) {
                const entry: CacheEntry = JSON.parse(data);
                if (entry.expires_at && now > entry.expires_at) {
                  keysToRemove.push(key);
                }
              }
            } catch (error) {
              // Invalid entry, remove it
              keysToRemove.push(key);
            }
          }
        }

        keysToRemove.forEach(key => this.storage!.removeItem(key));
        cleaned = keysToRemove.length;
      }

      return cleaned;
    } catch (error) {
      console.warn('Browser cache cleanup error:', error);
      return 0;
    }
  }

  // Private helper methods

  private async saveEntry(key: string, entry: CacheEntry): Promise<void> {
    const data = JSON.stringify(entry);

    if (this.storageType === 'indexedDB' && this.indexedDB) {
      await this.saveToIndexedDB(key, entry);
    } else if (this.storage) {
      this.storage.setItem(key, data);
    }
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(null);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  private async saveToIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(false);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDBSize(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(0);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  private async getAllIndexedDBKeys(): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve([]);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        resolve(keys);
      };

      request.onerror = () => resolve([]);
    });
  }

  private async cleanupExpiredIndexedDB(now: number): Promise<number> {
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(0);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expires_at');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };

      request.onerror = () => resolve(0);
    });
  }

  private async ensureStorageQuota(): Promise<void> {
    try {
      const currentSize = await this.size();
      if (currentSize >= this.maxSize) {
        // Implement LRU eviction for browser storage
        await this.evictLRU();
      }
    } catch (error) {
      console.warn('Failed to check storage quota:', error);
    }
  }

  private async evictLRU(): Promise<void> {
    try {
      // Simple LRU: remove oldest entries
      const entries: Array<{ key: string | null; entry: CacheEntry }> = [];

      if (this.storageType === 'indexedDB' && this.indexedDB) {
        // For IndexedDB, we'd need to get all entries and sort by accessedAt
        // This is complex, so we'll just clear some entries
        const allKeys = await this.getAllIndexedDBKeys();
        const keysToRemove = allKeys.slice(0, Math.ceil(this.maxSize * 0.1)); // Remove 10%

        for (const key of keysToRemove) {
          await this.deleteFromIndexedDB(key);
        }
      } else if (this.storage) {
        const storage = this.storage;
        // For Web Storage, collect entries and sort by accessedAt
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.config.keyPrefix || '')) {
            try {
              const data = storage.getItem(key);
              if (data) {
                const entry: CacheEntry = JSON.parse(data);
                entries.push({ key, entry });
              }
            } catch (error) {
              // Invalid entry, mark for removal
              entries.push({ key, entry: { value: null, created_at: 0, accessedAt: 0, size: 0 } });
            }
          }
        }

        // Sort by accessedAt (oldest first)
        entries.sort((a, b) => a.entry.accessedAt - b.entry.accessedAt);

        // Remove oldest 10%
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
          const entry = entries[i];
          if (entry && entry.key) {
            storage.removeItem(entry.key);
          }
        }
      }
    } catch (error) {
      console.warn('LRU eviction failed:', error);
    }
  }

  private calculateSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }

  // Override base class methods
  protected override getMemoryUsage(): number {
    // For browser storage, we can't easily track memory usage
    // Return an estimate based on number of entries
    return this.metrics.keyCount * 1024; // Rough estimate: 1KB per entry
  }

  // Helper methods
  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key');
    }
  }

  protected validateTtl(ttl?: number): number {
    return ttl || this.config.defaultTtlSec || 300;
  }

  protected async measureOperation<T>(operation: () => Promise<T>, _operationType: string, _key: string): Promise<T> {
    return this.measureLatency(operation);
  }

  protected recordHit(_key: string): void {
    this.updateMetrics('hit');
  }

  protected recordMiss(_key: string): void {
    this.updateMetrics('miss');
  }

  protected recordSet(_key: string, _size: number): void {
    this.updateMetrics('set');
  }

  protected recordDelete(_key: string): void {
    this.updateMetrics('delete');
  }
}


