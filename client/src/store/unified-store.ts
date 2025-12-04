/**
 * Unified State Management Strategy
 * 
 * Consolidates all state management into a coherent architecture:
 * - Zustand for global application state
 * - React Query for server state
 * - Local useState for component-specific state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  anonymityLevel: 'public' | 'pseudonymous' | 'anonymous' | 'private';
  county?: string;
  role: 'citizen' | 'expert' | 'moderator' | 'admin';
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'sw';
  notifications: {
    email: boolean;
    push: boolean;
    billUpdates: boolean;
    comments: boolean;
  };
  privacy: {
    showLocation: boolean;
    showContactInfo: boolean;
    allowDirectMessages: boolean;
    publicProfile: boolean;
  };
}

export interface AppState {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  
  // UI state
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'sw';
  sidebarOpen: boolean;
  
  // Feature flags
  features: {
    realTimeNotifications: boolean;
    advancedSearch: boolean;
    expertVerification: boolean;
    communityFeatures: boolean;
  };
  
  // Connection state
  isOnline: boolean;
  lastSyncTime: Date | null;
  
  // Notification state
  notifications: Notification[];
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'bill_update' | 'comment_reply' | 'system' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

interface AppActions {
  // Authentication actions
  setUser: (user: User | null) => void;
  setAuthToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // UI actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'sw') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Feature flag actions
  setFeatureFlag: (feature: keyof AppState['features'], enabled: boolean) => void;
  
  // Connection actions
  setOnlineStatus: (online: boolean) => void;
  updateLastSyncTime: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        authToken: null,
        theme: 'system',
        language: 'en',
        sidebarOpen: false,
        features: {
          realTimeNotifications: true,
          advancedSearch: true,
          expertVerification: false,
          communityFeatures: true,
        },
        isOnline: navigator.onLine,
        lastSyncTime: null,
        notifications: [],
        unreadCount: 0,

        // Authentication actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          }),

        setAuthToken: (token) =>
          set((state) => {
            state.authToken = token;
          }),

        login: (user, token) =>
          set((state) => {
            state.user = user;
            state.authToken = token;
            state.isAuthenticated = true;
            
            // Apply user preferences
            if (user.preferences) {
              state.theme = user.preferences.theme;
              state.language = user.preferences.language;
            }
          }),

        logout: () =>
          set((state) => {
            state.user = null;
            state.authToken = null;
            state.isAuthenticated = false;
            state.notifications = [];
            state.unreadCount = 0;
          }),

        updateUserPreferences: (preferences) =>
          set((state) => {
            if (state.user) {
              state.user.preferences = {
                ...state.user.preferences,
                ...preferences,
              };
              
              // Update global state based on preferences
              if (preferences.theme) {
                state.theme = preferences.theme;
              }
              if (preferences.language) {
                state.language = preferences.language;
              }
            }
          }),

        // UI actions
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
            
            // Update user preferences if logged in
            if (state.user) {
              state.user.preferences.theme = theme;
            }
          }),

        setLanguage: (language) =>
          set((state) => {
            state.language = language;
            
            // Update user preferences if logged in
            if (state.user) {
              state.user.preferences.language = language;
            }
          }),

        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),

        setSidebarOpen: (open) =>
          set((state) => {
            state.sidebarOpen = open;
          }),

        // Feature flag actions
        setFeatureFlag: (feature, enabled) =>
          set((state) => {
            state.features[feature] = enabled;
          }),

        // Connection actions
        setOnlineStatus: (online) =>
          set((state) => {
            state.isOnline = online;
          }),

        updateLastSyncTime: () =>
          set((state) => {
            state.lastSyncTime = new Date();
          }),

        // Notification actions
        addNotification: (notification) =>
          set((state) => {
            const newNotification: Notification = {
              ...notification,
              id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              read: false,
            };
            
            state.notifications.unshift(newNotification);
            state.unreadCount += 1;
            
            // Limit to 100 notifications
            if (state.notifications.length > 100) {
              state.notifications = state.notifications.slice(0, 100);
            }
          }),

        markNotificationRead: (id) =>
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }),

        markAllNotificationsRead: () =>
          set((state) => {
            state.notifications.forEach((notification) => {
              notification.read = true;
            });
            state.unreadCount = 0;
          }),

        removeNotification: (id) =>
          set((state) => {
            const index = state.notifications.findIndex((n) => n.id === id);
            if (index !== -1) {
              const notification = state.notifications[index];
              if (!notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
              state.notifications.splice(index, 1);
            }
          }),

        clearNotifications: () =>
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          }),
      })),
      {
        name: 'chanuka-app-store',
        partialize: (state) => ({
          // Persist only necessary state
          user: state.user,
          authToken: state.authToken,
          isAuthenticated: state.isAuthenticated,
          theme: state.theme,
          language: state.language,
          features: state.features,
        }),
      }
    ),
    {
      name: 'chanuka-app-store',
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

// Authentication selectors
export const useAuth = () => {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authToken = useAppStore((state) => state.authToken);
  const login = useAppStore((state) => state.login);
  const logout = useAppStore((state) => state.logout);
  
  return {
    user,
    isAuthenticated,
    authToken,
    login,
    logout,
  };
};

// UI selectors
export const useUI = () => {
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setTheme = useAppStore((state) => state.setTheme);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  
  return {
    theme,
    language,
    sidebarOpen,
    setTheme,
    setLanguage,
    toggleSidebar,
    setSidebarOpen,
  };
};

// Feature flag selectors
export const useFeatureFlags = () => {
  const features = useAppStore((state) => state.features);
  const setFeatureFlag = useAppStore((state) => state.setFeatureFlag);
  
  return {
    features,
    setFeatureFlag,
    isEnabled: (feature: keyof AppState['features']) => features[feature],
  };
};

// Notification selectors
export const useNotifications = () => {
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = useAppStore((state) => state.unreadCount);
  const addNotification = useAppStore((state) => state.addNotification);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  
  return {
    notifications,
    unreadCount,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
  };
};

// Connection selectors
export const useConnection = () => {
  const isOnline = useAppStore((state) => state.isOnline);
  const lastSyncTime = useAppStore((state) => state.lastSyncTime);
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);
  const updateLastSyncTime = useAppStore((state) => state.updateLastSyncTime);
  
  return {
    isOnline,
    lastSyncTime,
    setOnlineStatus,
    updateLastSyncTime,
  };
};

export default useAppStore;