import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  ErrorInfo,
  useMemo,
} from "react";
import { useUnifiedNavigation } from "../../hooks/use-unified-navigation";
import { useNavigationPerformance } from "../../hooks/use-navigation-performance";
import {
  useNavigationAccessibility,
  useNavigationKeyboardShortcuts,
} from "../../hooks/use-navigation-accessibility";
import { DesktopSidebar } from "../navigation";
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

// Default layout configuration
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

const AppLayout = React.memo(function AppLayout({
  children,
  config,
  className,
  onLayoutChange,
  onError,
}: AppLayoutProps) {
  const { isMobile, mounted, sidebarCollapsed } = useUnifiedNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousIsMobile, setPreviousIsMobile] = useState<boolean | null>(
    null
  );
  const [layoutError, setLayoutError] = useState<LayoutError | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    DEFAULT_LAYOUT_CONFIG
  );

  // Move useAccessibility to the top with other hooks
  const { announceToScreenReader } = useAccessibility();

  // Validate and merge layout configuration
  useEffect(() => {
    if (config) {
      const validation = safeValidateLayoutConfig({
        ...DEFAULT_LAYOUT_CONFIG,
        ...config,
      });
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
    }
  }, [config, onLayoutChange, onError]);

  // Performance and accessibility hooks
  const {
    startTransition,
    endTransition,
    enableGPUAcceleration,
    disableGPUAcceleration,
  } = useNavigationPerformance();

  const { announce } = useNavigationAccessibility();

  const { registerShortcut } = useNavigationKeyboardShortcuts();

  // Refs for accessibility and performance
  const layoutRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const isMobileRef = useRef(isMobile);
  
  // Keep isMobile ref in sync
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Error recovery function
  const handleLayoutError = useCallback(
    (error: Error, errorInfo?: ErrorInfo) => {
      const layoutError = new LayoutRenderError(error.message, "AppLayout", {
        error: error.stack,
        errorInfo,
      });
      setLayoutError(layoutError);
      onError?.(layoutError);
    },
    [onError]
  );

  // Recovery function to reset layout to default state
  const recoverFromError = useCallback(() => {
    setLayoutError(null);
    setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
    setIsTransitioning(false);
    setPreviousIsMobile(null);
  }, []);

  // Performance optimization: Memoize main content classes
  const mainContentClasses = useMemo(() => {
    if (isMobile) {
      return "flex-1 flex flex-col chanuka-content-transition";
    }

    // Desktop: adjust for sidebar width with smooth transitions
    const sidebarWidth = sidebarCollapsed ? "ml-16" : "ml-64";
    return `flex-1 flex flex-col chanuka-content-transition ${sidebarWidth}`;
  }, [isMobile, sidebarCollapsed]);

  // Accessibility: Keyboard navigation for layout - stable callback
  const handleLayoutKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Alt + M to focus main content
      if (event.altKey && event.key === "m") {
        event.preventDefault();
        mainContentRef.current?.focus();
        return;
      }

      // Alt + N to focus navigation (if not mobile)
      if (event.altKey && event.key === "n" && !isMobileRef.current) {
        event.preventDefault();
        const sidebarNav = document.querySelector(
          '[role="navigation"][aria-label="Main navigation"]'
        );
        if (sidebarNav) {
          (sidebarNav as HTMLElement).focus();
        }
        return;
      }

      // Alt + S to focus search
      if (event.altKey && event.key === "s") {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"], [role="searchbox"]'
        );
        if (searchInput) {
          (searchInput as HTMLElement).focus();
        }
      }
    },
    [] // Removed isMobile dependency since we use ref
  );

  // Stable refs for performance functions to avoid dependency issues
  const performanceFunctionsRef = useRef({
    startTransition: null as typeof startTransition,
    endTransition: null as typeof endTransition,
    enableGPUAcceleration: null as typeof enableGPUAcceleration,
    disableGPUAcceleration: null as typeof disableGPUAcceleration,
    announce: null as typeof announce
  });
  
  // Update refs when functions change - using individual dependencies to prevent circular updates
  performanceFunctionsRef.current.startTransition = startTransition;
  performanceFunctionsRef.current.endTransition = endTransition;
  performanceFunctionsRef.current.enableGPUAcceleration = enableGPUAcceleration;
  performanceFunctionsRef.current.disableGPUAcceleration = disableGPUAcceleration;
  performanceFunctionsRef.current.announce = announce;

  // Handle responsive breakpoint transitions with performance optimization
  useEffect(() => {
    if (!mounted) return;
    
    // Only trigger transition if isMobile actually changed
    if (previousIsMobile !== null && previousIsMobile !== isMobile) {
      const funcs = performanceFunctionsRef.current;
      
      // Start performance-optimized transition
      if (funcs.startTransition) funcs.startTransition(300);
      setIsTransitioning(true);

      // Announce layout change to screen readers
      if (funcs.announce) {
        funcs.announce(`Layout changed to ${isMobile ? "mobile" : "desktop"} view`);
      }

      // Enable GPU acceleration during transition
      if (layoutRef.current && funcs.enableGPUAcceleration) {
        funcs.enableGPUAcceleration(layoutRef.current);
      }

      const timer = setTimeout(() => {
        setIsTransitioning(false);
        if (funcs.endTransition) funcs.endTransition();

        // Disable GPU acceleration after transition
        if (layoutRef.current && funcs.disableGPUAcceleration) {
          funcs.disableGPUAcceleration(layoutRef.current);
        }
      }, 300);

      return () => clearTimeout(timer);
    }

    // Update previous state only after processing
    setPreviousIsMobile(isMobile);
  }, [isMobile, mounted]); // Removed previousIsMobile from dependencies to prevent loops

  // Register keyboard shortcuts for navigation - memoized to prevent re-registration
  const keyboardShortcuts = useCallback(() => {
    const funcs = performanceFunctionsRef.current;
    if (!registerShortcut || !funcs.announce) return [];
    
    return [
      // Alt + M to focus main content
      registerShortcut(
        "m",
        () => {
          mainContentRef.current?.focus();
          funcs.announce("Focused main content");
        },
        { alt: true }
      ),

      // Alt + N to focus navigation
      registerShortcut(
        "n",
        () => {
          if (!isMobileRef.current) {
            const sidebarNav = document.querySelector(
              '[role="navigation"][aria-label="Main navigation"]'
            );
            if (sidebarNav) {
              (sidebarNav as HTMLElement).focus();
              funcs.announce("Focused navigation menu");
            }
          }
        },
        { alt: true }
      ),

      // Alt + S to focus search (if available)
      registerShortcut(
        "s",
        () => {
          const searchInput = document.querySelector(
            'input[type="search"], [role="searchbox"]'
          );
          if (searchInput) {
            (searchInput as HTMLElement).focus();
            funcs.announce("Focused search");
          }
        },
        { alt: true }
      ),
    ];
  }, [registerShortcut]); // Removed isMobile dependency since we use ref

  useEffect(() => {
    const unregisterShortcuts = keyboardShortcuts();
    
    return () => {
      unregisterShortcuts.forEach((unregister) => unregister?.());
    };
  }, [keyboardShortcuts]);

  // Announce layout changes to screen readers - consolidated with transition effect
  // This is now handled in the transition effect above to prevent duplicate announcements

  // Error boundary rendering
  if (layoutError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Layout Error
            </h2>
            <p className="text-gray-600 mb-4">{layoutError.message}</p>
            <button
              onClick={recoverFromError}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              type="button"
            >
              Recover Layout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prevent layout shift during hydration with proper SSR placeholder
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* SSR Placeholder - matches expected desktop layout */}
          {layoutConfig.showSidebar && (
            <div className="hidden lg:block w-64 bg-white border-r border-gray-200 transition-all duration-300" />
          )}

          {/* Main content area with proper spacing */}
          <div className="flex-1 flex flex-col">
            {/* Mobile header placeholder */}
            {layoutConfig.showHeader && isMobile && (
              <div className="lg:hidden bg-white border-b border-gray-200 h-16" />
            )}

            {/* Main content */}
            <main className="flex-1 min-h-screen">{children}</main>

            {/* Footer placeholder */}
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

            {/* Mobile bottom nav placeholder */}
            {isMobile && <div className="lg:hidden h-16 bg-white border-t" />}
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div
        ref={layoutRef}
        className={`chanuka-layout-stable min-h-screen bg-gray-50 ${
          className || ""
        }`}
        onKeyDown={handleLayoutKeyDown}
      >
        {/* Skip Links for Accessibility */}
        {layoutConfig.enableAccessibility && (
          <>
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <SkipLink href="#navigation">Skip to navigation</SkipLink>
            <SkipLink href="#search">Skip to search</SkipLink>
          </>
        )}

        <div className="relative chanuka-layout-transition">
          {/* Desktop Sidebar - Fixed positioning for smooth transitions */}
          {!isMobile &&
            layoutConfig.showSidebar &&
            layoutConfig.sidebarState !== "hidden" && (
              <div className="fixed top-0 left-0 h-full z-30">
                <DesktopSidebar />
              </div>
            )}

          {/* Main content area with responsive positioning */}
          <div className={mainContentClasses}>
            {/* Mobile Navigation - Only shown on mobile */}
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

            {/* Main Content with proper spacing and transitions */}
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

            {/* Footer with responsive behavior */}
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
