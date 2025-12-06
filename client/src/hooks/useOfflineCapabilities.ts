import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

import { backgroundSyncManager } from '@client/utils/backgroundSyncManager';
import { cacheInvalidation } from '@client/utils/cacheInvalidation';
import { logger } from '@client/utils/logger';
import { offlineAnalytics } from '@client/utils/offlineAnalytics';
import { offlineDataManager } from '@client/utils/offlineDataManager';
import { addNetworkStatusListener, isOnline } from '@client/utils/serviceWorker';

export interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
}

export interface OfflineCapabilities {
  state: OfflineState;
  syncNow: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;
  isDataCached: (key: string) => Promise<boolean>;
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
    const updateSyncStatus = async () => {
      try {
        const syncStatus = await backgroundSyncManager.getSyncStatus();
        setState(prev => ({
          ...prev,
          pendingSyncCount: syncStatus.queueLength,
        }));
      } catch (error) {
        logger.error('Failed to get sync status', { component: 'useOfflineCapabilities', error });
      }
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
      logger.warn('Cannot sync while offline', { component: 'useOfflineCapabilities' });
      return;
    }

    try {
      // Trigger background sync
      await backgroundSyncManager.triggerSync();

      // Invalidate React Query cache to force fresh data
      await queryClient.invalidateQueries();

      // Update last sync time
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));

      // Track sync event
      await offlineAnalytics.trackUserAction('manual_sync', { success: true });

      logger.info('Sync completed successfully', { component: 'useOfflineCapabilities' });
    } catch (error) {
      await offlineAnalytics.trackUserAction('manual_sync', { success: false, error: String(error) });
      logger.error('Sync failed:', { component: 'useOfflineCapabilities', error });
      throw error;
    }
  }, [state.isOnline, queryClient]);

  const clearOfflineData = useCallback(async () => {
    try {
      // Clear offline cache
      await offlineDataManager.clearOfflineCache();

      // Clear API cache
      await cacheInvalidation.invalidateAll();

      // Clear React Query cache
      queryClient.clear();

      // Clear background sync data
      await backgroundSyncManager.clearOfflineData();

      setState(prev => ({
        ...prev,
        isOfflineReady: false,
        pendingSyncCount: 0,
      }));

      // Track the clear action
      await offlineAnalytics.trackUserAction('clear_offline_data');

      logger.info('Offline data cleared', { component: 'useOfflineCapabilities' });
    } catch (error) {
      logger.error('Failed to clear offline data', { component: 'useOfflineCapabilities', error });
      throw error;
    }
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
            await offlineDataManager.setOfflineData(endpoint, data);
          }
        } catch (error) {
          logger.warn(`Failed to cache ${endpoint}`, { component: 'useOfflineCapabilities', error });
        }
      }

      setState(prev => ({ ...prev, isOfflineReady: true }));

      // Track offline mode enable
      await offlineAnalytics.trackUserAction('enable_offline_mode');

      logger.info('Offline mode enabled', { component: 'useOfflineCapabilities' });
    } catch (error) {
      logger.error('Failed to enable offline mode:', { component: 'useOfflineCapabilities', error });
      throw error;
    }
  }, []);

  const disableOfflineMode = useCallback(async () => {
    await clearOfflineData();
    await offlineAnalytics.trackUserAction('disable_offline_mode');
    logger.info('Offline mode disabled', { component: 'useOfflineCapabilities' });
  }, [clearOfflineData]);

  const isDataCached = useCallback(async (key: string): Promise<boolean> => {
    try {
      const data = await offlineDataManager.getOfflineData(key);
      return data !== null;
    } catch (error) {
      logger.error('Failed to check if data is cached', { component: 'useOfflineCapabilities', key, error });
      return false;
    }
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

        const result = await offlineDataManager.getOfflineDataWithFallback(
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












































