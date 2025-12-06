import React, {
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { BarChart3, X, Building, FileText, Search, User, Settings, ArrowLeft, Bell } from 'lucide-react';
import { cn } from "@client/lib/utils";
import {
  MobileTouchHandler,
  MobileTouchUtils,
} from '@client/utils/mobile-touch-handler';
import { Sheet, SheetContent } from "../ui/sheet";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import NavigationPreferencesDialog from "../navigation/navigation-preferences-dialog";
import QuickAccessNav from "../navigation/quick-access-nav";
import {
  ResponsiveLayoutProvider,
  useResponsiveLayoutContext,
  TouchButton,
} from "../mobile/__archive__/responsive-layout-manager";
import {
  MobileTabBar,
  SwipeableHeader,
} from "../mobile/__archive__/mobile-navigation-enhancements";
import {
  MobileNavigationProps,
  NavigationItem as LayoutNavigationItem,
  LayoutError,
  LayoutRenderError,
  LayoutNavigationError,
  safeValidateNavigationItem,
} from "./index";

// Core type definitions for better type safety throughout the component
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

// Pre-defined navigation items to prevent recreation on every render
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

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  navigationItems = NAVIGATION_ITEMS,
  user,
  onLogout,
  className,
  enableSwipeGestures = true,
  enableTouchOptimization = true,
}) => {
  // Internal state management for when component is used in uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [navigationError, setNavigationError] = useState<LayoutError | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine whether to use controlled or uncontrolled open state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  // Stable function for managing state changes with transition handling to prevent rapid toggling
  const setIsOpen = useCallback((open: boolean) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (controlledIsOpen !== undefined) {
      if (!open) onClose?.();
    } else {
      setInternalIsOpen(open);
    }
    
    // Clear transition lock after animation completes (300ms matches CSS transition)
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [controlledIsOpen, onClose, isTransitioning]);

  // Validate all navigation items on mount and when they change
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

  // Function to recover from errors and reset component state
  const recoverFromError = useCallback(() => {
    setNavigationError(null);
    setIsTransitioning(false);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsOpen(false);
  }, [setIsOpen]);

  // Clean up transition timeout when component unmounts
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Memoized user fetch function to avoid unnecessary API calls
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

  // Query for user data with caching and retry logic
  const { data: fetchedUser } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !user,
  });

  const currentUser = user || fetchedUser;

  // Memoized logout handler to ensure stable function reference
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

  // Render error state with recovery option if navigation encounters an error
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
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            type="button"
          >
            Recover
          </button>
        </div>
      </div>
    );
  }

  // Wrap content in error boundary with try-catch
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

  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const contentTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable close handler with transition management
  const handleSheetClose = useCallback(() => {
    if (isContentTransitioning) return;
    
    setIsContentTransitioning(true);
    if (onClose) {
      onClose();
    }
    
    if (contentTransitionTimeoutRef.current) {
      clearTimeout(contentTransitionTimeoutRef.current);
    }
    contentTransitionTimeoutRef.current = setTimeout(() => {
      setIsContentTransitioning(false);
    }, 300);
  }, [onClose, isContentTransitioning]);

  // Stable logout handler
  const handleLogout = useCallback(() => {
    try {
      onLogout?.();
      localStorage.removeItem("token");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [onLogout]);

  // Check if a given path matches the current route
  const isActivePath = useCallback(
    (path: string): boolean => {
      if (path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  // Set up touch optimizations for better mobile UX
  useEffect(() => {
    if (!MobileTouchUtils.isTouchDevice()) return;

    const elements = [headerRef.current, bottomNavRef.current].filter(Boolean);
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach((element) => {
      if (element) {
        const cleanup = MobileTouchUtils.preventZoomOnDoubleTap(element);
        cleanupFunctions.push(cleanup);
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  // Handle swipe gestures for closing the navigation drawer
  useEffect(() => {
    if (!headerRef.current || !touchOptimized || !enableSwipeGestures) return;

    const touchHandler = new MobileTouchHandler(headerRef.current, {
      threshold: 50,
      preventScroll: false,
    });

    touchHandler.onSwipe = (swipe) => {
      if (isContentTransitioning) return;
      
      // Only handle left swipe to close when drawer is open
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

  // Bottom navigation items for the tab bar
  const bottomNavigationItems = useMemo(
    () => [
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
    ],
    []
  );

  // Navigation items for the bottom navigation bar
  const bottomNavItems = useMemo(() => NAVIGATION_ITEMS.slice(0, 4), []);

  return (
    <>
      {/* Swipeable header for mobile with actions */}
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

      {/* Side navigation drawer with all navigation options */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-80">
          <div className="flex flex-col h-full">
            {/* Header with branding and close button */}
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

            {/* User profile section when logged in */}
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

            {/* Quick access navigation shortcuts */}
            <div className="mb-4">
              <QuickAccessNav showTitle={false} maxItems={3} />
            </div>

            <Separator className="mb-4" />

            {/* Main navigation links */}
            <nav className="flex-1 space-y-2">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = isActivePath(item.href);
                const linkClassName = `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  touchOptimized ? "min-h-[44px]" : ""
                } ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                }`;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleSheetClose}
                    className={linkClassName}
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
                );
              })}

              {/* Admin-only section */}
              {user?.role === "admin" && (
                <>
                  <Separator className="my-4" />
                  <Link
                    to="/admin"
                    onClick={handleSheetClose}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActivePath("/admin")
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-label="Navigate to Admin"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Admin</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Footer with account and settings options */}
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

      {/* Bottom tab bar for quick navigation */}
      <MobileTabBar
        items={bottomNavigationItems}
        maxVisible={4}
        onItemClick={(item) => {
          window.location.href = item.href;
        }}
      />

      {/* Fixed bottom navigation bar for mobile devices */}
      <div
        ref={bottomNavRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
      >
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
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