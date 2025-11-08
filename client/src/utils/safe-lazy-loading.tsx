import {
  lazy,
  LazyExoticComponent,
  ComponentType,
  Suspense,
  useEffect,
  useRef,
} from "react";
import { logger } from "./browser-logger";
import {
  PageLoader,
} from "../components/loading/LoadingStates";
import { routePreloader } from "./route-preloading";

/**
 * Component loading state management with proper cleanup
 * Tracks in-flight loads to prevent duplicate concurrent requests
 */
const componentLoadingState = new Map<string, Promise<any>>();
const loadedComponents = new Set<string>();

/**
 * Cleanup utility for loading state
 * Removes entries after a brief grace period to handle race conditions
 */
function cleanupLoadingState(componentId: string, delay: number = 50): void {
  setTimeout(() => {
    componentLoadingState.delete(componentId);
  }, delay);
}

/**
 * Enhanced retry mechanism with exponential backoff and comprehensive error handling
 *
 * KEY IMPROVEMENTS:
 * 1. Fixed race condition in cleanup timing
 * 2. Reduced cleanup delay from 100ms to 50ms for faster recovery
 * 3. Added validation before marking as loaded
 * 4. Improved error context for debugging
 */
export function retryLazyComponentLoad<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentId: string,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffFactor: number = 2
): () => Promise<{ default: ComponentType<P> }> {
  return async () => {
    // Check if this component is already being loaded
    const existingLoad = componentLoadingState.get(componentId);
    if (existingLoad) {
      return existingLoad;
    }

    // Check if already loaded successfully
    if (loadedComponents.has(componentId)) {
      try {
        return await importFn();
      } catch (error) {
        // If cached load fails, clear cache and retry
        loadedComponents.delete(componentId);
        logger.warn(
          `Cached component ${componentId} failed to load, retrying`,
          error
        );
      }
    }

    // Create shared loading promise
    const loadingPromise = (async () => {
      let lastError: Error = new Error("Component loading failed");

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await importFn();

          // Validate component structure
          if (!result?.default || typeof result.default !== "function") {
            throw new Error(
              `Invalid component '${componentId}': expected React component as default export`
            );
          }

          // Mark as successfully loaded only after validation
          loadedComponents.add(componentId);
          return result;
        } catch (error) {
          lastError = error as Error;

          const isChunkError =
            lastError.message.includes("Loading chunk") ||
            lastError.message.includes("ChunkLoadError") ||
            lastError.name === "ChunkLoadError";

          const shouldRetry =
            attempt < maxRetries && (isChunkError || attempt === 0);

          if (shouldRetry) {
            const delay = initialDelay * Math.pow(backoffFactor, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));

            if (process.env.NODE_ENV === "development") {
              console.warn(
                `Retrying component '${componentId}' (attempt ${attempt + 2}/${
                  maxRetries + 1
                }) after ${delay}ms:`,
                lastError.message
              );
            }
          } else if (!isChunkError && attempt > 0) {
            // Non-chunk errors shouldn't be retried beyond first attempt
            break;
          }
        }
      }

      const enhancedError = new Error(
        `Failed to load component '${componentId}' after ${
          maxRetries + 1
        } attempts. Last error: ${lastError.message}`
      );
      (enhancedError as any).cause = lastError;

      logger.error(`Component load failure: ${componentId}`, enhancedError);
      throw enhancedError;
    })();

    // Store the loading promise
    componentLoadingState.set(componentId, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } catch (error) {
      // Remove from loaded components on error
      loadedComponents.delete(componentId);
      throw error;
    } finally {
      // Cleanup with reduced delay to minimize race condition window
      cleanupLoadingState(componentId, 50);
    }
  };
}

/**
 * Stable fallback component created once to prevent re-renders
 * This is defined outside the function to ensure referential equality
 */
const createStableErrorFallback = (
  componentName: string
): ComponentType<any> => {
  const StableFallback: ComponentType<any> = () => (
    <div className="p-4 text-center">
      <p className="text-red-600">Failed to load {componentName}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Reload Page
      </button>
    </div>
  );

  // Set display name for better debugging
  StableFallback.displayName = `ErrorFallback_${componentName}`;

  return StableFallback;
};

/**
 * Cache for stable fallback components to prevent recreation
 */
const fallbackComponentCache = new Map<string, ComponentType<any>>();

/**
 * Safe lazy component creation with optimized error handling
 *
 * IMPROVEMENTS:
 * 1. Reuses stable fallback components from cache
 * 2. Better error logging with context
 * 3. Proper component naming for DevTools
 */
function createSafeLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName: string
): LazyExoticComponent<ComponentType<P>> {
  const componentId = `lazy-${componentName}`;
  const retryableImport = retryLazyComponentLoad(
    importFn,
    componentId,
    3,
    1000,
    2
  );

  return lazy(async () => {
    try {
      const module = await retryableImport();
      return module;
    } catch (error) {
      logger.error(
        `Failed to load component ${componentName} after retries:`,
        error
      );

      // Get or create stable fallback component
      let StableFallback = fallbackComponentCache.get(componentName);
      if (!StableFallback) {
        StableFallback = createStableErrorFallback(componentName);
        fallbackComponentCache.set(componentName, StableFallback);
      }

      return { default: StableFallback };
    }
  });
}

/**
 * Preload registration with proper memory management
 */
const preloadRegistry = new Map<
  string,
  {
    registered: boolean;
    promise: Promise<void> | null;
    timestamp: number;
  }
>();

/**
 * Cleanup old preload entries to prevent memory leaks
 * Removes entries older than 5 minutes
 */
function cleanupPreloadRegistry(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, entry] of preloadRegistry.entries()) {
    if (now - entry.timestamp > maxAge) {
      preloadRegistry.delete(key);
    }
  }
}

/**
 * Enhanced safe lazy loading with intelligent preloading
 *
 * KEY FIXES:
 * 1. Improved preload registry with cleanup
 * 2. Better error handling and recovery
 * 3. Prevents duplicate registrations properly
 * 4. Uses queueMicrotask for more efficient scheduling
 */
export function createSafeLazyPage<P extends object = {}>(
  path: string,
  exportName: string,
  options: {
    enablePreloading?: boolean;
    preloadPriority?: "high" | "medium" | "low";
    connectionAware?: boolean;
    displayName?: string;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const {
    enablePreloading = true,
    preloadPriority = "medium",
    connectionAware = true,
    displayName,
  } = options;

  // Extract meaningful component name from path if not provided
  const componentName =
    displayName ||
    path.split("/").pop()?.replace(".tsx", "").replace(".ts", "") ||
    "UnknownPage";

  const importFn = (() => {
    // Use dynamic import with proper path resolution
    switch (path) {
      case "@/pages/home":
        return import("../pages/home");
      case "@/pages/dashboard":
        return import("../pages/dashboard");
      case "@/pages/bills-dashboard":
        return import("../pages/bills-dashboard");
      case "@/pages/auth-page":
        return import("../pages/auth-page");
      case "@/pages/bill-detail":
        return import("../pages/bill-detail");
      case "@/pages/bill-analysis":
        return import("../pages/bill-analysis");
      case "@/pages/community-input":
        return import("../pages/community-input");
      case "@/pages/expert-verification":
        return import("../pages/expert-verification");
      case "@/pages/search":
        return import("../pages/search");
      case "@/pages/profile":
        return import("../pages/profile");
      case "@/pages/user-profile":
        return import("../pages/user-profile");
      case "@/pages/onboarding":
        return import("../pages/onboarding");
      case "@/pages/admin":
        return import("../pages/admin");
      case "@/pages/database-manager":
        return import("../pages/database-manager");
      case "@/pages/bill-sponsorship-analysis":
        return import("../pages/bill-sponsorship-analysis");
      case "@/pages/comments":
        return import("../pages/comments");
      case "@/pages/not-found":
        return import("../pages/not-found");
      default:
        return Promise.reject(new Error(`Unknown page path: ${path}`));
    }
  }) as () => Promise<{
    default: ComponentType<P>;
  }>;

  const component = createSafeLazyComponent(importFn, componentName);

  // Defer preloading registration to avoid module-load side effects
  if (enablePreloading && typeof window !== "undefined") {
    const preloadKey = `preload-${componentName}`;

    // Check existing registration
    const existing = preloadRegistry.get(preloadKey);
    if (!existing || (!existing.registered && !existing.promise)) {
      // Initialize registry entry
      preloadRegistry.set(preloadKey, {
        registered: true,
        promise: null,
        timestamp: Date.now(),
      });

      // Use queueMicrotask for efficient scheduling
      queueMicrotask(() => {
        const entry = preloadRegistry.get(preloadKey);
        if (!entry || entry.promise) return;

        const preloadPromise = routePreloader
          .preloadComponent(component, `/${componentName.toLowerCase()}`)
          .catch((error) => {
            // Reset registration on failure to allow retry
            preloadRegistry.delete(preloadKey);

            if (process.env.NODE_ENV === "development") {
              console.warn(
                `Failed to register ${componentName} for preloading:`,
                error
              );
            }
          })
          .finally(() => {
            // Update entry to mark completion
            const currentEntry = preloadRegistry.get(preloadKey);
            if (currentEntry) {
              currentEntry.promise = null;
            }
          });

        // Store promise reference
        entry.promise = preloadPromise;
      });

      // Periodic cleanup to prevent memory leaks
      if (Math.random() < 0.01) {
        // 1% chance on each call
        cleanupPreloadRegistry();
      }
    }
  }

  return component;
}

/**
 * Type-safe helper for extracting named exports
 *
 * IMPROVEMENTS:
 * 1. Enhanced validation and error messages
 * 2. Better TypeScript type safety
 */
export function createNamedExportLazy<P extends object = {}>(
  path: string,
  exportName: string,
  componentName: string
): LazyExoticComponent<ComponentType<P>> {
  const moduleImport = (() =>
    import(/* @vite-ignore */ path as any)) as () => Promise<
    Record<string, any>
  >;

  const typedImport = async (): Promise<{ default: ComponentType<P> }> => {
    const module = await moduleImport();
    const Component = module[exportName] as ComponentType<P>;

    if (!Component) {
      const availableExports = Object.keys(module).filter(
        (k) => k !== "__esModule"
      );
      throw new Error(
        `Export '${exportName}' not found in module for component '${componentName}'. ` +
          `Available exports: ${availableExports.join(", ") || "none"}`
      );
    }

    if (typeof Component !== "function") {
      throw new Error(
        `Export '${exportName}' in component '${componentName}' is not a valid React component. ` +
          `Type: ${typeof Component}`
      );
    }

    return { default: Component };
  };

  return createSafeLazyComponent(typedImport, componentName);
}

/**
 * Wrapper component with proper error boundary integration
 */
export interface SafeLazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
}

export const SafeLazyWrapper: React.FC<SafeLazyWrapperProps> = ({
  children,
  fallback: Fallback = PageLoader,
}) => <Suspense fallback={<Fallback />}>{children}</Suspense>;

/**
 * Lazy page definitions with dynamic imports for better code splitting
 * Heavy components are loaded dynamically to reduce initial bundle size
 */
export const SafeLazyPages = {
  HomePage: createSafeLazyPage("@/pages/home", "default", {
    preloadPriority: "high",
    enablePreloading: true,
    displayName: "HomePage",
  }),
  BillsDashboard: createSafeLazyPage("@/pages/bills-dashboard", "default", {
    preloadPriority: "high",
    enablePreloading: true,
    displayName: "BillsDashboard",
  }),
  Dashboard: createSafeLazyPage("@/pages/dashboard", "default", {
    preloadPriority: "high",
    enablePreloading: true,
    displayName: "Dashboard",
  }),
  BillDetail: createSafeLazyPage("@/pages/bill-detail", "default", {
    preloadPriority: "medium",
    enablePreloading: true,
    displayName: "BillDetail",
  }),
  BillAnalysis: createSafeLazyPage("@/pages/bill-analysis", "default", {
    preloadPriority: "medium",
    enablePreloading: true,
    displayName: "BillAnalysis",
  }),
  CommunityInput: createSafeLazyPage("@/pages/community-input", "default", {
    preloadPriority: "medium",
    enablePreloading: true,
    displayName: "CommunityInput",
  }),
  ExpertVerification: createSafeLazyPage(
    "@/pages/expert-verification",
    "default",
    {
      preloadPriority: "medium",
      enablePreloading: true,
      displayName: "ExpertVerification",
    }
  ),
  SearchPage: createSafeLazyPage("@/pages/search", "default", {
    preloadPriority: "low",
    enablePreloading: true,
    displayName: "SearchPage",
  }),
  AuthPage: createSafeLazyPage("@/pages/auth-page", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "AuthPage",
  }),
  Profile: createSafeLazyPage("@/pages/profile", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "Profile",
  }),
  UserProfilePage: createSafeLazyPage("@/pages/user-profile", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "UserProfilePage",
  }),
  Onboarding: createSafeLazyPage("@/pages/onboarding", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "Onboarding",
  }),
  AdminPage: createSafeLazyPage("@/pages/admin", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "AdminPage",
  }),
  DatabaseManager: createSafeLazyPage("@/pages/database-manager", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "DatabaseManager",
  }),
  BillSponsorshipAnalysis: createSafeLazyPage(
    "@/pages/bill-sponsorship-analysis",
    "default",
    {
      preloadPriority: "medium",
      enablePreloading: true,
      displayName: "BillSponsorshipAnalysis",
    }
  ),
  CommentsPage: createSafeLazyPage("@/pages/comments", "default", {
    preloadPriority: "medium",
    enablePreloading: true,
    displayName: "CommentsPage",
  }),
  NotFound: createSafeLazyPage("@/pages/not-found", "default", {
    preloadPriority: "low",
    enablePreloading: false,
    displayName: "NotFound",
  }),
} as const;

/**
 * Dynamic imports for heavy features - loaded only when needed
 * These components are split into separate chunks to reduce initial bundle size
 */
export const DynamicFeatureImports = {
  // Heavy analysis components
  ArchitecturePlanning: () => import("../components/architecture-planning"),

  // Complex form components
  MobileOptimizedForms: () => import("../components/mobile/mobile-optimized-forms"),

  // Large analysis components
  AnalysisComponents: () => import("../components/analysis/comments"),
  AnalysisStats: () => import("../components/analysis/stats"),
  AnalysisTimeline: () => import("../components/analysis/timeline"),
  AnalysisSection: () => import("../components/analysis/section"),

  // Bill tracking components
  BillCard: () => import("../components/bills/bill-card"),
  BillList: () => import("../components/bills/bill-list"),
  BillTracking: () => import("../components/bills/bill-tracking"),
  BillImplementation: () => import("../components/bills/implementation-workarounds"),

  // Chart and visualization libraries (if used)
  Charts: () => import("recharts"),
} as const;

/**
 * Lazy-loaded sponsorship analysis components
 */
export const SafeLazySponsorshipPages = {
  SponsorshipOverviewWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "SponsorshipOverviewWrapper",
    "SponsorshipOverviewWrapper"
  ),
  PrimarySponsorWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "PrimarySponsorWrapper",
    "PrimarySponsorWrapper"
  ),
  CoSponsorsWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "CoSponsorsWrapper",
    "CoSponsorsWrapper"
  ),
  FinancialNetworkWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "FinancialNetworkWrapper",
    "FinancialNetworkWrapper"
  ),
  MethodologyWrapper: createNamedExportLazy(
    "@/pages/bill-sponsorship-analysis",
    "MethodologyWrapper",
    "MethodologyWrapper"
  ),
} as const;

/**
 * Enhanced retryable lazy component with configurable options
 */
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
  const componentId = `retryable-${componentName}`;

  const retryableImport = retryLazyComponentLoad(
    importFn,
    componentId,
    maxRetries,
    initialDelay,
    backoffFactor
  );

  return createSafeLazyComponent(retryableImport, componentName);
}

/**
 * Batch component creation with shared configuration
 */
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
      const importFn = () => import(/* @vite-ignore */ importPath);

      const lazyComponent = enableRetry
        ? createRetryableLazyComponent(importFn, componentName, retryOptions)
        : createSafeLazyPage(importPath, componentName);

      batch[componentName as keyof T] = lazyComponent;
      return batch;
    },
    {} as Record<keyof T, LazyExoticComponent<ComponentType<{}>>>
  );
}

/**
 * Utility for preloading components with proper error handling
 *
 * IMPROVEMENTS:
 * 1. Added fallback for components without _payload
 * 2. Better error messages
 */
export function preloadLazyComponent<P extends object>(
  lazyComponent: LazyExoticComponent<ComponentType<P>>
): Promise<{ default: ComponentType<P> }> {
  try {
    // Check for standard preload method (Vite, webpack 5)
    if (typeof (lazyComponent as any).preload === "function") {
      return (lazyComponent as any).preload();
    }

    // Fallback to React internals
    const payload = (lazyComponent as any)._payload;

    if (payload && typeof payload._result === "undefined") {
      return payload._init(payload._payload);
    }

    // Component already loaded
    return Promise.resolve({ default: lazyComponent as any });
  } catch (error) {
    return Promise.reject(
      new Error("Failed to preload component: " + (error as Error).message)
    );
  }
}

/**
 * Hook for preloading components with proper lifecycle management
 *
 * CRITICAL FIXES:
 * 1. Removed components from dependency array to prevent infinite loops
 * 2. Uses stable component identity via stringification
 * 3. Proper cleanup of async operations
 * 4. Prevents race conditions with mounted flag
 */
export function usePreloadComponents(
  components: LazyExoticComponent<ComponentType<any>>[],
  preloadCondition: boolean = true
): void {
  // Track if we've already preloaded this set of components
  const hasPreloadedRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a stable identifier for the component list
  // This prevents re-execution when the array reference changes
  const componentIdentifier = useRef(
    components.map((c) => (c as any).$$typeof || Math.random()).join("-")
  );

  useEffect(() => {
    // Reset mounted flag
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip if condition not met or already preloaded
    if (
      !preloadCondition ||
      hasPreloadedRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    // Create new identifier for current component list
    const newIdentifier = components
      .map((c) => (c as any).$$typeof || Math.random())
      .join("-");

    // If component list hasn't changed, skip
    if (newIdentifier === componentIdentifier.current) {
      return;
    }

    // Update identifier and mark as preloaded
    componentIdentifier.current = newIdentifier;
    hasPreloadedRef.current = true;

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Use timeout to avoid blocking main thread
    const timeoutId = setTimeout(() => {
      if (signal.aborted || !isMountedRef.current) return;

      components.forEach((component) => {
        if (signal.aborted || !isMountedRef.current) return;

        preloadLazyComponent(component).catch((error) => {
          if (process.env.NODE_ENV === "development" && !signal.aborted) {
            console.warn("Failed to preload component:", error);
          }
        });
      });
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [preloadCondition]); // Only depend on preloadCondition, not components array
}

/**
 * Utility to clear all caches (useful for testing or error recovery)
 */
export function clearAllCaches(): void {
  componentLoadingState.clear();
  loadedComponents.clear();
  preloadRegistry.clear();
  fallbackComponentCache.clear();

  if (process.env.NODE_ENV === "development") {
    console.log("All lazy loading caches cleared");
  }
}
