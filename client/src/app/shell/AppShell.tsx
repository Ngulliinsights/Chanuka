import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

import { AuthProvider, useAuth } from '@client/infrastructure/auth';
import { ErrorBoundary } from '@client/infrastructure/error/components';
import { createNavigationProvider } from '@client/infrastructure/navigation/context';
import { ThemeProvider } from '@client/lib/contexts/ThemeContext';
import { Toaster } from '@client/lib/design-system';
import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';
import {
  setCurrentPath,
  addToRecentPages,
  setUserRole,
} from '@client/infrastructure/store';
import { LogoPattern } from '@client/lib/design-system/layout/LogoPattern';
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';
import { BreadcrumbNavigation } from '@client/lib/ui/navigation/BreadcrumbNavigation';
import { useBreadcrumbNavigation } from '@client/lib/ui/navigation/hooks/useBreadcrumbNavigation';
import { OfflineProvider } from '@client/lib/ui/offline';
import { logger } from '@client/lib/utils/logger';

import { AnalyticsIntegration } from '../../infrastructure/analytics/AnalyticsIntegration';
import { NavigationConsistency } from '../../infrastructure/navigation/NavigationConsistency';
import { NavigationPerformance } from '../../infrastructure/navigation/NavigationPerformance';

import { AppRouter } from './AppRouter';
import { BrandedFooter } from './BrandedFooter';
import { NavigationBar } from './NavigationBar';
import { SkipLinks } from './SkipLinks';

/**
 * Type definitions for better type safety and code clarity
 */
interface SkipLink {
  href: string;
  label: string;
  onClick?: () => void;
}

interface AppShellProps {
  children?: React.ReactNode;
  enableOfflineSupport?: boolean;
  enableAccessibility?: boolean;
  enableThemeProvider?: boolean;
  enableRouter?: boolean;
  enableNavigation?: boolean;
  skipLinks?: SkipLink[];
}

/**
 * Loading fallback component for Suspense boundaries
 *
 * This component displays while the application or its lazy-loaded
 * components are being loaded. It provides visual feedback to users
 * that something is happening.
 */
function AppLoadingFallback() {
  return (
    <LoadingStateManager
      type="page"
      state="loading"
      message="Loading application..."
      className="min-h-screen"
      showDetails={false}
    />
  );
}

/**
 * Default skip links for accessibility
 *
 * Skip links allow keyboard users to quickly navigate to important
 * sections of the page without tabbing through everything. These
 * are especially important for screen reader users.
 */
const defaultSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Skip to main content',
  },
  {
    href: '#navigation',
    label: 'Skip to navigation',
  },
  {
    href: '#search',
    label: 'Skip to search',
  },
];

/**
 * AppShell component provides the foundational structure for the Chanuka application
 *
 * This is the root component that wraps the entire application with essential
 * providers and functionality. Think of it as the "container" that holds
 * everything together.
 *
 * Architecture:
 * - Provider Tree: Wraps content with necessary context providers in the correct order
 * - Error Boundaries: Catches and handles errors gracefully
 * - Suspense: Handles loading states for lazy-loaded components
 * - Accessibility: Provides skip links and proper ARIA attributes
 * - Routing: Integrates React Router for navigation
 * - Theme: Manages application theming
 * - Authentication: Provides auth context throughout the app
 * - Offline Support: Handles offline scenarios
 *
 * Features:
 * ✓ Complete application shell with routing
 * ✓ Error boundaries with recovery options
 * ✓ Theme provider integration
 * ✓ Authentication context
 * ✓ Accessibility provider with skip links
 * ✓ Offline support
 * ✓ Loading states
 * ✓ Responsive navigation bar
 * ✓ Toast notifications
 * ✓ Keyboard navigation patterns
 * ✓ Global error handling
 */

/**
 * NavigationWrapper - Provides navigation context inside Router
 * This component must be inside BrowserRouter to use routing hooks
 */
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  // Create NavigationProvider with proper hooks
  const NavigationProvider = useMemo(
    () => createNavigationProvider(useLocation, useNavigate, useAuth, useDeviceInfo),
    []
  );

  return <NavigationProvider>{children}</NavigationProvider>;
}

/**
 * NavigationTracker - Tracks route changes and updates navigation slice
 * This component must be inside the NavigationProvider to access navigation state
 */
function NavigationTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Initialize breadcrumb navigation
  useBreadcrumbNavigation({
    autoGenerate: true,
    updateOnRouteChange: true,
  });

  // Track route changes in navigation slice
  useEffect(() => {
    dispatch(setCurrentPath(location.pathname));

    // Add to recent pages if it's a meaningful page (not auth, etc.)
    if (
      !location.pathname.startsWith('/auth') &&
      !location.pathname.startsWith('/error') &&
      location.pathname !== '/'
    ) {
      // Generate a title from the pathname
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      const title =
        pathSegments.length > 0 && lastSegment
          ? lastSegment
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
          : 'Home';

      dispatch(
        addToRecentPages({
          path: location.pathname,
          title,
        })
      );
    }
  }, [location.pathname, dispatch]);

  // Update user role in navigation slice when auth state changes
  useEffect(() => {
    if (user?.role) {
      dispatch(setUserRole(user.role));
    } else {
      dispatch(setUserRole('public'));
    }
  }, [user?.role, dispatch]);

  return <>{children}</>;
}

export function AppShell({
  children,
  enableOfflineSupport = true,
  enableAccessibility = true,
  enableThemeProvider = true,
  enableRouter = true,
  enableNavigation = true,
  skipLinks = defaultSkipLinks,
}: AppShellProps) {
  // Track whether the shell has completed its initialization
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize the app shell and set up global error handlers
   *
   * This effect runs once on mount and sets up listeners for
   * unhandled errors and promise rejections. These are "safety nets"
   * that catch errors that slip through our error boundaries.
   */
  useEffect(() => {
    const initializeShell = () => {
      try {
        logger.info('AppShell initializing...', { component: 'AppShell' });

        /**
         * Handle unhandled promise rejections
         * These occur when a Promise is rejected but there's no .catch() handler
         */
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          logger.error(
            'Unhandled promise rejection:',
            {
              component: 'AppShell',
            },
            event.reason
          );

          // Prevent the default browser behavior (console error)
          event.preventDefault();
        };

        /**
         * Handle global errors that aren't caught by error boundaries
         * This is a last-resort error handler
         */
        const handleError = (event: ErrorEvent) => {
          logger.error(
            'Global error:',
            {
              component: 'AppShell',
            },
            event.error
          );
        };

        // Register the global error handlers
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        // Mark initialization as complete
        setIsInitialized(true);
        logger.info('AppShell initialized successfully', { component: 'AppShell' });

        // Return cleanup function to remove event listeners
        return () => {
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          window.removeEventListener('error', handleError);
        };
      } catch (error) {
        // If initialization fails, log the error but still allow the app to render
        logger.error(
          'AppShell initialization failed:',
          {
            component: 'AppShell',
          },
          error
        );
        setIsInitialized(true);
        // Return empty cleanup function
        return () => {};
      }
    };

    return initializeShell();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Error boundary handler
   *
   * This callback is invoked when the ErrorBoundary catches an error.
   * We use it to log detailed error information for debugging.
   */
  const handleError = useCallback((error: Error, errorInfo: { componentStack?: string | null }) => {
    logger.error(
      'AppShell error boundary caught error:',
      {
        component: 'AppShell',
      },
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }, []);

  /**
   * Build the core application content
   *
   * This is memoized to prevent unnecessary re-renders when props haven't changed.
   * The application content includes the layout, navigation, and main content area.
   */
  const appContent = useMemo(
    () => (
      <Suspense fallback={<AppLoadingFallback />}>
        <ErrorBoundary onError={handleError}>
          <NavigationWrapper>
            <NavigationTracker>
              <AnalyticsIntegration>
                {/* <RouteProfiler> */}
                <NavigationConsistency>
                  <NavigationPerformance>
                    {/* Skip Links for keyboard navigation accessibility */}
                    {enableAccessibility && <SkipLinks links={skipLinks} />}

                    {/* Main Application Layout */}
                    <div id="app-shell" className="min-h-screen bg-gray-50 bg-noise relative">
                      <LogoPattern opacity={0.03} scale={1.5} className="fixed inset-0 pointer-events-none" />

                      {/* Top Navigation Bar */}
                      {enableNavigation && (
                        <NavigationBar
                          showSearch={true}
                          showNotifications={true}
                          showUserMenu={true}
                        />
                      )}

                      {/* Breadcrumb Navigation */}
                      <div className="bg-white border-b border-gray-200">
                        <div className="container mx-auto px-4 py-2">
                          <BreadcrumbNavigation showHome={true} maxItems={5} className="py-2" />
                        </div>
                      </div>

                      {/* Main Content Area - The heart of the application */}
                      <main
                        id="main-content"
                        className="flex-1"
                        role="main"
                        aria-label="Main content"
                        tabIndex={-1} // Allows focus for skip links
                      >
                        {/* Either render the router (for full app) or children (for testing) */}
                        {enableRouter ? <AppRouter /> : children}
                      </main>

                      {/* Footer */}
                      <BrandedFooter />
                    </div>

                    {/* Toast notification system for user feedback */}
                    <Toaster />

                    {/* Development Monitoring Dashboard (Development Only) */}
                    {/* <DevelopmentMonitoringDashboard /> */}
                  </NavigationPerformance>
                </NavigationConsistency>
                {/* </RouteProfiler> */}
              </AnalyticsIntegration>
            </NavigationTracker>
          </NavigationWrapper>
        </ErrorBoundary>
      </Suspense>
    ),
    [enableAccessibility, enableNavigation, enableRouter, skipLinks, children, handleError]
  );

  /**
   * Build the provider tree from the inside out
   *
   * The order matters here! Providers wrap the content in a specific sequence:
   * 1. Router (outermost) - must wrap everything that uses routing
   * 2. Theme Provider - provides theme context
   * 3. Offline Provider - monitors connection status
   * 4. Auth Provider - provides authentication state
   * 5. App Content (innermost) - the actual application
   *
   * Think of it like nesting dolls - each provider wraps the one inside it.
   */
  const wrappedContent = useMemo(() => {
    let content = appContent;

    // Layer 4: Wrap with authentication provider
    // This makes auth state available throughout the app
    content = <AuthProvider>{content}</AuthProvider>;

    // Layer 3: Wrap with offline provider if enabled
    // This monitors network connectivity
    if (enableOfflineSupport) {
      content = <OfflineProvider>{content}</OfflineProvider>;
    }

    // Layer 2: Wrap with theme provider if enabled
    // This provides theme context (dark/light mode, colors, etc.)
    if (enableThemeProvider) {
      content = <ThemeProvider>{content}</ThemeProvider>;
    }

    // Layer 1: Wrap with router if enabled (outermost layer)
    // BrowserRouter must be outside everything that uses routing hooks
    if (enableRouter) {
      content = <BrowserRouter>{content}</BrowserRouter>;
    }

    return content;
  }, [appContent, enableOfflineSupport, enableThemeProvider, enableRouter]);

  /**
   * Show loading state during initialization
   *
   * This ensures we don't try to render the app before global
   * error handlers and other initialization is complete.
   */
  if (!isInitialized) {
    return <AppLoadingFallback />;
  }

  // Return the fully wrapped and initialized application
  return wrappedContent;
}

export default AppShell;
