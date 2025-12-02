import React, { useEffect, useState, useRef, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
// PersistGate causes DOM rehydration toggles that can trigger removeChild races
// during HMR/fast reloads. We'll handle persistor bootstrapping manually.
import { LoadingProvider } from '@/core/loading';
import { AuthProvider } from '@/features/users/hooks';
import { useConnectionAware } from '@/hooks/useConnectionAware';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { assetLoadingManager } from '@client/utils/asset-loading';
import { AccessibilityProvider } from './accessibility/accessibility-manager';
import { OfflineProvider } from './offline/offline-manager';
import { ThemeProvider } from '@client/contexts/ThemeContext';
import { SimpleErrorBoundary } from './error-handling/SimpleErrorBoundary';
import { initializeStore } from '@client/store';
// import { loadingStateUtils } from '@shared/shared/design-system/components/loading-states';
// import { errorStateUtils } from '@client/shared/design-system/components/error-states';
import { CommunityUIProvider } from '@client/store/slices/communitySlice';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface StoreData {
  store: any;
  persistor: any;
}

interface ProviderConfig {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

interface ProviderOverrides {
  ReduxStoreProvider?: React.ComponentType<{ children: React.ReactNode }>;
  QueryClientProvider?: React.ComponentType<{ client: QueryClient; children: React.ReactNode }>;
  ErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  CommunityUIProvider?: React.ComponentType<{ children: React.ReactNode }>;
  ThemeProvider?: React.ComponentType<{ children: React.ReactNode }>;
  LoadingProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AccessibilityProvider?: React.ComponentType<{ children: React.ReactNode }>;
  OfflineProvider?: React.ComponentType<{ children: React.ReactNode }>;
  [key: string]: React.ComponentType<any> | undefined;
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
 * Singleton store management ensures the Redux store and persistor are created
 * only once during the application lifecycle, preventing duplicate initialization
 * and maintaining consistent state across provider remounts.
 */
// Use a window-backed cache to survive HMR and avoid duplicate initializations
const STORE_CACHE_KEY = '__CHANUKA_REDUX_STORE__';

let storeInstance: any =
  typeof window !== 'undefined' && (window as any)[STORE_CACHE_KEY]?.store
    ? (window as any)[STORE_CACHE_KEY].store
    : null;

let persistorInstance: any =
  typeof window !== 'undefined' && (window as any)[STORE_CACHE_KEY]?.persistor
    ? (window as any)[STORE_CACHE_KEY].persistor
    : null;

let initializationPromise: Promise<StoreData> | null =
  typeof window !== 'undefined' && (window as any)[STORE_CACHE_KEY]?.initializationPromise
    ? (window as any)[STORE_CACHE_KEY].initializationPromise
    : null;

/**
 * Creates or retrieves the singleton Redux store instance. This function
 * implements a promise-caching pattern to handle concurrent initialization
 * attempts gracefully, ensuring only one store is ever created.
 */
async function getOrCreateStore(): Promise<StoreData> {
  // Return existing store if already initialized
  if (storeInstance && persistorInstance) {
    return { store: storeInstance, persistor: persistorInstance };
  }

  // Return in-flight initialization promise to prevent duplicate attempts
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = initializeStore()
    .then(({ store, persistor }) => {
      storeInstance = store;
      persistorInstance = persistor;
      // cache on window so HMR / fast reloads reuse the same instances
      if (typeof window !== 'undefined') {
        (window as any)[STORE_CACHE_KEY] = { store, persistor };
      }
      return { store, persistor };
    })
    .catch((error) => {
      // Reset promise on failure to allow retry
      initializationPromise = null;
      console.error('Redux store initialization failed:', error);
      throw error;
    });

  return initializationPromise;
}

// If Vite's HMR is active, ensure we don't keep stale references across module disposes
if (typeof (import.meta as any).hot !== 'undefined') {
  (import.meta as any).hot.accept();
  (import.meta as any).hot.dispose(() => {
    try {
      if (typeof window !== 'undefined' && (window as any)[STORE_CACHE_KEY]) {
        // keep store around to preserve app state during HMR, but remove promise
        const cached = (window as any)[STORE_CACHE_KEY];
        if (cached && cached.store && cached.persistor) {
          // leave store/persistor intact, but clear initializationPromise to allow re-init if needed
          delete (window as any)[STORE_CACHE_KEY].initializationPromise;
        } else {
          delete (window as any)[STORE_CACHE_KEY];
        }
      }
    } catch (e) {
      // swallow — HMR disposal should not break app
    }
  });
}

// =============================================================================
// LOADING PROVIDER WITH DEPENDENCIES
// =============================================================================

/**
 * Wraps LoadingProvider with connection-aware and offline detection hooks.
 * This adapter pattern transforms app-level connection state into the format
 * expected by the loading system, enabling intelligent loading behavior based
 * on network conditions.
 */
function LoadingProviderWithDeps({ children }: { children: React.ReactNode }) {
  const connectionInfo = useConnectionAware();
  const { isOnline } = useOfflineDetection();
  
  // Memoize connection adapter to prevent unnecessary re-renders
  const connectionAdapter = useMemo(() => ({
    type: (connectionInfo.connectionType ?? 'fast') as any,
    effectiveType: connectionInfo.effectiveType,
    downlink: connectionInfo.downlink,
    rtt: connectionInfo.rtt,
    saveData: false,
  }), [connectionInfo.connectionType, connectionInfo.effectiveType, connectionInfo.downlink, connectionInfo.rtt]);
  
  return (
    <LoadingProvider
      useConnectionAware={() => connectionAdapter}
      useOnlineStatus={() => isOnline}
      assetLoadingManager={assetLoadingManager}
    >
      {children}
    </LoadingProvider>
  );
}

// =============================================================================
// REDUX STORE PROVIDER
// =============================================================================

/**
 * Manages asynchronous Redux store initialization with proper loading and error
 * states. This component ensures the store is fully initialized before rendering
 * child components, providing a smooth user experience during app startup.
 */
function ReduxStoreProvider({ children }: { children: React.ReactNode }): React.ReactElement | null {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Create stable loading component to prevent DOM manipulation issues
  const persistGateLoading = useMemo(() => (
    <div className="chanuka-loading-overlay contrast-aa" key="persist-gate-loading">
      <div
        className="chanuka-spinner chanuka-spinner-large"
        role="status"
        aria-label="Restoring application state"
      />
      <p
        className="chanuka-loading-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Restoring application state...
      </p>
    </div>
  ), []);

  // Track whether persistence has finished rehydration. We avoid PersistGate
  // because it can toggle DOM children during rehydration and cause removeChild
  // race errors during HMR / strict mode double renders. Instead we subscribe
  // to the persistor and show the stable `persistGateLoading` until bootstrapped.
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    // Track component mount state to prevent state updates after unmount
    mountedRef.current = true;
    console.log('[ReduxStoreProvider] Starting store initialization');

    getOrCreateStore()
      .then((data) => {
        console.log('[ReduxStoreProvider] Store initialized successfully, updating state');
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setStoreData(data);
        }
      })
      .catch((err) => {
        console.error('[ReduxStoreProvider] Store initialization error:', err);
        if (mountedRef.current) {
          setError(err as Error);
        }
      });

    // Cleanup function to prevent memory leaks
    return () => {
      console.log('[ReduxStoreProvider] Component unmounting');
      mountedRef.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  // Subscribe to persistor bootstrapped state when storeData becomes available
  useEffect(() => {
    if (!storeData || !storeData.persistor) return;

    const persistor = storeData.persistor as any;
    let isSubscribed = true;

    try {
      // If persistor already bootstrapped, flip immediately
      if (persistor.getState && persistor.getState().bootstrapped) {
        if (mountedRef.current && isSubscribed) {
          setBootstrapped(true);
        }
        return;
      }

      // Otherwise subscribe until bootstrapped
      const unsubscribe = persistor.subscribe(() => {
        try {
          if (persistor.getState && persistor.getState().bootstrapped) {
            // Atomic check to prevent race condition with unmounting
            if (mountedRef.current && isSubscribed) {
              setBootstrapped(true);
            }
            if (typeof unsubscribe === 'function') unsubscribe();
          }
        } catch (e) {
          if (mountedRef.current && isSubscribed) {
            setBootstrapped(true);
          }
        }
      });

      // Cleanup subscription on unmount
      return () => {
        isSubscribed = false;
        try {
          if (typeof unsubscribe === 'function') unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      setBootstrapped(true);
    }
  }, [storeData]);

  // Error state: display user-friendly error with retry option
  if (error) {
    console.log('[ReduxStoreProvider] Rendering error state');
    const errorConfig = {
      children: {
        title: { text: 'Store Initialization Error' },
        description: { text: 'Failed to initialize the application store. Please refresh the page.' },
        actions: { children: [{ onClick: () => window.location.reload() }] }
      }
    };

    return (
      <div className="chanuka-error-boundary contrast-aaa">
        <div className="chanuka-error-boundary-icon" aria-hidden="true">⚠️</div>
        <h2 className="chanuka-error-boundary-title">{errorConfig.children.title.text}</h2>
        <p className="chanuka-error-boundary-description">{errorConfig.children.description.text}</p>
        <div className="chanuka-error-actions">
          <button
            type="button"
            onClick={errorConfig.children.actions.children[0].onClick}
            className="chanuka-btn-contrast-safe"
            aria-label="Refresh page to retry initialization"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state: show spinner while store initializes
  if (!storeData) {
    console.log('[ReduxStoreProvider] Rendering loading state');
    return (
      <div className="chanuka-loading-overlay contrast-aa">
        <div
          className="chanuka-spinner chanuka-spinner-large"
          role="status"
          aria-label="Initializing application store"
        />
        <p
          className="chanuka-loading-message"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Initializing application store...
        </p>
      </div>
    );
  }

  // Success state: render Redux provider. Show stable loading UI until
  // persistor bootstraps to avoid rehydration DOM toggles.
  console.log('[ReduxStoreProvider] Rendering success state, waiting for bootstrapped:', bootstrapped);
  return (
    <ReduxProvider store={storeData.store}>
      {bootstrapped ? children : persistGateLoading}
    </ReduxProvider>
  );
}

// =============================================================================
// PROVIDER COMPOSITION CONFIGURATION
// =============================================================================

/**
 * Provider composition array defines the nesting order from innermost to outermost.
 * This order is critical: Redux must be innermost so all other providers can access
 * the store, while error boundaries should be outer to catch errors from all providers.
 * 
 * The array is processed with reduceRight to build the nested structure efficiently
 * in a single pass, starting from the children and wrapping outward.
 */
const PROVIDERS: ProviderConfig[] = [
  { name: 'ReduxStoreProvider', component: ReduxStoreProvider },
  { name: 'QueryClientProvider', component: QueryClientProvider },
  { name: 'ErrorBoundary', component: SimpleErrorBoundary },
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
 * nested structure. This centralized configuration makes the provider hierarchy
 * easy to understand, modify, and test. The component supports override injection
 * for testing scenarios and custom implementations.
 * 
 * @param children - The application component tree to wrap with providers
 * @param overrides - Optional provider implementations for testing or customization
 * @param queryClient - React Query client instance (defaults to singleton)
 */
export function AppProviders({
  children,
  overrides = {},
  queryClient,
}: AppProvidersProps) {
  /**
   * Compose providers from innermost to outermost using reduceRight.
   * Each iteration wraps the accumulated component tree in the next provider,
   * handling special cases like QueryClientProvider that require specific props.
   */
  const composedProviders = PROVIDERS.reduceRight((acc, provider) => {
    // Use override component if provided, otherwise use default
    const OverrideComponent = overrides[provider.name];
    const Component = OverrideComponent || provider.component;

    // Special case: QueryClientProvider requires explicit client prop
    if (provider.name === 'QueryClientProvider') {
      return (
        <Component client={queryClient}>
          {acc}
        </Component>
      );
    }

    // Standard case: wrap with provider component
    return (
      <Component {...(provider.props || {})}>
        {acc}
      </Component>
    );
  }, children);

  return <>{composedProviders}</>;
}

export default AppProviders;