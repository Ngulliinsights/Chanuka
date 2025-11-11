/**
 * UI Slice
 * 
 * Manages global UI state, theme, navigation, and user interface preferences.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Navigation
  currentPage: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  
  // Modals and overlays
  activeModal: string | null;
  modalData: any;
  
  // Loading states - DEPRECATED: Use @core/loading instead
  globalLoading: boolean;
  loadingMessage: string | null;
  
  // Notifications and alerts
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration: number;
  } | null;
  
  // Mobile responsiveness
  isMobile: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  
  // Feature flags
  features: {
    realTimeUpdates: boolean;
    expertVerification: boolean;
    communityDiscussions: boolean;
    advancedFiltering: boolean;
  };
}

interface UIActions {
  // Theme management
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Navigation
  setCurrentPage: (page: string) => void;
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void;
  
  // Modal management
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  
  // Loading states - DEPRECATED: Use @core/loading instead
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Toast notifications
  showToast: (message: string, type: UIState['toast']['type'], duration?: number) => void;
  hideToast: () => void;
  
  // Responsive design
  setScreenSize: (size: UIState['screenSize']) => void;
  setIsMobile: (isMobile: boolean) => void;
  
  // Feature flags
  toggleFeature: (feature: keyof UIState['features']) => void;
  setFeature: (feature: keyof UIState['features'], enabled: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        theme: 'system',
        sidebarCollapsed: false,
        currentPage: '/',
        breadcrumbs: [],
        activeModal: null,
        modalData: null,
        globalLoading: false,
        loadingMessage: null,
        toast: null,
        isMobile: false,
        screenSize: 'desktop',
        features: {
          realTimeUpdates: true,
          expertVerification: true,
          communityDiscussions: true,
          advancedFiltering: true
        },

        // Theme management
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),

        toggleSidebar: () =>
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          }),

        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.sidebarCollapsed = collapsed;
          }),

        // Navigation
        setCurrentPage: (page) =>
          set((state) => {
            state.currentPage = page;
          }),

        setBreadcrumbs: (breadcrumbs) =>
          set((state) => {
            state.breadcrumbs = breadcrumbs;
          }),

        // Modal management
        openModal: (modalId, data) =>
          set((state) => {
            state.activeModal = modalId;
            state.modalData = data;
          }),

        closeModal: () =>
          set((state) => {
            state.activeModal = null;
            state.modalData = null;
          }),

        // Loading states
        setGlobalLoading: (loading, message) =>
          set((state) => {
            state.globalLoading = loading;
            state.loadingMessage = message || null;
          }),

        // Toast notifications
        showToast: (message, type, duration = 5000) =>
          set((state) => {
            state.toast = { message, type, duration };
          }),

        hideToast: () =>
          set((state) => {
            state.toast = null;
          }),

        // Responsive design
        setScreenSize: (size) =>
          set((state) => {
            state.screenSize = size;
            state.isMobile = size === 'mobile';
          }),

        setIsMobile: (isMobile) =>
          set((state) => {
            state.isMobile = isMobile;
            if (isMobile && state.screenSize !== 'mobile') {
              state.screenSize = 'mobile';
            }
          }),

        // Feature flags
        toggleFeature: (feature) =>
          set((state) => {
            state.features[feature] = !state.features[feature];
          }),

        setFeature: (feature, enabled) =>
          set((state) => {
            state.features[feature] = enabled;
          })
      })),
      {
        name: 'chanuka-ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          features: state.features
        })
      }
    ),
    { name: 'UIStore' }
  )
);

// Selectors
export const selectTheme = () => useUIStore(state => state.theme);
export const selectIsMobile = () => useUIStore(state => state.isMobile);
export const selectActiveModal = () => useUIStore(state => state.activeModal);
export const selectToast = () => useUIStore(state => state.toast);
export const selectFeatures = () => useUIStore(state => state.features);

// Export Redux-compatible slice
export const uiSlice = {
  name: 'ui',
  reducer: (state = {}, action: any) => state
};