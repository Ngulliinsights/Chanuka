import { lazy, LazyExoticComponent, ComponentType, Suspense } from "react";
import { logger } from "./browser-logger";
import {
  EnhancedErrorBoundary,
  ChunkErrorFallback,
} from "../components/error-handling";

// Safe lazy component creation with error handling and retry mechanism
function createSafeLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName: string
): LazyExoticComponent<ComponentType<P>> {
  const retryableImport = retryLazyComponentLoad(importFn, 3, 1000, 2);

  return lazy(async () => {
    try {
      const module = await retryableImport();
      return module;
    } catch (error) {
      logger.error(
        `Failed to load component ${componentName} after retries:`,
        error
      );
      // Return a fallback component
      return {
        default: (() => (
          <div className="p-4 text-center">
            <p className="text-red-600">Failed to load {componentName}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        )) as ComponentType<P>,
      };
    }
  });
}
import {
  PageLoader,
  ComponentLoader,
  ConnectionAwareLoader,
  LazyLoadPlaceholder,
} from "../components/loading/LoadingStates";
import { routePreloader } from "./route-preloading";

// Enhanced safe lazy loading function with better type inference and preloading
export function createSafeLazyPage<P extends object = {}>(
  path: string,
  pageName: string,
  options: {
    enablePreloading?: boolean;
    preloadPriority?: "high" | "medium" | "low";
    connectionAware?: boolean;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const {
    enablePreloading = true,
    preloadPriority = "medium",
    connectionAware = true,
  } = options;

  const importFn = (() =>
    /* @vite-ignore */
    import(path as any)) as () => Promise<{
    default: ComponentType<P>;
  }>;
  const component = createSafeLazyComponent(importFn, pageName);

  // Register component for preloading if enabled
  if (enablePreloading && typeof window !== "undefined") {
    // Add to preloader registry
    setTimeout(() => {
      routePreloader
        .preloadComponent(component, `/${pageName.toLowerCase()}`)
        .catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Failed to register ${pageName} for preloading:`,
              error
            );
          }
        });
    }, 0);
  }

  return component;
}

// Type-safe helper for extracting named exports as default exports
export function createNamedExportLazy<P extends object = {}>(
  path: string,
  exportName: string,
  componentName: string
): LazyExoticComponent<ComponentType<P>> {
  // This wrapper ensures proper type inference by explicitly typing the return
  const moduleImport = (() =>
    /* @vite-ignore */
    import(path as any)) as () => Promise<Record<string, any>>;
  const typedImport = async (): Promise<{ default: ComponentType<P> }> => {
    const module = await moduleImport();
    const Component = module[exportName] as ComponentType<P>;

    if (!Component) {
      throw new Error(
        `Export '${exportName}' not found in module for component '${componentName}'`
      );
    }

    return { default: Component };
  };

  return createSafeLazyComponent(typedImport, componentName);
}

// Wrapper component for lazy-loaded pages with suspense and error boundaries
export interface SafeLazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
}

export const SafeLazyWrapper: React.FC<SafeLazyWrapperProps> = ({
  children,
  fallback: Fallback = PageLoader,
}) => <Suspense fallback={<Fallback />}>{children}</Suspense>;

// Pre-configured safe lazy components for common pages with optimized preloading
export const SafeLazyPages = {
  // High priority pages - immediate preloading
  HomePage: createSafeLazyPage("@/pages/home", "HomePage", {
    preloadPriority: "high",
    enablePreloading: true,
  }),
  BillsDashboard: createSafeLazyPage(
    "@/pages/bills-dashboard",
    "BillsDashboard",
    {
      preloadPriority: "high",
      enablePreloading: true,
    }
  ),
  Dashboard: createSafeLazyPage("@/pages/dashboard", "Dashboard", {
    preloadPriority: "high",
    enablePreloading: true,
  }),

  // Medium priority pages - hover/idle preloading
  BillDetail: createSafeLazyPage("@/pages/bill-detail", "BillDetail", {
    preloadPriority: "medium",
    enablePreloading: true,
  }),
  BillAnalysis: createSafeLazyPage("@/pages/bill-analysis", "BillAnalysis", {
    preloadPriority: "medium",
    enablePreloading: true,
  }),
  CommunityInput: createSafeLazyPage(
    "@/pages/community-input",
    "CommunityInput",
    {
      preloadPriority: "medium",
      enablePreloading: true,
    }
  ),
  ExpertVerification: createSafeLazyPage(
    "@/pages/expert-verification",
    "ExpertVerification",
    {
      preloadPriority: "medium",
      enablePreloading: true,
    }
  ),

  // Low priority pages - on-demand loading
  SearchPage: createSafeLazyPage("@/pages/search", "SearchPage", {
    preloadPriority: "low",
    enablePreloading: true,
  }),
  AuthPage: createSafeLazyPage("@/pages/auth-page", "AuthPage", {
    preloadPriority: "low",
    enablePreloading: false,
  }),
  Profile: createSafeLazyPage("@/pages/profile", "Profile", {
    preloadPriority: "low",
    enablePreloading: false,
  }),
  UserProfilePage: createSafeLazyPage(
    "@/pages/user-profile",
    "UserProfilePage",
    {
      preloadPriority: "low",
      enablePreloading: false,
    }
  ),
  Onboarding: createSafeLazyPage("@/pages/onboarding", "Onboarding", {
    preloadPriority: "low",
    enablePreloading: false,
  }),

  // Admin pages - minimal preloading
  AdminPage: createSafeLazyPage("@/pages/admin", "AdminPage", {
    preloadPriority: "low",
    enablePreloading: false,
  }),
  DatabaseManager: createSafeLazyPage(
    "@/pages/database-manager",
    "DatabaseManager",
    {
      preloadPriority: "low",
      enablePreloading: false,
    }
  ),

  // Specialized pages
  BillSponsorshipAnalysis: createSafeLazyPage(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    {
      preloadPriority: "medium",
      enablePreloading: true,
    }
  ),
  CommentsPage: createSafeLazyPage("@/pages/comments", "CommentsPage", {
    preloadPriority: "medium",
    enablePreloading: true,
  }),
  NotFound: createSafeLazyPage("@/pages/not-found", "NotFound", {
    preloadPriority: "low",
    enablePreloading: false,
  }),
} as const;

// TODO: Replace with actual sponsorship analysis components
export const SafeLazySponsorshipPages = {
  SponsorshipOverviewWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    "BillSponsorshipAnalysis"
  ),
  PrimarySponsorWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    "BillSponsorshipAnalysis"
  ),
  CoSponsorsWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    "BillSponsorshipAnalysis"
  ),
  FinancialNetworkWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    "BillSponsorshipAnalysis"
  ),
  MethodologyWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "BillSponsorshipAnalysis",
    "BillSponsorshipAnalysis"
  ),
} as const;

// Enhanced retry mechanism with exponential backoff and better error handling
export function retryLazyComponentLoad<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffFactor: number = 2
): () => Promise<{ default: ComponentType<P> }> {
  return async () => {
    // Initialize lastError to handle TypeScript's control flow analysis
    let lastError: Error = new Error("Component loading failed");

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await importFn();

        // Validate that we actually got a component
        if (!result?.default || typeof result.default !== "function") {
          throw new Error(
            "Invalid component: expected a React component as default export"
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if this is a chunk loading error (network/build issue)
        const isChunkError =
          lastError.message.includes("Loading chunk") ||
          lastError.message.includes("ChunkLoadError") ||
          lastError.name === "ChunkLoadError";

        // Don't retry on the last attempt or for non-chunk errors
        if (attempt < maxRetries && (isChunkError || attempt === 0)) {
          const delay = initialDelay * Math.pow(backoffFactor, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Log retry attempts in development
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Retrying component load (attempt ${attempt + 2}/${
                maxRetries + 1
              }) after ${delay}ms:`,
              lastError.message
            );
          }
        } else if (!isChunkError && attempt > 0) {
          // Break early for non-chunk errors after first retry
          break;
        }
      }
    }

    // Enhance error message with context - compatible with older TypeScript targets
    const enhancedError = new Error(
      `Failed to load component after ${maxRetries + 1} attempts. Last error: ${
        lastError.message
      }`
    );

    // Safely add cause property for better error chaining (works with all TypeScript targets)
    (enhancedError as any).cause = lastError;

    throw enhancedError;
  };
}

// Enhanced safe lazy loading with retry mechanism and better type safety
export function createRetryableLazyComponent<P extends object = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName: string,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const { maxRetries = 3, initialDelay = 1000, backoffFactor = 2 } = options;

  const retryableImport = retryLazyComponentLoad(
    importFn,
    maxRetries,
    initialDelay,
    backoffFactor
  );

  return createSafeLazyComponent(retryableImport, componentName);
}

// Advanced factory function for creating batches of lazy components with shared configuration
export function createLazyComponentBatch<T extends Record<string, string>>(
  importMap: T,
  options: {
    enableRetry?: boolean;
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
  } = {}
): Record<keyof T, LazyExoticComponent<ComponentType<{}>>> {
  const { enableRetry = false, ...retryOptions } = options;

  return Object.entries(importMap).reduce(
    (batch, [componentName, importPath]) => {
      const importFn = () =>
        /* @vite-ignore */
        import(importPath);

      const lazyComponent = enableRetry
        ? createRetryableLazyComponent(importFn, componentName, retryOptions)
        : createSafeLazyPage(importPath, componentName);

      batch[componentName as keyof T] = lazyComponent;
      return batch;
    },
    {} as Record<keyof T, LazyExoticComponent<ComponentType<{}>>>
  );
}

// Utility for preloading components (useful for performance optimization)
export function preloadLazyComponent<P extends object>(
  lazyComponent: LazyExoticComponent<ComponentType<P>>
): Promise<{ default: ComponentType<P> }> {
  // Access the internal _payload to trigger preloading
  // This is safe because React's lazy components expose this method
  const payload = (lazyComponent as any)._payload;

  if (payload && typeof payload._result === "undefined") {
    // Component hasn't been loaded yet, trigger the load
    return payload._init(payload._payload);
  }

  // Component is already loaded or loading
  return Promise.resolve({ default: lazyComponent as any });
}

// Hook for preloading multiple components
export function usePreloadComponents(
  components: LazyExoticComponent<ComponentType<any>>[],
  preloadCondition: boolean = true
): void {
  if (preloadCondition && typeof window !== "undefined") {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      components.forEach((component) => {
        preloadLazyComponent(component).catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("Failed to preload component:", error);
          }
        });
      });
    }, 100);
  }
}
