/**
 * Custom Hook for Error Analytics Dashboard
 *
 * Provides data fetching, real-time updates, and state management
 * for the Error Analytics Dashboard component.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOverviewMetrics,
  fetchTrendData,
  fetchPatterns,
  fetchRecoveryAnalytics,
  fetchRealTimeMetrics,
  updateFilters,
  setActiveTab,
  refreshData,
  selectOverviewMetrics,
  selectTrendData,
  selectPatterns,
  selectRecoveryAnalytics,
  selectRealTimeMetrics,
  selectFilters,
  selectActiveTab,
  selectIsLoading,
  selectError,
  selectLastRefresh,
  selectIsRealTimeEnabled,
  selectConnectionStatus,
} from '@client/store/slices/errorAnalyticsSlice';
import { useWebSocket } from '@client/hooks/use-websocket';

interface UseErrorAnalyticsOptions {
  enableRealTime?: boolean;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useErrorAnalytics(options: UseErrorAnalyticsOptions = {}) {
  const {
    enableRealTime = true,
    refreshInterval = 30000,
    autoRefresh = true,
  } = options;

  const dispatch = useDispatch();
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const webSocketRef = useRef<any>();

  // Selectors
  const overviewMetrics = useSelector(selectOverviewMetrics);
  const trendData = useSelector(selectTrendData);
  const patterns = useSelector(selectPatterns);
  const recoveryAnalytics = useSelector(selectRecoveryAnalytics);
  const realTimeMetrics = useSelector(selectRealTimeMetrics);
  const filters = useSelector(selectFilters);
  const activeTab = useSelector(selectActiveTab);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const lastRefresh = useSelector(selectLastRefresh);
  const isRealTimeEnabled = useSelector(selectIsRealTimeEnabled);
  const connectionStatus = useSelector(selectConnectionStatus);

  // Data fetching functions
  const loadOverviewMetrics = useCallback(async () => {
    try {
      await dispatch(fetchOverviewMetrics(filters));
    } catch (error) {
      console.error('Failed to load overview metrics:', error);
    }
  }, [dispatch, filters]);

  const loadTrendData = useCallback(async (period = '24h') => {
    try {
      await dispatch(fetchTrendData({ period, filters }));
    } catch (error) {
      console.error('Failed to load trend data:', error);
    }
  }, [dispatch, filters]);

  const loadPatterns = useCallback(async () => {
    try {
      await dispatch(fetchPatterns(filters));
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  }, [dispatch, filters]);

  const loadRecoveryAnalytics = useCallback(async () => {
    try {
      await dispatch(fetchRecoveryAnalytics(filters));
    } catch (error) {
      console.error('Failed to load recovery analytics:', error);
    }
  }, [dispatch, filters]);

  const loadRealTimeMetrics = useCallback(async () => {
    try {
      await dispatch(fetchRealTimeMetrics());
    } catch (error) {
      console.error('Failed to load real-time metrics:', error);
    }
  }, [dispatch]);

  // Load all data
  const loadAllData = useCallback(async () => {
    await Promise.allSettled([
      loadOverviewMetrics(),
      loadTrendData(),
      loadPatterns(),
      loadRecoveryAnalytics(),
      loadRealTimeMetrics(),
    ]);
  }, [loadOverviewMetrics, loadTrendData, loadPatterns, loadRecoveryAnalytics, loadRealTimeMetrics]);

  // Filter management
  const updateDashboardFilters = useCallback((newFilters: Partial<typeof filters>) => {
    dispatch(updateFilters(newFilters));
  }, [dispatch]);

  const updateTimeRange = useCallback((timeRange: any) => {
    dispatch(updateFilters({ timeRange }));
  }, [dispatch]);

  const updateSeverityFilter = useCallback((severity: string[]) => {
    dispatch(updateFilters({ severity }));
  }, [dispatch]);

  const updateDomainFilter = useCallback((domain: string[]) => {
    dispatch(updateFilters({ domain }));
  }, [dispatch]);

  const updateComponentFilter = useCallback((component: string[]) => {
    dispatch(updateFilters({ component }));
  }, [dispatch]);

  // Tab management
  const changeTab = useCallback((tab: typeof activeTab) => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);

  // Refresh management
  const manualRefresh = useCallback(async () => {
    dispatch(refreshData());
    await loadAllData();
  }, [dispatch, loadAllData]);

  // Real-time setup using unified WebSocket hook
  const webSocket = useWebSocket({
    autoConnect: enableRealTime && isRealTimeEnabled,
    subscriptions: [
      { type: 'bill', id: 'error-analytics' }, // Use bill type for error analytics
      { type: 'user_notifications', id: 'error-alerts' }
    ],
    handlers: {
      onBillUpdate: (update) => {
        // Handle error analytics real-time updates through existing bill update types
        // These will be processed by the error analytics slice
        dispatch({ type: 'errorAnalytics/addRealTimeError', payload: update });
      },
      onNotification: (notification) => {
        // Handle error alerts through existing notification types
        dispatch({ type: 'errorAnalytics/addRealTimeAlert', payload: notification });
      }
    }
  });

  const setupRealTimeUpdates = useCallback(async () => {
    if (!enableRealTime || !isRealTimeEnabled) return;

    try {
      // WebSocket connection is handled by the useWebSocket hook
      console.log('Real-time updates enabled for error analytics');
    } catch (error) {
      console.error('Failed to setup real-time updates:', error);
    }
  }, [enableRealTime, isRealTimeEnabled]);

  const disconnectRealTime = useCallback(() => {
    // WebSocket disconnection is handled by the useWebSocket hook
    console.log('Real-time updates disabled for error analytics');
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      loadAllData();
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, loadAllData]);

  // Real-time setup effect
  useEffect(() => {
    setupRealTimeUpdates();

    return () => {
      disconnectRealTime();
    };
  }, [setupRealTimeUpdates, disconnectRealTime]);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      disconnectRealTime();
    };
  }, [disconnectRealTime]);

  return {
    // Data
    overviewMetrics,
    trendData,
    patterns,
    recoveryAnalytics,
    realTimeMetrics,

    // State
    filters,
    activeTab,
    isLoading,
    error,
    lastRefresh,
    isRealTimeEnabled,
    connectionStatus,

    // Actions
    loadOverviewMetrics,
    loadTrendData,
    loadPatterns,
    loadRecoveryAnalytics,
    loadRealTimeMetrics,
    loadAllData,

    // Filter actions
    updateFilters: updateDashboardFilters,
    updateTimeRange,
    updateSeverityFilter,
    updateDomainFilter,
    updateComponentFilter,

    // UI actions
    changeTab,
    manualRefresh,

    // Real-time actions
    setupRealTimeUpdates,
    disconnectRealTime,

    // WebSocket connection status
    webSocketConnectionStatus: webSocket.isConnected,
  };
}

/**
 * Hook for real-time error monitoring
 */
export function useRealTimeErrorMonitoring() {
  const dispatch = useDispatch();
  const realTimeMetrics = useSelector(selectRealTimeMetrics);
  const connectionStatus = useSelector(selectConnectionStatus);

  const addRealTimeError = useCallback((error: any) => {
    dispatch({ type: 'errorAnalytics/addRealTimeError', payload: error });
  }, [dispatch]);

  const addRealTimeAlert = useCallback((alert: any) => {
    dispatch({ type: 'errorAnalytics/addRealTimeAlert', payload: alert });
  }, [dispatch]);

  const updateRealTimeMetrics = useCallback((metrics: any) => {
    dispatch({ type: 'errorAnalytics/updateRealTimeMetrics', payload: metrics });
  }, [dispatch]);

  return {
    realTimeMetrics,
    connectionStatus,
    addRealTimeError,
    addRealTimeAlert,
    updateRealTimeMetrics,
  };
}

/**
 * Hook for error analytics data export
 */
export function useErrorAnalyticsExport() {
  const overviewMetrics = useSelector(selectOverviewMetrics);
  const trendData = useSelector(selectTrendData);
  const patterns = useSelector(selectPatterns);
  const recoveryAnalytics = useSelector(selectRecoveryAnalytics);
  const realTimeMetrics = useSelector(selectRealTimeMetrics);
  const filters = useSelector(selectFilters);

  const exportData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      filters,
      overviewMetrics,
      trendData,
      patterns,
      recoveryAnalytics,
      realTimeMetrics,
      metadata: {
        exportedAt: Date.now(),
        version: '1.0.0',
        format: 'json',
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-analytics-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return data;
  }, [overviewMetrics, trendData, patterns, recoveryAnalytics, realTimeMetrics, filters]);

  const exportCSV = useCallback(() => {
    if (!patterns.length) return;

    const headers = ['Name', 'Frequency', 'Severity', 'Domain', 'First Seen', 'Last Seen', 'Affected Users'];
    const rows = patterns.map(pattern => [
      pattern.name,
      pattern.frequency.toString(),
      pattern.severity,
      pattern.domain,
      new Date(pattern.firstSeen).toLocaleDateString(),
      new Date(pattern.lastSeen).toLocaleDateString(),
      pattern.affectedUsers.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-patterns-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [patterns]);

  return {
    exportData,
    exportCSV,
    canExport: !!(overviewMetrics || trendData || patterns.length || recoveryAnalytics || realTimeMetrics),
  };
}