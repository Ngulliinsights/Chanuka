import type { Store, UnknownAction } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import { AnalyticsProvider } from '@client/core/analytics/AnalyticsProvider';
import { useConnectionAware } from '@client/core/api/hooks/useConnectionAware';
import { useAuth } from '@client/core/auth';
import { SimpleErrorBoundary } from '@client/core/error/components/SimpleErrorBoundary';
import { LoadingProvider } from '@client/core/loading';
import { createNavigationProvider } from '@client/core/navigation/context';
import { CommunityUIProvider } from '@client/features/community/store/slices/communitySlice';
import { AuthProvider } from '@client/features/users/hooks';
import { KenyanContextProvider } from '@client/lib/context/KenyanContextProvider';
import { ThemeProvider } from '@client/lib/contexts/ThemeContext';
import { ChanukaProviders } from '@client/lib/design-system';
import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';
import { I18nProvider } from '@client/lib/hooks/use-i18n';
import { useOfflineDetection } from '@client/lib/hooks/useOfflineDetection';
import { initializeStore } from '@client/lib/infrastructure/store';
import { AccessibilityProvider } from '@client/lib/ui/accessibility/accessibility-manager';
import { OfflineProvider } from '@client/lib/ui/offline/offline-manager';
import { assetLoadingManager } from '@client/lib/utils/assets';

import { defaultQueryClient } from './queryClient';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface StoreData {
  store: Store<unknown, UnknownAction>;
  persistor: unknown;
}

interface Persistor {
  getState?: () => { bootstrapped: boolean };
  subscribe?: (callback: () => void) => (() => void) | undefined;
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

const STORE_CACHE_KEY = '__CHANUKA_REDUX_STORE__' as const;

interface StoreCache {
  store?: Store<unknown, UnknownAction>;
  persistor?: unknown;
  initializationPromise?: Promise<StoreData>;
}

interface WindowWithStoreCache extends Window {
  [STORE_CACHE_KEY]?: StoreCache;
}

const getWindow = (): WindowWithStoreCache | null =>
  typeof window !== 'undefined' ? (window as WindowWithStoreCache) : null;

/**
 * Module-level singleton instances with window backup for HMR resilience.
 */
let storeInstance: Store<unknown, UnknownAction> | null = null;
let persistorInstance: unknown = null;
let initializationPromise: Promise<StoreData> | null = null;

// Initialize from window cache if available (HMR recovery)
if (typeof window !== 'undefined') {
  const win = getWindow();
  const cache = win?.[STORE_CACHE_KEY];
  if (cache) {
    storeInstance = cache.store ?? null;
    persistorInstance = cache.persistor ?? null;
    initializationPromise = cache.initializationPromise ?? null;
  }
}

/**
 * Creates or retrieves the singleton Redux store instance.
 *
 * Implements promise-caching to handle concurrent initialization attempts.
 * Multiple simultaneous calls receive the same promise, preventing race conditions.
 */
async function getOrCreateStore(): Promise<StoreData> {
  // Fast path: Return existing store
  if (storeInstance && persistorInstance) {
    return { store: storeInstance, persistor: persistorInstance };
  }

  // Return in-flight promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = (async () => {
    try {
      const { store, persistor } = await initializeStore();
      storeInstance = store;
      persistorInstance = persistor;

      // Cache for HMR resilience
      const win = getWindow();
      if (win) {
        win[STORE_CACHE_KEY] = { store, persistor };
      }

      return { store, persistor };
    } catch (error) {
      // Reset on failure to allow retry
      initializationPromise = null;
      console.error('[Store] Initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * HMR disposal handler - preserves store state during hot reloads.
 */
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    const win = getWindow();
    const cache = win?.[STORE_CACHE_KEY];

    if (cache?.store && cache.persistor) {
      // Keep store/persistor, clear promise to allow re-initialization
      delete cache.initializationPromise;
    } else if (cache) {
      delete win![STORE_CACHE_KEY];
    }
  });
}

// =============================================================================
// LOADING PROVIDER WITH DEPENDENCIES
// =============================================================================

/**
 * Wraps LoadingProvider with connection-aware and offline detection hooks.
 * Transforms app-level connection state into the format expected by LoadingProvider.
 */
const LoadingProviderWithDeps = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const connectionInfo = useConnectionAware();
  const { isOnline } = useOfflineDetection();

  const connectionAdapter = useMemo(
    () => ({
      type: (connectionInfo.connectionType ?? 'fast') as 'slow' | 'fast' | 'unknown',
      effectiveType: connectionInfo.effectiveType as '2g' | '3g' | '4g' | '5g' | undefined,
      downlink: connectionInfo.downlink,
      rtt: connectionInfo.rtt,
      saveData: false,
      online: isOnline,
    }),
    [connectionInfo]
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
// NAVIGATION PROVIDER
// =============================================================================

/**
 * NavigationProvider factory using proper hooks.
 * Note: Must be used inside Router context (provided by AppShell).
 */
export const NavigationProvider = createNavigationProvider(
  useLocation,
  useNavigate,
  useAuth,
  useDeviceInfo
);

// =============================================================================
// REDUX STORE PROVIDER
// =============================================================================

/**
 * Stable loading component to prevent DOM manipulation issues during HMR.
 */
const LoadingOverlay: React.FC<{ message: string; label: string }> = React.memo(
  ({ message, label }) => (
    <div className="chanuka-loading-overlay contrast-aa">
      <div className="chanuka-spinner chanuka-spinner-large" role="status" aria-label={label} />
      <p className="chanuka-loading-message" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </div>
  )
);

LoadingOverlay.displayName = 'LoadingOverlay';

/**
 * Error component for store initialization failures.
 */
const StoreError: React.FC<{ onReload: () => void }> = React.memo(({ onReload }) => (
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
        onClick={onReload}
        className="chanuka-btn-contrast-safe"
        aria-label="Refresh page to retry initialization"
      >
        Refresh Page
      </button>
    </div>
  </div>
));

StoreError.displayName = 'StoreError';

/**
 * Manages asynchronous Redux store initialization with proper loading and error states.
 * Avoids PersistGate to prevent DOM manipulation issues during HMR.
 */
const ReduxStoreProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const isMountedRef = useRef(true);

  // Initialize store on mount
  useEffect(() => {
    isMountedRef.current = true;

    getOrCreateStore()
      .then(data => {
        if (isMountedRef.current) {
          setStoreData(data);
        }
      })
      .catch(err => {
        if (isMountedRef.current) {
          setError(err as Error);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Subscribe to persistor bootstrap state
  useEffect(() => {
    if (!storeData?.persistor) return;

    const persistor = storeData.persistor as Persistor;
    let unsubscribe: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    // Check if already bootstrapped
    if (persistor.getState?.()?.bootstrapped) {
      setBootstrapped(true);
      return;
    }

    // Subscribe to bootstrap completion
    unsubscribe = persistor.subscribe?.(() => {
      if (persistor.getState?.()?.bootstrapped && isMountedRef.current) {
        setBootstrapped(true);
        // Cleanup immediately after bootstrap
        if (unsubscribe) {
          unsubscribe();
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    });

    // Fallback: assume bootstrapped after timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (!bootstrapped && isMountedRef.current) {
        console.warn('[Store] Bootstrap timeout, proceeding anyway');
        setBootstrapped(true);
      }
    }, 5000); // Reduced to 5 second timeout

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [storeData]);

  const handleReload = useCallback(() => window.location.reload(), []);

  if (error) {
    return <StoreError onReload={handleReload} />;
  }

  if (!storeData) {
    return (
      <LoadingOverlay
        message="Initializing application store..."
        label="Initializing application store"
      />
    );
  }

  return (
    <ReduxProvider store={storeData.store}>
      {bootstrapped ? (
        children
      ) : (
        <LoadingOverlay
          message="Restoring application state..."
          label="Restoring application state"
        />
      )}
    </ReduxProvider>
  );
});

ReduxStoreProvider.displayName = 'ReduxStoreProvider';

// =============================================================================
// PROVIDER COMPOSITION CONFIGURATION
// =============================================================================

/**
 * Provider composition order (innermost to outermost):
 * 1. ReduxStoreProvider - Core state, required by most providers
 * 2. QueryClientProvider - Data fetching layer
 * 3. ErrorBoundary - Error containment
 * 4. I18nProvider - Internationalization
 * 5. KenyanContextProvider - Regional context
 * 6. ChanukaProviders - Design system
 * 7. AuthProvider - Authentication state
 * 8. CommunityUIProvider - Community features
 * 9. ThemeProvider - Theme management
 * 10. AnalyticsProvider - Event tracking
 * 11. LoadingProvider - Loading states
 * 12. AccessibilityProvider - A11y features
 * 13. OfflineProvider - Network detection (outermost)
 *
 * Note: NavigationProvider excluded (requires Router context from AppShell)
 */
const PROVIDERS: readonly ProviderConfig[] = [
  { name: 'ReduxStoreProvider', component: ReduxStoreProvider },
  {
    name: 'QueryClientProvider',
    component: QueryClientProvider as React.ComponentType<{
      client?: QueryClient;
      children: React.ReactNode;
    }>,
  },
  { name: 'ErrorBoundary', component: SimpleErrorBoundary },
  { name: 'I18nProvider', component: I18nProvider },
  { name: 'KenyanContextProvider', component: KenyanContextProvider },
  { name: 'ChanukaProviders', component: ChanukaProviders },
  { name: 'AuthProvider', component: AuthProvider },
  { name: 'CommunityUIProvider', component: CommunityUIProvider },
  { name: 'ThemeProvider', component: ThemeProvider },
  { name: 'AnalyticsProvider', component: AnalyticsProvider },
  { name: 'LoadingProvider', component: LoadingProviderWithDeps },
  { name: 'AccessibilityProvider', component: AccessibilityProvider },
  { name: 'OfflineProvider', component: OfflineProvider },
] as const;

// =============================================================================
// APP PROVIDERS COMPONENT
// =============================================================================

/**
 * Composes all application-level context providers into a single nested structure.
 *
 * Benefits:
 * - Centralized provider hierarchy for easy understanding and modification
 * - Supports override injection for testing
 * - Efficient composition using reduceRight (single pass)
 * - Type-safe with full TypeScript support
 *
 * @param children - Application component tree
 * @param overrides - Optional provider replacements for testing
 * @param queryClient - React Query client (defaults to singleton)
 */
export function AppProviders({
  children,
  overrides = {},
  queryClient = defaultQueryClient,
}: AppProvidersProps): JSX.Element {
  const composedProviders = useMemo(() => {
    return PROVIDERS.reduceRight<React.ReactNode>((acc, provider) => {
      const OverrideComponent = overrides[provider.name];
      const Component = OverrideComponent || provider.component;

      // Special handling for QueryClientProvider
      if (provider.name === 'QueryClientProvider') {
        const QueryComponent = Component as React.ComponentType<{
          client?: QueryClient;
          children: React.ReactNode;
        }>;
        return <QueryComponent client={queryClient}>{acc}</QueryComponent>;
      }

      // Standard provider wrapping
      const StandardComponent = Component as React.ComponentType<{
        children: React.ReactNode;
      }>;
      return <StandardComponent {...(provider.props || {})}>{acc}</StandardComponent>;
    }, children);
  }, [children, overrides, queryClient]);

  return <>{composedProviders}</>;
}
