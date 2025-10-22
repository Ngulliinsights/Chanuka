import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageErrorBoundary } from './error-handling';
import { NavigationProvider } from '../contexts/NavigationContext';
import { ResponsiveNavigationProvider } from '../contexts/ResponsiveNavigationContext';
import { LoadingProvider } from '../contexts/LoadingContext';
import { AuthProvider } from '../hooks/use-auth';
import { AccessibilityProvider } from './accessibility/accessibility-manager';
import { OfflineProvider } from './offline/offline-manager';

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

interface ProviderConfig {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

const PROVIDERS: ProviderConfig[] = [
  // Innermost to outermost order for reduceRight
  {
    name: 'ResponsiveNavigationProvider',
    component: ResponsiveNavigationProvider,
  },
  {
    name: 'NavigationProvider',
    component: NavigationProvider,
  },
  {
    name: 'AuthProvider',
    component: AuthProvider,
  },
  {
    name: 'LoadingProvider',
    component: LoadingProvider,
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
    name: 'PageErrorBoundary',
    component: PageErrorBoundary,
    props: { context: 'page' },
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
  PageErrorBoundary?: React.ComponentType<{ context: string; children: React.ReactNode }>;
  NavigationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  ResponsiveNavigationProvider?: React.ComponentType<{ children: React.ReactNode }>;
  LoadingProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AuthProvider?: React.ComponentType<{ children: React.ReactNode }>;
  AccessibilityProvider?: React.ComponentType<{ children: React.ReactNode }>;
  OfflineProvider?: React.ComponentType<{ children: React.ReactNode }>;
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

    if (provider.name === 'PageErrorBoundary') {
      return (
        <Component {...(provider.props || {})}>
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