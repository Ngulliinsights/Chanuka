/**
 * Optimized App Component
 *
 * A refined React application architecture that combines:
 * - Comprehensive routing with lazy loading
 * - Unified state management via Zustand store
 * - Robust error boundaries and loading states
 * - Performance monitoring and offline support
 * - Clean separation of concerns
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { Suspense, useEffect, useMemo, memo } from 'react';
import { lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Core infrastructure
import { logger } from '@/utils/logger';
import AppProviders from '@client/components/AppProviders';
import { ErrorBoundary } from '@client/components/error-handling/ErrorBoundary';
import SimpleAppLayout from '@client/components/layout/SimpleAppLayout';
import { LazyPageWrapper } from '@client/components/LazyPageWrapper';
import { LoadingStateManager } from '@client/components/loading/LoadingStates';
import { OfflineStatus } from '@client/components/offline/offline-manager';
import { CookieConsentBanner } from '@client/components/privacy';
import { Toaster } from '@client/components/ui/toaster';

// Hooks and utilities
import { useLoadingOperation } from '@client/core/loading/hooks';
import { createNavigationProvider } from '@client/core/navigation/context';
import { useWebVitals } from '@client/features/analytics/hooks';
import { useAuth } from '@client/features/users/hooks';
import { useMediaQuery } from '@client/hooks/use-mobile';
import {
  queryClient,
  configureOfflineSupport,
  setupGlobalErrorHandler,
} from '@client/lib/react-query-config';
import { useConnection } from '@client/store/unified-store';
import { SafeLazyPages, SafeLazySponsorshipPages } from '@client/utils/safe-lazy-loading';
import { LazyPages, preloadHighPriorityRoutes } from '@client/utils/simple-lazy-pages';

import { IntegrationProvider, IntegrationStatus } from './components/integration/IntegrationProvider';

// Development-only pages
const DesignSystemTestPage = lazy(() => import('@client/pages/design-system-test'));

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  query: {
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data for 10 minutes
    refetchOnWindowFocus: false,
  },
  loading: {
    pageTimeout: 15000, // Show timeout warning after 15 seconds
    connectionAware: true, // Adjust timeouts based on connection speed
    showTimeoutWarning: true,
  },
  dev: {
    enableDevTools: true,
    logLevel: 'info' as const,
  },
} as const;

const IS_DEV = process.env.NODE_ENV === 'development';

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

/**
 * Centralized route definitions with lazy-loaded components.
 * Routes are organized by feature area for easier maintenance.
 */
const ROUTES = [
  // Core Application
  {
    path: '/',
    element: (
      <LazyPageWrapper>
        <LazyPages.HomePage />
      </LazyPageWrapper>
    ),
    id: 'home',
    preload: true, // Mark for eager preloading
  },
  {
    path: '/dashboard',
    element: <SafeLazyPages.Dashboard />,
    id: 'dashboard',
    preload: true,
  },

  // Bill Management
  {
    path: '/bills',
    element: <SafeLazyPages.BillsDashboard />,
    id: 'bills-dashboard',
    preload: true,
  },
  {
    path: '/bills/:id',
    element: <SafeLazyPages.BillDetail />,
    id: 'bill-detail',
  },
  {
    path: '/bills/:id/analysis',
    element: <SafeLazyPages.BillAnalysis />,
    id: 'bill-analysis',
  },
  {
    path: '/bills/:id/comments',
    element: <SafeLazyPages.CommentsPage />,
    id: 'bill-comments',
  },

  // Sponsorship Analysis
  {
    path: '/bill-sponsorship-analysis',
    element: <SafeLazyPages.BillSponsorshipAnalysis />,
    id: 'sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis',
    element: <SafeLazyPages.BillSponsorshipAnalysis />,
    id: 'bill-sponsorship-analysis',
  },
  {
    path: '/bills/:id/sponsorship-analysis/overview',
    element: <SafeLazySponsorshipPages.SponsorshipOverviewWrapper />,
    id: 'sponsorship-overview',
  },
  {
    path: '/bills/:id/sponsorship-analysis/primary-sponsor',
    element: <SafeLazySponsorshipPages.PrimarySponsorWrapper />,
    id: 'primary-sponsor',
  },
  {
    path: '/bills/:id/sponsorship-analysis/co-sponsors',
    element: <SafeLazySponsorshipPages.CoSponsorsWrapper />,
    id: 'co-sponsors',
  },
  {
    path: '/bills/:id/sponsorship-analysis/financial-network',
    element: <SafeLazySponsorshipPages.FinancialNetworkWrapper />,
    id: 'financial-network',
  },
  {
    path: '/bills/:id/sponsorship-analysis/methodology',
    element: <SafeLazySponsorshipPages.MethodologyWrapper />,
    id: 'methodology',
  },

  // Community & Engagement
  {
    path: '/community',
    element: <SafeLazyPages.CommunityInput />,
    id: 'community',
  },
  {
    path: '/expert-verification',
    element: <SafeLazyPages.ExpertVerification />,
    id: 'expert-verification',
  },
  {
    path: '/civic-education',
    element: (
      <LazyPageWrapper>
        <LazyPages.CivicEducation />
      </LazyPageWrapper>
    ),
    id: 'civic-education',
  },

  // User Management
  {
    path: '/auth',
    element: <SafeLazyPages.AuthPage />,
    id: 'auth',
  },
  {
    path: '/account',
    element: <SafeLazyPages.Profile />,
    id: 'account',
  },
  {
    path: '/profile',
    element: <SafeLazyPages.Profile />,
    id: 'profile',
  },
  {
    path: '/user-profile',
    element: <SafeLazyPages.UserProfilePage />,
    id: 'user-profile',
  },
  {
    path: '/user-dashboard',
    element: <SafeLazyPages.UserDashboard />,
    id: 'user-dashboard',
  },
  {
    path: '/privacy-settings',
    element: <SafeLazyPages.Profile />,
    id: 'privacy-settings',
  },
  {
    path: '/onboarding',
    element: <SafeLazyPages.Onboarding />,
    id: 'onboarding',
  },

  // System & Admin
  {
    path: '/search',
    element: <SafeLazyPages.SearchPage />,
    id: 'search',
  },
  {
    path: '/admin',
    element: <SafeLazyPages.AdminPage />,
    id: 'admin',
  },
  {
    path: '/admin/database',
    element: <SafeLazyPages.DatabaseManager />,
    id: 'database-manager',
  },

  // Development Tools (only in dev mode)
  ...(IS_DEV
    ? [
        {
          path: '/design-system-test',
          element: <DesignSystemTestPage />,
          id: 'design-system-test',
        },
      ]
    : []),

  // 404 Fallback
  {
    path: '*',
    element: <SafeLazyPages.NotFound />,
    id: 'not-found',
  },
] as const;

// =============================================================================
// LOADING COMPONENT
// =============================================================================

/**
 * PageLoader provides a consistent loading experience with timeout warnings.
 * It adapts to connection speed and provides helpful feedback to users.
 */
const PageLoader = memo(function PageLoader() {
  const { error, isTimeout } = useLoadingOperation('app-page-loading', {
    timeout: CONFIG.loading.pageTimeout,
    connectionAware: CONFIG.loading.connectionAware,
    showTimeoutWarning: CONFIG.loading.showTimeoutWarning,
  });

  const currentState = isTimeout ? 'timeout' : 'loading';
  const loadingMessage = error?.message || 'Loading page...';

  return (
    <LoadingStateManager
      type="page"
      state={currentState}
      message={loadingMessage}
      error={error ?? undefined}
      timeout={CONFIG.loading.pageTimeout}
      className="min-h-screen"
      showDetails={IS_DEV}
    />
  );
});

// =============================================================================
// WEB VITALS MONITORING
// =============================================================================

/**
 * WebVitalsMonitor tracks Core Web Vitals (LCP, FID, CLS, etc.) and reports
 * them to analytics in production or logs them in development.
 */
const WebVitalsMonitor = memo(function WebVitalsMonitor() {
  useWebVitals({
    enabled: true,
    onAllMetrics: metrics => {
      if (IS_DEV) {
        logger.info('Core Web Vitals collected', undefined, metrics as Record<string, unknown>);
      } else if (
        typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag !== 'undefined'
      ) {
        // Send metrics to Google Analytics in production
        Object.entries(metrics).forEach(([name, value]) => {
          if (value !== undefined) {
            (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
              'event',
              'web_vitals',
              {
                event_category: 'Web Vitals',
                event_label: name.toUpperCase(),
                value: Math.round(value),
                custom_map: { metric_value: value },
              }
            );
          }
        });
      }
    },
    reportTo: IS_DEV ? undefined : '/api/analytics/web-vitals',
  });

  return null;
});

// =============================================================================
// CONNECTION MONITOR
// =============================================================================

/**
 * ConnectionMonitor listens to browser online/offline events and updates
 * the unified store. This enables the app to adapt to connection changes.
 */
const ConnectionMonitor = memo(function ConnectionMonitor() {
  const { setOnlineStatus } = useConnection();

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      logger.info('Connection restored', { component: 'ConnectionMonitor' });
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      logger.warn('Connection lost', { component: 'ConnectionMonitor' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return null;
});

// =============================================================================
// APP INITIALIZER
// =============================================================================

/**
 * AppInitializer handles one-time setup tasks when the app first loads:
 * - Configures offline support for React Query
 * - Sets up global error handlers
 * - Preloads high-priority routes
 * - Logs initialization in development
 */
const AppInitializer = memo(function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Configure offline support for queries
    const cleanupOffline = configureOfflineSupport();

    // Setup global error handling
    setupGlobalErrorHandler();

    // Preload critical routes for faster navigation
    preloadHighPriorityRoutes();

    if (IS_DEV) {
      logger.info('Application initialized', {
        component: 'App',
        routeCount: ROUTES.length,
        environment: 'development',
        timestamp: new Date().toISOString(),
      });
      console.log('🚀 Chanuka App initialized');
      console.log('📊 Query Client configured');
      console.log('🏪 Unified Store ready');
      console.log('⚡ High priority routes preloading');
    }

    return cleanupOffline;
  }, []);

  return <>{children}</>;
});

// =============================================================================
// NAVIGATION WRAPPER
// =============================================================================

/**
 * NavigationWrapper provides navigation context to all child components.
 * It creates the navigation provider once and memoizes it for performance.
 */
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const NavigationProvider = useMemo(
    () => createNavigationProvider(useLocation, useNavigate, useAuth, useMediaQuery),
    []
  );

  return <NavigationProvider>{children}</NavigationProvider>;
}

// =============================================================================
// APP CONTENT
// =============================================================================

/**
 * AppContent renders the main application routes within the layout.
 * Each route is wrapped in an error boundary for graceful error handling.
 */
const AppContent = memo(function AppContent() {
  return (
    <SimpleAppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {ROUTES.map(({ path, element, id }) => {
            // Wrap each route in error handling
            try {
              return <Route key={id} path={path} element={element} />;
            } catch (error) {
              logger.error(`Failed to render route ${id}:`, { component: 'App' }, error);

              // Provide a fallback UI for route errors
              return (
                <Route
                  key={id}
                  path={path}
                  element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold text-red-600">Page Load Error</h2>
                        <p className="text-gray-600">Failed to load the {id} page</p>
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  }
                />
              );
            }
          })}
        </Routes>
      </Suspense>
    </SimpleAppLayout>
  );
});

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

/**
 * App is the root component that orchestrates the entire application.
 *
 * Architecture layers (from outer to inner):
 * 1. ErrorBoundary - Catches and handles any errors in the entire app
 * 2. QueryClientProvider - Provides React Query functionality
 * 3. AppProviders - Custom providers for auth, theme, etc.
 * 4. BrowserRouter - Enables client-side routing
 * 5. AppInitializer - Performs one-time setup
 * 6. NavigationWrapper - Provides navigation context
 * 7. ConnectionMonitor - Monitors network status
 * 8. AppContent - Renders the actual routes and pages
 * 9. Global UI components - Toaster, offline status, etc.
 */
export default function App() {
  // Use memoized query client instance
  const queryClientInstance = useMemo(() => queryClient, []);

  return (
    <ErrorBoundary>
      <IntegrationProvider
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Initializing platform...</p>
            </div>
          </div>
        }
      >
        <QueryClientProvider client={queryClientInstance}>
          <AppProviders queryClient={queryClientInstance}>
            <BrowserRouter>
              <AppInitializer>
                <NavigationWrapper>
                  <ConnectionMonitor />

                  {/* Integration status indicator */}
                  <div className="fixed top-4 right-4 z-50">
                    <IntegrationStatus />
                  </div>

                  {/* Main application content */}
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>

                  {/* Global UI components that appear across all pages */}
                  <Toaster />
                  <OfflineStatus showDetails={false} />
                  <CookieConsentBanner />
                  <WebVitalsMonitor />

                  {/* Development tools (only in dev mode) */}
                  {IS_DEV && CONFIG.dev.enableDevTools && (
                    <ReactQueryDevtools initialIsOpen={false} />
                  )}
                </NavigationWrapper>
              </AppInitializer>
            </BrowserRouter>
          </AppProviders>
        </QueryClientProvider>
      </IntegrationProvider>
    </ErrorBoundary>
  );
}
