import React, { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './error-handling';
import { createNavigationProvider } from '../core/navigation/context';
import { LoadingProvider } from '../core/loading';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useConnectionAware } from '../hooks/useConnectionAware';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { assetLoadingManager } from '../utils/asset-loading';
import { useMediaQuery } from '../hooks/use-mobile';
import { AccessibilityProvider } from './accessibility/accessibility-manager';
import { OfflineProvider } from './offline/offline-manager';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SimpleErrorBoundary } from './error-handling/SimpleErrorBoundary';
import { initializeStore } from '../store';
import { loadingStateUtils } from '../shared/design-system/components/loading-states';
import { errorStateUtils } from '../shared/design-system/components/error-states';

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

// Create the React-specific NavigationProvider
const NavigationProvider = createNavigationProvider(
  useLocation,
  useNavigate,
  useAuth,
  useMediaQuery
);

// Create a wrapper component for LoadingProvider with dependencies
function LoadingProviderWithDeps({ children }: { children: React.ReactNode }) {
  const connectionInfo = useConnectionAware();
  const { isOnline } = useOfflineDetection();
  
  return (
    <LoadingProvider
      useConnectionAware={() => connectionInfo}
      useOnlineStatus={() => isOnline}
      assetLoadingManager={assetLoadingManager}
    >
      {children}
    </LoadingProvider>
  );
}

// Create a synchronous store for immediate use
let storeInstance: any = null;
let persistorInstance: any = null;

// Initialize store using the existing store initialization
async function createAsyncStore() {
  if (storeInstance && persistorInstance) {
    return { store: storeInstance, persistor: persistorInstance };
  }

  try {
    // Use the existing store initialization
    const { store, persistor } = await initializeStore();
    storeInstance = store;
    persistorInstance = persistor;
    return { store, persistor };
  } catch (error) {
    console.error('Failed to create store:', error);
    throw error;
  }
}

// Redux Store Provider Component
function ReduxStoreProvider({ children }: { children: React.ReactNode }) {
  const [storeData, setStoreData] = useState<{ store: any; persistor: any } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initializingRef.current || storeData) return;
    
    initializingRef.current = true;
    
    createAsyncStore()
      .then(({ store, persistor }) => {
        setStoreData({ store, persistor });
      })
      .catch((err) => {
        console.error('Failed to initialize Redux store:', err);
        setError(err as Error);
      })
      .finally(() => {
        initializingRef.current = false;
      });
  }, [storeData]);

  if (error) {
    const errorConfig = errorStateUtils.createErrorBoundary({
      title: 'Store Initialization Error',
      description: 'Failed to initialize the application store. Please refresh the page.',
      onRetry: () => window.location.reload(),
    });

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

  if (!storeData) {
    const loadingOverlay = loadingStateUtils.createLoadingOverlay('Initializing application store...');
    
    return (
      <div className="chanuka-loading-overlay contrast-aa">
        <div className="chanuka-spinner chanuka-spinner-large" aria-hidden="true" aria-label="Loading"></div>
        <p className="chanuka-loading-message" role="status" aria-live="polite" aria-atomic="true">
          Initializing application store...
        </p>
      </div>
    );
  }

  return (
    <ReduxProvider store={storeData.store}>
      <PersistGate loading={
        <div className="chanuka-loading-overlay contrast-aa">
          <div className="chanuka-spinner chanuka-spinner-large" aria-hidden="true" aria-label="Loading"></div>
          <p className="chanuka-loading-message" role="status" aria-live="polite" aria-atomic="true">
            Restoring application state...
          </p>
        </div>
      } persistor={storeData.persistor}>
        {children}
      </PersistGate>
    </ReduxProvider>
  );
}

interface ProviderConfig {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

const PROVIDERS: ProviderConfig[] = [
  // Optimized order: innermost to outermost for reduceRight
  // Redux Provider must be first (innermost) so other providers can use Redux
  {
    name: 'ReduxStoreProvider',
    component: ReduxStoreProvider,
  },
  {
    name: 'QueryClientProvider',
    component: QueryClientProvider,
  },
  {
    name: 'ErrorBoundary',
    component: SimpleErrorBoundary, // Use SimpleErrorBoundary for better performance
  },
  {
    name: 'AuthProvider',
    component: AuthProvider,
  },
  {
    name: 'ThemeProvider',
    component: ThemeProvider,
  },
  // Optional providers for enhanced functionality
  {
    name: 'LoadingProvider',
    component: LoadingProviderWithDeps,
  },
  {
    name: 'AccessibilityProvider',
    component: AccessibilityProvider,
  },
  {
    name: 'OfflineProvider',
    component: OfflineProvider,
  },
];

// =============================================================================
// APP PROVIDERS COMPONENT
// =============================================================================

interface ProviderOverrides {
  ReduxStoreProvider?: React.ComponentType<{ children: React.ReactNode }>;
  QueryClientProvider?: React.ComponentType<{ client: QueryClient; children: React.ReactNode }>;
  ErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  NavigationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  ThemeProvider?: React.ComponentType<{ children: React.ReactNode }>;
  LoadingProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AccessibilityProvider?: React.ComponentType<{ children: React.ReactNode }>;
  OfflineProvider?: React.ComponentType<{ children: React.ReactNode }>;
  // allow lookup by provider name at runtime when applying overrides
  [key: string]: React.ComponentType<any> | undefined;
}

interface AppProvidersProps {
  children: React.ReactNode;
  overrides?: ProviderOverrides;
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  overrides = {},
  queryClient
}: AppProvidersProps) {
  const composedProviders = PROVIDERS.reduceRight((acc, provider) => {
    const OverrideComponent = overrides[provider.name];
    const Component = OverrideComponent || provider.component;

    // Handle special cases for providers that need props
    if (provider.name === 'QueryClientProvider') {
      return (
        <Component client={queryClient}>
          {acc}
        </Component>
      );
    }

    // Default case for providers without special props
    return (
      <Component {...(provider.props || {})}>
        {acc}
      </Component>
    );
  }, children);

  return composedProviders;
}

export default AppProviders;

