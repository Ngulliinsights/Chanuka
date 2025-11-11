import React, { Suspense, lazy, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingStateManager } from '../loading/LoadingStates';
import { ProtectedRoute, AdminRoute, ModeratorRoute, VerifiedUserRoute } from './ProtectedRoute';
import { logger } from '../../utils/logger';

// Enhanced lazy loading with retry mechanism
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(() => 
    importFn().catch(error => {
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
              <p className="text-gray-600 mb-4">
                There was an error loading this page component.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                type="button"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      };
    })
  );
};

// Lazy-loaded page components with enhanced error handling
const HomePage = createLazyComponent(() => import('../../pages/home'), 'Home Page');
const BillsDashboard = createLazyComponent(() => import('../../pages/enhanced-bills-dashboard-page'), 'Bills Dashboard');
const BillDetail = createLazyComponent(() => import('../../pages/bill-detail'), 'Bill Detail');
const BillAnalysis = createLazyComponent(() => import('../../pages/bill-analysis'), 'Bill Analysis');
const CommunityHub = createLazyComponent(() => import('../../pages/community-input'), 'Community Hub');
const SearchPage = createLazyComponent(() => import('../../pages/search'), 'Search Page');
const AuthPage = createLazyComponent(() => import('../../pages/auth-page'), 'Authentication');
const UserProfile = createLazyComponent(() => import('../../pages/profile'), 'User Profile');
const UserDashboard = createLazyComponent(() => import('../../pages/dashboard'), 'User Dashboard');
const AdminDashboard = createLazyComponent(() => import('../../pages/admin'), 'Admin Dashboard');
const NotFoundPage = createLazyComponent(() => import('../../pages/not-found'), 'Not Found');

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
 * Route loading fallback component
 */
function RouteLoadingFallback({ routeName }: { routeName?: string }) {
  return (
    <LoadingStateManager
      type="page"
      state="loading"
      message={`Loading ${routeName || 'page'}...`}
      className="min-h-screen"
      showDetails={false}
    />
  );
}

/**
 * Route error fallback component
 */
function RouteErrorFallback({ 
  error, 
  resetErrorBoundary, 
  routeName 
}: { 
  error: Error; 
  resetErrorBoundary: () => void; 
  routeName?: string;
}) {
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
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Go Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapper component for individual routes with error boundaries
 */
function RouteWrapper({ 
  children, 
  routeName 
}: { 
  children: React.ReactNode; 
  routeName: string;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <RouteErrorFallback {...props} routeName={routeName} />
      )}
      onError={(error, errorInfo) => {
        logger.error(`Route error in ${routeName}:`, { component: 'AppRouter' }, {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <Suspense fallback={<RouteLoadingFallback routeName={routeName} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Route configuration with lazy loading and protection settings
 */
const routes: RouteConfig[] = [
  // Public routes
  {
    id: 'home',
    path: '/',
    element: <HomePage />,
    preload: true
  },
  {
    id: 'bills-dashboard',
    path: '/bills',
    element: <BillsDashboard />,
    preload: true
  },
  {
    id: 'bill-detail',
    path: '/bills/:id',
    element: <BillDetail />
  },
  {
    id: 'bill-analysis',
    path: '/bills/:id/analysis',
    element: <BillAnalysis />
  },
  {
    id: 'community',
    path: '/community',
    element: <CommunityHub />
  },
  {
    id: 'search',
    path: '/search',
    element: <SearchPage />
  },
  {
    id: 'auth',
    path: '/auth',
    element: <AuthPage />
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
    protected: true
  },
  {
    id: 'user-profile',
    path: '/profile',
    element: (
      <ProtectedRoute>
        <UserProfile />
      </ProtectedRoute>
    ),
    protected: true
  },

  // Verified user routes
  {
    id: 'user-settings',
    path: '/settings',
    element: (
      <VerifiedUserRoute>
        <UserProfile />
      </VerifiedUserRoute>
    ),
    protected: true,
    requireVerification: true
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
    requireVerification: true
  },

  // Catch-all route
  {
    id: 'not-found',
    path: '*',
    element: <NotFoundPage />
  }
];

/**
 * AppRouter component handles all application routing with lazy loading and protection
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
      hash: location.hash
    });
  }, [location]);

  // Preload critical routes on app initialization
  useEffect(() => {
    const preloadRoutes = async () => {
      const criticalRoutes = routes.filter(route => route.preload);
      
      for (const route of criticalRoutes) {
        try {
          // Trigger lazy loading for critical routes
          // This is done by accessing the component, which triggers the import
          if (route.id === 'home') {
            import('../../pages/home');
          } else if (route.id === 'bills-dashboard') {
            import('../../pages/enhanced-bills-dashboard-page');
          }
        } catch (error) {
          logger.warn(`Failed to preload route ${route.id}:`, { component: 'AppRouter' }, error);
        }
      }
    };

    // Preload after a short delay to not block initial render
    const timeoutId = setTimeout(preloadRoutes, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle route errors
  const handleRouteError = useCallback((error: Error, errorInfo: { componentStack: string }) => {
    logger.error('Router error boundary caught error:', { component: 'AppRouter' }, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      currentPath: location.pathname
    });
  }, [location.pathname]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <RouteErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
          routeName="Router" 
        />
      )}
      onError={handleRouteError}
    >
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={
              <RouteWrapper routeName={route.id}>
                {route.element}
              </RouteWrapper>
            }
          />
        ))}
      </Routes>
    </ErrorBoundary>
  );
}

export default AppRouter;