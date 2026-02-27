/**
 * Store Configuration and Initialization
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authReducer from '@client/infrastructure/auth/store/auth-slice';

import errorHandlingReducer from './slices/errorHandlingSlice';
import loadingReducer from './slices/loadingSlice';
import navigationReducer from './slices/navigationSlice';
import sessionReducer from './slices/sessionSlice';
import uiReducer from './slices/uiSlice';
import userDashboardReducer from './slices/userDashboardSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'session', 'ui', 'userDashboard', 'navigation'], // Only persist these slices
};

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  session: sessionReducer,
  ui: uiReducer,
  userDashboard: userDashboardReducer,
  loading: loadingReducer,
  navigation: navigationReducer,
  errorHandling: errorHandlingReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
      immutableCheck: {
        warnAfter: 128,
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface StoreData {
  store: typeof store;
  persistor: typeof persistor;
}

export function initializeStore(): StoreData {
  return {
    store,
    persistor,
  };
}

export function getStore() {
  return store;
}

// ============================================================================
// PUBLIC API - Selectors (to avoid direct slice imports)
// ============================================================================

// Re-export commonly used selectors from slices
export {
  selectBreadcrumbs,
  selectNavigationPreferences,
  selectNavigationUIState,
} from './slices/navigationSlice';

export {
  selectLoadingState,
  selectIsLoading,
  selectLoadingOperations,
  startLoadingOperation,
  completeLoadingOperation,
  selectLoadingOperation,
  selectOperationsByPriority,
  selectActiveOperationsCount,
  selectShouldShowGlobalLoader,
} from './slices/loadingSlice';

export type { SessionInfo } from './slices/sessionSlice';

// ============================================================================
// PUBLIC API - Actions (to avoid direct slice imports)
// ============================================================================

// Re-export commonly used actions from slices
export {
  addToRecentPages,
  clearPersistedState,
  setUserRole,
  setCurrentPath,
  updateBreadcrumbs,
  updateRelatedPages,
  setCurrentSection,
  toggleSidebar,
  toggleMobileMenu,
  setMobile,
  setSidebarCollapsed,
  setMounted,
  updatePreferences,
} from './slices/navigationSlice';

export {
  setCurrentSession,
} from './slices/sessionSlice';

export {
  startLoading,
  stopLoading,
  setLoadingProgress,
} from './slices/loadingSlice';

// ============================================================================
// PUBLIC API - Hooks (custom hooks for common patterns)
// ============================================================================

export { useUserDashboardStore } from './slices/userDashboardSlice';

// ============================================================================
// PUBLIC API - Reducers (for testing)
// ============================================================================

// Only export reducers for testing purposes
export { default as navigationReducer } from './slices/navigationSlice';
export { default as loadingReducer } from './slices/loadingSlice';
export { default as sessionReducer } from './slices/sessionSlice';
export { default as userDashboardReducer } from './slices/userDashboardSlice';
export { default as uiReducer } from './slices/uiSlice';
export { default as errorHandlingReducer } from './slices/errorHandlingSlice';

// ============================================================================
// PUBLIC API - Types
// ============================================================================

export type {
  LoadingState,
  LoadingStateData,
  ExtendedLoadingOperation,
} from './slices/loadingSlice';

export type { DashboardFilters } from './slices/errorAnalyticsSlice';

// Re-export error analytics slice exports
export {
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
} from './slices/errorAnalyticsSlice';

