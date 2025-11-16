import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './error-handling';
import { createNavigationProvider } from '../core/navigation/context';
import { LoadingProvider } from '../core/loading';
import { AuthProvider, useAuth } from '../hooks/use-auth';
import { useConnectionAware } from '../hooks/useConnectionAware';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { assetLoadingManager } from '../utils/asset-loading';
import { useMediaQuery } from '../hooks/use-mobile';
import { AccessibilityProvider } from './accessibility/accessibility-manager';
import { OfflineProvider } from './offline/offline-manager';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SimpleErrorBoundary } from './error-handling/SimpleErrorBoundary';

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

interface ProviderConfig {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

const PROVIDERS: ProviderConfig[] = [
  // Optimized order: innermost to outermost for reduceRight
  // Core providers first (NavigationProvider removed - needs to be inside Router)
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

