
// Core Providers and Layout
import AppProviders from '@client/components/AppProviders';
import { ErrorBoundary } from '@client/components/error-handling/ErrorBoundary';
import SimpleAppLayout from '@client/components/layout/SimpleAppLayout';
// UI Components
// AccessibilitySettingsPanel is now integrated into UserAccountPage
import { LazyPageWrapper } from '@client/components/LazyPageWrapper';
import { LoadingStateManager } from '@client/components/loading/LoadingStates';
import { OfflineStatus } from '@client/components/offline/offline-manager';
import { CookieConsentBanner } from '@client/components/privacy';
import { Toaster } from '@client/components/ui/toaster';
// Hooks
import { useLoadingOperation } from '@client/core/loading/hooks';
import { createNavigationProvider } from '@client/core/navigation/context';
import { useWebVitals } from '@client/features/analytics/hooks';
import { useAuth } from '@client/features/users/hooks';
import { useMediaQuery } from '@client/hooks/use-mobile';
// Utils
import { logger } from '@client/utils/logger';
import { SafeLazyPages, SafeLazySponsorshipPages } from '@client/utils/safe-lazy-loading';
import { SimpleLazyPages } from '@client/utils/simple-lazy-pages';
import { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy } from 'react';
import React, { Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Core Systems

// Test Pages (lazy loaded only when needed)
const DesignSystemTestPage = lazy(() => import('@client/pages/design-system-test'));

// =============================================================================
// CONFIGURATION - Centralized configuration for easy maintenance
// =============================================================================

const CONFIG = {
  query: {
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  },
  loading: {
    pageTimeout: 15000, // 15 seconds max loading time
    connectionAware: true, // Adjust timeouts based on connection speed
    showTimeoutWarning: true, // User feedback for slow loads
  },
  dev: {
    enableDevTools: true,
    logLevel: 'info',
  },
} as const;

// Environment detection - single source of truth
const IS_DEV = process.env.NODE_ENV === 'development';

// =============================================================================
// QUERY CLIENT - Singleton pattern ensures one instance across app
// =============================================================================

let queryClientInstance: QueryClient | null = null;

/**
 * Get or create the QueryClient instance. Using a singleton pattern here
 * prevents creating multiple QueryClient instances which could lead to
 * cache inconsistencies and memory leaks.
 */
const getQueryClient = (): QueryClient => {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: CONFIG.query.retry,
          staleTime: CONFIG.query.staleTime,
          gcTime: CONFIG.query.gcTime,
          refetchOnWindowFocus: CONFIG.query.refetchOnWindowFocus,
          throwOnError: false, // Handle errors gracefully at component level
          networkMode: 'online', // Only run queries when online
        },
        mutations: {
          retry: CONFIG.query.retry,
          networkMode: 'online',
        },
      },
    });
  }
  return queryClientInstance;
};

// =============================================================================
// PAGE LOADER - Handles loading states with timeouts and error handling
// =============================================================================

/**
 * PageLoader provides intelligent loading states with timeout detection.
 * It adjusts behavior based on connection speed and provides clear feedback
 * to users when pages take longer than expected to load.
 */
function PageLoader() {
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
}

// =============================================================================
// ROUTE DEFINITIONS - Centralized routing configuration
// =============================================================================

/**
 * Route configuration is defined as a constant to enable:
 * 1. Easy maintenance - all routes in one place
 * 2. Type safety - TypeScript can infer route types
 * 3. Code splitting - each route lazy loads only when needed
 * 4. Performance - reduces initial bundle size significantly
 */
const ROUTES = [
  // Main Application Routes
  {
    path: '/',
    element: (
      <LazyPageWrapper>
        <SimpleLazyPages.HomePage />
      </LazyPageWrapper>
    ),
    id: 'home',
  },
  { 
    path: '/dashboard', 
    element: <SafeLazyPages.Dashboard />, 
    id: 'dashboard' 
  },

  // Bill Management Routes - Core feature set
  {
    path: '/bills',
    element: <SafeLazyPages.BillsDashboard />,
    id: 'bills-dashboard',
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

  // Sponsorship Analysis Routes - Advanced features
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

  // Community and Engagement Routes
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
        <SimpleLazyPages.CivicEducation />
      </LazyPageWrapper>
    ),
    id: 'civic-education',
  },

  // User Management Routes
  { 
    path: '/auth', 
    element: <SafeLazyPages.AuthPage />, 
    id: 'auth' 
  },
  { 
    path: '/account', 
    element: <SafeLazyPages.Profile />, 
    id: 'account' 
  },
  // Legacy routes redirect to unified account page
  { 
    path: '/profile', 
    element: <SafeLazyPages.Profile />, 
    id: 'profile' 
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

  // System and Admin Routes
  { 
    path: '/search', 
    element: <SafeLazyPages.SearchPage />, 
    id: 'search' 
  },
  { 
    path: '/admin', 
    element: <SafeLazyPages.AdminPage />, 
    id: 'admin' 
  },
  {
    path: '/admin/database',
    element: <SafeLazyPages.DatabaseManager />,
    id: 'database-manager',
  },

  // Development and Testing Routes (only loaded in dev mode)
  ...(IS_DEV ? [
    {
      path: '/design-system-test',
      element: <DesignSystemTestPage />,
      id: 'design-system-test',
    },
  ] : []),

  // 404 Catch-all - must be last
  { 
    path: '*', 
    element: <SafeLazyPages.NotFound />, 
    id: 'not-found' 
  },
] as const;

// =============================================================================
// WEB VITALS MONITORING - Performance tracking for Core Web Vitals
// =============================================================================

/**
 * WebVitalsMonitor tracks Core Web Vitals (LCP, FID, CLS) which are
 * Google's key metrics for user experience. This data helps identify
 * performance bottlenecks and monitor real-world user experience.
 */
function WebVitalsMonitor() {
  useWebVitals({
    enabled: true,
    onAllMetrics: metrics => {
      if (IS_DEV) {
        // In development, log to console for immediate feedback
        logger.info('Core Web Vitals collected', undefined, metrics as Record<string, unknown>);
      } else if (typeof (window as unknown as { gtag?: unknown }).gtag !== 'undefined') {
        // In production, send to Google Analytics for tracking trends
        Object.entries(metrics).forEach(([name, value]) => {
          if (value !== undefined) {
            (window as unknown as { gtag: (event: string, action: string, params: Record<string, unknown>) => void }).gtag('event', 'web_vitals', {
              event_category: 'Web Vitals',
              event_label: name.toUpperCase(),
              value: Math.round(value),
              custom_map: { metric_value: value },
            });
          }
        });
      }
    },
    reportTo: IS_DEV ? undefined : '/api/analytics/web-vitals',
  });

  return null; // Monitoring component - renders nothing
}

// =============================================================================
// APP CONTENT - Main routing component
// =============================================================================

/**
 * AppContent wraps the routing logic in our layout and suspense boundary.
 * The Suspense boundary catches lazy-loaded components during loading
 * and shows the PageLoader component instead of a blank screen.
 */
function AppContent() {
  return (
    <SimpleAppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {ROUTES.map(({ path, element, id }) => {
            try {
              return <Route key={id} path={path} element={element} />;
            } catch (error) {
              logger.error(`Failed to render route ${id}:`, { component: 'App' }, error);
              return (
                <Route 
                  key={id} 
                  path={path} 
                  element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h2 className="text-xl font-semibold text-red-600 mb-2">Page Load Error</h2>
                        <p className="text-gray-600 mb-4">Failed to load {id} page</p>
                        <button 
                          type="button"
                          onClick={() => window.location.reload()} 
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
}

// =============================================================================
// NAVIGATION WRAPPER - Provides router context to navigation system
// =============================================================================

/**
 * NavigationWrapper bridges React Router's hooks with our custom navigation
 * system. It's separated into its own component so the navigation provider
 * only has access to hooks after the Router is mounted.
 */
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  // Create the navigation provider with all necessary hooks
  // Using useMemo ensures we only create this once, not on every render
  const NavigationProvider = useMemo(
    () => createNavigationProvider(useLocation, useNavigate, useAuth, useMediaQuery),
    []
  );

  return <NavigationProvider>{children}</NavigationProvider>;
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

/**
 * The main App component orchestrates all providers and global components.
 * The order of providers matters - each inner component can access the
 * context from providers that wrap it.
 * 
 * Provider hierarchy:
 * 1. AppProviders (React Query, Theme, etc.)
 * 2. BrowserRouter (routing)
 * 3. NavigationWrapper (navigation context)
 * 4. AppContent (actual application)
 */
export default function App() {
  // Get QueryClient instance once at app root
  const queryClient = useMemo(() => getQueryClient(), []);

  // Simple initialization logging for debugging
  useEffect(() => {
    if (IS_DEV) {
      logger.info('Application initialized', {
        component: 'App',
        routeCount: ROUTES.length,
        environment: 'development',
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders queryClient={queryClient}>
        <BrowserRouter>
          <NavigationWrapper>
            <ErrorBoundary>
              {/* Main application content */}
              <AppContent />
            </ErrorBoundary>
            
            {/* Global UI components that overlay the main content */}
            <Toaster />
            <OfflineStatus showDetails={false} />
            <CookieConsentBanner />
            <WebVitalsMonitor />
            
            {/* Development tools - only in dev mode */}
            {IS_DEV && CONFIG.dev.enableDevTools && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </NavigationWrapper>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}