import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  ErrorInfo,
  useMemo,
} from "react";
import { useUnifiedNavigation } from "@client/core/navigation/hooks/use-unified-navigation";
import { useNavigationPerformance } from "@client/core/navigation/hooks/use-navigation-performance";
import { useNavigationAccessibility, useNavigationKeyboardShortcuts } from "@client/core/navigation/hooks/use-navigation-accessibility";
import { DesktopSidebar } from '@client/components/navigation';
import MobileNavigation from "./mobile-navigation";
import {
  SkipLink,
  useAccessibility,
} from "../accessibility/accessibility-manager";
import {
  AppLayoutProps,
  LayoutConfig,
  LayoutError,
  LayoutRenderError,
  safeValidateLayoutConfig,
} from "./index";

// Default layout configuration with comprehensive settings
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  type: "app",
  showSidebar: true,
  showHeader: true,
  showFooter: true,
  sidebarState: "expanded",
  headerStyle: "default",
  footerStyle: "default",
  enableMobileOptimization: true,
  enableAccessibility: true,
  enablePerformanceOptimization: true,
};

// Transition timing constant for consistent animations
const TRANSITION_DURATION = 300;

const AppLayout = React.memo(function AppLayout({
  children,
  config,
  className,
  onLayoutChange,
  onError,
}: AppLayoutProps) {
  // Core navigation and state management hooks
  const { isMobile, mounted, sidebarCollapsed } = useUnifiedNavigation();
  const { announceToScreenReader } = useAccessibility();
  
  // Layout state management
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [layoutError, setLayoutError] = useState<LayoutError | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    DEFAULT_LAYOUT_CONFIG
  );

  // Performance and accessibility hooks
  const {
    startTransition,
    endTransition,
    enableGPUAcceleration,
    disableGPUAcceleration,
  } = useNavigationPerformance();

  const { announce } = useNavigationAccessibility();
  const { registerShortcut } = useNavigationKeyboardShortcuts();

  // Refs for DOM elements and stable values to prevent unnecessary re-renders
  const layoutRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const isMobileRef = useRef(isMobile);
  const previousIsMobileRef = useRef<boolean | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep mobile state ref synchronized with prop changes
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Validate and merge layout configuration when config prop changes
  useEffect(() => {
    if (!config) {
      return;
    }

    const mergedConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
    const validation = safeValidateLayoutConfig(mergedConfig);
    
    if (validation.success) {
      setLayoutConfig(validation.data);
      onLayoutChange?.(validation.data);
    } else {
      const error = new LayoutRenderError(
        `Invalid layout configuration: ${validation.error?.message}`,
        "AppLayout",
        { config, validationError: validation.error }
      );
      setLayoutError(error);
      onError?.(error);
    }
  }, [config, onLayoutChange, onError]);

  // Error handling callback with proper typing and context
  const handleLayoutError = useCallback(
    (error: Error, errorInfo?: ErrorInfo) => {
      const layoutError = new LayoutRenderError(
        error.message,
        "AppLayout",
        {
          error: error.stack,
          errorInfo,
        }
      );
      setLayoutError(layoutError);
      onError?.(layoutError);
    },
    [onError]
  );

  // Recovery function to reset layout to pristine state
  const recoverFromError = useCallback(() => {
    setLayoutError(null);
    setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
    setIsTransitioning(false);
    previousIsMobileRef.current = null;
    
    // Clear any pending transition timers to prevent memory leaks
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  // Memoized main content classes for optimal rendering performance
  const mainContentClasses = useMemo(() => {
    if (isMobile) {
      return "flex-1 flex flex-col chanuka-content-transition";
    }

    // Desktop mode adjusts margin based on sidebar state with smooth transitions
    const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-64";
    return `flex-1 flex flex-col chanuka-content-transition ${sidebarWidth}`;
  }, [isMobile, sidebarCollapsed]);

  // Keyboard navigation handler using stable ref to prevent dependency issues
  const handleLayoutKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Alt + M focuses the main content area
      if (event.altKey && event.key === "m") {
        event.preventDefault();
        mainContentRef.current?.focus();
        announceToScreenReader("Focused main content");
        return;
      }

      // Alt + N focuses navigation sidebar (desktop only)
      if (event.altKey && event.key === "n" && !isMobileRef.current) {
        event.preventDefault();
        const sidebarNav = document.querySelector(
          '[role="navigation"][aria-label="Main navigation"]'
        );
        if (sidebarNav) {
          (sidebarNav as HTMLElement).focus();
          announceToScreenReader("Focused navigation menu");
        }
        return;
      }

      // Alt + S focuses the search input if available
      if (event.altKey && event.key === "s") {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"], [role="searchbox"]'
        );
        if (searchInput) {
          (searchInput as HTMLElement).focus();
          announceToScreenReader("Focused search");
        }
      }
    },
    [announceToScreenReader]
  );

  // Handle responsive breakpoint transitions with GPU acceleration
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousMobile = previousIsMobileRef.current;
    
    // Only trigger transition when breakpoint actually changes
    if (previousMobile !== null && previousMobile !== isMobile) {
      // Start performance-optimized transition sequence
      startTransition(TRANSITION_DURATION);
      setIsTransitioning(true);

      // Announce layout change for screen reader users
      announce(`Layout changed to ${isMobile ? "mobile" : "desktop"} view`);

      // Enable GPU acceleration for smoother animations
      if (layoutRef.current) {
        enableGPUAcceleration(layoutRef.current);
      }

      // Schedule transition cleanup
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        endTransition();

        // Disable GPU acceleration to conserve resources
        if (layoutRef.current) {
          disableGPUAcceleration(layoutRef.current);
        }
        
        transitionTimerRef.current = null;
      }, TRANSITION_DURATION);

      // Cleanup function to prevent memory leaks
      return () => {
        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
          transitionTimerRef.current = null;
        }
      };
    }

    // Update reference for next comparison
    previousIsMobileRef.current = isMobile;
  }, [
    isMobile,
    mounted,
    startTransition,
    endTransition,
    enableGPUAcceleration,
    disableGPUAcceleration,
    announce,
  ]);

  // Register global keyboard shortcuts for navigation
  useEffect(() => {
    if (!registerShortcut) {
      return;
    }

    const unregisterShortcuts = [
      // Alt + M shortcut for main content
      registerShortcut(
        "m",
        () => {
          mainContentRef.current?.focus();
          announce("Focused main content");
        },
        { alt: true }
      ),

      // Alt + N shortcut for navigation menu (desktop only)
      registerShortcut(
        "n",
        () => {
          if (!isMobileRef.current) {
            const sidebarNav = document.querySelector(
              '[role="navigation"][aria-label="Main navigation"]'
            );
            if (sidebarNav) {
              (sidebarNav as HTMLElement).focus();
              announce("Focused navigation menu");
            }
          }
        },
        { alt: true }
      ),

      // Alt + S shortcut for search functionality
      registerShortcut(
        "s",
        () => {
          const searchInput = document.querySelector(
            'input[type="search"], [role="searchbox"]'
          );
          if (searchInput) {
            (searchInput as HTMLElement).focus();
            announce("Focused search");
          }
        },
        { alt: true }
      ),
    ];

    // Cleanup all registered shortcuts when component unmounts
    return () => {
      unregisterShortcuts.forEach((unregister) => unregister?.());
    };
  }, [registerShortcut, announce]);

  // Error boundary UI with recovery option
  if (layoutError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4" role="img" aria-label="Warning">
              ⚠️
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Layout Error
            </h2>
            <p className="text-gray-600 mb-4">{layoutError.message}</p>
            <button
              onClick={recoverFromError}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="button"
            >
              Recover Layout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Server-side rendering placeholder to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {layoutConfig.showSidebar && (
            <div className="hidden lg:block w-64 bg-white border-r border-gray-200 transition-all duration-300" />
          )}

          <div className="flex-1 flex flex-col">
            {layoutConfig.showHeader && isMobile && (
              <div className="lg:hidden bg-white border-b border-gray-200 h-16" />
            )}

            <main className="flex-1 min-h-screen">{children}</main>

            {layoutConfig.showFooter && (
              <footer className="bg-white border-t mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center text-gray-600">
                    <p>
                      &copy; 2024 Chanuka Platform. Promoting transparent
                      governance.
                    </p>
                  </div>
                </div>
              </footer>
            )}

            {isMobile && <div className="lg:hidden h-16 bg-white border-t" />}
          </div>
        </div>
      </div>
    );
  }

  // Main layout render with proper error handling
  try {
    return (
      <div
        ref={layoutRef}
        className={`chanuka-layout-stable min-h-screen bg-gray-50 ${
          className || ""
        }`}
        onKeyDown={handleLayoutKeyDown}
      >
        {layoutConfig.enableAccessibility && (
          <>
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <SkipLink href="#navigation">Skip to navigation</SkipLink>
            <SkipLink href="#search">Skip to search</SkipLink>
          </>
        )}

        <div className="relative chanuka-layout-transition">
          {!isMobile &&
            layoutConfig.showSidebar &&
            layoutConfig.sidebarState !== "hidden" && (
              <div className="fixed top-0 left-0 h-full z-30">
                <DesktopSidebar />
              </div>
            )}

          <div className={mainContentClasses}>
            {isMobile && layoutConfig.showHeader && (
              <div
                className={`chanuka-layout-transition ${
                  isTransitioning
                    ? "chanuka-mobile-nav-enter-active opacity-90"
                    : "opacity-100"
                }`}
              >
                <MobileNavigation />
              </div>
            )}

            <main
              ref={mainContentRef}
              id="main-content"
              className={`flex-1 overflow-auto chanuka-content-transition ${
                isMobile ? "pb-16" : "min-h-screen"
              } ${isTransitioning ? "opacity-95" : "opacity-100"}`}
              role="main"
              aria-label="Main content"
              tabIndex={-1}
            >
              <div className="w-full">{children}</div>
            </main>

            {layoutConfig.showFooter && (
              <footer
                className={`bg-white border-t mt-auto chanuka-layout-transition ${
                  isMobile ? "mb-16" : ""
                } ${
                  layoutConfig.footerStyle === "sticky" ? "sticky bottom-0" : ""
                }`}
                role="contentinfo"
                aria-label="Site footer"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center text-gray-600">
                    <p>
                      &copy; 2024 Chanuka Platform. Promoting transparent
                      governance.
                    </p>
                  </div>
                </div>
              </footer>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    handleLayoutError(error as Error);
    return null;
  }
});

export default AppLayout;