/**
 * Offline Data Manager - Core Storage
 *
 * Handles IndexedDB operations for offline data storage and sync queue management
 */

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  data?: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
  version: string;
}

export interface SyncStatus {
  queueLength: number;
  lastSyncTime: number | null;
  pendingActions: OfflineAction[];
}

class OfflineDataManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'chanuka-offline-db';
  private readonly dbVersion = 1;
  private readonly actionsStore = 'offline-actions';
  private readonly cacheStore = 'offline-cache';
  private readonly analyticsStore = 'offline-analytics';
  private pendingRequests = new Map<string, Promise<unknown>>();

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline actions store
        if (!db.objectStoreNames.contains(this.actionsStore)) {
          const actionsStore = db.createObjectStore(this.actionsStore, { keyPath: 'id' });
          actionsStore.createIndex('timestamp', 'timestamp');
          actionsStore.createIndex('priority', 'priority');
        }

        // Create cache store
        if (!db.objectStoreNames.contains(this.cacheStore)) {
          const cacheStore = db.createObjectStore(this.cacheStore, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }

        // Create analytics store
        if (!db.objectStoreNames.contains(this.analyticsStore)) {
          const analyticsStore = db.createObjectStore(this.analyticsStore, { keyPath: 'id' });
          analyticsStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const fullAction: OfflineAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const transaction = this.db.transaction([this.actionsStore], 'readwrite');
    const store = transaction.objectStore(this.actionsStore);

    return new Promise((resolve, reject) => {
      const request = store.add(fullAction);

      request.onsuccess = () => {
        console.log('Action queued successfully', fullAction);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to queue action', request.error);
        reject(request.error);
      };
    });
  }

  async getQueuedActions(): Promise<OfflineAction[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.actionsStore], 'readonly');
    const store = transaction.objectStore(this.actionsStore);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async removeAction(actionId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.actionsStore], 'readwrite');
    const store = transaction.objectStore(this.actionsStore);

    return new Promise((resolve, reject) => {
      const request = store.delete(actionId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateActionRetryCount(actionId: string, retryCount: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.actionsStore], 'readwrite');
    const store = transaction.objectStore(this.actionsStore);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount = retryCount;
          const putRequest = store.put(action);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Action not found'));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  async cacheData(key: string, data: unknown, ttl: number = 3600000): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cachedData: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      version: '1.0',
    };

    const transaction = this.db.transaction([this.cacheStore], 'readwrite');
    const store = transaction.objectStore(this.cacheStore);

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.cacheStore], 'readonly');
    const store = transaction.objectStore(this.cacheStore);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedData;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if data has expired
        if (Date.now() - result.timestamp > result.ttl) {
          // Remove expired data
          this.removeCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data as T);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async removeCachedData(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.cacheStore], 'readwrite');
    const store = transaction.objectStore(this.cacheStore);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearExpiredCache(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.cacheStore], 'readwrite');
    const store = transaction.objectStore(this.cacheStore);
    const now = Date.now();
    let removedCount = 0;

    return new Promise((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const data = cursor.value as CachedData;

          if (now - data.timestamp > data.ttl) {
            cursor.delete();
            removedCount++;
          }

          cursor.continue();
        } else {
          resolve(removedCount);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const actions = await this.getQueuedActions();
    const lastSyncTime = actions.length > 0 ? Math.max(...actions.map(a => a.timestamp)) : null;

    return {
      queueLength: actions.length,
      lastSyncTime,
      pendingActions: actions,
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(
      [this.actionsStore, this.cacheStore, this.analyticsStore],
      'readwrite'
    );

    const promises = [
      this.clearStore(transaction.objectStore(this.actionsStore)),
      this.clearStore(transaction.objectStore(this.cacheStore)),
      this.clearStore(transaction.objectStore(this.analyticsStore)),
    ];

    await Promise.all(promises);
  }

  private clearStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async getOfflineDataWithFallback<T>(key: string, fetchFn: () => Promise<T>, fallbackData?: T): Promise<T | null> {
    try {
      if (navigator.onLine) {
        const data = await fetchFn();
        await this.cacheData(key, data);
        return data;
      }
      
      const cached = await this.getCachedData<T>(key);
      if (cached) return cached;
      
      return fallbackData ?? null;
    } catch (error) {
       // Try cache as hard fallback
       const cached = await this.getCachedData<T>(key);
       if (cached) return cached;
       return fallbackData ?? null;
    }
  }

  async setOfflineData(key: string, data: unknown): Promise<void> {
    return this.cacheData(key, data);
  }

  async getOfflineData<T>(key: string): Promise<T | null> {
    return this.getCachedData<T>(key);
  }

  async clearOfflineCache(): Promise<void> {
    return this.clearAllData();
  }
}

export const offlineDataManager = new OfflineDataManager();
