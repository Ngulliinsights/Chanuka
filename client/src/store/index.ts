/**
 * Redux Store Configuration
 * 
 * Implements Redux Toolkit with normalized data structures, API middleware,
 * WebSocket middleware, error handling, and retry mechanisms as specified
 * in the Chanuka client UI upgrade requirements.
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { logger } from '../utils/logger';

// Import slices
import billsSlice from './slices/billsSlice';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import realTimeSlice from './slices/realTimeSlice';
import errorAnalyticsSlice from './slices/errorAnalyticsSlice';
import loadingSlice from './slices/loadingSlice';
import errorHandlingSlice from './slices/errorHandlingSlice';

// Import middleware
import { apiMiddleware } from './middleware/apiMiddleware';
import { webSocketMiddleware } from './middleware/webSocketMiddleware';
import { errorHandlingMiddleware } from './middleware/errorHandlingMiddleware';
import { authMiddleware } from './middleware/authMiddleware';

// Persist configuration
const persistConfig = {
  key: 'chanuka-root',
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
  blacklist: ['bills', 'realTime'], // Don't persist real-time data
};

// Root reducer
const rootReducer = combineReducers({
  bills: billsSlice,
  auth: authSlice,
  ui: uiSlice,
  realTime: realTimeSlice,
  errorAnalytics: errorAnalyticsSlice,
  loading: loadingSlice,
  errorHandling: errorHandlingSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register'],
      },
      immutableCheck: {
        ignoredPaths: ['realTime.notifications', 'realTime.expertActivities'],
      },
    })
      .concat(errorHandlingMiddleware)
      .concat(authMiddleware)
      .concat(apiMiddleware)
      .concat(webSocketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
  // Performance optimizations
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers({
      autoBatch: true,
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Log store initialization
logger.info('Redux store initialized', {
  component: 'ReduxStore',
  middleware: ['errorHandling', 'auth', 'api', 'webSocket'],
  persistedSlices: ['auth', 'ui'],
});