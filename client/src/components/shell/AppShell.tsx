import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '../ui/toaster';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AccessibilityProvider } from '../accessibility/accessibility-manager';
import { OfflineProvider } from '../offline/offline-manager';
import { LoadingStateManager } from '../loading/LoadingStates';
import { GlobalLoadingIndicator } from '../loading/GlobalLoadingIndicator';
import { SkipLinks } from './SkipLinks';
import { NavigationBar } from './NavigationBar';
import { AppRouter } from './AppRouter';
import { AuthProvider } from '@client/features/users/hooks/useAuth';
import { logger } from '@client/utils/logger';

interface AppShellProps {
  children?: React.ReactNode;
  enableOfflineSupport?: boolean;
  enableAccessibility?: boolean;
  enableThemeProvider?: boolean;
  enableRouter?: boolean;
  enableNavigation?: boolean;
  fallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  skipLinks?: Array<{
    href: string;
    label: string;
    onClick?: () => void;
  }>;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Default error fallback component for the AppShell
 * Provides a user-friendly error interface with recovery options
 */
function DefaultErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClearStorage = useCallback(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).finally(() => window.location.reload());
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to clear storage:', e);
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4" role="img" aria-label="Error">
            ⚠️
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Application Error
          </h1>
          <p className="text-gray-600 mb-4">
            The Chanuka platform encountered an unexpected error. Please try refreshing the page.
          </p>
          
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={resetErrorBoundary}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="button"
            >
              Try Again
            </button>
            <button
              onClick={handleReload}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              type="button"
            >
              Refresh Page
            </button>
            <button
              onClick={handleClearStorage}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              type="button"
            >
              Clear Cache & Reload
            </button>
          </div>

          {isDevelopment && (
            <div className="text-left">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
                type="button"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              
              {showDetails && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-left">
                  <p className="font-semibold mb-2">Error Message:</p>
                  <pre className="whitespace-pre-wrap text-red-600 mb-3">
                    {error.message}
                  </pre>
                  
                  {error.stack && (
                    <>
                      <p className="font-semibold mb-2">Stack Trace:</p>
                      <pre className="whitespace-pre-wrap text-gray-600 text-xs max-h-32 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading fallback component for Suspense boundaries
 */
function AppLoadingFallback() {
  return (
    <LoadingStateManager
      type="app"
      state="loading"
      message="Loading application..."
      className="min-h-screen"
      showDetails={false}
    />
  );
}

/**
 * Default skip links for the application
 */
const defaultSkipLinks = [
  {
    href: '#main-content',
    label: 'Skip to main content'
  },
  {
    href: '#navigation',
    label: 'Skip to navigation'
  },
  {
    href: '#search',
    label: 'Skip to search'
  }
];

/**
 * AppShell component provides the foundational structure for the Chanuka application
 * 
 * Features:
 * - Complete application shell with routing
 * - Error boundaries with recovery options
 * - Theme provider integration
 * - Authentication context
 * - Accessibility provider with skip links
 * - Offline support
 * - Loading states
 * - Responsive navigation bar
 * - Global loading indicators
 * - Toast notifications
 * - Keyboard navigation patterns
 */
export function AppShell({
  children,
  enableOfflineSupport = true,
  enableAccessibility = true,
  enableThemeProvider = true,
  enableRouter = true,
  enableNavigation = true,
  fallbackComponent: CustomErrorFallback,
  skipLinks = defaultSkipLinks
}: AppShellProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the app shell
  useEffect(() => {
    const initializeShell = async () => {
      try {
        // Log shell initialization
        logger.info('AppShell initializing...', { component: 'AppShell' });

        // Set up global error handlers
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          logger.error('Unhandled promise rejection:', { component: 'AppShell' }, event.reason);
        };

        const handleError = (event: ErrorEvent) => {
          logger.error('Global error:', { component: 'AppShell' }, event.error);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        // Mark as initialized
        setIsInitialized(true);
        logger.info('AppShell initialized successfully', { component: 'AppShell' });

        // Cleanup function
        return () => {
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          window.removeEventListener('error', handleError);
        };
      } catch (error) {
        logger.error('AppShell initialization failed:', { component: 'AppShell' }, error);
        setIsInitialized(true); // Still allow the app to render
      }
    };

    initializeShell();
  }, []);

  // Error boundary handler
  const handleError = useCallback((error: Error, errorInfo: { componentStack: string }) => {
    logger.error('AppShell error boundary caught error:', { component: 'AppShell' }, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }, []);

  // Show loading state during initialization
  if (!isInitialized) {
    return <AppLoadingFallback />;
  }

  // Build the application content
  const appContent = (
    <Suspense fallback={<AppLoadingFallback />}>
      <ErrorBoundary
        FallbackComponent={CustomErrorFallback || DefaultErrorFallback}
        onError={handleError}
        onReset={() => {
          // Clear any error state and reload if necessary
          logger.info('AppShell error boundary reset', { component: 'AppShell' });
        }}
      >
        {/* Skip Links for Accessibility */}
        {enableAccessibility && <SkipLinks links={skipLinks} />}

        {/* Global Loading Indicator */}
        <GlobalLoadingIndicator
          position="top-right"
          showDetails={process.env.NODE_ENV === 'development'}
          showProgress={true}
          showConnectionStatus={true}
          maxVisible={3}
        />

        {/* Application Layout */}
        <div id="app-shell" className="min-h-screen bg-gray-50">
          {/* Navigation Bar */}
          {enableNavigation && (
            <NavigationBar 
              showSearch={true}
              showNotifications={true}
              showUserMenu={true}
            />
          )}

          {/* Main Content Area */}
          <main 
            id="main-content" 
            className="flex-1"
            role="main"
            aria-label="Main content"
            tabIndex={-1}
          >
            {enableRouter ? <AppRouter /> : children}
          </main>
        </div>

        {/* Toast Notifications */}
        <Toaster />
      </ErrorBoundary>
    </Suspense>
  );

  // Build the provider tree
  let content = appContent;

  // Wrap with authentication provider
  content = (
    <AuthProvider>
      {content}
    </AuthProvider>
  );

  // Wrap with accessibility provider if enabled
  if (enableAccessibility) {
    content = (
      <AccessibilityProvider>
        {content}
      </AccessibilityProvider>
    );
  }

  // Wrap with offline provider if enabled
  if (enableOfflineSupport) {
    content = (
      <OfflineProvider>
        {content}
      </OfflineProvider>
    );
  }

  // Wrap with theme provider if enabled
  if (enableThemeProvider) {
    content = (
      <ThemeProvider>
        {content}
      </ThemeProvider>
    );
  }

  // Wrap with router if enabled
  if (enableRouter) {
    content = (
      <BrowserRouter>
        {content}
      </BrowserRouter>
    );
  }

  return content;
}

export default AppShell;