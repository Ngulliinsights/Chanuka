import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from '@client/core/loading/context';
import { createNavigationProvider } from '@client/core/navigation/context';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, AuthProvider } from '@client/features/users/hooks/useAuth';
import { useMediaQuery } from '@client/hooks/use-mobile';
import { AccessibilityProvider } from '@client/components/accessibility/accessibility-manager';
import { OfflineProvider } from '@client/components/offline/offline-manager';
import { vi } from 'vitest';

// =============================================================================
// TYPES
// =============================================================================

export interface TestProvidersOptions {
  queryClient?: QueryClient;
  initialEntries?: string[];
  route?: string;
  authState?: {
    user?: any;
    isAuthenticated?: boolean;
  };
  navigationState?: {
    currentPath?: string;
    user_role?: 'public' | 'user' | 'expert' | 'admin';
  };
  loadingState?: {
    operations?: any[];
    globalLoading?: boolean;
  };
}

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  role: 'citizen',
  verification_status: 'verified',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  reputation: 100,
  expertise: 'general',
  ...overrides,
});

export const createMockBill = (overrides: Partial<any> = {}) => ({
  id: 'bill-1',
  title: 'Healthcare Reform Bill',
  summary: 'A comprehensive healthcare reform proposal',
  status: 'active',
  category: 'healthcare',
  sponsor: 'Senator Smith',
  introduced_date: new Date('2024-01-01'),
  last_action_date: new Date('2024-01-15'),
  votes: {
    yes: 45,
    no: 30,
    abstain: 5,
  },
  tags: ['healthcare', 'reform', 'insurance'],
  ...overrides,
});

export const createMockAuthState = (overrides: Partial<any> = {}) => ({
  user: createMockUser(),
  isAuthenticated: true,
  loading: false,
  ...overrides,
});

export const createMockNavigationState = (overrides: Partial<any> = {}) => ({
  currentPath: '/',
  previousPath: '/',
  breadcrumbs: [{ label: 'Home', path: '/', is_active: true }],
  relatedPages: [],
  currentSection: 'legislative',
  sidebarOpen: false,
  mobileMenuOpen: false,
  user_role: 'public',
  preferences: {
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
  },
  ...overrides,
});

// =============================================================================
// TEST PROVIDERS COMPONENT
// =============================================================================

interface TestProvidersProps {
  children: React.ReactNode;
  options?: TestProvidersOptions;
}

const TestProviders: React.FC<TestProvidersProps> = ({ children, options = {} }) => {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    initialEntries = ['/'],
    route = '/',
    authState,
    navigationState,
    loadingState,
  } = options;

  // Create NavigationProvider with mocked hooks
  const NavigationProvider = createNavigationProvider(
    () => ({ pathname: route }),
    () => vi.fn(),
    () => ({ 
      user: authState?.user || { id: 'test', name: 'Test User' }, 
      isAuthenticated: authState?.isAuthenticated || false 
    }),
    () => false // Mock useMediaQuery to return false (desktop)
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OfflineProvider>
          <AccessibilityProvider>
            <LoadingProvider>
              <AuthProvider>
                <NavigationProvider>
                  {children}
                </NavigationProvider>
              </AuthProvider>
            </LoadingProvider>
          </AccessibilityProvider>
        </OfflineProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// =============================================================================
// RENDER WITH PROVIDERS
// =============================================================================

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  providers?: TestProvidersOptions;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  const { providers, ...renderOptions } = options;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders options={providers}>{children}</TestProviders>
  );

  return render(ui, { wrapper, ...renderOptions });
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const waitForLoadingToFinish = async (container?: HTMLElement) => {
  // Wait for any loading states to finish
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const mockApiResponse = <T extends any>(
  data: T,
  options: { delay?: number; error?: Error } = {}
) => {
  const { delay = 0, error } = options;

  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }, delay);
  });
};

export const createMockQueryResponse = <T extends any>(
  data: T,
  options: { isLoading?: boolean; error?: Error } = {}
) => ({
  data: options.error ? undefined : data,
  isLoading: options.isLoading ?? false,
  error: options.error,
  refetch: vi.fn(),
});

export const createMockMutationResponse = <T extends any>(
  options: { isLoading?: boolean; error?: Error; data?: T } = {}
) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isLoading: options.isLoading ?? false,
  error: options.error,
  data: options.data,
  reset: vi.fn(),
});

// =============================================================================
// COMMON TEST PATTERNS
// =============================================================================

export const setupAuthenticatedUser = (userOverrides?: Partial<any>) => ({
  providers: {
    authState: {
      user: createMockUser(userOverrides),
      isAuthenticated: true,
    },
  },
});

export const setupUnauthenticatedUser = () => ({
  providers: {
    authState: {
      user: null,
      isAuthenticated: false,
    },
  },
});

export const setupLoadingState = (operationId: string, type: string = 'api') => ({
  providers: {
    loadingState: {
      operations: [{
        id: operationId,
        type,
        message: `Loading ${type}...`,
        priority: 'medium',
        maxRetries: 3,
        connectionAware: true,
        startTime: Date.now(),
        retryCount: 0,
      }],
    },
  },
});

export const setupNavigationState = (path: string, user_role: string = 'public') => ({
  providers: {
    navigationState: {
      ...createMockNavigationState(),
      currentPath: path,
      user_role,
    },
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export * from './index';

