/**
 * Unified State Management System
 * 
 * Consolidates all client state management into a single, predictable pattern
 * with proper error handling, loading states, and offline support
 */

import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Core State Types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  retryCount: number;
}

// Define specific types instead of using 'any' for better type safety
export type DashboardFilters = {
  status?: string[];
  dateRange?: { start: string; end: string };
  category?: string;
  urgency?: string[];
};

export type ActivityMetadata = {
  billId?: string;
  commentId?: string;
  analysisId?: string;
  [key: string]: unknown;
};

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    billUpdates: boolean;
    communityActivity: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    defaultFilters: DashboardFilters;
    pinnedBills: string[];
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
}

// Define a proper Bill type instead of using 'any'
export interface Bill {
  id: string;
  title: string;
  status: string;
  urgency?: string;
  policyArea?: string;
  introducedDate?: string;
  summary?: string;
  // Add other bill properties as needed
}

export interface UserState {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    persona: 'novice' | 'intermediate' | 'expert';
    onboardingCompleted: boolean;
  } | null;
  preferences: UserPreferences;
  savedBills: Set<string>;
  recentActivity: Array<{
    id: string;
    type: 'bill_viewed' | 'bill_saved' | 'comment_posted' | 'analysis_viewed';
    timestamp: string;
    metadata: ActivityMetadata;
  }>;
}

export interface BillsState {
  bills: Record<string, Bill>;
  filters: {
    query: string;
    status: string[];
    urgency: string[];
    policyAreas: string[];
    dateRange: { start?: string; end?: string };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  cache: {
    lastFetch: string | null;
    ttl: number;
  };
}

// Define specific action payload types instead of using 'any'
export type PendingActionPayload = 
  | { type: 'save_bill'; billId: string }
  | { type: 'unsave_bill'; billId: string }
  | { type: 'post_comment'; billId: string; content: string }
  | { type: 'update_preferences'; preferences: Partial<UserPreferences> };

export interface AppState {
  // Connection & Sync
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingActions: Array<{
    id: string;
    type: string;
    payload: PendingActionPayload;
    timestamp: string;
  }>;

  // Loading States
  loading: Record<string, LoadingState>;

  // Feature States
  user: UserState;
  bills: BillsState;
  
  // UI State
  ui: {
    sidebarOpen: boolean;
    activeModal: string | null;
    notifications: Array<{
      id: string;
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      timestamp: string;
      dismissed: boolean;
    }>;
    breadcrumbs: Array<{
      label: string;
      href: string;
    }>;
  };
}

// Actions Interface
export interface AppActions {
  // Loading Management
  setLoading: (key: string, loading: Partial<LoadingState>) => void;
  clearError: (key: string) => void;
  incrementRetry: (key: string) => void;

  // User Actions
  setUser: (user: UserState['user']) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  saveBill: (billId: string) => void;
  unsaveBill: (billId: string) => void;
  addActivity: (activity: UserState['recentActivity'][0]) => void;

  // Bills Actions
  setBills: (bills: Record<string, Bill>) => void;
  updateFilters: (filters: Partial<BillsState['filters']>) => void;
  updatePagination: (pagination: Partial<BillsState['pagination']>) => void;
  invalidateCache: () => void;

  // UI Actions
  toggleSidebar: () => void;
  setActiveModal: (modal: string | null) => void;
  addNotification: (notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissNotification: (id: string) => void;
  setBreadcrumbs: (breadcrumbs: AppState['ui']['breadcrumbs']) => void;

  // Sync Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingAction: (action: Omit<AppState['pendingActions'][0], 'id' | 'timestamp'>) => void;
  processPendingActions: () => Promise<void>;

  // Reset Actions
  resetState: () => void;
  resetUserState: () => void;
}

// Default State
const defaultState: AppState = {
  isOnline: navigator.onLine,
  syncStatus: 'idle',
  pendingActions: [],
  
  loading: {},
  
  user: {
    isAuthenticated: false,
    user: null,
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        billUpdates: true,
        communityActivity: false,
      },
      dashboard: {
        layout: 'grid',
        defaultFilters: {},
        pinnedBills: [],
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium',
        screenReader: false,
      },
    },
    savedBills: new Set(),
    recentActivity: [],
  },
  
  bills: {
    bills: {},
    filters: {
      query: '',
      status: [],
      urgency: [],
      policyAreas: [],
      dateRange: {},
    },
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      hasMore: false,
    },
    cache: {
      lastFetch: null,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  },
  
  ui: {
    sidebarOpen: false,
    activeModal: null,
    notifications: [],
    breadcrumbs: [],
  },
};

// Create Store with Middleware
export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...defaultState,

        // Loading Management
        // Fixed: Properly merge loading state without overwriting defaults
        setLoading: (key, loading) =>
          set((state) => {
            const existingState = state.loading[key];
            
            // Create the complete loading state by merging defaults with existing and new values
            state.loading[key] = {
              isLoading: existingState?.isLoading ?? false,
              error: existingState?.error ?? null,
              lastUpdated: existingState?.lastUpdated ?? null,
              retryCount: existingState?.retryCount ?? 0,
              ...loading, // New values override everything above
            };
          }),

        clearError: (key) =>
          set((state) => {
            if (state.loading[key]) {
              state.loading[key].error = null;
            }
          }),

        incrementRetry: (key) =>
          set((state) => {
            if (state.loading[key]) {
              state.loading[key].retryCount += 1;
            }
          }),

        // User Actions
        setUser: (user) =>
          set((state) => {
            state.user.user = user;
            state.user.isAuthenticated = !!user;
          }),

        updatePreferences: (preferences) =>
          set((state) => {
            // Deep merge preferences to avoid losing nested properties
            if (preferences.notifications) {
              Object.assign(state.user.preferences.notifications, preferences.notifications);
            }
            if (preferences.dashboard) {
              Object.assign(state.user.preferences.dashboard, preferences.dashboard);
            }
            if (preferences.accessibility) {
              Object.assign(state.user.preferences.accessibility, preferences.accessibility);
            }
            // Update top-level preferences
            if (preferences.theme) state.user.preferences.theme = preferences.theme;
            if (preferences.language) state.user.preferences.language = preferences.language;
          }),

        saveBill: (billId) =>
          set((state) => {
            state.user.savedBills.add(billId);
            state.user.recentActivity.unshift({
              id: `save_${billId}_${Date.now()}`,
              type: 'bill_saved',
              timestamp: new Date().toISOString(),
              metadata: { billId },
            });
            // Keep only last 50 activities
            if (state.user.recentActivity.length > 50) {
              state.user.recentActivity = state.user.recentActivity.slice(0, 50);
            }
          }),

        unsaveBill: (billId) =>
          set((state) => {
            state.user.savedBills.delete(billId);
          }),

        addActivity: (activity) =>
          set((state) => {
            state.user.recentActivity.unshift({
              ...activity,
              id: activity.id || `${activity.type}_${Date.now()}`,
              timestamp: activity.timestamp || new Date().toISOString(),
            });
            // Keep only last 50 activities
            if (state.user.recentActivity.length > 50) {
              state.user.recentActivity = state.user.recentActivity.slice(0, 50);
            }
          }),

        // Bills Actions
        setBills: (bills) =>
          set((state) => {
            state.bills.bills = bills;
            state.bills.cache.lastFetch = new Date().toISOString();
          }),

        updateFilters: (filters) =>
          set((state) => {
            Object.assign(state.bills.filters, filters);
            // Reset pagination when filters change
            state.bills.pagination.page = 1;
          }),

        updatePagination: (pagination) =>
          set((state) => {
            Object.assign(state.bills.pagination, pagination);
          }),

        invalidateCache: () =>
          set((state) => {
            state.bills.cache.lastFetch = null;
          }),

        // UI Actions
        toggleSidebar: () =>
          set((state) => {
            state.ui.sidebarOpen = !state.ui.sidebarOpen;
          }),

        setActiveModal: (modal) =>
          set((state) => {
            state.ui.activeModal = modal;
          }),

        addNotification: (notification) =>
          set((state) => {
            state.ui.notifications.unshift({
              ...notification,
              id: `notification_${Date.now()}`,
              timestamp: new Date().toISOString(),
              dismissed: false,
            });
            // Keep only last 10 notifications
            if (state.ui.notifications.length > 10) {
              state.ui.notifications = state.ui.notifications.slice(0, 10);
            }
          }),

        dismissNotification: (id) =>
          set((state) => {
            const notification = state.ui.notifications.find(n => n.id === id);
            if (notification) {
              notification.dismissed = true;
            }
          }),

        setBreadcrumbs: (breadcrumbs) =>
          set((state) => {
            state.ui.breadcrumbs = breadcrumbs;
          }),

        // Sync Actions
        setOnlineStatus: (isOnline) =>
          set((state) => {
            state.isOnline = isOnline;
            if (isOnline && state.pendingActions.length > 0) {
              // Trigger sync when coming back online
              setTimeout(() => get().processPendingActions(), 1000);
            }
          }),

        addPendingAction: (action) =>
          set((state) => {
            state.pendingActions.push({
              ...action,
              id: `action_${Date.now()}`,
              timestamp: new Date().toISOString(),
            });
          }),

        processPendingActions: async () => {
          const { pendingActions, isOnline } = get();
          
          if (!isOnline || pendingActions.length === 0) return;

          set((state) => {
            state.syncStatus = 'syncing';
          });

          try {
            // Process each pending action
            for (const action of pendingActions) {
              // Handle different action types based on the payload
              switch (action.payload.type) {
                case 'save_bill':
                  // TODO: Implement actual API call
                  console.log('Syncing save_bill:', action.payload.billId);
                  break;
                case 'unsave_bill':
                  // TODO: Implement actual API call
                  console.log('Syncing unsave_bill:', action.payload.billId);
                  break;
                case 'post_comment':
                  // TODO: Implement actual API call
                  console.log('Syncing post_comment:', action.payload);
                  break;
                case 'update_preferences':
                  // TODO: Implement actual API call
                  console.log('Syncing update_preferences:', action.payload);
                  break;
                default:
                  console.warn('Unknown action type:', action);
              }
            }

            set((state) => {
              state.pendingActions = [];
              state.syncStatus = 'idle';
            });
          } catch (error) {
            set((state) => {
              state.syncStatus = 'error';
            });
            console.error('Failed to process pending actions:', error);
          }
        },

        // Reset Actions
        resetState: () => set(defaultState),

        resetUserState: () =>
          set((state) => {
            state.user = defaultState.user;
          }),
      })),
      {
        name: 'chanuka-app-state',
        storage: createJSONStorage(() => localStorage),
        // partialize is a Zustand term for selecting which parts of state to persist
        partialize: (state) => ({
          user: {
            ...state.user,
            savedBills: Array.from(state.user.savedBills), // Convert Set to Array for serialization
          },
          bills: {
            ...state.bills,
            cache: state.bills.cache,
          },
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            // Don't persist notifications or modals
          },
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.user?.savedBills) {
            // Convert Array back to Set after rehydration
            state.user.savedBills = new Set(state.user.savedBills as unknown as string[]);
          }
        },
      }
    )
  )
);

// Selectors for common state access patterns
export const useLoadingState = (key: string) => 
  useAppStore((state) => state.loading[key] || { isLoading: false, error: null, lastUpdated: null, retryCount: 0 });

export const useUserPreferences = () => 
  useAppStore((state) => state.user.preferences);

export const useSavedBills = () => 
  useAppStore((state) => state.user.savedBills);

export const useNotifications = () => 
  useAppStore((state) => state.ui.notifications.filter(n => !n.dismissed));

export const useBillsFilters = () => 
  useAppStore((state) => state.bills.filters);

export const useOnlineStatus = () => 
  useAppStore((state) => ({ isOnline: state.isOnline, syncStatus: state.syncStatus }));

// Setup online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useAppStore.getState().setOnlineStatus(true));
  window.addEventListener('offline', () => useAppStore.getState().setOnlineStatus(false));
}