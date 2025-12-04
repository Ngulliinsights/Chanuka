/**
 * Redux Store Configuration
 * 
 * Implements Redux Toolkit with normalized data structures, API middleware,
 * WebSocket middleware, error handling, and retry mechanisms as specified
 * in the Chanuka client UI upgrade requirements.
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { isPlainObject } from '@reduxjs/toolkit';

// Custom serialization check that allows ISO date strings
const customSerializationCheck = {
  isSerializable: (value: any): boolean => {
    // Allow ISO date strings
    if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return true;
    }
    return isPlainObject(value) || typeof value === 'undefined' || typeof value === 'string' || 
           typeof value === 'boolean' || typeof value === 'number' || Array.isArray(value);
  }
};
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import { logger } from '@client/utils/logger';

// Import slices - auth and session slices are lazy loaded
import { apiMiddleware } from './middleware/apiMiddleware';
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandlingMiddleware } from './middleware/errorHandlingMiddleware';
import { navigationPersistenceMiddleware } from './middleware/navigationPersistenceMiddleware';
import { webSocketMiddleware } from './middleware/webSocketMiddleware';
import discussionSlice from './slices/discussionSlice';
import errorAnalyticsSlice from './slices/errorAnalyticsSlice';
import errorHandlingSlice from './slices/errorHandlingSlice';
import loadingSlice from './slices/loadingSlice';
import navigationSlice from './slices/navigationSlice';
import realTimeSlice from './slices/realTimeSlice';
import uiSlice from './slices/uiSlice';
import userDashboardSlice from './slices/userDashboardSlice';

// Lazy load auth and session slices
const authSlicePromise = import('./slices/authSlice');
const sessionSlicePromise = import('./slices/sessionSlice');

// Import middleware

// Create a safe storage wrapper that handles localStorage failures
const createSafeStorage = () => {
  try {
    // Test localStorage availability
    const testKey = '__redux_persist_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return storage;
  } catch (error) {
    logger.warn('localStorage not available, using memory storage fallback', { 
      component: 'ReduxStore', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Fallback to memory storage
    const memoryStorage = {
      getItem: (_key: string) => Promise.resolve(null),
      setItem: (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    };
    
    return memoryStorage;
  }
};

// Persist configuration with safe storage
const persistConfig = {
  key: 'chanuka-root',
  storage: createSafeStorage(),
  whitelist: ['auth', 'session', 'ui', 'navigation'], // Persist auth, session, UI, and navigation state
  blacklist: ['bills', 'realTime'], // Don't persist real-time data
  debug: process.env.NODE_ENV === 'development',
};

// Async function to create store with lazy loaded slices
export const createStore = async () => {
  // Await lazy loaded slices
  const [{ default: authSlice }, { default: sessionSlice }] = await Promise.all([
    authSlicePromise,
    sessionSlicePromise
  ]);

  // Root reducer with lazy loaded slices
  const rootReducer = combineReducers({
    auth: authSlice,
    session: sessionSlice,
    navigation: navigationSlice,
    ui: uiSlice,
    realTime: realTimeSlice,
    errorAnalytics: errorAnalyticsSlice,
    loading: loadingSlice,
    errorHandling: errorHandlingSlice,
    discussion: discussionSlice,
    userDashboard: userDashboardSlice,
  });

  // Persisted reducer
  const persistedReducer = persistReducer(persistConfig, rootReducer);

  // Configure store with middleware
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
          ignoredPaths: ['register'],
          // Custom serialization check that allows ISO date strings
          isSerializable: (value: any): boolean => {
            // Allow ISO date strings (they're serializable)
            if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              return true;
            }
            // Use default serialization check for other values
            return (
              typeof value === 'undefined' ||
              typeof value === 'string' ||
              typeof value === 'boolean' ||
              typeof value === 'number' ||
              value === null ||
              Array.isArray(value) ||
              (typeof value === 'object' && value.constructor === Object)
            );
          },
        },
        immutableCheck: {
          ignoredPaths: ['realTime.notifications', 'realTime.expertActivities'],
        },
      })
        .concat(errorHandlingMiddleware)
        .concat(authMiddleware)
        .concat(apiMiddleware)
        .concat(webSocketMiddleware)
        .concat(navigationPersistenceMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
    // Performance optimizations
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers({
        autoBatch: true,
      }),
  });

  // Create persistor
  const persistor = persistStore(store);

  return { store, persistor };
};

// Store initialization state
let _store: ReturnType<typeof configureStore> | null = null;
let _persistor: ReturnType<typeof persistStore> | null = null;
let _initializationPromise: Promise<{ store: any; persistor: any }> | null = null;

// Initialize store with proper error handling and fallback
const initializeStore = async () => {
  if (_initializationPromise) {
    return _initializationPromise;
  }

  _initializationPromise = (async () => {
    try {
      if (!_store) {
        const { store, persistor } = await createStore();
        _store = store;
        _persistor = persistor;
        
        logger.info('Store initialized successfully', { component: 'ReduxStore' });
      }
      return { store: _store, persistor: _persistor };
    } catch (error) {
      logger.error('Failed to initialize store', { component: 'ReduxStore', error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Create a fallback store without persistence if initialization fails
      const fallbackStore = configureStore({
        reducer: combineReducers({
          navigation: navigationSlice,
          ui: uiSlice,
          realTime: realTimeSlice,
          errorAnalytics: errorAnalyticsSlice,
          loading: loadingSlice,
          errorHandling: errorHandlingSlice,
          discussion: discussionSlice,
          userDashboard: userDashboardSlice,
        }),
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
          }),
        devTools: process.env.NODE_ENV !== 'production',
      });
      
      _store = fallbackStore;
      _persistor = null; // No persistor for fallback store
      
      logger.warn('Using fallback store without persistence', { component: 'ReduxStore' });
      return { store: _store, persistor: _persistor };
    }
  })();

  return _initializationPromise;
};

// Export synchronous getters with auto-initialization
export const getStore = () => {
  if (!_store) {
    // Auto-initialize if not already done
    initializeStore().catch(error => {
      logger.error('Auto-initialization failed', { component: 'ReduxStore', error: error instanceof Error ? error.message : 'Unknown error' });
    });
    
    // Return a temporary store to prevent crashes
    if (!_store) {
      _store = configureStore({
        reducer: combineReducers({
          navigation: navigationSlice,
          ui: uiSlice,
          realTime: realTimeSlice,
          errorAnalytics: errorAnalyticsSlice,
          loading: loadingSlice,
          errorHandling: errorHandlingSlice,
          discussion: discussionSlice,
          userDashboard: userDashboardSlice,
        }),
        middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: customSerializationCheck,
    }),
        devTools: process.env.NODE_ENV !== 'production',
      });
    }
  }
  return _store;
};

export const getPersistor = () => {
  if (!_persistor) {
    logger.warn('Persistor not available, persistence disabled', { component: 'ReduxStore' });
    return null;
  }
  return _persistor;
};

// For immediate use, export the async initializer
export { initializeStore };

// Define root state type (will be inferred from store)
export type RootState = ReturnType<Awaited<ReturnType<typeof createStore>>['store']['getState']>;

// Define app dispatch type
export type AppDispatch = Awaited<ReturnType<typeof createStore>>['store']['dispatch'];

// Log store initialization
logger.info('Redux store initialized', {
  component: 'ReduxStore',
  middleware: ['errorHandling', 'auth', 'api', 'webSocket'],
  persistedSlices: ['auth', 'session', 'ui'],
  slices: ['bills', 'auth', 'session', 'navigation', 'ui', 'realTime', 'errorAnalytics', 'loading', 'errorHandling', 'discussion', 'userDashboard'],
});

// Backward-compatible proxy exports for modules expecting a synchronous store
export const store = {
  dispatch: (...args: any[]) => getStore().dispatch.apply(getStore(), args as any),
  getState: () => getStore().getState(),
  subscribe: (...args: any[]) => getStore().subscribe.apply(getStore(), args as any),
} as any;

export const persistor = {
  pause: (...args: any[]) => getPersistor()?.pause.apply(getPersistor(), args as any),
  persist: (...args: any[]) => getPersistor()?.persist.apply(getPersistor(), args as any),
  purge: (...args: any[]) => getPersistor()?.purge.apply(getPersistor(), args as any),
  flush: (...args: any[]) => getPersistor()?.flush.apply(getPersistor(), args as any),
  subscribe: (...args: any[]) => getPersistor()?.subscribe.apply(getPersistor(), args as any),
} as any;
