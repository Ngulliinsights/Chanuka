import React, { Suspense, lazy, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@client/infrastructure/error/components';
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';
import { logger } from '@client/lib/utils/logger';

import { ProtectedRoute, AdminRoute, VerifiedUserRoute } from './ProtectedRoute';

/**
 * Enhanced lazy loading with retry mechanism and error recovery.
 * This wrapper ensures that transient network errors don't permanently
 * break the application by providing a fallback UI with retry capability.
 */
 
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(() =>
     
    importFn().catch((error: unknown) => {
      logger.error(`Failed to load ${componentName}:`, { component: 'AppRouter' }, error);

      // Return a fallback component that allows retry
      return {
        default: () => (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-orange-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Load {componentName}
              </h2>
              <p className="text-gray-600 mb-4">There was an error loading this page component.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                type="button"
              >
                Reload Page
              </button>
            </div>
          </div>
        ),
      };
    })
  );
};

// Lazy-loaded page components with enhanced error handling
const HomePage = createLazyComponent(
  () => import('@client/features/home/pages/home'),
  'Home Page'
);
const BillsPortal = createLazyComponent(
  () => import('@client/features/bills/pages/BillsPortalPage'),
  'Bills Portal'
);
const BillsDashboard = createLazyComponent(
  () => import('@client/features/bills/pages/bills-dashboard-page'),
  'Bills Dashboard'
);
const BillDetail = createLazyComponent(
  () => import('@client/features/bills/pages/bill-detail'),
  'Bill Detail'
);

const CommunityHub = createLazyComponent(
  () => import('@client/features/community/pages/community-input'),
  'Community Hub'
);
const ExpertVerificationPage = createLazyComponent(
  () => import('@client/features/expert/pages/expert-verification'),
  'Expert Verification'
);
const UniversalSearchPage = createLazyComponent(
  () => import('@client/features/search/pages/universal-search'),
  'Universal Search'
);
const AuthPage = createLazyComponent(
  () => import('@client/features/auth/pages/auth-page'),
  'Authentication'
);
const Onboarding = createLazyComponent(() => import('@client/features/onboarding/pages/onboarding'), 'Onboarding');
const TermsPage = createLazyComponent(() => import('@client/features/legal/pages/terms'), 'Terms');
const PrivacyPage = createLazyComponent(() => import('@client/features/legal/pages/privacy'), 'Privacy');
const SupportPage = createLazyComponent(() => import('@client/features/home/pages/support'), 'Support');
const DocumentationPage = createLazyComponent(() => import('@client/features/legal/pages/documentation'), 'Documentation');
const ContactPage = createLazyComponent(() => import('@client/features/home/pages/contact'), 'Contact');
const AboutPage = createLazyComponent(() => import('@client/features/home/pages/about'), 'About');
const CareersPage = createLazyComponent(() => import('@client/features/home/pages/careers'), 'Careers');
const PressPage = createLazyComponent(() => import('@client/features/home/pages/press'), 'Press');
const BlogPage = createLazyComponent(() => import('@client/features/home/pages/blog'), 'Blog');
const CookiePolicyPage = createLazyComponent(() => import('@client/features/legal/pages/cookie-policy'), 'Cookie Policy');
const AccessibilityPage = createLazyComponent(() => import('@client/features/legal/pages/accessibility'), 'Accessibility');
const CivicEducationPage = createLazyComponent(() => import('@client/features/civic/pages/civic-education'), 'Civic Education');
const AnalysisToolsPage = createLazyComponent(() => import('@client/features/analysis/pages/analysis-tools'), 'Analysis Tools');
const ExpertInsightsPage = createLazyComponent(() => import('@client/features/expert/pages/expert-insights'), 'Expert Insights');
const ApiAccessPage = createLazyComponent(() => import('@client/features/api/pages/api-access'), 'API Access');
const SystemStatusPage = createLazyComponent(() => import('@client/features/status/pages/system-status'), 'System Status');
const SitemapPage = createLazyComponent(() => import('@client/features/sitemap/pages/sitemap'), 'Sitemap');
const SecurityPage = createLazyComponent(() => import('@client/features/legal/pages/security'), 'Security');
const UserProfile = createLazyComponent(
  () => import('@client/features/users/pages/user-account'),
  'User Account'
);
const UserDashboard = createLazyComponent(
  () => import('@client/features/users/pages/user-account'),
  'User Dashboard'
);
const AdminDashboard = createLazyComponent(
  () => import('@client/features/admin/pages/admin'),
  'Admin Dashboard'
);
const AnalyticsDashboard = createLazyComponent(
  () => import('@client/features/admin/pages/analytics-dashboard'),
  'Analytics Dashboard'
);
const NotFoundPage = createLazyComponent(() => import('@client/lib/pages/not-found'), 'Not Found');
const WorkaroundAnalysisPage = createLazyComponent(
  () => import('@client/features/analysis/pages/WorkaroundAnalysisPage'),
  'Workaround Analysis'
);
const PretextDetectionPage = createLazyComponent(
  () => import('@client/features/pretext-detection/pages/pretext-detection'),
  'Pretext Detection'
);
const FeatureFlagManager = createLazyComponent(
  () => import('@client/features/feature-flags/pages/FeatureFlagManagerPage'),
  'Feature Flag Manager'
);
const IntegrationMonitoringDashboard = createLazyComponent(
  () => import('@client/features/monitoring/pages/integration-monitoring'),
  'Integration Monitoring'
);
const ArgumentIntelligencePage = createLazyComponent(
  () => import('@client/features/argument-intelligence/pages/argument-intelligence'),
  'Argument Intelligence'
);

interface RouteConfig {
  path: string;
  element: React.ReactElement;
  protected?: boolean;
  roles?: string[];
  requireVerification?: boolean;
  preload?: boolean;
  id: string;
}

/**
 * Route loading fallback component with consistent styling
 */
 
const RouteLoadingFallback = React.memo<{ routeName?: string }>(({ routeName }) => {
  return (
    <LoadingStateManager
      type="page"
      state="loading"
      message={`Loading ${routeName || 'page'}...`}
      className="min-h-screen"
      showDetails={false}
    />
  );
});

RouteLoadingFallback.displayName = 'RouteLoadingFallback';

/**
 * Route error fallback component with recovery options
 */
 
 
const RouteErrorFallback = React.memo<{
  error: Error;
  resetErrorBoundary: () => void;
  routeName?: string;
}>(({ error, resetErrorBoundary, routeName }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to Load {routeName || 'Page'}
        </h2>
        <p className="text-gray-600 mb-4">
          There was an error loading this page. Please try again.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={resetErrorBoundary}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            type="button"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            type="button"
          >
            Go Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
            <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
});

RouteErrorFallback.displayName = 'RouteErrorFallback';

/**
 * Wrapper component for individual routes with error boundaries.
 * Memoized to prevent unnecessary re-renders when parent updates.
 */
 
 
const RouteWrapper = React.memo<{
  children: React.ReactNode;
  routeName: string;
}>(({ children, routeName }) => {
  // Memoize error handler to prevent recreation on each render
  const handleError = useCallback(
    (error: Error, errorInfo?: { componentStack?: string | null }) => {
      const componentStack = errorInfo?.componentStack;
      logger.error(
        `Route error in ${routeName}:`,
        { component: 'AppRouter' },
        {
          error: error.message,
          stack: error.stack,
          componentStack,
        }
      );
    },
    [routeName]
  );

  return (
    <ErrorBoundary
      onError={handleError}
      context={`route:${routeName}`}
      showTechnicalDetails={process.env.NODE_ENV === 'development'}
    >
      <Suspense fallback={<RouteLoadingFallback routeName={routeName} />}>{children}</Suspense>
    </ErrorBoundary>
  );
});

RouteWrapper.displayName = 'RouteWrapper';

/**
 * Route configuration with lazy loading and protection settings.
 * Defined outside component to prevent recreation on each render.
 */
const routes: RouteConfig[] = [
  // Public routes
  {
    id: 'home',
    path: '/',
    element: <HomePage />,
    preload: true,
  },
  {
    id: 'bills-portal',
    path: '/bills',
    element: <BillsPortal />,
    preload: true,
  },
  {
    id: 'bills-dashboard-legacy',
    path: '/bills/dashboard',
    element: <BillsDashboard />,
  },
  {
    id: 'bill-detail',
    path: '/bills/:id',
    element: <BillDetail />,
  },

  {
    id: 'community',
    path: '/community',
    element: <CommunityHub />,
  },
  {
    id: 'expert-verification',
    path: '/community/expert-verification',
    element: <ExpertVerificationPage />,
  },
  // Consolidated search route - main search interface
  {
    id: 'search',
    path: '/search',
    element: <UniversalSearchPage />,
    preload: true,
  },
  // Search results route - clean results display without "Intelligent Search" branding
  {
    id: 'search-results',
    path: '/results',
    element: <UniversalSearchPage />,
  },
  {
    id: 'auth',
    path: '/auth',
    element: <AuthPage />,
  },
  {
    id: 'onboarding',
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    id: 'terms',
    path: '/terms',
    element: <TermsPage />,
  },
  {
    id: 'privacy',
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    id: 'support',
    path: '/support',
    element: <SupportPage />,
  },
  {
    id: 'documentation',
    path: '/documentation',
    element: <DocumentationPage />,
  },
  {
    id: 'docs',
    path: '/docs',
    element: <DocumentationPage />,
  },
  {
    id: 'contact',
    path: '/contact',
    element: <ContactPage />,
  },
  {
    id: 'about',
    path: '/about',
    element: <AboutPage />,
  },
  {
    id: 'careers',
    path: '/careers',
    element: <CareersPage />,
  },
  {
    id: 'press',
    path: '/press',
    element: <PressPage />,
  },
  {
    id: 'blog',
    path: '/blog',
    element: <BlogPage />,
  },
  {
    id: 'cookies',
    path: '/cookies',
    element: <CookiePolicyPage />,
  },
  {
    id: 'accessibility',
    path: '/accessibility',
    element: <AccessibilityPage />,
  },
  {
    id: 'civic-education',
    path: '/civic-education',
    element: <CivicEducationPage />,
  },
  {
    id: 'analysis-tools',
    path: '/analysis',
    element: <AnalysisToolsPage />,
  },
  {
    id: 'expert-insights',
    path: '/expert',
    element: <ExpertInsightsPage />,
  },
  {
    id: 'api-access',
    path: '/api',
    element: <ApiAccessPage />,
  },
  {
    id: 'system-status',
    path: '/status',
    element: <SystemStatusPage />,
  },
  {
    id: 'sitemap',
    path: '/sitemap',
    element: <SitemapPage />,
  },
  {
    id: 'security',
    path: '/security',
    element: <SecurityPage />,
  },

  // Protected routes - require authentication
  {
    id: 'user-dashboard',
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    ),
    protected: true,
  },
  {
    id: 'user-account',
    path: '/account',
    element: (
      <ProtectedRoute>
        <UserProfile />
      </ProtectedRoute>
    ),
    protected: true,
  },

  // Verified user routes
  {
    id: 'user-settings',
    path: '/account/settings',
    element: (
      <VerifiedUserRoute>
        <UserProfile />
      </VerifiedUserRoute>
    ),
    protected: true,
    requireVerification: true,
  },

  // Admin routes
  {
    id: 'admin-dashboard',
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
    protected: true,
    roles: ['admin', 'super_admin'],
    requireVerification: true,
  },
  {
    id: 'admin-analytics',
    path: '/admin/analytics',
    element: (
      <AdminRoute>
        <AnalyticsDashboard />
      </AdminRoute>
    ),
    protected: true,
    roles: ['admin', 'super_admin'],
    requireVerification: true,
  },
  {
    id: 'admin-feature-flags',
    path: '/admin/feature-flags',
    element: (
      <AdminRoute>
        <FeatureFlagManager />
      </AdminRoute>
    ),
    protected: true,
    roles: ['admin', 'super_admin'],
    requireVerification: true,
  },
  {
    id: 'admin-monitoring',
    path: '/admin/monitoring',
    element: (
      <AdminRoute>
        <IntegrationMonitoringDashboard />
      </AdminRoute>
    ),
    protected: true,
    roles: ['admin', 'super_admin'],
    requireVerification: true,
  },

  // Workaround Analysis - Strategic Dashboard
  {
    id: 'workaround-analysis',
    path: '/workarounds',
    element: <WorkaroundAnalysisPage />,
  },

  // Pretext Detection
  {
    id: 'pretext-detection',
    path: '/pretext-detection',
    element: <PretextDetectionPage />,
  },

  // Argument Intelligence
  {
    id: 'argument-intelligence',
    path: '/bills/:billId/arguments',
    element: <ArgumentIntelligencePage />,
  },

  // Legacy redirects - preserve old links for backward compatibility
  {
    id: 'legacy-profile-redirect',
    path: '/profile',
    element: <Navigate to="/account" replace />,
  },
  {
    id: 'legacy-intelligent-search-redirect',
    path: '/IntelligentSearchPage',
    element: <Navigate to="/search" replace />,
  },
  {
    id: 'legacy-intelligent-search-redirect-alt',
    path: '/intelligent-search',
    element: <Navigate to="/search" replace />,
  },

  // Catch-all route
  {
    id: 'not-found',
    path: '*',
    element: <NotFoundPage />,
  },
];

/**
 * Map of route IDs to their import functions for preloading.
 * This allows us to trigger imports before navigation occurs.
 */
type PreloadMapEntry = () => Promise<{ default: React.ComponentType<any> }>;
const preloadMap: Record<string, PreloadMapEntry> = {
  home: () => import('@client/features/home/pages/home'),
  'bills-portal': () => import('@client/features/bills/pages/BillsPortalPage'),
  search: () => import('@client/features/search/pages/universal-search'),
};

/**
 * AppRouter component handles all application routing with lazy loading and protection.
 *
 * Performance optimizations:
 * - Memoized route configurations to prevent recreation
 * - Stable callback references using useCallback
 * - Lazy route preloading for critical paths
 * - Proper error boundary scoping per route
 *
 * Features:
 * - Lazy loading with code splitting
 * - Route-level error boundaries
 * - Protected routes with authentication/authorization
 * - Loading states for route transitions
 * - Route preloading for critical paths
 * - Comprehensive error handling
 * - Performance monitoring
 */
export function AppRouter() {
  const location = useLocation();

  // Log route changes for analytics and debugging
  useEffect(() => {
    logger.info('Route changed', {
      component: 'AppRouter',
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash]);

  // Preload critical routes on app initialization
  useEffect(() => {
    const preloadRoutes = async () => {
      const criticalRoutes = routes.filter(route => route.preload);

      for (const route of criticalRoutes) {
        const preloadFn = preloadMap[route.id];
        if (preloadFn) {
          try {
            // Trigger lazy loading for critical routes
            await preloadFn();
          } catch (err: unknown) {
            const errorObj =
              err instanceof Error
                ? { message: err.message, stack: err.stack }
                : { error: String(err) };
            logger.warn(
              `Failed to preload route ${route.id}:`,
              { component: 'AppRouter' },
              errorObj
            );
          }
        }
      }
    };

    // Preload after a short delay to not block initial render
    const timeoutId = setTimeout(preloadRoutes, 1000);
    return () => clearTimeout(timeoutId);
  }, []); // Empty deps - only run once on mount

  // Memoized error handler for router-level errors
  const handleRouteError = useCallback(
    (error: Error, errorInfo?: { componentStack?: string | null }) => {
      const componentStack = errorInfo?.componentStack;
      logger.error(
        'Router error boundary caught error:',
        { component: 'AppRouter' },
        {
          error: error.message,
          stack: error.stack,
          componentStack,
          currentPath: location.pathname,
        }
      );
    },
    [location.pathname]
  );

  // Memoized fallback component for router-level errors
  // Note: This doesn't use the full ErrorFallbackProps as we're using a simpler pattern
  // We leave fallback undefined to use ErrorBoundary's default error display
  // or pass a custom component that matches ErrorFallbackProps interface

  // Memoize route elements to prevent unnecessary re-renders.
  // This is particularly important for routes with complex protection logic.
  const routeElements = useMemo(() => {
    return routes.map(route => (
      <Route
        key={route.id}
        path={route.path}
        element={<RouteWrapper routeName={route.id}>{route.element}</RouteWrapper>}
      />
    ));
  }, []); // Empty deps - routes are static

  return (
    <ErrorBoundary onError={handleRouteError}>
      <Routes>{routeElements}</Routes>
    </ErrorBoundary>
  );
}

// Remove duplicate export - keep only named export from index.ts
// export default AppRouter;
