/**
 * Offline Manager
 * Handles offline functionality, data synchronization, and network status
 */

import { Network } from 'lucide-react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '../../../utils/logger';

interface OfflineData {
  bills: Array<{
    id: number;
    title: string;
    status: string;
    summary?: string;
  }>;
  user: {
    id: string;
    name: string;
    email: string;
    preferences: Record<string, unknown>;
  } | null;
  preferences: Record<string, unknown>;
  lastSync: number;
}

interface PendingAction {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface OfflineContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  offlineData: OfflineData | null;
  pendingActions: PendingAction[];
  addPendingAction: (type: string, data: Record<string, unknown>) => void;
  syncPendingActions: () => Promise<void>;
  cacheData: (key: keyof OfflineData, data: OfflineData[keyof OfflineData]) => void;
  getCachedData: (key: keyof OfflineData) => OfflineData[keyof OfflineData] | null;
  clearOfflineData: () => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const dbRef = useRef<IDBDatabase | null>(null);

  // Load offline data from IndexedDB
  const loadOfflineData = useCallback(async () => {
    if (!dbRef.current) return;

    try {
      const transaction = dbRef.current.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');

      const dataRequest = store.get('offlineData');
      dataRequest.onsuccess = () => {
        if (dataRequest.result) {
          setOfflineData(dataRequest.result.value);
        }
      };

      // Load pending actions
      const actionsTransaction = dbRef.current.transaction(['actions'], 'readonly');
      const actionsStore = actionsTransaction.objectStore('actions');
      const actionsRequest = actionsStore.getAll();

      actionsRequest.onsuccess = () => {
        setPendingActions(actionsRequest.result || []);
      };
    } catch (error) {
      logger.error('Failed to load offline data:', { component: 'Chanuka' }, error);
    }
  }, []);

  // Sync pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || !dbRef.current || pendingActions.length === 0) return;

    logger.info('Syncing pending actions:', { component: 'Chanuka', count: pendingActions.length });

    // Process individual action
    const processAction = async (action: PendingAction) => {
      switch (action.type) {
        case 'track-bill':
          await fetch('/api/bills/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data),
          });
          break;

        case 'untrack-bill':
          await fetch('/api/bills/untrack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data),
          });
          break;

        case 'update-preferences':
          await fetch('/api/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data),
          });
          break;

        default:
          logger.warn('Unknown action type:', { component: 'Chanuka', type: action.type });
      }
    };

    for (const action of pendingActions) {
      try {
        await processAction(action);

        // Remove successful action
        const transaction = dbRef.current.transaction(['actions'], 'readwrite');
        const store = transaction.objectStore('actions');
        await store.delete(action.id);

        setPendingActions(prev => prev.filter(a => a.id !== action.id));
      } catch (error) {
        logger.error('Failed to sync action:', {
          component: 'Chanuka',
          action: action.type,
          error,
        });

        // Increment retry count
        const updatedAction = {
          ...action,
          retryCount: action.retryCount + 1,
        };

        if (updatedAction.retryCount < 3) {
          const transaction = dbRef.current.transaction(['actions'], 'readwrite');
          const store = transaction.objectStore('actions');
          await store.put(updatedAction);

          setPendingActions(prev => prev.map(a => (a.id === action.id ? updatedAction : a)));
        } else {
          // Remove after 3 failed attempts
          const transaction = dbRef.current.transaction(['actions'], 'readwrite');
          const store = transaction.objectStore('actions');
          await store.delete(action.id);

          setPendingActions(prev => prev.filter(a => a.id !== action.id));
        }
      }
    }
  }, [isOnline, pendingActions]);

  // Initialize IndexedDB for offline storage
  useEffect(() => {
    const initDB = async () => {
      try {
        const request = indexedDB.open('chanuka-offline', 1);

        request.onerror = () => {
          logger.error('Failed to open IndexedDB', { component: 'Chanuka' });
        };

        request.onsuccess = () => {
          dbRef.current = request.result;
          loadOfflineData();
        };

        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object stores
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'key' });
          }

          if (!db.objectStoreNames.contains('actions')) {
            db.createObjectStore('actions', { keyPath: 'id' });
          }
        };
      } catch (error) {
        logger.error('IndexedDB initialization failed:', { component: 'Chanuka' }, error);
      }
    };

    initDB();
  }, [loadOfflineData]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          logger.info('Service Worker registered:', {
            component: 'Chanuka',
            registration: registration.scope,
          });
          setIsServiceWorkerReady(true);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  logger.info('New version available', { component: 'Chanuka' });
                }
              });
            }
          });
        })
        .catch(error => {
          logger.error('Service Worker registration failed:', { component: 'Chanuka' }, error);
        });
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions]);

  // Cache data for offline use
  const cacheData = useCallback(
    async (key: keyof OfflineData, data: OfflineData[keyof OfflineData]) => {
      if (!dbRef.current) return;

      try {
        const currentData = offlineData || {
          bills: [],
          user: null,
          preferences: {},
          lastSync: 0,
        };

        const newOfflineData: OfflineData = {
          ...currentData,
          [key]: data,
          lastSync: Date.now(),
        };

        const transaction = dbRef.current.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');

        await store.put({
          key: 'offlineData',
          value: newOfflineData,
        });

        setOfflineData(newOfflineData);
      } catch (error) {
        logger.error('Failed to cache data:', { component: 'Chanuka' }, error);
      }
    },
    [offlineData]
  );

  // Get cached data
  const getCachedData = useCallback(
    (key: keyof OfflineData): OfflineData[keyof OfflineData] | null => {
      return offlineData?.[key] ?? null;
    },
    [offlineData]
  );

  // Add pending action for later sync
  const addPendingAction = useCallback(async (type: string, data: Record<string, unknown>) => {
    if (!dbRef.current) return;

    const action: PendingAction = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      const transaction = dbRef.current.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');

      await store.put(action);
      setPendingActions(prev => [...prev, action]);
    } catch (error) {
      logger.error('Failed to add pending action:', { component: 'Chanuka' }, error);
    }
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    if (!dbRef.current) return;

    try {
      const transaction = dbRef.current.transaction(['data', 'actions'], 'readwrite');
      const dataStore = transaction.objectStore('data');
      const actionsStore = transaction.objectStore('actions');

      await dataStore.clear();
      await actionsStore.clear();

      setOfflineData(null);
      setPendingActions([]);
    } catch (error) {
      logger.error('Failed to clear offline data:', { component: 'Chanuka' }, error);
    }
  }, []);

  const contextValue: OfflineContextType = {
    isOnline,
    isServiceWorkerReady,
    offlineData,
    pendingActions,
    addPendingAction,
    syncPendingActions,
    cacheData,
    getCachedData,
    clearOfflineData,
  };

  return <OfflineContext.Provider value={contextValue}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

/**
 * Offline Status Indicator Component
 */
interface OfflineStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineStatus({ className = '', showDetails = false }: OfflineStatusProps) {
  const { isOnline, pendingActions, syncPendingActions } = useOffline();
  const [isVisible, setIsVisible] = useState(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
    } else {
      // Hide after a delay when back online
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isOnline]);

  if (!isVisible) return null;

  return (
    <div
      className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}
      text-white px-4 py-2 text-center text-sm font-medium
      ${className}
    `}
    >
      <div className="flex items-center justify-center space-x-2">
        {isOnline ? (
          <>
            <Network className="h-4 w-4" />
            <span>Back online</span>
            {pendingActions.length > 0 && (
              <button
                type="button"
                onClick={syncPendingActions}
                className="ml-2 underline hover:no-underline"
              >
                Sync {pendingActions.length} pending actions
              </button>
            )}
          </>
        ) : (
          <>
            <Network className="h-4 w-4" />
            <span>You&apos;re offline</span>
            {showDetails && pendingActions.length > 0 && (
              <span className="ml-2">({pendingActions.length} actions pending)</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Offline-First Data Hook
 * Provides data with offline fallback
 *
 * Note: This hook is exported from a component file for convenience.
 * For optimal Fast Refresh support, consider moving to a separate utilities file.
 */
export function useOfflineData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOnline) {
        // Try to fetch fresh data
        const freshData = await fetchFn();
        setData(freshData);
        await cacheData(key as keyof OfflineData, freshData as OfflineData[keyof OfflineData]);
      } else {
        // Use cached data
        const cachedData = getCachedData(key as keyof OfflineData);
        if (cachedData) {
          setData(cachedData as T);
        } else {
          throw new Error('No cached data available');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Try cached data as fallback
      const cachedData = getCachedData(key as keyof OfflineData);
      if (cachedData) {
        setData(cachedData as T);
        setError('Using cached data (offline)');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, key, fetchFn, getCachedData, cacheData]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

export default OfflineProvider;
