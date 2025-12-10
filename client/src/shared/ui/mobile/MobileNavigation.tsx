/**
 * Unified Mobile Navigation Component
 *
 * Consolidates all mobile navigation systems into a single, configurable component.
 * Supports drawer and bottom navigation modes with swipe gestures and accessibility.
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, User, Settings, ArrowLeft, Bell } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@client/shared/design-system';
import type { NavigationItem } from '@client/config';
import { useAuth } from '@client/hooks';
import { useMobileNavigation } from '@client/hooks/mobile/useMobileNavigation';
import { cn } from '@client/lib/utils';

// Navigation modes
export type NavigationMode = 'drawer' | 'bottom' | 'both';

// Component props
export interface MobileNavigationProps {
  /** Navigation mode */
  mode?: NavigationMode;
  /** Navigation items */
  items?: NavigationItem[];
  /** User object */
  user?: Record<string, unknown>;
  /** Logout handler */
  onLogout?: () => void;
  /** Search click handler */
  onSearchClick?: () => void;
  /** Custom className */
  className?: string;
  /** Show header */
  showHeader?: boolean;
  /** Header title */
  title?: string;
  /** Show user profile in drawer */
  showUserProfile?: boolean;
}

// Default navigation items
const DEFAULT_NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: <User className="h-5 w-5" />,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Settings className="h-5 w-5" />,
  },
] as const;

// Touch utilities
const TouchUtils = {
  isTouchDevice: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

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
  },
};

/**
 * Unified Mobile Navigation Component
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  mode = 'both',
  items = DEFAULT_NAVIGATION_ITEMS as unknown as NavigationItem[],
  user,
  onLogout,
  onSearchClick,
  className,
  showHeader = true,
  title = 'Navigation',
  showUserProfile = true,
}) => {
  const location = useLocation();
  const { user: authUser, isAuthenticated } = useAuth();
  const { isDrawerOpen, openDrawer, closeDrawer } = useMobileNavigation();

  const currentUser = user || authUser;
  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);

  // Fetch user data if not provided
  const { data: fetchedUser } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      if (currentUser) return currentUser;

      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;
      return response.json();
    },
    enabled: !currentUser,
  });

  const activeUser = currentUser || fetchedUser;

  // Handle logout
  const handleLogout = useCallback(() => {
    try {
      onLogout?.();
      localStorage.removeItem('token');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [onLogout]);

  // Check if path is active
  const isActivePath = useCallback(
    (path: string): boolean => {
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );


  // Touch optimizations
  useEffect(() => {
    if (!TouchUtils.isTouchDevice()) return;

    const elements = [headerRef.current, bottomNavRef.current].filter(Boolean) as HTMLElement[];
    const cleanupFunctions: (() => void)[] = [];

    elements.forEach((element) => {
      const cleanup = TouchUtils.preventZoomOnDoubleTap(element);
      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, []);

  // Render header
  const renderHeader = () => {
    if (!showHeader || mode === 'bottom') return null;

    return (
      <header
        ref={headerRef}
        className="flex items-center justify-between p-4 border-b bg-background"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={openDrawer}
            className="h-8 w-8 p-0"
            aria-label="Open navigation menu"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {onSearchClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearchClick}
              className="h-8 w-8 p-0"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {activeUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>
    );
  };

  // Render drawer
  const renderDrawer = () => {
    if (mode === 'bottom') return null;

    return (
      <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">C</span>
                  <SheetTitle>Menu</SheetTitle>
                </div>
              </div>
            </SheetHeader>

            {showUserProfile && isAuthenticated && activeUser && (
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeUser.avatar} alt={activeUser.name || 'User'} />
                    <AvatarFallback>{activeUser.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activeUser.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto py-2">
              <div className="space-y-1 px-2">
                {items.map((item) => {
                  const isActive = isActivePath(item.href);

                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={closeDrawer}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                        'transition-all duration-200 min-h-[44px]',
                        'focus:outline-none focus:ring-2 focus:ring-ring',
                        item.disabled && 'opacity-50 cursor-not-allowed',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      tabIndex={item.disabled ? -1 : 0}
                    >
                      {item.icon && (
                        <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t p-2 space-y-2">
              {activeUser && (
                <Link
                  to="/account"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <User className="h-5 w-5" />
                  Account
                </Link>
              )}

              <Link
                to="/settings"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors min-h-[44px]"
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>

              {activeUser && (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                >
                  <ArrowLeft className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Render bottom navigation
  const renderBottomNavigation = () => {
    if (mode === 'drawer') return null;

    return (
      <div
        ref={bottomNavRef}
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 z-50 pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
      >
        <div className="flex items-center justify-around">
          {items.slice(0, 5).map((item) => {
            const isActive = isActivePath(item.href);

            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground active:text-foreground'
                )}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('mobile-navigation', className)}>
      {renderHeader()}
      {renderDrawer()}
      {renderBottomNavigation()}
    </div>
  );
};

export default MobileNavigation;