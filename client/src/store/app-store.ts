/**
 * Unified Application State Management
 * 
 * A simple, predictable state management solution using Zustand
 * that consolidates navigation, UI, and application state.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// State interfaces
interface NavigationState {
  currentPath: string
  previousPath: string | null
  breadcrumbs: Array<{ label: string; path: string }>
  sidebarCollapsed: boolean
  isMobile: boolean
  mounted: boolean
}

interface UIState {
  theme: 'light' | 'dark' | 'system'
  loading: Record<string, boolean>
  errors: Record<string, string | null>
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }>
}

interface UserState {
  isAuthenticated: boolean
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  preferences: {
    language: string
    timezone: string
    notifications: boolean
  }
}

interface AppState extends NavigationState, UIState, UserState {}

// Actions interface
interface AppActions {
  // Navigation actions
  setCurrentPath: (path: string) => void
  setPreviousPath: (path: string | null) => void
  setBreadcrumbs: (breadcrumbs: NavigationState['breadcrumbs']) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setIsMobile: (isMobile: boolean) => void
  setMounted: (mounted: boolean) => void
  
  // UI actions
  setTheme: (theme: UIState['theme']) => void
  setLoading: (key: string, loading: boolean) => void
  setError: (key: string, error: string | null) => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // User actions
  setUser: (user: UserState['user']) => void
  setAuthenticated: (authenticated: boolean) => void
  updatePreferences: (preferences: Partial<UserState['preferences']>) => void
  
  // Utility actions
  reset: () => void
}

// Initial state
const initialState: AppState = {
  // Navigation
  currentPath: '/',
  previousPath: null,
  breadcrumbs: [],
  sidebarCollapsed: false,
  isMobile: false,
  mounted: false,
  
  // UI
  theme: 'system',
  loading: {},
  errors: {},
  notifications: [],
  
  // User
  isAuthenticated: false,
  user: null,
  preferences: {
    language: 'en',
    timezone: 'UTC',
    notifications: true,
  },
}

// Store creation with middleware
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Navigation actions
        setCurrentPath: (path) => set((state) => {
          state.previousPath = state.currentPath
          state.currentPath = path
        }),
        
        setPreviousPath: (path) => set((state) => {
          state.previousPath = path
        }),
        
        setBreadcrumbs: (breadcrumbs) => set((state) => {
          state.breadcrumbs = breadcrumbs
        }),
        
        toggleSidebar: () => set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed
        }),
        
        setSidebarCollapsed: (collapsed) => set((state) => {
          state.sidebarCollapsed = collapsed
        }),
        
        setIsMobile: (isMobile) => set((state) => {
          state.isMobile = isMobile
          // Auto-collapse sidebar on mobile
          if (isMobile) {
            state.sidebarCollapsed = true
          }
        }),
        
        setMounted: (mounted) => set((state) => {
          state.mounted = mounted
        }),
        
        // UI actions
        setTheme: (theme) => set((state) => {
          state.theme = theme
        }),
        
        setLoading: (key, loading) => set((state) => {
          if (loading) {
            state.loading[key] = true
          } else {
            delete state.loading[key]
          }
        }),
        
        setError: (key, error) => set((state) => {
          if (error) {
            state.errors[key] = error
          } else {
            delete state.errors[key]
          }
        }),
        
        addNotification: (notification) => set((state) => {
          const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          state.notifications.push({
            ...notification,
            id,
            timestamp: Date.now(),
          })
        }),
        
        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id)
        }),
        
        clearNotifications: () => set((state) => {
          state.notifications = []
        }),
        
        // User actions
        setUser: (user) => set((state) => {
          state.user = user
          state.isAuthenticated = !!user
        }),
        
        setAuthenticated: (authenticated) => set((state) => {
          state.isAuthenticated = authenticated
          if (!authenticated) {
            state.user = null
          }
        }),
        
        updatePreferences: (preferences) => set((state) => {
          state.preferences = { ...state.preferences, ...preferences }
        }),
        
        // Utility actions
        reset: () => set(() => ({ ...initialState })),
      })),
      {
        name: 'chanuka-app-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'chanuka-app-store',
    }
  )
)

// Selectors for better performance
export const useNavigation = () => useAppStore((state) => ({
  currentPath: state.currentPath,
  previousPath: state.previousPath,
  breadcrumbs: state.breadcrumbs,
  sidebarCollapsed: state.sidebarCollapsed,
  isMobile: state.isMobile,
  mounted: state.mounted,
  setCurrentPath: state.setCurrentPath,
  setPreviousPath: state.setPreviousPath,
  setBreadcrumbs: state.setBreadcrumbs,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setIsMobile: state.setIsMobile,
  setMounted: state.setMounted,
}))

export const useUI = () => useAppStore((state) => ({
  theme: state.theme,
  loading: state.loading,
  errors: state.errors,
  notifications: state.notifications,
  setTheme: state.setTheme,
  setLoading: state.setLoading,
  setError: state.setError,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}))

export const useUser = () => useAppStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  user: state.user,
  preferences: state.preferences,
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  updatePreferences: state.updatePreferences,
}))

// Utility hooks
export const useIsLoading = (key?: string) => {
  return useAppStore((state) => {
    if (key) {
      return !!state.loading[key]
    }
    return Object.keys(state.loading).length > 0
  })
}

export const useError = (key: string) => {
  return useAppStore((state) => state.errors[key] || null)
}