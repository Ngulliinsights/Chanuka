/**
 * Custom Hook for Error Analytics Dashboard
 *
 * Provides data fetching, real-time updates, and state management
 * for the Error Analytics Dashboard component.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { ErrorPattern } from '@client/services';
import type { AppDispatch } from '@client/shared/infrastructure/store';
import {
  fetchOverviewMetrics,
  fetchPatterns,
  fetchRecoveryAnalytics,
  fetchRealTimeMetrics,
  fetchTrendData,
  refreshData,
  selectActiveTab,
  selectConnectionStatus,
  selectError,
  selectFilters,
  selectIsLoading,
  selectIsRealTimeEnabled,
  selectLastRefresh,
  selectOverviewMetrics,
  selectPatterns,
  selectRealTimeMetrics,
  selectRecoveryAnalytics,
  selectTrendData,
  setActiveTab,
  updateFilters,
} from '@client/shared/infrastructure/store/slices/errorAnalyticsSlice';

// Type definitions
interface TimeRange {
  start: number;
  end: number;
  preset: string;
}

interface DashboardFilters {
  timeRange?: TimeRange;
  severity?: string[];
  domain?: string[];
  component?: string[];
}

type ActiveTab = 'overview' | 'trends' | 'patterns' | 'recovery' | 'realtime';

interface WebSocketUpdate {
  type: string;
  data: unknown;
  timestamp: number;
}

interface WebSocketNotification {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: number;
}

interface WebSocketHook {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

interface UseErrorAnalyticsOptions {
  enableRealTime?: boolean;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface ErrorAnalyticsReturn {
  // Data
  overviewMetrics: unknown;
  trendData: unknown;
  patterns: ErrorPattern[];
  recoveryAnalytics: unknown;
  realTimeMetrics: unknown;

  // State
  filters: DashboardFilters;
  activeTab: ActiveTab;
  isLoading: boolean;
  error: string | null;
  lastRefresh: number | null;
  isRealTimeEnabled: boolean;
  connectionStatus: string;

  // Actions
  loadOverviewMetrics: () => Promise<void>;
  loadTrendData: (period?: string) => Promise<void>;
  loadPatterns: () => Promise<void>;
  loadRecoveryAnalytics: () => Promise<void>;
  loadRealTimeMetrics: () => Promise<void>;
  loadAllData: () => Promise<void>;

  // Filter actions
  updateFilters: (newFilters: Partial<DashboardFilters>) => void;
  updateTimeRange: (timeRange: TimeRange) => void;
  updateSeverityFilter: (severity: string[]) => void;
  updateDomainFilter: (domain: string[]) => void;
  updateComponentFilter: (component: string[]) => void;

  // UI actions
  changeTab: (tab: ActiveTab) => void;
  manualRefresh: () => Promise<void>;

  // Real-time actions
  setupRealTimeUpdates: () => Promise<void>;
  disconnectRealTime: () => void;

  // WebSocket connection status
  webSocketConnectionStatus: boolean;
}

// Mock WebSocket hook - replace with actual implementation when available
function useWebSocketMock(config: {
  autoConnect: boolean;
  subscriptions: Array<{ type: string; id: string }>;
  handlers: {
    onBillUpdate: (update: WebSocketUpdate) => void;
    onNotification: (notification: WebSocketNotification) => void;
  };
}): WebSocketHook {
  // This is a placeholder implementation
  // Replace with actual useWebSocket when the module is available
  return {
    isConnected: false,
    connect: () => console.log('WebSocket connect', config),
    disconnect: () => console.log('WebSocket disconnect'),
  };
}

export function useErrorAnalytics(options: UseErrorAnalyticsOptions = {}): ErrorAnalyticsReturn {
  const { enableRealTime = true, refreshInterval = 30000, autoRefresh = true } = options;

  const dispatch = useDispatch<AppDispatch>();
  const refreshTimerRef = useRef<NodeJS.Timeout>();

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
      await dispatch(fetchOverviewMetrics(filters)).unwrap();
    } catch (error: unknown) {
      console.error('Failed to load overview metrics:', error);
    }
  }, [dispatch, filters]);

  const loadTrendData = useCallback(
    async (period = '24h') => {
      try {
        await dispatch(fetchTrendData({ period, filters })).unwrap();
      } catch (error: unknown) {
        console.error('Failed to load trend data:', error);
      }
    },
    [dispatch, filters]
  );

  const loadPatterns = useCallback(async () => {
    try {
      await dispatch(fetchPatterns(filters)).unwrap();
    } catch (error: unknown) {
      console.error('Failed to load patterns:', error);
    }
  }, [dispatch, filters]);

  const loadRecoveryAnalytics = useCallback(async () => {
    try {
      await dispatch(fetchRecoveryAnalytics(filters)).unwrap();
    } catch (error: unknown) {
      console.error('Failed to load recovery analytics:', error);
    }
  }, [dispatch, filters]);

  const loadRealTimeMetrics = useCallback(async () => {
    try {
      await dispatch(fetchRealTimeMetrics()).unwrap();
    } catch (error: unknown) {
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
  }, [
    loadOverviewMetrics,
    loadTrendData,
    loadPatterns,
    loadRecoveryAnalytics,
    loadRealTimeMetrics,
  ]);

  // Filter management
  const updateDashboardFilters = useCallback(
    (newFilters: Partial<DashboardFilters>) => {
      dispatch(updateFilters(newFilters));
    },
    [dispatch]
  );

  const updateTimeRange = useCallback(
    (timeRange: TimeRange) => {
      dispatch(updateFilters({ timeRange }));
    },
    [dispatch]
  );

  const updateSeverityFilter = useCallback(
    (severity: string[]) => {
      dispatch(updateFilters({ severity }));
    },
    [dispatch]
  );

  const updateDomainFilter = useCallback(
    (domain: string[]) => {
      dispatch(updateFilters({ domain }));
    },
    [dispatch]
  );

  const updateComponentFilter = useCallback(
    (component: string[]) => {
      dispatch(updateFilters({ component }));
    },
    [dispatch]
  );

  // Tab management
  const changeTab = useCallback(
    (tab: ActiveTab) => {
      dispatch(setActiveTab(tab));
    },
    [dispatch]
  );

  // Refresh management
  const manualRefresh = useCallback(async () => {
    dispatch(refreshData());
    await loadAllData();
  }, [dispatch, loadAllData]);

  // Real-time setup using WebSocket hook
  // Note: Replace useWebSocketMock with actual useWebSocket when module is available
  const webSocket = useWebSocketMock({
    autoConnect: enableRealTime && isRealTimeEnabled,
    subscriptions: [
      { type: 'bill', id: 'error-analytics' },
      { type: 'user_notifications', id: 'error-alerts' },
    ],
    handlers: {
      onBillUpdate: (update: WebSocketUpdate) => {
        dispatch({
          type: 'errorAnalytics/addRealTimeError',
          payload: update,
        });
      },
      onNotification: (notification: WebSocketNotification) => {
        dispatch({
          type: 'errorAnalytics/addRealTimeAlert',
          payload: notification,
        });
      },
    },
  });

  const setupRealTimeUpdates = useCallback(async () => {
    if (!enableRealTime || !isRealTimeEnabled) return;

    try {
      console.log('Real-time updates enabled for error analytics');
    } catch (error: unknown) {
      console.error('Failed to setup real-time updates:', error);
    }
  }, [enableRealTime, isRealTimeEnabled]);

  const disconnectRealTime = useCallback(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const dispatch = useDispatch<AppDispatch>();
  const realTimeMetrics = useSelector(selectRealTimeMetrics);
  const connectionStatus = useSelector(selectConnectionStatus);

  const addRealTimeError = useCallback(
    (error: WebSocketUpdate) => {
      dispatch({ type: 'errorAnalytics/addRealTimeError', payload: error });
    },
    [dispatch]
  );

  const addRealTimeAlert = useCallback(
    (alert: WebSocketNotification) => {
      dispatch({ type: 'errorAnalytics/addRealTimeAlert', payload: alert });
    },
    [dispatch]
  );

  const updateRealTimeMetrics = useCallback(
    (metrics: unknown) => {
      dispatch({
        type: 'errorAnalytics/updateRealTimeMetrics',
        payload: metrics,
      });
    },
    [dispatch]
  );

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
interface ExportMetadata {
  exportedAt: number;
  version: string;
  format: string;
}

interface ExportData {
  timestamp: string;
  filters: DashboardFilters;
  overviewMetrics: unknown;
  trendData: unknown;
  patterns: ErrorPattern[];
  recoveryAnalytics: unknown;
  realTimeMetrics: unknown;
  metadata: ExportMetadata;
}

export function useErrorAnalyticsExport() {
  const overviewMetrics = useSelector(selectOverviewMetrics);
  const trendData = useSelector(selectTrendData);
  const patterns = useSelector(selectPatterns);
  const recoveryAnalytics = useSelector(selectRecoveryAnalytics);
  const realTimeMetrics = useSelector(selectRealTimeMetrics);
  const filters = useSelector(selectFilters);

  const exportData = useCallback((): ExportData => {
    const data: ExportData = {
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
      type: 'application/json',
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

    // CSV export based on actual ErrorPattern interface from @client/services
    // Adjust headers and mapping based on the actual properties available
    const headers = ['Pattern', 'Frequency', 'Impact', 'Trend'];

    const rows = patterns.map(pattern => [
      pattern.pattern || 'N/A',
      pattern.frequency?.toString() || '0',
      pattern.impact || 'N/A',
      pattern.trend || 'N/A',
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
    canExport: !!(
      overviewMetrics ||
      trendData ||
      patterns.length ||
      recoveryAnalytics ||
      realTimeMetrics
    ),
  };
}
