/**
 * UI Slice
 *
 * Manages global UI state, theme, navigation, and user interface preferences.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

  // Connection status
  isOnline: boolean;

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

const initialState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  currentPage: '/',
  breadcrumbs: [],
  activeModal: null,
  modalData: null,
  globalLoading: false,
  loadingMessage: null,
  toast: null,
  isOnline: navigator.onLine,
  isMobile: false,
  screenSize: 'desktop',
  features: {
    realTimeUpdates: true,
    expertVerification: true,
    communityDiscussions: true,
    advancedFiltering: true
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme management
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    // Navigation
    setCurrentPage: (state, action: PayloadAction<string>) => {
      state.currentPage = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload;
    },

    // Modal management
    openModal: (state, action: PayloadAction<{ modalId: string; data?: any }>) => {
      state.activeModal = action.payload.modalId;
      state.modalData = action.payload.data;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },

    // Loading states - DEPRECATED: Use @core/loading instead
    setGlobalLoading: (state, action: PayloadAction<{ loading: boolean; message?: string }>) => {
      state.globalLoading = action.payload.loading;
      state.loadingMessage = action.payload.message || null;
    },

    // Toast notifications
    showToast: (state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number }>) => {
      state.toast = {
        message: action.payload.message,
        type: action.payload.type,
        duration: action.payload.duration || 5000
      };
    },
    hideToast: (state) => {
      state.toast = null;
    },

    // Responsive design
    setScreenSize: (state, action: PayloadAction<UIState['screenSize']>) => {
      state.screenSize = action.payload;
      state.isMobile = action.payload === 'mobile';
    },
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
      if (action.payload && state.screenSize !== 'mobile') {
        state.screenSize = 'mobile';
      }
    },

    // Connection status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    // Feature flags
    toggleFeature: (state, action: PayloadAction<keyof UIState['features']>) => {
      state.features[action.payload] = !state.features[action.payload];
    },
    setFeature: (state, action: PayloadAction<{ feature: keyof UIState['features']; enabled: boolean }>) => {
      state.features[action.payload.feature] = action.payload.enabled;
    },
  },
});

// Export actions
export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setCurrentPage,
  setBreadcrumbs,
  openModal,
  closeModal,
  setGlobalLoading,
  showToast,
  hideToast,
  setOnlineStatus,
  setScreenSize,
  setIsMobile,
  toggleFeature,
  setFeature
} = uiSlice.actions;

// Export selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectCurrentPage = (state: { ui: UIState }) => state.ui.currentPage;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
export const selectLoadingMessage = (state: { ui: UIState }) => state.ui.loadingMessage;
export const selectToast = (state: { ui: UIState }) => state.ui.toast;
export const selectIsOnline = (state: { ui: UIState }) => state.ui.isOnline;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectScreenSize = (state: { ui: UIState }) => state.ui.screenSize;
export const selectFeatures = (state: { ui: UIState }) => state.ui.features;

// Export reducer
export default uiSlice.reducer;