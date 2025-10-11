import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { PageErrorBoundary } from "@/components/error-handling";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ResponsiveNavigationProvider } from "@/contexts/ResponsiveNavigationContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AuthProvider } from "@/hooks/use-auth";
import AppLayout from "@/components/layout/app-layout";
import { AccessibilityProvider } from "@/components/accessibility/accessibility-manager";
import { AccessibilityTrigger } from "@/components/accessibility/accessibility-settings-panel";
import { OfflineProvider, OfflineStatus } from "@/components/offline/offline-manager";
import {
  CriticalAssetLoader,
  DevAssetLoadingDebug,
} from "@/components/loading/AssetLoadingIndicator";
import { GlobalLoadingIndicator } from "@/components/loading/GlobalLoadingIndicator";
import { LoadingStateManager } from "@/components/loading/LoadingStates";
import { SidebarDebugger } from "@/components/navigation/SidebarDebugger";
import BrowserCompatibilityChecker from "@/components/compatibility/BrowserCompatibilityChecker";
import PerformanceMetricsCollector from "@/components/performance/PerformanceMetricsCollector";
import { Suspense, useEffect } from "react";
import { useComprehensiveLoading } from "@/hooks/useComprehensiveLoading";
import {
import { logger } from '../utils/logger.js';
  SafeLazyPages,
  SafeLazySponsorshipPages,
} from "@/utils/safe-lazy-loading";

// =============================================================================
// CONFIGURATION
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
  dev: {
    showAssetDebug: true,
    showSidebarDebug: true,
    showPerformanceMetrics: true,
    metricsRefreshInterval: 30000,
  },
} as const;

const IS_DEV = process.env.NODE_ENV === "development";

// =============================================================================
// QUERY CLIENT SINGLETON
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
        },
        mutations: {
          retry: CONFIG.query.retry,
          networkMode: "online",
        },
      },
    });
  }
  return queryClientInstance;
};

// =============================================================================
// PAGE LOADER
// =============================================================================

function PageLoader() {
  const { loadingState, startLoading } = useComprehensiveLoading();

  useEffect(() => {
    startLoading("initial", {
      timeout: CONFIG.loading.pageTimeout,
      connectionAware: CONFIG.loading.connectionAware,
      showTimeoutWarning: CONFIG.loading.showTimeoutWarning,
    });
  }, [startLoading]);

  const currentState = loadingState.hasTimedOut ? "timeout" : "loading";
  const loadingMessage = loadingState.message || "Loading page...";

  return (
    <LoadingStateManager
      type="page"
      state={currentState}
      message={loadingMessage}
      error={loadingState.error ?? undefined}
      timeout={CONFIG.loading.pageTimeout}
      className="min-h-screen"
      showDetails={IS_DEV}
    />
  );
}

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

const ROUTES = [
  // Main routes
  { path: "/", element: <SafeLazyPages.HomePage />, id: "home" },
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
  { path: "*", element: <SafeLazyPages.NotFound />, id: "not-found" },
] as const;

// =============================================================================
// DEVELOPMENT TOOLS
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
      {CONFIG.dev.showSidebarDebug && <SidebarDebugger />}
      {CONFIG.dev.showPerformanceMetrics && (
        <PerformanceMetricsCollector 
          showDetails={true}
          autoRefresh={true}
          refreshInterval={CONFIG.dev.metricsRefreshInterval}
        />
      )}
    </>
  );
}

// =============================================================================
// APP CONTENT
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

      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {ROUTES.map(({ path, element, id }) => (
              <Route key={id} path={path} element={element} />
            ))}
          </Routes>
        </Suspense>
      </AppLayout>
    </>
  );
}

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  const queryClient = getQueryClient();

  useEffect(() => {
    if (IS_DEV) {
      logger.info('App initialized with', { component: 'SimpleTool' }, ROUTES.length, "routes");
    }
  }, []);

  return (
    <BrowserCompatibilityChecker showWarnings={true} blockUnsupported={false}>
      <QueryClientProvider client={queryClient}>
        <PageErrorBoundary context="page">
          <BrowserRouter>
            <OfflineProvider>
              <AccessibilityProvider>
                <LoadingProvider>
                  <AuthProvider>
                    <NavigationProvider>
                      <ResponsiveNavigationProvider>
                        <AppContent />
                        <Toaster />
                        <AccessibilityTrigger />
                        <OfflineStatus showDetails={true} />
                      </ResponsiveNavigationProvider>
                    </NavigationProvider>
                  </AuthProvider>
                </LoadingProvider>
              </AccessibilityProvider>
            </OfflineProvider>
          </BrowserRouter>
        </PageErrorBoundary>

        {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserCompatibilityChecker>
  );
}