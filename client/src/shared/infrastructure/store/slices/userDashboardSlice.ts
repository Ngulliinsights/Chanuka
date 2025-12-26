
/**
 * User Dashboard State Management with Redux Toolkit
 * 
 * Manages personalized dashboard data, engagement history,
 * civic metrics, and ML-powered recommendations.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import { useAppSelector, useAppDispatch } from '@client/hooks/store';
import type {
  UserDashboardData,
  TrackedBill,
  EngagementHistoryItem,
  CivicImpactMetrics,
  BillRecommendation,
  PrivacyControls,
  DataExportRequest,
  TemporalFilter,
  DashboardPreferences
} from '@client/types/user-dashboard';

import type { RootState } from '../index';

interface UserDashboardState {
  // Core data
  dashboardData: UserDashboardData | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Filters and preferences
  timeFilter: TemporalFilter;
  preferences: DashboardPreferences;
  privacyControls: PrivacyControls;
  
  // Real-time updates
  lastUpdateTime: string | null;
  pendingUpdates: number;
}

// Async thunks
export const refreshRecommendations = createAsyncThunk(
  'userDashboard/refreshRecommendations',
  async (_request, { rejectWithValue }) => {
    try {
      // In a real implementation, this would call the ML recommendation API
      // For now, we'll simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockRecommendations: BillRecommendation[] = [
        {
          bill: {
            id: Math.floor(Math.random() * 1000),
            billNumber: 'HB-2024-001',
            title: 'Digital Privacy Protection Act',
            summary: 'Enhances digital privacy protections for citizens',
            status: 'committee',
            urgencyLevel: 'medium',
            policyAreas: ['Privacy', 'Technology']
          },
          relevanceScore: 0.85,
          reasons: [
            {
              type: 'interest_match',
              description: 'Matches your interest in privacy legislation',
              weight: 0.4
            },
            {
              type: 'activity_pattern',
              description: 'Similar to bills you\'ve engaged with',
              weight: 0.3
            }
          ],
          confidence: 0.78
        }
      ];
      
      return mockRecommendations;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh recommendations');
    }
  }
);

export const requestDataExport = createAsyncThunk(
  'userDashboard/requestDataExport',
  async (_request: DataExportRequest, { rejectWithValue }) => {
    try {
      // In a real implementation, this would call the data export API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exportId = `export_${Date.now()}`;
      return exportId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Export failed');
    }
  }
);

export const refreshDashboard = createAsyncThunk(
  'userDashboard/refreshDashboard',
  async (_, { rejectWithValue }) => {
    try {
      // In a real implementation, this would fetch fresh data from the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh dashboard');
    }
  }
);

const initialTimeFilter: TemporalFilter = {
  period: 'month'
};

const initialPreferences: DashboardPreferences = {
  layout: 'cards',
  showWelcomeMessage: true,
  defaultTimeFilter: 'month',
  pinnedSections: ['tracked-bills', 'civic-metrics'],
  hiddenSections: [],
  refreshInterval: 15
};

const initialPrivacyControls: PrivacyControls = {
  profileVisibility: 'public',
  showActivity: true,
  showMetrics: true,
  showRecommendations: true,
  allowDataExport: true,
  allowAnalytics: true
};

const initialState: UserDashboardState = {
  dashboardData: null,
  loading: false,
  error: null,
  timeFilter: initialTimeFilter,
  preferences: initialPreferences,
  privacyControls: initialPrivacyControls,
  lastUpdateTime: null,
  pendingUpdates: 0
};

const userDashboardSlice = createSlice({
  name: 'userDashboard',
  initialState,
  reducers: {
    // Data management
    setDashboardData: (state, action: PayloadAction<UserDashboardData>) => {
      state.dashboardData = action.payload;
      state.lastUpdateTime = new Date().toISOString();
    },

    updateTrackedBill: (state, action: PayloadAction<{ billId: number; updates: Partial<TrackedBill> }>) => {
      const { billId, updates } = action.payload;
      if (!state.dashboardData) return;
      
      const billIndex = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
      if (billIndex !== -1) {
        state.dashboardData.trackedBills[billIndex] = {
          ...state.dashboardData.trackedBills[billIndex],
          ...updates
        };
      }
    },

    addEngagementItem: (state, action: PayloadAction<EngagementHistoryItem>) => {
      const item = action.payload;
      if (!state.dashboardData) return;
      
      state.dashboardData.recentActivity.unshift(item);
      // Keep only the most recent 100 items
      if (state.dashboardData.recentActivity.length > 100) {
        state.dashboardData.recentActivity = state.dashboardData.recentActivity.slice(0, 100);
      }
    },

    updateCivicMetrics: (state, action: PayloadAction<Partial<CivicImpactMetrics>>) => {
      const metrics = action.payload;
      if (!state.dashboardData) return;
      
      state.dashboardData.civicMetrics = {
        ...state.dashboardData.civicMetrics,
        ...metrics
      };
    },

    // Bill tracking
    trackBill: (state, action: PayloadAction<{ billId: number; notifications?: TrackedBill['notifications'] }>) => {
      const { billId, notifications } = action.payload;
      if (!state.dashboardData) return;
      
      // Check if bill is already tracked
      const existingIndex = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
      if (existingIndex === -1) {
        // Add new tracked bill (would normally fetch from API)
        const newTrackedBill: TrackedBill = {
          id: billId,
          billNumber: `BILL-${billId}`,
          title: 'Loading...',
          status: 'introduced',
          urgencyLevel: 'low',
          lastStatusChange: new Date().toISOString(),
          userEngagement: {
            saved: true,
            commented: false,
            shared: false,
            viewCount: 1,
            lastViewed: new Date().toISOString()
          },
          notifications: notifications || {
            statusChanges: true,
            newComments: false,
            expertAnalysis: true
          }
        };
        
        state.dashboardData.trackedBills.unshift(newTrackedBill);
        state.dashboardData.stats.totalBillsTracked += 1;
      }
    },

    untrackBill: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      if (!state.dashboardData) return;
      
      const index = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
      if (index !== -1) {
        state.dashboardData.trackedBills.splice(index, 1);
        state.dashboardData.stats.totalBillsTracked -= 1;
      }
    },

    updateBillNotifications: (state, action: PayloadAction<{ billId: number; notifications: TrackedBill['notifications'] }>) => {
      const { billId, notifications } = action.payload;
      if (!state.dashboardData) return;
      
      const billIndex = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
      if (billIndex !== -1) {
        state.dashboardData.trackedBills[billIndex].notifications = notifications;
      }
    },

    // Recommendations
    dismissRecommendation: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      if (!state.dashboardData) return;
      
      state.dashboardData.recommendations = state.dashboardData.recommendations.filter(
        r => r.bill.id !== billId
      );
    },

    acceptRecommendation: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      if (!state.dashboardData) return;
      
      // Track the bill
      userDashboardSlice.caseReducers.trackBill(state, { 
        payload: { billId }, 
        type: 'userDashboard/trackBill' 
      });
      
      // Dismiss the recommendation
      userDashboardSlice.caseReducers.dismissRecommendation(state, { 
        payload: billId, 
        type: 'userDashboard/dismissRecommendation' 
      });
    },

    // Filters and preferences
    setTimeFilter: (state, action: PayloadAction<TemporalFilter>) => {
      state.timeFilter = action.payload;
    },

    updatePreferences: (state, action: PayloadAction<Partial<DashboardPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    updatePrivacyControls: (state, action: PayloadAction<Partial<PrivacyControls>>) => {
      state.privacyControls = { ...state.privacyControls, ...action.payload };
    },

    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Real-time updates
    handleRealTimeUpdate: (state, action: PayloadAction<{ type: string; data: Record<string, unknown> }>) => {
      const { type, data } = action.payload;
      
      switch (type) {
        case 'bill_status_change':
          if (state.dashboardData) {
            const billIndex = state.dashboardData.trackedBills.findIndex(
              b => b.id === data.bill_id
            );
            if (billIndex !== -1 && typeof data.newStatus === 'string') {
              const validStatuses = ['committee', 'introduced', 'passed', 'failed', 'signed', 'vetoed'];
              if (validStatuses.includes(data.newStatus)) {
                state.dashboardData.trackedBills[billIndex].status = data.newStatus as 'committee' | 'introduced' | 'passed' | 'failed' | 'signed' | 'vetoed';
                state.dashboardData.trackedBills[billIndex].lastStatusChange = new Date().toISOString();
              }
            }
          }
          break;

        case 'civic_metrics_update':
          if (state.dashboardData && data.userId === state.dashboardData.stats && 
              data.metrics && typeof data.metrics === 'object') {
            state.dashboardData.civicMetrics = {
              ...state.dashboardData.civicMetrics,
              ...(data.metrics as Partial<CivicImpactMetrics>)
            };
          }
          break;

        case 'new_recommendation':
          if (state.dashboardData && data.recommendation && 
              typeof data.recommendation === 'object' && 
              'bill' in data.recommendation) {
            state.dashboardData.recommendations.unshift(data.recommendation as BillRecommendation);
            // Keep only top 10 recommendations
            if (state.dashboardData.recommendations.length > 10) {
              state.dashboardData.recommendations = state.dashboardData.recommendations.slice(0, 10);
            }
          }
          break;
      }

      state.lastUpdateTime = new Date().toISOString();
      state.pendingUpdates += 1;
    },

    // Utility actions
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    // Refresh recommendations
    builder
      .addCase(refreshRecommendations.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        if (state.dashboardData) {
          state.dashboardData.recommendations = action.payload;
        }
      })
      .addCase(refreshRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Request data export
    builder
      .addCase(requestDataExport.pending, (state) => {
        state.loading = true;
      })
      .addCase(requestDataExport.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestDataExport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Refresh dashboard
    builder
      .addCase(refreshDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.lastUpdateTime = action.payload.timestamp;
        state.pendingUpdates = 0;
      })
      .addCase(refreshDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setDashboardData,
  updateTrackedBill,
  addEngagementItem,
  updateCivicMetrics,
  trackBill,
  untrackBill,
  updateBillNotifications,
  dismissRecommendation,
  acceptRecommendation,
  setTimeFilter,
  updatePreferences,
  updatePrivacyControls,
  setLoading,
  setError,
  handleRealTimeUpdate,
  reset,
} = userDashboardSlice.actions;

export default userDashboardSlice.reducer;

// Selectors
export const selectUserDashboardState = (state: RootState) => {
  // Handle persisted state structure
  const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
  return userDashboard as UserDashboardState;
};

export const selectDashboardData = createSelector(
  [selectUserDashboardState],
  (userDashboard) => userDashboard.dashboardData
);

export const selectFilteredEngagementHistory = createSelector(
  [selectUserDashboardState],
  (userDashboard): EngagementHistoryItem[] => {
    if (!userDashboard.dashboardData) return [];
    
    return userDashboard.dashboardData.recentActivity.filter((item: EngagementHistoryItem) => {
      if (!userDashboard.timeFilter.startDate && !userDashboard.timeFilter.endDate) {
        const now = new Date();
        const itemDate = new Date(item.timestamp);
        
        switch (userDashboard.timeFilter.period) {
          case 'day':
            return itemDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
          case 'week':
            return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          case 'month':
            return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          case 'quarter':
            return itemDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          case 'year':
            return itemDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          default:
            return true;
        }
      }
      
      const itemDate = new Date(item.timestamp);
      const start = userDashboard.timeFilter.startDate ? new Date(userDashboard.timeFilter.startDate) : null;
      const end = userDashboard.timeFilter.endDate ? new Date(userDashboard.timeFilter.endDate) : null;
      
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      
      return true;
    });
  }
);

export const selectEngagementStats = createSelector(
  [selectFilteredEngagementHistory],
  (filteredHistory) => ({
    totalActivities: filteredHistory.length,
    commentCount: filteredHistory.filter((item: EngagementHistoryItem) => item.type === 'comment').length,
    shareCount: filteredHistory.filter((item: EngagementHistoryItem) => item.type === 'share').length,
    viewCount: filteredHistory.filter((item: EngagementHistoryItem) => item.type === 'view').length,
    saveCount: filteredHistory.filter((item: EngagementHistoryItem) => item.type === 'save').length
  })
);

export const selectDashboardMeta = createSelector(
  [selectUserDashboardState],
  (userDashboard) => ({
    hasData: !!userDashboard.dashboardData,
    isDataStale: userDashboard.lastUpdateTime ? 
      (Date.now() - new Date(userDashboard.lastUpdateTime).getTime()) > (userDashboard.preferences.refreshInterval * 60 * 1000) : 
      true
  })
);

// Hook for components that need to interact with the user dashboard store
export const useUserDashboardStore = () => {
  const dispatch = useAppDispatch();

  return {
    trackBill: (billId: number, notifications?: TrackedBill['notifications']) =>
      dispatch(trackBill({ billId, notifications })),
    untrackBill: (billId: number) => dispatch(untrackBill(billId)),
    updateBillNotifications: (billId: number, notifications: TrackedBill['notifications']) =>
      dispatch(updateBillNotifications({ billId, notifications })),
    addEngagementItem: (item: EngagementHistoryItem) => dispatch(addEngagementItem(item)),
    dismissRecommendation: (billId: number) => dispatch(dismissRecommendation(billId)),
    updatePreferences: (preferences: Partial<DashboardPreferences>) =>
      dispatch(updatePreferences(preferences)),
    updatePrivacyControls: (controls: Partial<PrivacyControls>) =>
      dispatch(updatePrivacyControls(controls)),
    setDashboardData: (data: UserDashboardData) => dispatch(setDashboardData(data)),
    requestDataExport: (request: DataExportRequest) => dispatch(requestDataExport(request))
  };
};

// Hook for components that need to access user dashboard selectors
export const useUserDashboardSelectors = () => {
  const dispatch = useAppDispatch();

  const dashboardData = useAppSelector(selectDashboardData);
  const loading = useAppSelector((state: RootState) => {
    const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
    return (userDashboard as UserDashboardState).loading;
  });
  const error = useAppSelector((state: RootState) => {
    const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
    return (userDashboard as UserDashboardState).error;
  });
  const timeFilter = useAppSelector((state: RootState) => {
    const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
    return (userDashboard as UserDashboardState).timeFilter;
  });
  const preferences = useAppSelector((state: RootState) => {
    const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
    return (userDashboard as UserDashboardState).preferences;
  });
  const privacyControls = useAppSelector((state: RootState) => {
    const userDashboard = 'userDashboard' in state ? state.userDashboard : state;
    return (userDashboard as UserDashboardState).privacyControls;
  });
  const filteredEngagementHistory = useAppSelector(selectFilteredEngagementHistory);
  const engagementStats = useAppSelector(selectEngagementStats);
  const { hasData, isDataStale } = useAppSelector(selectDashboardMeta);

  return {
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    timeFilter,
    hasData,
    isDataStale,
    filteredEngagementHistory,
    engagementStats,
    refreshDashboard: () => dispatch(refreshDashboard()),
    setTimeFilter: (filter: TemporalFilter) => dispatch(setTimeFilter(filter)),
    setError: (error: string | null) => dispatch(setError(error))
  };
};
