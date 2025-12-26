import type { Store, UnknownAction } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { ThemeProvider } from '@client/contexts/ThemeContext';
import { useConnectionAware } from '@client/core/api/hooks/useConnectionAware';
import { SimpleErrorBoundary } from '@client/core/error/components/SimpleErrorBoundary';
import { LoadingProvider } from '@client/core/loading';
import { CommunityUIProvider } from '@client/features/community/store/slices/communitySlice';
import { AuthProvider } from '@client/features/users/hooks';
import { useOfflineDetection } from '@client/hooks/useOfflineDetection';
import { ChanukaProviders } from '@client/shared/design-system';
import { initializeStore } from '@client/shared/infrastructure/store';
import { AccessibilityProvider } from '@client/shared/ui/accessibility/accessibility-manager';
import { OfflineProvider } from '@client/shared/ui/offline/offline-manager';
import { assetLoadingManager } from '@client/utils/assets';

/**
 * Default QueryClient instance with optimized settings for the Chanuka platform.
 * The configuration balances data freshness with performance by caching results
 * for 5 minutes and retrying failed requests twice before giving up.
 */
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false, // Prevent excessive refetching
    },
  },
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface StoreData {
  store: Store<unknown, UnknownAction>;
  persistor: unknown;
}

interface BaseProviderConfig {
  name: string;
  component: React.ComponentType<{ children: React.ReactNode }>;
  props?: Record<string, unknown>;
}

interface QueryProviderConfig {
  name: 'QueryClientProvider';
  component: React.ComponentType<{ client?: QueryClient; children: React.ReactNode }>;
  props?: Record<string, unknown>;
}

type ProviderConfig = BaseProviderConfig | QueryProviderConfig;

interface ProviderOverrides {
  ReduxStoreProvider?: React.ComponentType<{ children: React.ReactNode }>;
  QueryClientProvider?: React.ComponentType<{ client?: QueryClient; children: React.ReactNode }>;
  ErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  CommunityUIProvider?: React.ComponentType<{ children: React.ReactNode }>;
  ThemeProvider?: React.ComponentType<{ children: React.ReactNode }>;
  LoadingProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AccessibilityProvider?: React.ComponentType<{ children: React.ReactNode }>;
  OfflineProvider?: React.ComponentType<{ children: React.ReactNode }>;
  [key: string]:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.ComponentType<{ client?: QueryClient; children: React.ReactNode }>
    | undefined;
}

interface AppProvidersProps {
  children: React.ReactNode;
  overrides?: ProviderOverrides;
  queryClient?: QueryClient;
}

// =============================================================================
// STORE INITIALIZATION - SINGLETON PATTERN
// =============================================================================

/**
 * Window interface extension for store caching.
 * This allows the store to persist across HMR reloads in development.
 */
const STORE_CACHE_KEY = '__CHANUKA_REDUX_STORE__';

interface WindowWithStoreCache extends Window {
  [STORE_CACHE_KEY]?: {
    store?: unknown;
    persistor?: unknown;
    initializationPromise?: Promise<StoreData>;
  };
}

const windowWithCache = typeof window !== 'undefined' ? (window as WindowWithStoreCache) : null;

/**
 * Module-level store instances with window backup for HMR resilience.
 * These variables maintain singleton state across component remounts.
 */
let storeInstance: Store<unknown, UnknownAction> | null =
  (windowWithCache?.[STORE_CACHE_KEY]?.store as Store<unknown, UnknownAction>) ?? null;

let persistorInstance: unknown = windowWithCache?.[STORE_CACHE_KEY]?.persistor ?? null;

let initializationPromise: Promise<StoreData> | null =
  windowWithCache?.[STORE_CACHE_KEY]?.initializationPromise ?? null;

/**
 * Creates or retrieves the singleton Redux store instance.
 * 
 * This function implements a promise-caching pattern to handle concurrent
 * initialization attempts gracefully. When multiple components try to access
 * the store simultaneously during app startup, they all receive the same
 * promise instead of triggering multiple initialization sequences.
 * 
 * The pattern works like this:
 * 1. First caller creates a new promise and starts initialization
 * 2. Subsequent callers receive the same in-flight promise
 * 3. Once initialization completes, all callers receive the same store instance
 * 4. Failed initializations reset the promise to allow retry
 * 
 * This prevents race conditions and ensures only one store ever exists.
 */
async function getOrCreateStore(): Promise<StoreData> {
  // Fast path: Return existing store if already initialized
  if (storeInstance && persistorInstance) {
    return { store: storeInstance, persistor: persistorInstance };
  }

  // Return in-flight initialization promise to prevent duplicate attempts
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = Promise.resolve().then(() => {
    const { store, persistor } = initializeStore();
    storeInstance = store;
    persistorInstance = persistor;
    
    // Cache on window so HMR / fast reloads reuse the same instances
    if (windowWithCache) {
      windowWithCache[STORE_CACHE_KEY] = { store, persistor };
    }
    
    return { store, persistor };
  }).catch((error: any) => {
    // Reset promise on failure to allow retry
    initializationPromise = null;
    console.error('Redux store initialization failed:', error);
    throw error;
  });

  return initializationPromise;
}

/**
 * HMR disposal handler for Vite.
 * Preserves store state during hot module replacement while cleaning up
 * the initialization promise to allow re-initialization if needed.
 */
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    try {
      if (windowWithCache?.[STORE_CACHE_KEY]) {
        const cached = windowWithCache[STORE_CACHE_KEY];
        if (cached && cached.store && cached.persistor) {
          // Keep store/persistor intact to preserve app state during HMR
          delete windowWithCache[STORE_CACHE_KEY]!.initializationPromise;
        } else {
          delete windowWithCache[STORE_CACHE_KEY];
        }
      }
    } catch (e) {
      // Swallow errors - HMR disposal should not break app
    }
  });
}

// =============================================================================
// LOADING PROVIDER WITH DEPENDENCIES
// =============================================================================

/**
 * Wraps LoadingProvider with connection-aware and offline detection hooks.
 * 
 * This adapter pattern transforms app-level connection state into the format
 * expected by the loading system. By separating these concerns, we maintain
 * clean boundaries between different parts of the application while enabling
 * intelligent loading behavior based on network conditions.
 * 
 * The component uses useMemo to prevent unnecessary re-renders when connection
 * properties haven't actually changed, which is important because the loading
 * provider sits high in the component tree and affects many children.
 */
// eslint-disable-next-line react/prop-types
const LoadingProviderWithDeps = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const connectionInfo = useConnectionAware();
  const { isOnline } = useOfflineDetection();

  // Memoize connection adapter to prevent unnecessary re-renders
  const connectionAdapter = useMemo(
    () => ({
      type: (connectionInfo.connectionType ?? 'fast') as 'slow' | 'fast' | 'unknown',
      effectiveType: connectionInfo.effectiveType,
      downlink: connectionInfo.downlink,
      rtt: connectionInfo.rtt,
      saveData: false,
    }),
    [
      connectionInfo.connectionType,
      connectionInfo.effectiveType,
      connectionInfo.downlink,
      connectionInfo.rtt,
    ]
  );

  return (
    <LoadingProvider
      useConnectionAware={() => connectionAdapter}
      useOnlineStatus={() => isOnline}
      assetLoadingManager={assetLoadingManager}
    >
      {children}
    </LoadingProvider>
  );
});

LoadingProviderWithDeps.displayName = 'LoadingProviderWithDeps';

// =============================================================================
// REDUX STORE PROVIDER
// =============================================================================

/**
 * Manages asynchronous Redux store initialization with proper loading and error states.
 * 
 * This component solves a critical problem: Redux store initialization is async
 * (it needs to rehydrate from IndexedDB/localStorage), but React components expect
 * providers to be available immediately. The component handles the async initialization
 * gracefully by showing loading states and preventing access to uninitialized state.
 * 
 * The implementation avoids PersistGate because it can cause DOM manipulation issues
 * during HMR and strict mode double renders. Instead, we manually subscribe to the
 * persistor's bootstrap state and use stable loading components that don't toggle.
 */
// eslint-disable-next-line react/prop-types
const ReduxStoreProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const mountedRef = useRef(true);

  // Memoize stable loading component to prevent DOM manipulation issues
  const persistGateLoading = useMemo(
    () => (
      <div className="chanuka-loading-overlay contrast-aa" key="persist-gate-loading">
        <div
          className="chanuka-spinner chanuka-spinner-large"
          role="status"
          aria-label="Restoring application state"
        />
        <p className="chanuka-loading-message" role="status" aria-live="polite" aria-atomic="true">
          Restoring application state...
        </p>
      </div>
    ),
    []
  );

  // Initialize store on mount
  useEffect(() => {
    mountedRef.current = true;

    getOrCreateStore()
      .then(data => {
        if (mountedRef.current) {
          setStoreData(data);
        }
      })
      .catch(err => {
        console.error('[ReduxStoreProvider] Store initialization error:', err);
        if (mountedRef.current) {
          setError(err as Error);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Subscribe to persistor bootstrapped state
  useEffect(() => {
    if (!storeData || !storeData.persistor) return;

    interface PersistorLike {
      getState?: () => { bootstrapped: boolean };
      subscribe?: (callback: () => void) => (() => void) | void;
    }

    const persistor = storeData.persistor as PersistorLike;
    let isSubscribed = true;

    try {
      // If persistor already bootstrapped, update state immediately
      if (persistor.getState?.()?.bootstrapped) {
        if (mountedRef.current && isSubscribed) {
          setBootstrapped(true);
        }
        return;
      }

      // Subscribe until bootstrapped
      const unsubscribe = persistor.subscribe?.(() => {
        try {
          if (persistor.getState?.()?.bootstrapped) {
            if (mountedRef.current && isSubscribed) {
              setBootstrapped(true);
            }
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
          }
        } catch (e) {
          // On error, assume bootstrapped to prevent infinite loading
          if (mountedRef.current && isSubscribed) {
            setBootstrapped(true);
          }
        }
      });

      return () => {
        isSubscribed = false;
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    } catch (e) {
      // If subscription fails, assume bootstrapped
      setBootstrapped(true);
    }
  }, [storeData]);

  // Memoize error handler
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  // Error state
  if (error) {
    return (
      <div className="chanuka-error-boundary contrast-aaa">
        <div className="chanuka-error-boundary-icon" aria-hidden="true">
          ⚠️
        </div>
        <h2 className="chanuka-error-boundary-title">Store Initialization Error</h2>
        <p className="chanuka-error-boundary-description">
          Failed to initialize the application store. Please refresh the page.
        </p>
        <div className="chanuka-error-actions">
          <button
            type="button"
            onClick={handleReload}
            className="chanuka-btn-contrast-safe"
            aria-label="Refresh page to retry initialization"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!storeData) {
    return (
      <div className="chanuka-loading-overlay contrast-aa">
        <div
          className="chanuka-spinner chanuka-spinner-large"
          role="status"
          aria-label="Initializing application store"
        />
        <p className="chanuka-loading-message" role="status" aria-live="polite" aria-atomic="true">
          Initializing application store...
        </p>
      </div>
    );
  }

  // Success state - show stable loading UI until persistor bootstraps
  if (!storeData) {
    return <div>Loading store...</div>;
  }
  
  return (
    <ReduxProvider store={storeData.store as Store<unknown, UnknownAction>}>
      {bootstrapped ? children : persistGateLoading}
    </ReduxProvider>
  );
});

ReduxStoreProvider.displayName = 'ReduxStoreProvider';

// =============================================================================
// PROVIDER COMPOSITION CONFIGURATION
// =============================================================================

/**
 * Provider composition array defines the nesting order from innermost to outermost.
 * 
 * The order is carefully designed:
 * 1. ReduxStoreProvider - Innermost, as all other providers may need store access
 * 2. QueryClientProvider - React Query for data fetching
 * 3. ErrorBoundary - Catch errors from all child providers
 * 4. ChanukaProviders - Brand voice, multilingual, bandwidth-aware rendering
 * 5. AuthProvider - Authentication context
 * 6. CommunityUIProvider - Community-specific UI state
 * 7. ThemeProvider - Theme context
 * 8. LoadingProvider - Loading state management
 * 9. AccessibilityProvider - Accessibility features
 * 10. OfflineProvider - Outermost, can wrap everything with offline detection
 * 
 * This configuration is processed with reduceRight to build the nested structure
 * efficiently in a single pass, starting from children and wrapping outward.
 */
const PROVIDERS: ProviderConfig[] = [
  { name: 'ReduxStoreProvider', component: ReduxStoreProvider },
  {
    name: 'QueryClientProvider',
    component: QueryClientProvider as React.ComponentType<{
      client?: QueryClient;
      children: React.ReactNode;
    }>,
  },
  { name: 'ErrorBoundary', component: SimpleErrorBoundary },
  { name: 'ChanukaProviders', component: ChanukaProviders },
  { name: 'AuthProvider', component: AuthProvider },
  { name: 'CommunityUIProvider', component: CommunityUIProvider },
  { name: 'ThemeProvider', component: ThemeProvider },
  { name: 'LoadingProvider', component: LoadingProviderWithDeps },
  { name: 'AccessibilityProvider', component: AccessibilityProvider },
  { name: 'OfflineProvider', component: OfflineProvider },
];

// =============================================================================
// APP PROVIDERS COMPONENT
// =============================================================================

/**
 * AppProviders composes all application-level context providers into a single
 * nested structure.
 * 
 * This centralized configuration makes the provider hierarchy easy to understand,
 * modify, and test. The component supports override injection for testing scenarios
 * and custom implementations, making it flexible for different environments.
 * 
 * The composition uses reduceRight to build the nested structure efficiently,
 * handling special cases like QueryClientProvider that require specific props.
 * 
 * @param children - The application component tree to wrap with providers
 * @param overrides - Optional provider implementations for testing or customization
 * @param queryClient - React Query client instance (defaults to singleton)
 */
export function AppProviders({ 
  children, 
  overrides = {}, 
  queryClient 
}: AppProvidersProps) {
  /**
   * Compose providers from innermost to outermost using reduceRight.
   * 
   * This approach is more efficient than nested JSX because it creates the
   * entire tree in one pass. Each iteration wraps the accumulated component
   * tree in the next provider, building from the inside out.
   */
  const composedProviders = useMemo(() => {
    return PROVIDERS.reduceRight((acc, provider) => {
      const OverrideComponent = overrides[provider.name];

      // Special case: QueryClientProvider requires explicit client prop
      if (provider.name === 'QueryClientProvider') {
        const QueryComponent = (OverrideComponent || provider.component) as React.ComponentType<{
          client?: QueryClient;
          children: React.ReactNode;
        }>;
        return <QueryComponent client={queryClient || defaultQueryClient}>{acc}</QueryComponent>;
      }

      // Standard case: wrap with provider component
      const Component = (OverrideComponent || provider.component) as React.ComponentType<{
        children: React.ReactNode;
      }>;
      return <Component {...(provider.props || {})}>{acc}</Component>;
    }, children);
  }, [children, overrides, queryClient]);

  return <>{composedProviders}</>;
}

// Remove duplicate export - keep only named export
// export default AppProviders;