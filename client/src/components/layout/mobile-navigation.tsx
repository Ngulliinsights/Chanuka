import { useQuery } from "@tanstack/react-query";
import { BarChart3, X, Building, FileText, Search, User, Settings, ArrowLeft, Bell } from 'lucide-react';
import React, {
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@client/lib/utils";

import {
  MobileTabBar,
  SwipeableHeader,
} from "../mobile/mobile-navigation-enhancements";
import {
  ResponsiveLayoutProvider,
  useResponsiveLayoutContext,
  TouchButton,
} from "../mobile/responsive-layout-manager";
import NavigationPreferencesDialog from "../navigation/navigation-preferences-dialog";
import QuickAccessNav from "../navigation/quick-access-nav";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { TouchTarget } from "@client/shared/design-system/components/TouchTarget";
import { ResponsiveButton } from "@client/shared/design-system/components/ResponsiveButton";
import { ResponsiveContainer } from "@client/shared/design-system/components/ResponsiveContainer";
import { navigationUtils } from "@client/utils/navigation";

import {
  MobileNavigationProps,
  NavigationItem as LayoutNavigationItem,
  LayoutError,
  LayoutRenderError,
  LayoutNavigationError,
  safeValidateNavigationItem,
} from "./index";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  role: "public" | "citizen" | "expert" | "admin" | "journalist" | "advocate";
}

interface NavigationItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface AuthResponse {
  user: User;
}

interface MobileNavigationContentProps {
  isOpen: boolean;
  onClose?: () => void;
  navigationItems: NavigationItem[];
  user?: User | null | undefined;
  onLogout: () => void;
  enableSwipeGestures: boolean;
}

interface SwipeGesture {
  direction: "left" | "right" | "up" | "down";
  distance: number;
  velocity: number;
}

// ============================================================================
// TOUCH GESTURE HANDLER
// ============================================================================

/**
 * SimpleTouchHandler manages swipe gestures on mobile devices.
 * It tracks touch start and end positions to calculate swipe direction and distance.
 */
class SimpleTouchHandler {
  private element: HTMLElement;
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private threshold: number;
  public onSwipe?: (gesture: SwipeGesture) => void;

  constructor(element: HTMLElement, options: { threshold: number; preventScroll: boolean }) {
    this.element = element;
    this.threshold = options.threshold;
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  private handleTouchStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
  }

  private handleTouchEnd(e: TouchEvent): void {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const deltaTime = Date.now() - this.startTime;

    // Only trigger swipe if horizontal movement exceeds vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.threshold) {
      const direction = deltaX > 0 ? "right" : "left";
      const velocity = Math.abs(deltaX) / Math.max(deltaTime, 1);
      
      this.onSwipe?.({
        direction,
        distance: Math.abs(deltaX),
        velocity,
      });
    }
  }

  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }
}

// ============================================================================
// TOUCH UTILITIES
// ============================================================================

/**
 * TouchUtils provides helper functions for touch interactions.
 * These utilities improve the mobile user experience by handling common touch scenarios.
 */
const TouchUtils = {
  /**
   * Detects if the current device supports touch input.
   */
  isTouchDevice: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  /**
   * Prevents accidental zooming when users double-tap on elements.
   * This is important for buttons and interactive elements on mobile devices.
   */
  preventZoomOnDoubleTap: (element: HTMLElement): (() => void) => {
    let lastTouchEnd = 0;
    
    const handler = (e: TouchEvent): void => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    element.addEventListener('touchend', handler);
    return () => element.removeEventListener('touchend', handler);
  }
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Pre-defined navigation items prevent unnecessary re-renders.
 * These items represent the main sections of the application.
 */
const NAVIGATION_ITEMS: LayoutNavigationItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: <Building className="h-5 w-5" />,
  },
  {
    id: "bills",
    label: "Bills",
    href: "/bills",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <User className="h-5 w-5" />,
  },
];

// Transition duration matches CSS animation timing
const TRANSITION_DURATION = 300;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * MobileNavigation is the main wrapper component that manages state and handles errors.
 * It supports both controlled and uncontrolled modes, allowing flexible integration.
 */
const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  navigationItems = NAVIGATION_ITEMS,
  user,
  onLogout,
  className,
  enableSwipeGestures = true,
}) => {
  // State management for uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [navigationError, setNavigationError] = useState<LayoutError | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef(null);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  /**
   * Manages state changes with transition locking to prevent rapid toggling.
   * This ensures smooth animations and prevents UI glitches.
   */
  const setIsOpen = useCallback((open: boolean) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (controlledIsOpen !== undefined) {
      if (!open) onClose?.();
    } else {
      setInternalIsOpen(open);
    }
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [controlledIsOpen, onClose, isTransitioning]);

  /**
   * Validates all navigation items on mount to catch configuration errors early.
   * This helps developers identify issues during development rather than in production.
   */
  useEffect(() => {
    for (const item of navigationItems) {
      const validation = safeValidateNavigationItem(item);
      if (!validation.success) {
        const error = new LayoutNavigationError(
          `Invalid navigation item: ${validation.error?.message}`,
          item.label,
          item.href,
          { item, validationError: validation.error }
        );
        setNavigationError(error);
        break;
      }
    }
  }, [navigationItems]);

  /**
   * Recovers from errors by resetting all state.
   * This provides a clean slate if something goes wrong.
   */
  const recoverFromError = useCallback(() => {
    setNavigationError(null);
    setIsTransitioning(false);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsOpen(false);
  }, [setIsOpen]);

  // Clean up timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Fetches user data from the API if not provided as a prop.
   * Uses memoization to prevent unnecessary API calls.
   */
  const fetchUser = useCallback(async (): Promise<User | null> => {
    if (user) return user;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;

      const data: AuthResponse = await response.json();
      return data.user;
    } catch (error) {
      const navError = new LayoutNavigationError(
        "Failed to fetch user data",
        "user-fetch",
        "/api/auth/verify",
        { error: (error as Error).message }
      );
      setNavigationError(navError);
      return null;
    }
  }, [user]);

  // Query with caching and retry logic for better reliability
  const { data: fetchedUser } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !user,
  });

  const currentUser = user || fetchedUser;

  /**
   * Handles logout by clearing authentication and redirecting.
   * Wrapped in useCallback for stable reference across renders.
   */
  const handleLogout = useCallback(() => {
    try {
      onLogout?.();
      localStorage.removeItem("token");
      window.location.href = "/auth";
    } catch (error) {
      const navError = new LayoutNavigationError(
        "Logout failed",
        "logout",
        "/auth",
        { error: (error as Error).message }
      );
      setNavigationError(navError);
    }
  }, [onLogout]);

  // Render error state with recovery option
  if (navigationError) {
    return (
      <div className={cn("bg-red-50 border-b border-red-200 p-4", className)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-red-600 text-sm font-medium">
              Navigation Error
            </div>
            <div className="text-red-500 text-xs">
              {navigationError.message}
            </div>
          </div>
          <button
            onClick={recoverFromError}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            type="button"
          >
            Recover
          </button>
        </div>
      </div>
    );
  }

  // Wrap in try-catch for runtime error handling
  try {
    return (
      <ResponsiveLayoutProvider>
        <MobileNavigationContent
          isOpen={isOpen}
          onClose={onClose}
          navigationItems={navigationItems}
          user={currentUser}
          onLogout={handleLogout}
          enableSwipeGestures={enableSwipeGestures}
        />
      </ResponsiveLayoutProvider>
    );
  } catch (error) {
    const renderError = new LayoutRenderError(
      `Mobile navigation render failed: ${(error as Error).message}`,
      "MobileNavigation"
    );
    setNavigationError(renderError);
    return null;
  }
};

// ============================================================================
// CONTENT COMPONENT
// ============================================================================

/**
 * MobileNavigationContent renders the actual navigation UI.
 * This separation keeps the main component focused on state management.
 */
const MobileNavigationContent: React.FC<MobileNavigationContentProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  enableSwipeGestures,
}) => {
  const location = useLocation();
  const { touchOptimized } = useResponsiveLayoutContext();
  const [isContentTransitioning, setIsContentTransitioning] = useState(false);

  const headerRef = useRef(null);
  const bottomNavRef = useRef(null);
  const contentTransitionTimeoutRef = useRef(null);

  /**
   * Handles sheet close with transition management.
   * Prevents multiple rapid close attempts during animation.
   */
  const handleSheetClose = useCallback(() => {
    if (isContentTransitioning) return;
    
    setIsContentTransitioning(true);
    onClose?.();
    
    if (contentTransitionTimeoutRef.current) {
      clearTimeout(contentTransitionTimeoutRef.current);
    }
    
    contentTransitionTimeoutRef.current = setTimeout(() => {
      setIsContentTransitioning(false);
    }, TRANSITION_DURATION);
  }, [onClose, isContentTransitioning]);

  /**
   * Handles logout with error handling.
   * Ensures clean state even if logout fails.
   */
  const handleLogout = useCallback(() => {
    try {
      onLogout?.();
      localStorage.removeItem("token");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [onLogout]);

  /**
   * Checks if a path matches the current route.
   * Handles both exact matches and prefix matches.
   */
  const isActivePath = useCallback(
    (path: string): boolean => {
      if (path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  /**
   * Sets up touch optimizations to improve mobile UX.
   * Prevents double-tap zoom on interactive elements.
   */
  useEffect(() => {
    if (!TouchUtils.isTouchDevice()) return;

    const elements = [headerRef.current, bottomNavRef.current].filter(Boolean) as HTMLElement[];
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach((element) => {
      const cleanup = TouchUtils.preventZoomOnDoubleTap(element);
      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  /**
   * Sets up swipe gesture handling for closing the drawer.
   * Only active when touch optimization and swipe gestures are enabled.
   */
  useEffect(() => {
    if (!headerRef.current || !touchOptimized || !enableSwipeGestures) return;

    const touchHandler = new SimpleTouchHandler(headerRef.current, {
      threshold: 50,
      preventScroll: false,
    });

    touchHandler.onSwipe = (swipe: SwipeGesture) => {
      if (isContentTransitioning) return;
      
      // Close drawer on left swipe when open
      if (swipe.direction === "left" && isOpen) {
        handleSheetClose();
      }
    };

    return () => {
      touchHandler.destroy();
    };
  }, [isOpen, touchOptimized, enableSwipeGestures, handleSheetClose, isContentTransitioning]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (contentTransitionTimeoutRef.current) {
        clearTimeout(contentTransitionTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Bottom navigation items for the tab bar.
   * Memoized to prevent recreation on every render.
   */
  const bottomNavigationItems = useMemo(
    () => NAVIGATION_ITEMS.map(item => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
    })),
    []
  );

  /**
   * Generates class names for navigation links based on active state.
   * Separated into a function for better readability.
   */
  const getNavLinkClassName = useCallback((href: string, isAdmin = false) => {
    const isActive = isActivePath(href);
    const baseClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors";
    const touchClasses = touchOptimized ? "min-h-[44px]" : "";
    
    let activeClasses: string;
    if (isAdmin) {
      activeClasses = isActive
        ? "bg-red-50 text-red-700 border border-red-200"
        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100";
    } else {
      activeClasses = isActive
        ? "bg-blue-50 text-blue-700 border border-blue-200"
        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100";
    }
    
    return `${baseClasses} ${touchClasses} ${activeClasses}`;
  }, [isActivePath, touchOptimized]);

  return (
    <>
      {/* Swipeable header for mobile navigation */}
      <SwipeableHeader
        title="Navigation"
        leftAction={{
          icon: <BarChart3 className="h-6 w-6" />,
          onClick: () => {
            // Navigation controlled by parent component
          },
          label: "Open navigation menu",
        }}
        rightActions={[
          ...(user
            ? [
                {
                  icon: <Bell className="h-5 w-5" />,
                  onClick: () => {
                    // Handle notifications
                  },
                  label: "Notifications",
                },
              ]
            : []),
          ...(!user
            ? [
                {
                  icon: <User className="h-5 w-5" />,
                  onClick: () => (window.location.href = "/auth"),
                  label: "Sign In",
                },
              ]
            : []),
        ]}
        onSwipeRight={() => {
          // Navigation controlled by parent
        }}
      />

      {/* Side drawer navigation with all options */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-80">
          <div className="flex flex-col h-full">
            {/* Header with branding */}
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-lg">Chanuka</span>
              </div>
              <TouchButton
                variant="ghost"
                size="md"
                onClick={handleSheetClose}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </TouchButton>
            </div>

            <Separator className="mb-4" />

            {/* User profile section */}
            {user && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Quick access navigation */}
            <div className="mb-4">
              <QuickAccessNav showTitle={false} maxItems={3} />
            </div>

            <Separator className="mb-4" />

            {/* Main navigation links */}
            <nav className="flex-1 space-y-2">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleSheetClose}
                  className={getNavLinkClassName(item.href)}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </Link>
              ))}

              {/* Admin section */}
              {user?.role === "admin" && (
                <>
                  <Separator className="my-4" />
                  <Link
                    to="/admin"
                    onClick={handleSheetClose}
                    className={getNavLinkClassName("/admin", true)}
                    aria-label="Navigate to Admin"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Admin</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Footer with account options */}
            <div className="pt-4 border-t space-y-2">
              {user && (
                <Link
                  to="/account"
                  onClick={handleSheetClose}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Navigate to Account"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Account</span>
                </Link>
              )}

              <NavigationPreferencesDialog
                trigger={
                  <TouchButton
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    Navigation Settings
                  </TouchButton>
                }
              />

              {user && (
                <TouchButton
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ArrowLeft className="h-5 w-5 mr-3" />
                  Sign Out
                </TouchButton>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom tab bar */}
      <MobileTabBar
        items={bottomNavigationItems}
        maxVisible={4}
        onItemClick={(item: { href: string }) => {
          window.location.href = item.href;
        }}
      />

      {/* Fixed bottom navigation bar */}
      <div
        ref={bottomNavRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
      >
        <div className="flex items-center justify-around">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = isActivePath(item.href);
            const linkClassName = `flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              touchOptimized ? "min-w-[44px] min-h-[44px]" : ""
            } ${
              isActive
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700 active:text-gray-800"
            }`;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={linkClassName}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;