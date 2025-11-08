/**
 * Enhanced App.tsx with Unified Error Handling Integration
 * 
 * This example shows how to integrate the unified error handling system
 * into the existing App.tsx while maintaining all current functionality.
 */

import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "./components/ui/toaster";
import AppProviders from "./components/AppProviders";
import AppLayout from "./components/layout/app-layout";
import { AccessibilityTrigger } from "./components/accessibility/accessibility-settings-panel";
import { OfflineStatus } from "./components/offline/offline-manager";
import {
  CriticalAssetLoader,
  DevAssetLoadingDebug,
} from "./components/loading/AssetLoadingIndicator";
import { GlobalLoadingIndicator } from "./components/loading/GlobalLoadingIndicator";
import { LoadingStateManager } from "./components/loading/LoadingStates";
import BrowserCompatibilityChecker from "./components/compatibility/BrowserCompatibilityChecker";
import PerformanceMetricsCollector from "./components/performance/PerformanceMetricsCollector";
import { Suspense, useEffect } from "react";
import { lazy } from "react";
import { useLoadingOperation } from "./core/loading/hooks";
import { logger } from './utils/browser-logger';
import {
  SafeLazyPages,
  SafeLazySponsorshipPages,
} from "./utils/safe-lazy-loading";
import { SimpleLazyPages, LazyPageWrapper } from "./utils/simple-lazy-pages";
import { createNavigationProvider } from './core/navigation/context';
import { useAuth } from './hooks/use-auth';
import { useMediaQuery } from './hooks/use-mobile';
import { useWebVitals } from './hooks/use-web-vitals';

// Import test page for design system verification
const DesignSystemTestPage = lazy(() => import('./pages/design-system-test'));

// ============================================================================= 
// UNIFIED ERROR HANDLING INTEGRATION
// =============================================================================

// Import unified error handling components
import { 
  UnifiedErrorProvider,
  EnhancedErrorBoundary,
  initializeErrorHandling,
  useUnifiedErrorIntegration 
} from "./components/error";

// =============================================================================
// CONFIGURATION (Enhanced with Error Handling)
// =============================================================================

const CONFIG = {
  query: {
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  },
  loading: {
    pageTimeout: 15000,
    connectionAware: true,
    showTimeoutWarning: true,
  },
  // Enhanced error handling configuration
  errorHandling: {
    showToasts: true,
    showModalsForCritical: true,
    enableFeedback: process.env.NODE_ENV === 'production',
    enableRecovery: true,
    maxRecoveryAttempts: 3,
    showTechnicalDetails: process.env.NODE_ENV === 'development',
  },
  dev: {
    showAssetDebug: true,
    showSidebarDebug: true,
    showPerformanceMetrics: true,
    metricsRefreshInterval: 30000,
  },
} as const;

const IS_DEV = process.env.NODE_ENV === "development";

// =============================================================================
// QUERY CLIENT SINGLETON (Enhanced with Error Handling)
// =============================================================================

let queryClientInstance: QueryClient | null = null;

const getQueryClient = (): QueryClient => {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: CONFIG.query.retry,
          staleTime: CONFIG.query.staleTime,
          gcTime: CONFIG.query.gcTime,
          refetchOnWindowFocus: CONFIG.query.refetchOnWindowFocus,
          throwOnError: false,
          networkMode: "online",
          // Enhanced error handling for queries
          onError: (error) => {
            // Errors will be handled by the unified error handler
            // through the query error boundary or manual handling
            if (IS_DEV) {
              logger.error('Query error occurred', { error });
            }
          },
        },
        mutations: {
          retry: CONFIG.query.retry,
          networkMode: "online",
          // Enhanced error handling for mutations
          onError: (error) => {
            // Errors will be handled by the unified error handler
            if (IS_DEV) {
              logger.error('Mutation error occurred', { error });
            }
          },
        },
      },
    });
  }
  return queryClientInstance;
};

// =============================================================================
// PAGE LOADER (Enhanced with Error Handling)
// =============================================================================

function PageLoader() {
  const { isLoading, error, isTimeout } = useLoadingOperation('app-page-loading', {
    timeout: CONFIG.loading.pageTimeout,
    connectionAware: CONFIG.loading.connectionAware,
    showTimeoutWarning: CONFIG.loading.showTimeoutWarning,
  });

  const currentState = isTimeout ? "timeout" : "loading";
  const loadingMessage = error?.message || "Loading page...";

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
// ROUTE DEFINITIONS (Same as original)
// =============================================================================

const ROUTES = [
  // Main routes
  { path: "/", element: <LazyPageWrapper><SimpleLazyPages.HomePage /></LazyPageWrapper>, id: "home" },
  { path: "/dashboard", element: <SafeLazyPages.Dashboard />, id: "dashboard" },
  
  // Bill routes
  { path: "/bills", element: <SafeLazyPages.BillsDashboard />, id: "bills-dashboard" },
  { path: "/bills/:id", element: <SafeLazyPages.BillDetail />, id: "bill-detail" },
  { path: "/bills/:id/analysis", element: <SafeLazyPages.BillAnalysis />, id: "bill-analysis" },
  { path: "/bills/:id/comments", element: <SafeLazyPages.CommentsPage />, id: "bill-comments" },
  
  // Sponsorship routes
  { path: "/bill-sponsorship-analysis", element: <SafeLazyPages.BillSponsorshipAnalysis />, id: "sponsorship-analysis" },
  { path: "/bills/:id/sponsorship-analysis", element: <SafeLazyPages.BillSponsorshipAnalysis />, id: "bill-sponsorship-analysis" },
  { path: "/bills/:id/sponsorship-analysis/overview", element: <SafeLazySponsorshipPages.SponsorshipOverviewWrapper />, id: "sponsorship-overview" },
  { path: "/bills/:id/sponsorship-analysis/primary-sponsor", element: <SafeLazySponsorshipPages.PrimarySponsorWrapper />, id: "primary-sponsor" },
  { path: "/bills/:id/sponsorship-analysis/co-sponsors", element: <SafeLazySponsorshipPages.CoSponsorsWrapper />, id: "co-sponsors" },
  { path: "/bills/:id/sponsorship-analysis/financial-network", element: <SafeLazySponsorshipPages.FinancialNetworkWrapper />, id: "financial-network" },
  { path: "/bills/:id/sponsorship-analysis/methodology", element: <SafeLazySponsorshipPages.MethodologyWrapper />, id: "methodology" },
  
  // Community routes
  { path: "/community", element: <SafeLazyPages.CommunityInput />, id: "community" },
  { path: "/expert-verification", element: <SafeLazyPages.ExpertVerification />, id: "expert-verification" },
  
  // User routes
  { path: "/auth", element: <SafeLazyPages.AuthPage />, id: "auth" },
  { path: "/profile", element: <SafeLazyPages.Profile />, id: "profile" },
  { path: "/user-profile", element: <SafeLazyPages.UserProfilePage />, id: "user-profile" },
  { path: "/onboarding", element: <SafeLazyPages.Onboarding />, id: "onboarding" },
  
  // System routes
  { path: "/search", element: <SafeLazyPages.SearchPage />, id: "search" },
  { path: "/admin", element: <SafeLazyPages.AdminPage />, id: "admin" },
  { path: "/admin/database", element: <SafeLazyPages.DatabaseManager />, id: "database-manager" },
  { path: "/design-system-test", element: <DesignSystemTestPage />, id: "design-system-test" },
  { path: "*", element: <SafeLazyPages.NotFound />, id: "not-found" },
] as const;

// =============================================================================
// DEVELOPMENT TOOLS (Enhanced with Error Monitoring)
// =============================================================================

function DevelopmentTools() {
  if (!IS_DEV) return null;

  return (
    <>
      {CONFIG.dev.showAssetDebug && (
        <>
          <CriticalAssetLoader />
          <DevAssetLoadingDebug />
        </>
      )}
      {CONFIG.dev.showPerformanceMetrics && (
        <PerformanceMetricsCollector 
          showDetails={true}
          autoRefresh={true}
          refreshInterval={CONFIG.dev.metricsRefreshInterval}
        />
      )}
      {/* Error monitoring in development */}
      <ErrorMonitoringPanel />
    </>
  );
}

// Development error monitoring panel
function ErrorMonitoringPanel() {
  const { getRecentErrors, getErrorStats } = useUnifiedErrorIntegration();
  
  useEffect(() => {
    // Log error stats periodically in development
    const interval = setInterval(() => {
      const stats = getErrorStats();
      if (stats.total > 0) {
        logger.info('Error Statistics', stats);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [getErrorStats]);

  return null; // This is just for monitoring, no UI
}

// =============================================================================
// APP CONTENT (Enhanced with Error Boundaries)
// =============================================================================

function AppContent() {
  return (
    <>
      <GlobalLoadingIndicator
        position="top-right"
        showDetails={IS_DEV}
        showProgress={true}
        showConnectionStatus={true}
        maxVisible={3}
      />

      <DevelopmentTools />

      {/* Wrap AppLayout with enhanced error boundary */}
      <EnhancedErrorBoundary
        enableRecovery={CONFIG.errorHandling.enableRecovery}
        enableFeedback={CONFIG.errorHandling.enableFeedback}
        maxRecoveryAttempts={CONFIG.errorHandling.maxRecoveryAttempts}
        showTechnicalDetails={CONFIG.errorHandling.showTechnicalDetails}
        context="AppLayout"
      >
        <AppLayout>
          {/* Wrap Routes with error boundary for route-level error handling */}
          <EnhancedErrorBoundary
            enableRecovery={true}
            enableFeedback={CONFIG.errorHandling.enableFeedback}
            context="Routes"
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {ROUTES.map(({ path, element, id }) => (
                  <Route 
                    key={id} 
                    path={path} 
                    element={
                      // Wrap each route with its own error boundary for isolation
                      <EnhancedErrorBoundary
                        enableRecovery={true}
                        context={`Route-${id}`}
                      >
                        {element}
                      </EnhancedErrorBoundary>
                    } 
                  />
                ))}
              </Routes>
            </Suspense>
          </EnhancedErrorBoundary>
        </AppLayout>
      </EnhancedErrorBoundary>
    </>
  );
}

// =============================================================================
// MAIN APP (Enhanced with Unified Error Handling)
// =============================================================================

// Create NavigationProvider once to avoid infinite re-renders
const NavigationProvider = createNavigationProvider(
  useLocation,
  useNavigate,
  useAuth,
  useMediaQuery
);

// Wrapper component that provides router hooks to NavigationProvider
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  return <NavigationProvider>{children}</NavigationProvider>;
}

// Web Vitals monitoring component (Enhanced with error handling)
function WebVitalsMonitor() {
  useWebVitals({
    enabled: true,
    onAllMetrics: (metrics) => {
      if (IS_DEV) {
        logger.info('Core Web Vitals collected', metrics);
      }
      // In production, this could send to analytics service
      if (!IS_DEV && (window as any).gtag) {
        try {
          // Send to Google Analytics with error handling
          Object.entries(metrics).forEach(([name, value]) => {
            if (value !== undefined) {
              (window as any).gtag('event', 'web_vitals', {
                event_category: 'Web Vitals',
                event_label: name.toUpperCase(),
                value: Math.round(value),
                custom_map: { metric_value: value }
              });
            }
          });
        } catch (error) {
          // Handle analytics errors gracefully
          logger.warn('Failed to send web vitals to analytics', { error });
        }
      }
    },
    reportTo: IS_DEV ? undefined : '/api/analytics/web-vitals'
  });

  return null; // This component doesn't render anything
}

export default function App() {
  const queryClient = getQueryClient();

  useEffect(() => {
    // Initialize unified error handling system
    initializeErrorHandling();
    
    if (IS_DEV) {
      logger.info('App initialized with unified error handling', { 
        component: 'Chanuka', 
        routeCount: ROUTES.length,
        errorHandlingEnabled: true 
      });
    }
  }, []);

  return (
    {/* Top-level error boundary for catastrophic errors */}
    <EnhancedErrorBoundary
      enableRecovery={true}
      enableFeedback={false} // Don't show feedback for top-level errors
      maxRecoveryAttempts={1}
      showTechnicalDetails={IS_DEV}
      context="App-Root"
    >
      <BrowserCompatibilityChecker showWarnings={true} blockUnsupported={false}>
        {/* Unified Error Provider for automatic error UI integration */}
        <UnifiedErrorProvider
          showToasts={CONFIG.errorHandling.showToasts}
          showModalsForCritical={CONFIG.errorHandling.showModalsForCritical}
          enableFeedback={CONFIG.errorHandling.enableFeedback}
        >
          <AppProviders queryClient={queryClient}>
            <BrowserRouter>
              <NavigationWrapper>
                <WebVitalsMonitor />
                <AppContent />
                <Toaster />
                <AccessibilityTrigger />
                <OfflineStatus showDetails={true} />
                {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
              </NavigationWrapper>
            </BrowserRouter>
          </AppProviders>
        </UnifiedErrorProvider>
      </BrowserCompatibilityChecker>
    </EnhancedErrorBoundary>
  );
}

// =============================================================================
// USAGE EXAMPLES AND MIGRATION NOTES
// =============================================================================

/*
MIGRATION STEPS:

1. Replace the import in your main index file:
   // Old
   import App from './App';
   
   // New
   import App from './App-with-unified-errors';

2. The enhanced App provides:
   - Automatic error recovery for network issues
   - User feedback collection for critical errors
   - Comprehensive error logging and analytics
   - Graceful degradation for component failures
   - Development-time error monitoring

3. Individual components can now use unified error handling:
   
   import { useUnifiedErrorHandler, createNetworkError } from './components/error';
   
   function MyComponent() {
     const { handleError } = useUnifiedErrorHandler();
     
     const handleApiCall = async () => {
       try {
         const response = await fetch('/api/data');
         if (!response.ok) {
           createNetworkError('API call failed', { status: response.status });
           return;
         }
         // Handle success
       } catch (error) {
         handleError({
           type: ErrorType.NETWORK,
           severity: ErrorSeverity.MEDIUM,
           message: 'Network request failed',
           context: { component: 'MyComponent' },
           recoverable: true,
           retryable: true,
         });
       }
     };
   }

4. Error boundaries are now enhanced with:
   - Automatic recovery attempts
   - User feedback collection
   - Better error context and logging
   - Recovery strategy execution

5. The system provides:
   - Toast notifications for non-critical errors
   - Modal dialogs for critical errors
   - Automatic retry with exponential backoff
   - Error analytics and monitoring
   - Development-time error debugging
*/