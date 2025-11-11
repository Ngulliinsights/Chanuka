/**
 * User Dashboard State Management
 * 
 * Manages personalized dashboard data, engagement history,
 * civic metrics, and ML-powered recommendations.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
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
} from '../../types/user-dashboard';

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

interface UserDashboardActions {
  // Data management
  setDashboardData: (data: UserDashboardData) => void;
  updateTrackedBill: (billId: number, updates: Partial<TrackedBill>) => void;
  addEngagementItem: (item: EngagementHistoryItem) => void;
  updateCivicMetrics: (metrics: Partial<CivicImpactMetrics>) => void;
  
  // Bill tracking
  trackBill: (billId: number, notifications?: TrackedBill['notifications']) => void;
  untrackBill: (billId: number) => void;
  updateBillNotifications: (billId: number, notifications: TrackedBill['notifications']) => void;
  
  // Recommendations
  dismissRecommendation: (billId: number) => void;
  acceptRecommendation: (billId: number) => void;
  refreshRecommendations: () => Promise<void>;
  
  // Filters and preferences
  setTimeFilter: (filter: TemporalFilter) => void;
  updatePreferences: (preferences: Partial<DashboardPreferences>) => void;
  updatePrivacyControls: (controls: Partial<PrivacyControls>) => void;
  
  // Data export
  requestDataExport: (request: DataExportRequest) => Promise<string>;
  
  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Real-time updates
  handleRealTimeUpdate: (update: { type: string; data: any }) => void;
  
  // Utility actions
  refreshDashboard: () => Promise<void>;
  reset: () => void;
}

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

export const useUserDashboardStore = create<UserDashboardState & UserDashboardActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Data management
        setDashboardData: (data) => set((state) => {
          state.dashboardData = data;
          state.lastUpdateTime = new Date().toISOString();
        }),

        updateTrackedBill: (billId, updates) => set((state) => {
          if (!state.dashboardData) return;
          
          const billIndex = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
          if (billIndex !== -1) {
            state.dashboardData.trackedBills[billIndex] = {
              ...state.dashboardData.trackedBills[billIndex],
              ...updates
            };
          }
        }),

        addEngagementItem: (item) => set((state) => {
          if (!state.dashboardData) return;
          
          state.dashboardData.recentActivity.unshift(item);
          // Keep only the most recent 100 items
          if (state.dashboardData.recentActivity.length > 100) {
            state.dashboardData.recentActivity = state.dashboardData.recentActivity.slice(0, 100);
          }
        }),

        updateCivicMetrics: (metrics) => set((state) => {
          if (!state.dashboardData) return;
          
          state.dashboardData.civicMetrics = {
            ...state.dashboardData.civicMetrics,
            ...metrics
          };
        }),

        // Bill tracking
        trackBill: (billId, notifications) => set((state) => {
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
        }),

        untrackBill: (billId) => set((state) => {
          if (!state.dashboardData) return;
          
          const index = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
          if (index !== -1) {
            state.dashboardData.trackedBills.splice(index, 1);
            state.dashboardData.stats.totalBillsTracked -= 1;
          }
        }),

        updateBillNotifications: (billId, notifications) => set((state) => {
          if (!state.dashboardData) return;
          
          const billIndex = state.dashboardData.trackedBills.findIndex(b => b.id === billId);
          if (billIndex !== -1) {
            state.dashboardData.trackedBills[billIndex].notifications = notifications;
          }
        }),

        // Recommendations
        dismissRecommendation: (billId) => set((state) => {
          if (!state.dashboardData) return;
          
          state.dashboardData.recommendations = state.dashboardData.recommendations.filter(
            r => r.bill.id !== billId
          );
        }),

        acceptRecommendation: (billId) => set(() => {
          const { trackBill, dismissRecommendation } = get();
          trackBill(billId);
          dismissRecommendation(billId);
        }),

        refreshRecommendations: async () => {
          set((state) => { state.loading = true; });
          
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
            
            set((state) => {
              if (state.dashboardData) {
                state.dashboardData.recommendations = mockRecommendations;
              }
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to refresh recommendations';
              state.loading = false;
            });
          }
        },

        // Filters and preferences
        setTimeFilter: (filter) => set((state) => {
          state.timeFilter = filter;
        }),

        updatePreferences: (preferences) => set((state) => {
          state.preferences = { ...state.preferences, ...preferences };
        }),

        updatePrivacyControls: (controls) => set((state) => {
          state.privacyControls = { ...state.privacyControls, ...controls };
        }),

        // Data export
        requestDataExport: async (_request) => {
          set((state) => { state.loading = true; });
          
          try {
            // In a real implementation, this would call the data export API
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const exportId = `export_${Date.now()}`;
            
            set((state) => { state.loading = false; });
            
            return exportId;
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Export failed';
              state.loading = false;
            });
            throw error;
          }
        },

        // Loading and error states
        setLoading: (loading) => set((state) => {
          state.loading = loading;
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        // Real-time updates
        handleRealTimeUpdate: (update) => set((state) => {
          switch (update.type) {
            case 'bill_status_change':
              if (state.dashboardData) {
                const billIndex = state.dashboardData.trackedBills.findIndex(
                  b => b.id === update.data.bill_id
                );
                if (billIndex !== -1) {
                  state.dashboardData.trackedBills[billIndex].status = update.data.newStatus;
                  state.dashboardData.trackedBills[billIndex].lastStatusChange = new Date().toISOString();
                }
              }
              break;

            case 'civic_metrics_update':
              if (state.dashboardData && update.data.userId === state.dashboardData.stats) {
                state.dashboardData.civicMetrics = {
                  ...state.dashboardData.civicMetrics,
                  ...update.data.metrics
                };
              }
              break;

            case 'new_recommendation':
              if (state.dashboardData) {
                state.dashboardData.recommendations.unshift(update.data.recommendation);
                // Keep only top 10 recommendations
                if (state.dashboardData.recommendations.length > 10) {
                  state.dashboardData.recommendations = state.dashboardData.recommendations.slice(0, 10);
                }
              }
              break;
          }

          state.lastUpdateTime = new Date().toISOString();
          state.pendingUpdates += 1;
        }),

        // Utility actions
        refreshDashboard: async () => {
          set((state) => { state.loading = true; });
          
          try {
            // In a real implementation, this would fetch fresh data from the API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            set((state) => {
              state.loading = false;
              state.lastUpdateTime = new Date().toISOString();
              state.pendingUpdates = 0;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to refresh dashboard';
              state.loading = false;
            });
          }
        },

        reset: () => set(() => ({ ...initialState }))
      })),
      {
        name: 'chanuka-user-dashboard-store',
        partialize: (state) => ({
          preferences: state.preferences,
          privacyControls: state.privacyControls,
          timeFilter: state.timeFilter
        })
      }
    ),
    { name: 'UserDashboardStore' }
  )
);

// Selectors for computed values
export const useUserDashboardSelectors = () => {
  const state = useUserDashboardStore();

  // Filter engagement history based on time filter
  const filteredEngagementHistory = state.dashboardData?.recentActivity.filter(item => {
    if (!state.timeFilter.startDate && !state.timeFilter.endDate) {
      const now = new Date();
      const itemDate = new Date(item.timestamp);
      
      switch (state.timeFilter.period) {
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
    const start = state.timeFilter.startDate ? new Date(state.timeFilter.startDate) : null;
    const end = state.timeFilter.endDate ? new Date(state.timeFilter.endDate) : null;
    
    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    
    return true;
  }) || [];

  // Calculate engagement stats for the filtered period
  const engagementStats = {
    totalActivities: filteredEngagementHistory.length,
    commentCount: filteredEngagementHistory.filter(item => item.type === 'comment').length,
    shareCount: filteredEngagementHistory.filter(item => item.type === 'share').length,
    viewCount: filteredEngagementHistory.filter(item => item.type === 'view').length,
    saveCount: filteredEngagementHistory.filter(item => item.type === 'save').length
  };

  return {
    ...state,
    filteredEngagementHistory,
    engagementStats,
    hasData: !!state.dashboardData,
    isDataStale: state.lastUpdateTime ? 
      (Date.now() - new Date(state.lastUpdateTime).getTime()) > (state.preferences.refreshInterval * 60 * 1000) : 
      true
  };
};