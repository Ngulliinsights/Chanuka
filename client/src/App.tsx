import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppProviders from "./components/AppProviders";
import AppLayout from "./components/layout/app-layout";
import { AccessibilityTrigger } from "./components/accessibility/accessibility-settings-panel";
import { OfflineStatus } from "./components/offline/offline-manager";
import { LoadingStateManager } from "./components/loading/LoadingStates";
import { GlobalLoadingIndicator } from "./components/loading/GlobalLoadingIndicator";
import { Toaster } from "./components/ui/toaster";
import {
  CriticalAssetLoader,
  DevAssetLoadingDebug,
} from "./components/loading/AssetLoadingIndicator";
import PerformanceMetricsCollector from "./components/performance/PerformanceMetricsCollector";
import BrowserCompatibilityChecker from "./components/compatibility/BrowserCompatibilityChecker";
import { Suspense, useEffect } from "react";
import { lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoadingOperation } from "./core/loading/hooks";
import { logger } from "./utils/logger";
import {
  SafeLazyPages,
  SafeLazySponsorshipPages,
} from "./utils/safe-lazy-loading";
import { SimpleLazyPages, LazyPageWrapper } from "./utils/simple-lazy-pages";
import { createNavigationProvider } from "./core/navigation/context";
import { useAuth } from "./hooks/use-auth";
import { useMediaQuery } from "./hooks/use-mobile";
import { useWebVitals } from "./hooks/use-web-vitals";
import MonitoringService from "./monitoring";
import { performanceMonitor } from "./utils/performance-monitor";

// Import test page for design system verification
const DesignSystemTestPage = lazy(() => import("./pages/design-system-test"));
// Import consolidated core error management system
import {
  initializeCoreErrorHandling,
  EnhancedErrorBoundary,
} from "./core/error";

// Import security system
import { initializeSecurity } from "./security";

// Import privacy components
import { CookieConsentBanner } from "./components/privacy";

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
  const { error, isTimeout } = useLoadingOperation(
    "app-page-loading",
    {
      timeout: CONFIG.loading.pageTimeout,
      connectionAware: CONFIG.loading.connectionAware,
      showTimeoutWarning: CONFIG.loading.showTimeoutWarning,
    }
  );

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
// ROUTE DEFINITIONS
// =============================================================================

const ROUTES = [
  // Main routes
  {
    path: "/",
    element: (
      <LazyPageWrapper>
        <SimpleLazyPages.HomePage />
      </LazyPageWrapper>
    ),
    id: "home",
  },
  { path: "/dashboard", element: <SafeLazyPages.Dashboard />, id: "dashboard" },

  // Bill routes
  {
    path: "/bills",
    element: <SafeLazyPages.BillsDashboard />,
    id: "bills-dashboard",
  },
  {
    path: "/bills/:id",
    element: <SafeLazyPages.BillDetail />,
    id: "bill-detail",
  },
  {
    path: "/bills/:id/analysis",
    element: <SafeLazyPages.BillAnalysis />,
    id: "bill-analysis",
  },
  {
    path: "/bills/:id/comments",
    element: <SafeLazyPages.CommentsPage />,
    id: "bill-comments",
  },

  // Sponsorship routes
  {
    path: "/bill-sponsorship-analysis",
    element: <SafeLazyPages.BillSponsorshipAnalysis />,
    id: "sponsorship-analysis",
  },
  {
    path: "/bills/:id/sponsorship-analysis",
    element: <SafeLazyPages.BillSponsorshipAnalysis />,
    id: "bill-sponsorship-analysis",
  },
  {
    path: "/bills/:id/sponsorship-analysis/overview",
    element: <SafeLazySponsorshipPages.SponsorshipOverviewWrapper />,
    id: "sponsorship-overview",
  },
  {
    path: "/bills/:id/sponsorship-analysis/primary-sponsor",
    element: <SafeLazySponsorshipPages.PrimarySponsorWrapper />,
    id: "primary-sponsor",
  },
  {
    path: "/bills/:id/sponsorship-analysis/co-sponsors",
    element: <SafeLazySponsorshipPages.CoSponsorsWrapper />,
    id: "co-sponsors",
  },
  {
    path: "/bills/:id/sponsorship-analysis/financial-network",
    element: <SafeLazySponsorshipPages.FinancialNetworkWrapper />,
    id: "financial-network",
  },
  {
    path: "/bills/:id/sponsorship-analysis/methodology",
    element: <SafeLazySponsorshipPages.MethodologyWrapper />,
    id: "methodology",
  },

  // Community routes
  {
    path: "/community",
    element: <SafeLazyPages.CommunityInput />,
    id: "community",
  },
  {
    path: "/expert-verification",
    element: <SafeLazyPages.ExpertVerification />,
    id: "expert-verification",
  },

  // User routes
  { path: "/auth", element: <SafeLazyPages.AuthPage />, id: "auth" },
  { path: "/profile", element: <SafeLazyPages.Profile />, id: "profile" },
  {
    path: "/user-profile",
    element: <SafeLazyPages.UserProfilePage />,
    id: "user-profile",
  },
  {
    path: "/user-dashboard",
    element: <SafeLazyPages.UserDashboard />,
    id: "user-dashboard",
  },
  {
    path: "/onboarding",
    element: <SafeLazyPages.Onboarding />,
    id: "onboarding",
  },
  {
    path: "/privacy-settings",
    element: <SafeLazyPages.PrivacySettings />,
    id: "privacy-settings",
  },

  // System routes
  { path: "/search", element: <SafeLazyPages.SearchPage />, id: "search" },
  { path: "/admin", element: <SafeLazyPages.AdminPage />, id: "admin" },
  {
    path: "/admin/database",
    element: <SafeLazyPages.DatabaseManager />,
    id: "database-manager",
  },
  {
    path: "/design-system-test",
    element: <DesignSystemTestPage />,
    id: "design-system-test",
  },
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
          <EnhancedErrorBoundary
            enableRecovery={true}
            context="Routes"
          >
            <Routes>
              {ROUTES.map(({ path, element, id }) => (
                <Route
                  key={id}
                  path={path}
                  element={
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
          </EnhancedErrorBoundary>
        </Suspense>
      </AppLayout>
    </>
  );
}

// =============================================================================
// MAIN APP
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

// Web Vitals monitoring component
function WebVitalsMonitor() {
  useWebVitals({
    enabled: true,
    onAllMetrics: (metrics) => {
      if (IS_DEV) {
        logger.info("Core Web Vitals collected", undefined, metrics as Record<string, unknown>);
      }
      // In production, this could send to analytics service
      if (!IS_DEV && (window as any).gtag) {
        // Send to Google Analytics
        Object.entries(metrics).forEach(([name, value]) => {
          if (value !== undefined) {
            (window as any).gtag("event", "web_vitals", {
              event_category: "Web Vitals",
              event_label: name.toUpperCase(),
              value: Math.round(value),
              custom_map: { metric_value: value },
            });
          }
        });
      }
    },
    reportTo: IS_DEV ? undefined : "/api/analytics/web-vitals",
  });

  return null; // This component doesn't render anything
}

export default function App() {
  const queryClient = getQueryClient();

  useEffect(() => {
    // Initialize consolidated core error handling system
    initializeCoreErrorHandling({
      enableGlobalHandlers: true,
      enableRecovery: true,
      logErrors: true,
      maxErrors: 100,
      enableAnalytics: process.env.NODE_ENV === "production",
    });

    // Initialize security system
    initializeSecurity({
      enableCSP: true,
      enableCSRF: true,
      enableRateLimit: true,
      enableVulnerabilityScanning: true,
      enableInputSanitization: true,
      scanInterval: IS_DEV ? 60000 : 300000, // 1 min dev, 5 min prod
    });

    // Initialize performance monitoring (already started in main.tsx, but ensure config is set)
    performanceMonitor.updateConfig({
      enableBundleAnalysis: true,
      enableAssetOptimization: true,
      enableWebVitalsMonitoring: true,
      enableRealtimeOptimization: true,
      reportingInterval: IS_DEV ? 10000 : 30000, // More frequent in dev
      performanceBudgets: {
        loadTime: IS_DEV ? 5000 : 3000, // More lenient in dev
        bundleSize: 2 * 1024 * 1024, // 2MB
        memoryUsage: IS_DEV ? 200 * 1024 * 1024 : 100 * 1024 * 1024 // 200MB dev, 100MB prod
      }
    });

    if (IS_DEV) {
      logger.info("App initialized with unified error handling and security", {
        component: "Chanuka",
        routeCount: ROUTES.length,
        errorHandlingEnabled: true,
        coreErrorSystemEnabled: true,
        securitySystemEnabled: true,
        advancedFeaturesEnabled: true,
      });
    }
  }, []);

  return (
    <EnhancedErrorBoundary
      enableRecovery={true}
      context="App-Root"
      showTechnicalDetails={IS_DEV}
    >
      <BrowserCompatibilityChecker
        showWarnings={true}
        blockUnsupported={false}
      >
        <AppProviders queryClient={queryClient}>
          <BrowserRouter>
            <NavigationWrapper>
              <WebVitalsMonitor />
              <EnhancedErrorBoundary
                enableRecovery={true}
                context="AppContent"
              >
                <AppContent />
              </EnhancedErrorBoundary>
              <Toaster />
              <AccessibilityTrigger />
              <OfflineStatus showDetails={true} />
              <CookieConsentBanner />
              {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </NavigationWrapper>
          </BrowserRouter>
        </AppProviders>
      </BrowserCompatibilityChecker>
    </EnhancedErrorBoundary>
  );
}
