/**
 * Offline Data Manager
 * Handles IndexedDB operations for offline data storage and sync queue management
 */

import { logger } from '@shared/core';

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

export interface CachedData {
  key: string;
  data: any;
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

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', { component: 'OfflineDataManager' });
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized successfully', { component: 'OfflineDataManager' });
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline actions store
        if (!db.objectStoreNames.contains(this.actionsStore)) {
          const actionsStore = db.createObjectStore(this.actionsStore, { keyPath: 'id' });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionsStore.createIndex('priority', 'priority', { unique: false });
          actionsStore.createIndex('type', 'type', { unique: false });
        }

        // Create offline cache store
        if (!db.objectStoreNames.contains(this.cacheStore)) {
          const cacheStore = db.createObjectStore(this.cacheStore, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('version', 'version', { unique: false });
        }

        // Create offline analytics store
        if (!db.objectStoreNames.contains(this.analyticsStore)) {
          const analyticsStore = db.createObjectStore(this.analyticsStore, { keyPath: 'id', autoIncrement: true });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          analyticsStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // Offline Actions Management
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.init();

    const fullAction: OfflineAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.actionsStore], 'readwrite');
      const store = transaction.objectStore(this.actionsStore);
      const request = store.add(fullAction);

      request.onsuccess = () => {
        logger.info('Offline action added', { component: 'OfflineDataManager', actionId: fullAction.id });
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to add offline action', { component: 'OfflineDataManager', error: request.error });
        reject(request.error);
      };
    });
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.actionsStore], 'readonly');
      const store = transaction.objectStore(this.actionsStore);
      const request = store.getAll();

      request.onsuccess = () => {
        const actions = request.result as OfflineAction[];
        // Sort by priority and timestamp
        actions.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
        });
        resolve(actions);
      };

      request.onerror = () => {
        logger.error('Failed to get pending actions', { component: 'OfflineDataManager', error: request.error });
        reject(request.error);
      };
    });
  }

  async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.actionsStore], 'readwrite');
      const store = transaction.objectStore(this.actionsStore);
      const request = store.delete(actionId);

      request.onsuccess = () => {
        logger.info('Offline action removed', { component: 'OfflineDataManager', actionId });
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to remove offline action', { component: 'OfflineDataManager', error: request.error });
        reject(request.error);
      };
    });
  }

  async updateActionRetryCount(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.actionsStore], 'readwrite');
      const store = transaction.objectStore(this.actionsStore);
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result as OfflineAction;
        if (action) {
          action.retryCount += 1;
          const updateRequest = store.put(action);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(); // Action not found, nothing to update
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Offline Cache Management
  async setOfflineData(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();

    const cachedData: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      version: '1.0',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.cacheStore], 'readwrite');
      const store = transaction.objectStore(this.cacheStore);
      const request = store.put(cachedData);

      request.onsuccess = () => {
        logger.debug('Offline data cached', { component: 'OfflineDataManager', key });
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to cache offline data', { component: 'OfflineDataManager', error: request.error });
        reject(request.error);
      };
    });
  }

  async getOfflineData<T = any>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.cacheStore], 'readonly');
      const store = transaction.objectStore(this.cacheStore);
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result as CachedData | undefined;
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          resolve(cached.data);
        } else {
          if (cached) {
            // Remove expired data
            store.delete(key);
          }
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.error('Failed to get offline data', { component: 'OfflineDataManager', error: request.error });
        reject(request.error);
      };
    });
  }

  async getOfflineDataWithFallback<T = any>(
    key: string,
    fetchFn: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    // Try to get from offline cache first
    const cached = await this.getOfflineData<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not cached or expired, try to fetch fresh data
    try {
      const freshData = await fetchFn();
      // Cache the fresh data for future offline use
      await this.setOfflineData(key, freshData);
      return freshData;
    } catch (error) {
      // If fetch fails and we have fallback data, return it
      if (fallbackData !== undefined) {
        logger.warn('Using fallback data due to fetch failure', { component: 'OfflineDataManager', key, error });
        return fallbackData;
      }
      throw error;
    }
  }

  // Analytics and Error Reporting
  async logOfflineEvent(type: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    const event = {
      type,
      data,
      timestamp: Date.now(),
      user_agent: navigator.user_agent,
      url: window.location.href,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.analyticsStore], 'readwrite');
      const store = transaction.objectStore(this.analyticsStore);
      const request = store.add(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineAnalytics(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.analyticsStore], 'readonly');
      const store = transaction.objectStore(this.analyticsStore);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Status
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingActions = await this.getPendingActions();
    const lastSyncTime = localStorage.getItem('lastSyncTime')
      ? parseInt(localStorage.getItem('lastSyncTime')!)
      : null;

    return {
      queueLength: pendingActions.length,
      lastSyncTime,
      pendingActions,
    };
  }

  // Cleanup
  async clearOfflineCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.cacheStore, this.actionsStore], 'readwrite');

      const cacheStore = transaction.objectStore(this.cacheStore);
      const actionsStore = transaction.objectStore(this.actionsStore);

      const requests = [
        new Promise<void>((res, rej) => {
          const request = cacheStore.clear();
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        }),
        new Promise<void>((res, rej) => {
          const request = actionsStore.clear();
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        })
      ];

      Promise.all(requests)
        .then(() => {
          logger.info('Offline cache cleared', { component: 'OfflineDataManager' });
          resolve();
        })
        .catch(reject);
    });
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Global instance
export const offlineDataManager = new OfflineDataManager();

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineDataManager.init().catch(error => {
    logger.error('Failed to initialize offline data manager', { component: 'OfflineDataManager', error });
  });
}

