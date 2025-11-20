/**
 * Bills Data Cache Service - Offline Support and Caching
 * 
 * Advanced caching service for bills data with offline support,
 * intelligent cache invalidation, and background synchronization.
 */

import { Bill } from '@shared/schema/foundation';
import { BillsStats } from '@client/core/api/bills';
import { logger } from '@client/utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  metadata?: {
    source: 'api' | 'websocket' | 'offline';
    size: number;
    compressed: boolean;
  };
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default TTL in milliseconds
  compressionThreshold: number; // Compress entries larger than this (bytes)
  enablePersistence: boolean; // Enable IndexedDB persistence
  enableCompression: boolean; // Enable data compression
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // in bytes
  hitRate: number;
  missRate: number;
  oldestEntry: number;
  newestEntry: number;
  compressionRatio: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Bills Data Cache Service Class
// ============================================================================

class BillsDataCacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private db: IDBDatabase | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private offlineQueue: OfflineQueueItem[] = [];
  
  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalSize: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 10 * 1024, // 10KB
      enablePersistence: true,
      enableCompression: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the cache service
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize IndexedDB if persistence is enabled
      if (this.config.enablePersistence) {
        await this.initializeIndexedDB();
      }

      // Start cleanup timer
      this.startCleanupTimer();

      // Load offline queue from storage
      await this.loadOfflineQueue();

      logger.info('Bills Data Cache Service initialized', {
        component: 'BillsDataCacheService',
        config: this.config,
        persistenceEnabled: this.config.enablePersistence
      });
    } catch (error) {
      logger.error('Failed to initialize Bills Data Cache Service', {
        component: 'BillsDataCacheService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChanukaBillsCache', 1);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', {
          component: 'BillsDataCacheService'
        });
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.debug('IndexedDB initialized successfully', {
          component: 'BillsDataCacheService'
        });
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('ttl', 'ttl', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('priority', 'priority', { unique: false });
        }

        logger.debug('IndexedDB schema created', {
          component: 'BillsDataCacheService'
        });
      };
    });
  }

  /**
   * Get data from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    this.stats.totalRequests++;

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        this.stats.hits++;
        logger.debug('Cache hit (memory)', {
          component: 'BillsDataCacheService',
          key: key.substring(0, 50) + '...',
          age: Date.now() - memoryEntry.timestamp
        });
        return this.decompressData(memoryEntry.data);
      }

      // Check persistent storage if enabled
      if (this.config.enablePersistence && this.db) {
        const persistentEntry = await this.getFromIndexedDB<T>(key);
        if (persistentEntry && this.isEntryValid(persistentEntry)) {
          // Restore to memory cache
          this.memoryCache.set(key, persistentEntry);
          this.stats.hits++;
          logger.debug('Cache hit (persistent)', {
            component: 'BillsDataCacheService',
            key: key.substring(0, 50) + '...',
            age: Date.now() - persistentEntry.timestamp
          });
          return this.decompressData(persistentEntry.data);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Failed to get from cache', {
        component: 'BillsDataCacheService',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T = any>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data: this.compressData(data),
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version: '1.0',
        metadata: {
          source: 'api',
          size: this.calculateSize(data),
          compressed: this.shouldCompress(data)
        }
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);
      this.stats.totalSize += entry.metadata!.size;

      // Store in persistent storage if enabled
      if (this.config.enablePersistence && this.db) {
        await this.setInIndexedDB(key, entry);
      }

      // Enforce cache size limits
      await this.enforceCacheLimits();

      logger.debug('Data cached successfully', {
        component: 'BillsDataCacheService',
        key: key.substring(0, 50) + '...',
        size: entry.metadata!.size,
        compressed: entry.metadata!.compressed,
        ttl: entry.ttl
      });
    } catch (error) {
      logger.error('Failed to set cache', {
        component: 'BillsDataCacheService',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        this.memoryCache.delete(key);
        this.stats.totalSize -= memoryEntry.metadata?.size || 0;
      }

      // Remove from persistent storage
      if (this.config.enablePersistence && this.db) {
        await this.deleteFromIndexedDB(key);
      }

      logger.debug('Cache entry deleted', {
        component: 'BillsDataCacheService',
        key: key.substring(0, 50) + '...'
      });
    } catch (error) {
      logger.error('Failed to delete from cache', {
        component: 'BillsDataCacheService',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.stats.totalSize = 0;

      // Clear persistent storage
      if (this.config.enablePersistence && this.db) {
        await this.clearIndexedDB();
      }

      logger.info('Cache cleared', {
        component: 'BillsDataCacheService'
      });
    } catch (error) {
      logger.error('Failed to clear cache', {
        component: 'BillsDataCacheService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cache bills data with intelligent key generation
   */
  async cacheBills(bills: Bill[], searchParams?: any): Promise<void> {
    const key = this.generateBillsKey(searchParams);
    await this.set(key, bills, 10 * 60 * 1000); // 10 minutes TTL for bills list
  }

  /**
   * Get cached bills data
   */
  async getCachedBills(searchParams?: any): Promise<Bill[] | null> {
    const key = this.generateBillsKey(searchParams);
    return await this.get<Bill[]>(key);
  }

  /**
   * Cache individual bill data
   */
  async cacheBill(bill: Bill): Promise<void> {
    const key = `bill:${bill.id}`;
    await this.set(key, bill, 30 * 60 * 1000); // 30 minutes TTL for individual bills
  }

  /**
   * Get cached individual bill
   */
  async getCachedBill(billId: number): Promise<Bill | null> {
    const key = `bill:${billId}`;
    return await this.get<Bill>(key);
  }

  /**
   * Cache bills statistics
   */
  async cacheBillsStats(stats: BillsStats): Promise<void> {
    const key = 'bills:stats';
    await this.set(key, stats, 5 * 60 * 1000); // 5 minutes TTL for stats
  }

  /**
   * Get cached bills statistics
   */
  async getCachedBillsStats(): Promise<BillsStats | null> {
    const key = 'bills:stats';
    return await this.get<BillsStats>(key);
  }

  /**
   * Add item to offline queue
   */
  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineQueue.push(queueItem);
    
    // Persist to IndexedDB
    if (this.config.enablePersistence && this.db) {
      await this.saveOfflineQueueItem(queueItem);
    }

    logger.info('Item added to offline queue', {
      component: 'BillsDataCacheService',
      itemId: queueItem.id,
      type: queueItem.type,
      endpoint: queueItem.endpoint,
      queueSize: this.offlineQueue.length
    });
  }

  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    logger.info('Processing offline queue', {
      component: 'BillsDataCacheService',
      queueSize: this.offlineQueue.length
    });

    const itemsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.processOfflineQueueItem(item);
        
        // Remove from persistent storage
        if (this.config.enablePersistence && this.db) {
          await this.removeOfflineQueueItem(item.id);
        }
      } catch (error) {
        logger.error('Failed to process offline queue item', {
          component: 'BillsDataCacheService',
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Re-queue if retries available
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          this.offlineQueue.push(item);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();
    
    let totalCompressedSize = 0;
    let totalUncompressedSize = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    entries.forEach(entry => {
      if (entry.metadata) {
        totalCompressedSize += entry.metadata.size;
        if (entry.metadata.compressed) {
          totalUncompressedSize += this.calculateSize(entry.data);
        } else {
          totalUncompressedSize += entry.metadata.size;
        }
      }
      
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    });

    return {
      totalEntries: this.memoryCache.size,
      totalSize: this.stats.totalSize,
      hitRate: this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0,
      missRate: this.stats.totalRequests > 0 ? this.stats.misses / this.stats.totalRequests : 0,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry,
      compressionRatio: totalUncompressedSize > 0 ? totalCompressedSize / totalUncompressedSize : 1
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate cache key for bills search
   */
  private generateBillsKey(searchParams?: any): string {
    if (!searchParams) return 'bills:all';
    
    const normalized = {
      ...searchParams,
      // Sort arrays for consistent keys
      status: searchParams.status?.sort(),
      urgency: searchParams.urgency?.sort(),
      policyAreas: searchParams.policyAreas?.sort(),
      sponsors: searchParams.sponsors?.sort(),
      controversyLevels: searchParams.controversyLevels?.sort()
    };

    return `bills:search:${btoa(JSON.stringify(normalized))}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Calculate data size in bytes
   */
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(data: any): boolean {
    return this.config.enableCompression && 
           this.calculateSize(data) > this.config.compressionThreshold;
  }

  /**
   * Compress data if needed
   */
  private compressData(data: any): any {
    if (this.shouldCompress(data)) {
      // Simple compression using JSON.stringify with reduced whitespace
      // In a real implementation, you might use a compression library
      return JSON.stringify(data);
    }
    return data;
  }

  /**
   * Decompress data if needed
   */
  private decompressData(data: any): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }

  /**
   * Enforce cache size limits
   */
  private async enforceCacheLimits(): Promise<void> {
    if (this.stats.totalSize <= this.config.maxSize) return;

    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest entries until under limit
    let removedSize = 0;
    let removedCount = 0;

    for (const [key, entry] of entries) {
      if (this.stats.totalSize - removedSize <= this.config.maxSize * 0.8) break;

      this.memoryCache.delete(key);
      removedSize += entry.metadata?.size || 0;
      removedCount++;

      // Also remove from persistent storage
      if (this.config.enablePersistence && this.db) {
        await this.deleteFromIndexedDB(key);
      }
    }

    this.stats.totalSize -= removedSize;

    if (removedCount > 0) {
      logger.info('Cache size limit enforced', {
        component: 'BillsDataCacheService',
        removedEntries: removedCount,
        removedSize,
        currentSize: this.stats.totalSize,
        maxSize: this.config.maxSize
      });
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];
    let reclaimedSize = 0;

    this.memoryCache.forEach((entry, key) => {
      if (!this.isEntryValid(entry)) {
        expiredKeys.push(key);
        reclaimedSize += entry.metadata?.size || 0;
      }
    });

    // Remove expired entries
    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      
      if (this.config.enablePersistence && this.db) {
        await this.deleteFromIndexedDB(key);
      }
    }

    this.stats.totalSize -= reclaimedSize;

    if (expiredKeys.length > 0) {
      logger.debug('Expired cache entries cleaned up', {
        component: 'BillsDataCacheService',
        expiredCount: expiredKeys.length,
        reclaimedSize,
        remainingEntries: this.memoryCache.size
      });
    }
  }

  // ============================================================================
  // IndexedDB Helper Methods
  // ============================================================================

  private async getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.entry : null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get from IndexedDB'));
      };
    });
  }

  private async setInIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set in IndexedDB'));
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear IndexedDB'));
    });
  }

  // ============================================================================
  // Offline Queue Helper Methods
  // ============================================================================

  private async loadOfflineQueue(): Promise<void> {
    if (!this.config.enablePersistence || !this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readonly');
      const store = transaction.objectStore('offlineQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        this.offlineQueue = request.result || [];
        logger.info('Offline queue loaded', {
          component: 'BillsDataCacheService',
          queueSize: this.offlineQueue.length
        });
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to load offline queue'));
      };
    });
  }

  private async saveOfflineQueueItem(item: OfflineQueueItem): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save offline queue item'));
    });
  }

  private async removeOfflineQueueItem(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove offline queue item'));
    });
  }

  private async processOfflineQueueItem(item: OfflineQueueItem): Promise<void> {
    // This would integrate with your API service to replay the queued operation
    // For now, we'll just log it
    logger.info('Processing offline queue item', {
      component: 'BillsDataCacheService',
      itemId: item.id,
      type: item.type,
      endpoint: item.endpoint,
      retryCount: item.retryCount
    });

    // In a real implementation, you would:
    // 1. Make the API call using the stored endpoint and data
    // 2. Handle success/failure appropriately
    // 3. Update local state if needed
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.memoryCache.clear();
    this.offlineQueue = [];

    logger.info('Bills Data Cache Service cleaned up', {
      component: 'BillsDataCacheService'
    });
  }
}

// ============================================================================
// Export singleton instance and types
// ============================================================================

export const billsDataCache = new BillsDataCacheService();

// Types are already exported at their definitions above