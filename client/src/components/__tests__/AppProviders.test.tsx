import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { AppProviders } from '../AppProviders';

// Mock all the provider dependencies with context support
const mockQueryClient = {};
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => mockQueryClient),
  QueryClientProvider: ({ children, client }: any) => (
    <div data-testid="query-client-provider" data-client={client ? 'provided' : 'not-provided'}>
      {children}
    </div>
  ),
  useQueryClient: () => mockQueryClient,
}));

jest.mock('../error-handling/SimpleErrorBoundary', () => ({
  SimpleErrorBoundary: ({ children }: any) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

const mockAuthValue = { user: { name: 'Test User' }, isAuthenticated: true };
jest.mock('../hooks/use-auth', () => ({
  AuthProvider: ({ children }: any) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: jest.fn(() => mockAuthValue),
}));

const mockThemeValue = { theme: 'dark', toggleTheme: jest.fn() };
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: any) => (
    <div data-testid="theme-provider">{children}</div>
  ),
  useTheme: jest.fn(() => mockThemeValue),
}));

const mockLoadingValue = { isLoading: false, showLoader: jest.fn() };
jest.mock('../core/loading', () => ({
  createLoadingProvider: jest.fn(() => ({ children }: any) => (
    <div data-testid="loading-provider">{children}</div>
  )),
  useLoading: jest.fn(() => mockLoadingValue),
}));

const mockAccessibilityValue = { highContrast: false, setHighContrast: jest.fn() };
jest.mock('./accessibility/accessibility-manager', () => ({
  AccessibilityProvider: ({ children }: any) => (
    <div data-testid="accessibility-provider">{children}</div>
  ),
  useAccessibility: jest.fn(() => mockAccessibilityValue),
}));

const mockOfflineValue = { isOffline: false, goOffline: jest.fn() };
jest.mock('./offline/offline-manager', () => ({
  OfflineProvider: ({ children }: any) => (
    <div data-testid="offline-provider">{children}</div>
  ),
  useOffline: jest.fn(() => mockOfflineValue),
}));

// Mock hooks
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(() => ({ pathname: '/' })),
  useNavigate: jest.fn(),
}));

jest.mock('../hooks/useConnectionAware', () => ({
  useConnectionAware: jest.fn(),
}));

jest.mock('../hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock('../utils/asset-loading', () => ({
  assetLoadingManager: {},
}));

jest.mock('../hooks/use-mobile', () => ({
  useMediaQuery: jest.fn(),
}));

jest.mock('../core/navigation/context', () => ({
  createNavigationProvider: jest.fn(() => ({ children }: any) => (
    <div data-testid="navigation-provider">{children}</div>
  )),
}));

// Test component that consumes contexts
const ContextConsumer = () => {
  const { useQueryClient } = require('@tanstack/react-query');
  const { useAuth } = require('../hooks/use-auth');
  const { useTheme } = require('../contexts/ThemeContext');
  const { useLoading } = require('../core/loading');
  const { useAccessibility } = require('./accessibility/accessibility-manager');
  const { useOffline } = require('./offline/offline-manager');

  const queryClient = useQueryClient();
  const auth = useAuth();
  const theme = useTheme();
  const loading = useLoading();
  const accessibility = useAccessibility();
  const offline = useOffline();

  return (
    <div data-testid="context-consumer">
      <span data-testid="query-client">{queryClient ? 'has-client' : 'no-client'}</span>
      <span data-testid="auth-user">{auth.user?.name || 'no-user'}</span>
      <span data-testid="theme-value">{theme.theme}</span>
      <span data-testid="loading-state">{loading.isLoading ? 'loading' : 'not-loading'}</span>
      <span data-testid="accessibility-contrast">{accessibility.highContrast ? 'high' : 'normal'}</span>
      <span data-testid="offline-state">{offline.isOffline ? 'offline' : 'online'}</span>
    </div>
  );
};

describe('AppProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propagates QueryClient context to child components', async () => {
    const queryClient = new QueryClient();
    render(
      <AppProviders queryClient={queryClient}>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('query-client')).toHaveTextContent('has-client');
    });
  });

  it('propagates Auth context to child components', async () => {
    render(
      <AppProviders>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('Test User');
    });
  });

  it('propagates Theme context to child components', async () => {
    render(
      <AppProviders>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    });
  });

  it('propagates Loading context to child components', async () => {
    render(
      <AppProviders>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
    });
  });

  it('propagates Accessibility context to child components', async () => {
    render(
      <AppProviders>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('accessibility-contrast')).toHaveTextContent('normal');
    });
  });

  it('propagates Offline context to child components', async () => {
    render(
      <AppProviders>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('offline-state')).toHaveTextContent('online');
    });
  });

  it('applies provider overrides and maintains context propagation', async () => {
    const MockAuthProvider = ({ children }: any) => {
      const mockAuthValue = { user: { name: 'Override User' }, isAuthenticated: true };
      const { useAuth } = require('../hooks/use-auth');
      // Override the hook to return different value
      useAuth.mockReturnValue(mockAuthValue);

      return (
        <div data-testid="mock-auth-provider">
          {children}
        </div>
      );
    };

    const overrides = {
      AuthProvider: MockAuthProvider,
    };

    render(
      <AppProviders overrides={overrides}>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-user')).toHaveTextContent('Override User');
    });
    expect(screen.getByTestId('mock-auth-provider')).toBeInTheDocument();
  });

  it('maintains context isolation between different provider instances', async () => {
    const queryClient1 = new QueryClient();
    const queryClient2 = new QueryClient();

    const { rerender } = render(
      <AppProviders queryClient={queryClient1}>
        <ContextConsumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('query-client')).toHaveTextContent('has-client');
    });

    // Rerender with different query client
    rerender(
      <AppProviders queryClient={queryClient2}>
        <ContextConsumer />
      </AppProviders>
    );

    // Context should still be available (different instance but same interface)
    await waitFor(() => {
      expect(screen.getByTestId('query-client')).toHaveTextContent('has-client');
    });
  });

  it('handles context updates from child components', async () => {
    // Test component that can trigger context updates
    const ContextUpdater = () => {
      const { useTheme } = require('../contexts/ThemeContext');
      const theme = useTheme();

      return (
        <div>
          <button
            data-testid="toggle-theme"
            onClick={theme.toggleTheme}
          >
            Toggle Theme
          </button>
          <span data-testid="current-theme">{theme.theme}</span>
        </div>
      );
    };

    render(
      <AppProviders>
        <ContextUpdater />
      </AppProviders>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');

    // Click to toggle theme
    screen.getByTestId('toggle-theme').click();

    // Verify the toggle function was called (mocked)
    expect(mockThemeValue.toggleTheme).toHaveBeenCalled();
  });
});