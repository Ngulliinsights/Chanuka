/**
 * Offline Manager
 * Handles offline functionality, data synchronization, and network status
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef 
} from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { logger } from '@shared/core/src/observability/logging';

interface OfflineData {
  bills: any[];
  user: any;
  preferences: any;
  lastSync: number;
}

interface PendingAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  offlineData: OfflineData | null;
  pendingActions: PendingAction[];
  addPendingAction: (type: string, data: any) => void;
  syncPendingActions: () => Promise<void>;
  cacheData: (key: keyof OfflineData, data: any) => void;
  getCachedData: (key: keyof OfflineData) => any;
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
        
        request.onupgradeneeded = (event) => {
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
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered:', { component: 'Chanuka' }, registration);
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
        .catch((error) => {
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
  }, []);

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

  // Cache data for offline use
  const cacheData = useCallback(async (key: keyof OfflineData, data: any) => {
    if (!dbRef.current) return;

    try {
      const currentData = offlineData || { bills: [], user: null, preferences: null, lastSync: 0 };
      const newOfflineData = {
        ...currentData,
        [key]: data,
        lastSync: Date.now()
      };

      const transaction = dbRef.current.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      await store.put({
        key: 'offlineData',
        value: newOfflineData
      });

      setOfflineData(newOfflineData);
    } catch (error) {
      logger.error('Failed to cache data:', { component: 'Chanuka' }, error);
    }
  }, [offlineData]);

  // Get cached data
  const getCachedData = useCallback((key: keyof OfflineData) => {
    return offlineData?.[key] || null;
  }, [offlineData]);

  // Add pending action for later sync
  const addPendingAction = useCallback(async (type: string, data: any) => {
    if (!dbRef.current) return;

    const action: PendingAction = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
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

  // Sync pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || !dbRef.current || pendingActions.length === 0) return;

    logger.info('Syncing pending actions:', { component: 'Chanuka' }, pendingActions.length);

    for (const action of pendingActions) {
      try {
        await processAction(action);
        
        // Remove successful action
        const transaction = dbRef.current.transaction(['actions'], 'readwrite');
        const store = transaction.objectStore('actions');
        await store.delete(action.id);
        
        setPendingActions(prev => prev.filter(a => a.id !== action.id));
      } catch (error) {
        logger.error('Failed to sync action:', { component: 'Chanuka' }, action, error);
        
        // Increment retry count
        const updatedAction = {
          ...action,
          retryCount: action.retryCount + 1
        };

        if (updatedAction.retryCount < 3) {
          const transaction = dbRef.current.transaction(['actions'], 'readwrite');
          const store = transaction.objectStore('actions');
          await store.put(updatedAction);
          
          setPendingActions(prev => 
            prev.map(a => a.id === action.id ? updatedAction : a)
          );
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

  // Process individual action
  const processAction = async (action: PendingAction) => {
    switch (action.type) {
      case 'track-bill':
        await fetch('/api/bills/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      
      case 'untrack-bill':
        await fetch('/api/bills/untrack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      
      case 'update-preferences':
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

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
    clearOfflineData
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
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
  }, [isOnline]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}
      text-white px-4 py-2 text-center text-sm font-medium
      ${className}
    `}>
      <div className="flex items-center justify-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Back online</span>
            {pendingActions.length > 0 && (
              <button
                onClick={syncPendingActions}
                className="ml-2 underline hover:no-underline"
              >
                Sync {pendingActions.length} pending actions
              </button>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline</span>
            {showDetails && pendingActions.length > 0 && (
              <span className="ml-2">
                ({pendingActions.length} actions pending)
              </span>
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
 */
export function useOfflineData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
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
        await cacheData(key as any, freshData);
      } else {
        // Use cached data
        const cachedData = getCachedData(key as any);
        if (cachedData) {
          setData(cachedData);
        } else {
          throw new Error('No cached data available');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Try cached data as fallback
      const cachedData = getCachedData(key as any);
      if (cachedData) {
        setData(cachedData);
        setError('Using cached data (offline)');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, key, fetchFn, getCachedData, cacheData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

export default OfflineProvider;
