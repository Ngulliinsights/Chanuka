/**
 * Error Analytics Slice for Redux State Management
 *
 * Manages state for the Error Analytics Dashboard, including metrics,
 * filters, real-time data, and UI state.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Import unified types from services
import {
  errorAnalyticsBridge,
  type ErrorAnalyticsData,
  type ErrorMetrics,
  type RealTimeAlert,
} from '@client/lib/services/errorAnalyticsBridge';

// Define extended types for dashboard features
export interface DashboardFilters {
  timeRange: {
    start: number;
    end: number;
    preset?: '1h' | '24h' | '7d' | '30d';
  };
  severity: string[];
  domain: string[];
  component: string[];
}

export interface ErrorOverviewMetrics {
  totalErrors: number;
  errorRate: number;
  affectedUsers: number;
  criticalErrors: number;
  trends: {
    daily: number;
    weekly: number;
  };
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  count: number;
  severity?: string;
}

export interface ErrorPattern {
  id: string;
  pattern: string;
  frequency: number;
  impact: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface RecoveryAnalytics {
  totalRecoveries: number;
  averageRecoveryTime: number;
  successRate: number;
  topRecoveryMethods: Array<{
    method: string;
    count: number;
    successRate: number;
  }>;
}

export interface RealTimeMetrics {
  currentErrorRate: number;
  activeAlerts: RealTimeAlert[];
  liveStream: ErrorAnalyticsData[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export interface ErrorEntry extends ErrorAnalyticsData {
  id: string;
  resolved?: boolean;
  resolutionTime?: number;
}

interface ErrorAnalyticsState {
  // Data states
  overviewMetrics: ErrorOverviewMetrics | null;
  trendData: TimeSeriesDataPoint[] | null;
  patterns: ErrorPattern[];
  recoveryAnalytics: RecoveryAnalytics | null;
  realTimeMetrics: RealTimeMetrics | null;

  // UI states
  filters: DashboardFilters;
  activeTab: 'overview' | 'trends' | 'patterns' | 'recovery' | 'realtime';
  isLoading: boolean;
  lastRefresh: number;
  error: string | null;

  // Real-time states
  isRealTimeEnabled: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  reconnectAttempts: number;
}

// Initial state
const initialFilters: DashboardFilters = {
  timeRange: { 
    start: Date.now() - 24 * 60 * 60 * 1000, 
    end: Date.now(), 
    preset: '24h' 
  },
  severity: [],
  domain: [],
  component: [],
};

const initialState: ErrorAnalyticsState = {
  overviewMetrics: null,
  trendData: null,
  patterns: [],
  recoveryAnalytics: null,
  realTimeMetrics: null,
  filters: initialFilters,
  activeTab: 'overview',
  isLoading: false,
  lastRefresh: Date.now(),
  error: null,
  isRealTimeEnabled: true,
  connectionStatus: 'disconnected',
  reconnectAttempts: 0,
};

// Async thunks for data fetching
export const fetchOverviewMetrics = createAsyncThunk(
  'errorAnalytics/fetchOverviewMetrics',
  async (filters: DashboardFilters) => {
    // Transform bridge data to dashboard format
    const metrics = errorAnalyticsBridge.getMetrics();
    
    return {
      totalErrors: metrics.totalErrors,
      errorRate: metrics.errorRate,
      affectedUsers: 0, // Would need tracking implementation
      criticalErrors: Object.values(metrics.errorsByType).reduce((sum, count) => sum + count, 0),
      trends: {
        daily: metrics.totalErrors,
        weekly: metrics.totalErrors,
      },
    } as ErrorOverviewMetrics;
  }
);

export const fetchTrendData = createAsyncThunk(
  'errorAnalytics/fetchTrendData',
  async ({ period, filters }: { period: string; filters: DashboardFilters }) => {
    // This would need actual trend tracking implementation
    // For now, return mock structure
    const metrics = errorAnalyticsBridge.getMetrics();
    
    return [{
      timestamp: Date.now(),
      count: metrics.totalErrors,
    }] as TimeSeriesDataPoint[];
  }
);

export const fetchPatterns = createAsyncThunk(
  'errorAnalytics/fetchPatterns',
  async (filters: DashboardFilters) => {
    const metrics = errorAnalyticsBridge.getMetrics();

    // Transform top errors to patterns
    return metrics.topErrors.map((error, index) => ({
      id: `pattern-${index}`,
      pattern: error.message,
      frequency: error.count,
      affectedComponents: [],
      firstSeen: Date.now() - 3600000,
      lastSeen: Date.now(),
      impact: 'medium',
      trend: 'stable',
    })) as ErrorPattern[];
  }
);

export const fetchRecoveryAnalytics = createAsyncThunk(
  'errorAnalytics/fetchRecoveryAnalytics',
  async (filters: DashboardFilters) => {
    // Mock recovery analytics - would need actual tracking
    return {
      totalRecoveries: 0,
      averageRecoveryTime: 0,
      successRate: 0,
      topRecoveryMethods: [],
    } as RecoveryAnalytics;
  }
);

export const fetchRealTimeMetrics = createAsyncThunk(
  'errorAnalytics/fetchRealTimeMetrics',
  async () => {
    const metrics = errorAnalyticsBridge.getMetrics();
    const alerts = errorAnalyticsBridge.getAlerts();
    
    return {
      currentErrorRate: metrics.errorRate,
      activeAlerts: alerts,
      liveStream: [],
      systemHealth: 'healthy' as const,
    } as RealTimeMetrics;
  }
);

// Slice definition
const errorAnalyticsSlice = createSlice({
  name: 'errorAnalytics',
  initialState,
  reducers: {
    // Filter management
    updateFilters: (state, action: PayloadAction<Partial<DashboardFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.filters = initialFilters;
    },

    // UI state management
    setActiveTab: (state, action: PayloadAction<ErrorAnalyticsState['activeTab']>) => {
      state.activeTab = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Real-time state management
    setRealTimeEnabled: (state, action: PayloadAction<boolean>) => {
      state.isRealTimeEnabled = action.payload;
    },

    updateConnectionStatus: (
      state,
      action: PayloadAction<ErrorAnalyticsState['connectionStatus']>
    ) => {
      state.connectionStatus = action.payload;
    },

    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },

    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },

    // Data updates
    updateRealTimeMetrics: (state, action: PayloadAction<Partial<RealTimeMetrics>>) => {
      if (state.realTimeMetrics) {
        state.realTimeMetrics = { ...state.realTimeMetrics, ...action.payload };
      } else {
        state.realTimeMetrics = action.payload as RealTimeMetrics;
      }
      state.lastRefresh = Date.now();
    },

    addRealTimeError: (state, action: PayloadAction<ErrorEntry>) => {
      if (state.realTimeMetrics) {
        // Add to live stream, keeping only last 20
        state.realTimeMetrics.liveStream = [
          action.payload,
          ...state.realTimeMetrics.liveStream.slice(0, 19),
        ];

        // Update error rate (simple calculation)
        const recentErrors = state.realTimeMetrics.liveStream.slice(0, 10);
        state.realTimeMetrics.currentErrorRate = recentErrors.length / 5; // per minute over last 5 minutes
      }
    },

    addRealTimeAlert: (state, action: PayloadAction<RealTimeAlert>) => {
      if (state.realTimeMetrics) {
        // Remove duplicate alert if exists, add new one at front
        state.realTimeMetrics.activeAlerts = [
          action.payload,
          ...state.realTimeMetrics.activeAlerts.filter(
            (alert) => alert.id !== action.payload.id
          ),
        ].slice(0, 10); // Keep only last 10 alerts
      }
    },

    // Refresh all data
    refreshData: (state) => {
      state.lastRefresh = Date.now();
    },

    // Clear all data
    clearData: (state) => {
      state.overviewMetrics = null;
      state.trendData = null;
      state.patterns = [];
      state.recoveryAnalytics = null;
      state.realTimeMetrics = null;
      state.lastRefresh = Date.now();
    },
  },
  extraReducers: (builder) => {
    // Overview metrics
    builder
      .addCase(fetchOverviewMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOverviewMetrics.fulfilled, (state, action) => {
        state.overviewMetrics = action.payload;
        state.isLoading = false;
        state.lastRefresh = Date.now();
      })
      .addCase(fetchOverviewMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch overview metrics';
      })

      // Trend data
      .addCase(fetchTrendData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrendData.fulfilled, (state, action) => {
        state.trendData = action.payload;
        state.isLoading = false;
        state.lastRefresh = Date.now();
      })
      .addCase(fetchTrendData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch trend data';
      })

      // Patterns
      .addCase(fetchPatterns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPatterns.fulfilled, (state, action) => {
        state.patterns = action.payload;
        state.isLoading = false;
        state.lastRefresh = Date.now();
      })
      .addCase(fetchPatterns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch patterns';
      })

      // Recovery analytics
      .addCase(fetchRecoveryAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRecoveryAnalytics.fulfilled, (state, action) => {
        state.recoveryAnalytics = action.payload;
        state.isLoading = false;
        state.lastRefresh = Date.now();
      })
      .addCase(fetchRecoveryAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch recovery analytics';
      })

      // Real-time metrics
      .addCase(fetchRealTimeMetrics.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchRealTimeMetrics.fulfilled, (state, action) => {
        state.realTimeMetrics = action.payload;
        state.lastRefresh = Date.now();
      })
      .addCase(fetchRealTimeMetrics.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch real-time metrics';
      });
  },
});

// Export actions
export const {
  updateFilters,
  resetFilters,
  setActiveTab,
  setLoading,
  setError,
  setRealTimeEnabled,
  updateConnectionStatus,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  updateRealTimeMetrics,
  addRealTimeError,
  addRealTimeAlert,
  refreshData,
  clearData,
} = errorAnalyticsSlice.actions;

// Root state interface for selectors
interface RootState {
  errorAnalytics: ErrorAnalyticsState;
}

// Export selectors
export const selectOverviewMetrics = (state: RootState) => state.errorAnalytics.overviewMetrics;
export const selectTrendData = (state: RootState) => state.errorAnalytics.trendData;
export const selectPatterns = (state: RootState) => state.errorAnalytics.patterns;
export const selectRecoveryAnalytics = (state: RootState) => state.errorAnalytics.recoveryAnalytics;
export const selectRealTimeMetrics = (state: RootState) => state.errorAnalytics.realTimeMetrics;
export const selectFilters = (state: RootState) => state.errorAnalytics.filters;
export const selectActiveTab = (state: RootState) => state.errorAnalytics.activeTab;
export const selectIsLoading = (state: RootState) => state.errorAnalytics.isLoading;
export const selectError = (state: RootState) => state.errorAnalytics.error;
export const selectLastRefresh = (state: RootState) => state.errorAnalytics.lastRefresh;
export const selectIsRealTimeEnabled = (state: RootState) => state.errorAnalytics.isRealTimeEnabled;
export const selectConnectionStatus = (state: RootState) => state.errorAnalytics.connectionStatus;

// Export reducer
export default errorAnalyticsSlice.reducer;