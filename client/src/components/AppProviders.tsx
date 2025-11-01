import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { EnhancedErrorBoundary } from './error-handling';
import { createNavigationProvider } from '../core/navigation/context';
import { createLoadingProvider } from '../core/loading';
import { AuthProvider, useAuth } from '../hooks/use-auth';
import { useConnectionAware } from '../hooks/useConnectionAware';
import { useOnlineStatus } from '../hooks/use-online-status';
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

// Create the React-specific LoadingProvider (inject runtime deps)
const LoadingProviderWithDeps = createLoadingProvider(
  useConnectionAware,
  useOnlineStatus,
  assetLoadingManager
);

interface ProviderConfig {
  name: string;
  component: React.ComponentType<any> | React.ReactElement;
  props?: Record<string, any>;
}

const PROVIDERS: ProviderConfig[] = [
  // Innermost to outermost order for reduceRight
  {
    name: 'ThemeProvider',
    component: ThemeProvider,
  },
  {
    name: 'AuthProvider',
    component: AuthProvider,
  },
  {
    name: 'NavigationProvider',
    component: NavigationProvider,
  },
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
  {
    name: 'SimpleErrorBoundary',
    component: SimpleErrorBoundary,
  },
  {
    name: 'QueryClientProvider',
    component: QueryClientProvider,
  },
];

// =============================================================================
// APP PROVIDERS COMPONENT
// =============================================================================

interface ProviderOverrides {
  QueryClientProvider?: React.ComponentType<{ client: QueryClient; children: React.ReactNode }>;
  EnhancedErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  NavigationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  LoadingProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AccessibilityProvider?: React.ComponentType<{ children: React.ReactNode }>;
  OfflineProvider?: React.ComponentType<{ children: React.ReactNode }>;
  ThemeProvider?: React.ComponentType<{ children: React.ReactNode }>;
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

    if (provider.name === 'EnhancedErrorBoundary') {
      return (
        <Component>
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

