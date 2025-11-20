// Unified Caching Service for API Client Architecture
// Based on the consolidated API client design specifications

import { CacheConfig, CacheEntry } from '@client/types';
import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';

// Persistent Cache Adapters
interface PersistentCacheAdapter {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  cleanup(): Promise<void>;
  keys(): Promise<string[]>;
}

// Memory Cache Adapter
class MemoryCacheAdapter implements PersistentCacheAdapter {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return (this.cache.get(key) as CacheEntry<T>) || null;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
}

// LocalStorage Cache Adapter
class LocalStorageCacheAdapter implements PersistentCacheAdapter {
  private readonly prefix = 'api_cache_';

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      return entry;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to write to localStorage:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      const expiredKeys: string[] = [];

      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const entry: CacheEntry = JSON.parse(item);
              if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
              }
            }
          } catch (error) {
            // Invalid entry, mark for removal
            expiredKeys.push(key);
          }
        }
      }

      expiredKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''));
    } catch (error) {
      console.warn('Failed to get keys from localStorage:', error);
      return [];
    }
  }
}

// IndexedDB Cache Adapter (simplified)
class IndexedDBCacheAdapter implements PersistentCacheAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ApiCache';
  private readonly storeName = 'entries';

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const keys = await this.keys();
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const key of keys) {
        const entry = await this.get(key);
        if (entry && now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      await Promise.all(expiredKeys.map(key => this.delete(key)));
    } catch (error) {
      console.warn('Failed to cleanup IndexedDB:', error);
    }
  }

  async keys(): Promise<string[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result as string[]) || []);
    });
  }
}

// Cache Key Generation Strategy
export class CacheKeyGenerator {
  static generate(endpoint: string, params?: Record<string, any>, method: string = 'GET'): string {
    const baseKey = `${method}:${endpoint}`;

    if (!params || method !== 'GET') {
      return baseKey;
    }

    // Sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return `${baseKey}:${JSON.stringify(sortedParams)}`;
  }

  static generateEntityKey(entityType: string, id: string | number): string {
    return `entity:${entityType}:${id}`;
  }

  static generateCollectionKey(entityType: string, query?: Record<string, any>): string {
    if (!query) {
      return `collection:${entityType}`;
    }

    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((result, key) => {
        result[key] = query[key];
        return result;
      }, {} as Record<string, any>);

    return `collection:${entityType}:${JSON.stringify(sortedQuery)}`;
  }

  static generateSearchKey(searchType: string, query: string, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(this.sortObject(filters)) : '';
    return `search:${searchType}:${query}:${filterString}`;
  }

  private static sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as Record<string, any>);
  }
}

// Unified Cache Manager
export class UnifiedCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private persistentCache: PersistentCacheAdapter;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig) {
    this.config = config;
    this.persistentCache = this.createPersistentCache(config.storage);
    this.startCleanupTimer();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try memory cache first
      let entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry.data;
      }

      // Try persistent cache
      const persistentEntry = await this.persistentCache.get(key);
      if (persistentEntry && !this.isExpired(persistentEntry)) {
        // Restore to memory cache
        this.memoryCache.set(key, persistentEntry);
        return persistentEntry.data as T;
      }

      return null;
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'get',
        key
      });
      return null;
    }
  }

  async set<T>(key: string, data: T, options?: { ttl?: number; persist?: boolean; compress?: boolean; encrypt?: boolean }): Promise<void> {
    try {
      const ttl = options?.ttl || this.config.defaultTTL;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        metadata: {
          size: this.calculateSize(data),
          compressed: options?.compress || false,
          encrypted: options?.encrypt || false
        }
      };

      // Compress if enabled
      if (this.config.compression && !entry.metadata.compressed) {
        entry.data = await this.compress(data);
        entry.metadata.compressed = true;
      }

      // Encrypt if enabled
      if (this.config.encryption && !entry.metadata.encrypted) {
        entry.data = await this.encrypt(entry.data);
        entry.metadata.encrypted = true;
      }

      // Store in memory
      this.memoryCache.set(key, entry);

      // Store persistently if configured
      if (options?.persist !== false) {
        await this.persistentCache.set(key, entry);
      }

      // Enforce size limits
      this.enforceSizeLimits();
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'set',
        key
      });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.persistentCache.delete(key);
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'delete',
        key
      });
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.persistentCache.clear();
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'clear'
      });
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      // Check memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        return true;
      }

      // Check persistent cache
      const persistentEntry = await this.persistentCache.get(key);
      return persistentEntry !== null && !this.isExpired(persistentEntry);
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'has',
        key
      });
      return false;
    }
  }

  getStats(): { memorySize: number; persistentSize: number; hitRate: number } {
    const memorySize = this.memoryCache.size;
    let persistentSize = 0;

    // This is a simplified stats calculation
    // In a real implementation, you'd track more detailed metrics
    return {
      memorySize,
      persistentSize,
      hitRate: 0 // Would need to track hits/misses over time
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private async compress(data: any): Promise<any> {
    // Placeholder for compression implementation
    // Would use a library like pako for actual compression
    return data;
  }

  private async encrypt(data: any): Promise<any> {
    // Placeholder for encryption implementation
    // Would use Web Crypto API for actual encryption
    return data;
  }

  private createPersistentCache(storage: 'memory' | 'localStorage' | 'indexedDB'): PersistentCacheAdapter {
    switch (storage) {
      case 'localStorage':
        return new LocalStorageCacheAdapter();
      case 'indexedDB':
        return new IndexedDBCacheAdapter();
      case 'memory':
      default:
        return new MemoryCacheAdapter();
    }
  }

  private enforceSizeLimits(): void {
    if (this.memoryCache.size <= this.config.maxSize) return;

    // Remove least recently used items
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = Math.ceil(this.config.maxSize * 0.1); // Remove 10%
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }, 60000); // Clean up every minute
  }

  private async cleanup(): Promise<void> {
    try {
      await this.persistentCache.cleanup();

      // Clean memory cache
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'cleanup'
      });
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Global Cache Instance
export const globalCache = new UnifiedCacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storage: 'memory',
  compression: false,
  encryption: false
});