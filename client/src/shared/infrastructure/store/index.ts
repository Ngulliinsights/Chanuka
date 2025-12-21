/**
 * Store Configuration and Initialization
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authReducer from '../../core/auth/store/auth-slice';
import sessionReducer from './slices/sessionSlice';
import uiReducer from './slices/uiSlice';
import userDashboardReducer from './slices/userDashboardSlice';
import loadingReducer from './slices/loadingSlice';
import navigationReducer from './slices/navigationSlice';
import errorHandlingReducer from './slices/errorHandlingSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'session', 'ui', 'userDashboard', 'navigation'], // Only persist these slices
};

// Root reducer
const rootReducer = {
  auth: authReducer,
  session: sessionReducer,
  ui: uiReducer,
  userDashboard: userDashboardReducer,
  loading: loadingReducer,
  navigation: navigationReducer,
  errorHandling: errorHandlingReducer,
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer as any);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
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

export default store;