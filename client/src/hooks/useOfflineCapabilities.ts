import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineDataManager, cacheInvalidation } from '@/utils/apiCache';
import { addNetworkStatusListener, isOnline } from '@/utils/serviceWorker';
import { logger } from '../../shared/core/src/utils/logger';

export interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
}

export interface OfflineCapabilities {
  state: OfflineState;
  syncNow: () => Promise<void>;
  clearOfflineData: () => void;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  isDataCached: (key: string) => boolean;
}

export function useOfflineCapabilities(): OfflineCapabilities {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const [state, setState] = useState<OfflineState>({
    isOnline: isOnline(),
    isOfflineReady: false,
    pendingSyncCount: 0,
    lastSyncTime: null,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update online status
  useEffect(() => {
    const cleanup = addNetworkStatusListener((online) => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isOnline: online }));
        
        if (online) {
          // Trigger sync when coming back online
          syncNow();
        }
      }
    });

    return cleanup;
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = () => {
      const syncStatus = offlineDataManager.getSyncStatus();
      setState(prev => ({
        ...prev,
        pendingSyncCount: syncStatus.queueLength,
      }));
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Check if offline mode is ready
  useEffect(() => {
    const checkOfflineReadiness = async () => {
      try {
        // Check if service worker is registered and critical data is cached
        const registration = await navigator.serviceWorker.getRegistration();
        const hasCriticalData = localStorage.getItem('offline_bills') !== null;
        
        setState(prev => ({
          ...prev,
          isOfflineReady: !!registration && hasCriticalData,
        }));
      } catch (error) {
        logger.error('Failed to check offline readiness:', { component: 'Chanuka' }, error);
      }
    };

    checkOfflineReadiness();
  }, []);

  const syncNow = useCallback(async () => {
    if (!state.isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }

    try {
      // Invalidate React Query cache to force fresh data
      await queryClient.invalidateQueries();
      
      // Update last sync time
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));

      logger.info('Sync completed successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Sync failed:', { component: 'Chanuka' }, error);
      throw error;
    }
  }, [state.isOnline, queryClient]);

  const clearOfflineData = useCallback(() => {
    // Clear offline cache
    offlineDataManager.clearOfflineCache();
    
    // Clear API cache
    cacheInvalidation.invalidateAll();
    
    // Clear React Query cache
    queryClient.clear();
    
    setState(prev => ({
      ...prev,
      isOfflineReady: false,
      pendingSyncCount: 0,
    }));

    logger.info('Offline data cleared', { component: 'Chanuka' });
  }, [queryClient]);

  const enableOfflineMode = useCallback(async () => {
    try {
      // Preload critical data for offline use
      const criticalEndpoints = [
        '/api/bills',
        '/api/sponsors',
        '/api/community/recent',
      ];

      for (const endpoint of criticalEndpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem(`offline_${endpoint.replace('/api/', '')}`, JSON.stringify({
              data,
              timestamp: Date.now(),
            }));
          }
        } catch (error) {
          console.warn(`Failed to cache ${endpoint}:`, error);
        }
      }

      setState(prev => ({ ...prev, isOfflineReady: true }));
      logger.info('Offline mode enabled', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Failed to enable offline mode:', { component: 'Chanuka' }, error);
    }
  }, []);

  const disableOfflineMode = useCallback(() => {
    clearOfflineData();
    logger.info('Offline mode disabled', { component: 'Chanuka' });
  }, [clearOfflineData]);

  const isDataCached = useCallback((key: string): boolean => {
    return localStorage.getItem(`offline_${key}`) !== null;
  }, []);

  return {
    state,
    syncNow,
    clearOfflineData,
    enableOfflineMode,
    disableOfflineMode,
    isDataCached,
  };
}

// Hook for offline-first data fetching
export function useOfflineQuery<T>(
  key: string,
  fetchFn: () => Promise<T>,
  fallbackData?: T
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsFromCache(false);

        const result = await offlineDataManager.getOfflineData(
          key,
          fetchFn,
          fallbackData
        );

        if (mounted) {
          setData(result);
          // Check if data came from cache
          const cached = localStorage.getItem(`offline_${key}`);
          setIsFromCache(!!cached);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key, fallbackData]);

  const refetch = useCallback(async () => {
    if (!isOnline()) {
      throw new Error('Cannot refetch while offline');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setIsFromCache(false);
      
      // Update cache
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data: result,
        timestamp: Date.now(),
      }));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refetch,
  };
}

// Hook for managing offline notifications
export function useOfflineNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>>([]);

  const addNotification = useCallback((
    type: 'info' | 'warning' | 'error',
    message: string
  ) => {
    const notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Listen for network status changes
  useEffect(() => {
    const cleanup = addNetworkStatusListener((online) => {
      if (online) {
        addNotification('info', 'Connection restored. Syncing data...');
      } else {
        addNotification('warning', 'You are now offline. Some features may be limited.');
      }
    });

    return cleanup;
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}






