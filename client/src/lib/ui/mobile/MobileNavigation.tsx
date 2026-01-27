/**
 * Unified Mobile Navigation Component
 *
 * Consolidates all mobile navigation systems into a single, configurable component.
 * Supports drawer and bottom navigation modes with swipe gestures and accessibility.
 */

import type { NavigationItem } from '@client/config';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, User, Settings, ArrowLeft, Bell } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '@client/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@client/lib/design-system';
import { useMobileNavigation } from '@client/lib/hooks/mobile/useMobileNavigation';
import { cn } from '@client/lib/utils/cn';

// Navigation modes
export type NavigationMode = 'drawer' | 'bottom' | 'both';

// User interface
export interface UserData {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
}

// Component props
export interface MobileNavigationProps {
  /** Navigation mode */
  mode?: NavigationMode;
  /** Navigation items */
  items?: NavigationItem[];
  /** User object */
  user?: UserData;
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
const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: 'BarChart3',
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: 'User',
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: 'Search',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'Settings',
  },
];

// Icon mapper
const iconMap: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  User: <User className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  Bell: <Bell className="h-5 w-5" />,
};

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

    element.addEventListener('touchend', handler, { passive: false });
    return () => element.removeEventListener('touchend', handler);
  },
};

/**
 * Unified Mobile Navigation Component
 */
export const MobileNavigation = React.memo<MobileNavigationProps>(
  ({
    mode = 'both',
    items = DEFAULT_NAVIGATION_ITEMS,
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
      queryFn: async (): Promise<UserData | null> => {
        if (currentUser) return currentUser as UserData;

        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return null;
        return response.json();
      },
      enabled: !currentUser,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });

    const activeUser = useMemo(
      () => (currentUser || fetchedUser) as UserData | undefined,
      [currentUser, fetchedUser]
    );

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

      elements.forEach(element => {
        const cleanup = TouchUtils.preventZoomOnDoubleTap(element);
        cleanupFunctions.push(cleanup);
      });

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }, []);

    // Memoized navigation items
    const visibleItems = useMemo(() => items, [items]);
    const bottomNavItems = useMemo(() => items.slice(0, 5), [items]);

    // Get icon component
    const getIcon = useCallback((iconName: string | React.ReactNode): React.ReactNode => {
      if (typeof iconName === 'string') {
        return iconMap[iconName] || null;
      }
      return iconName;
    }, []);

    // Render header
    const renderHeader = useCallback(() => {
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>
      );
    }, [showHeader, mode, openDrawer, title, onSearchClick, activeUser]);

    // Render drawer
    const renderDrawer = useCallback(() => {
      if (mode === 'bottom') return null;

      return (
        <Sheet open={isDrawerOpen} onOpenChange={open => !open && closeDrawer()}>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              <SheetHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold text-xl">C</span>
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
                  {visibleItems.map(item => {
                    const isActive = isActivePath(item.href);
                    const icon = getIcon(item.icon);

                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={closeDrawer}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                          'transition-all duration-200 min-h-[44px]',
                          'focus:outline-none focus:ring-2 focus:ring-ring',
                          item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        tabIndex={item.disabled ? -1 : 0}
                      >
                        {icon && (
                          <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
                            {icon}
                          </span>
                        )}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge !== null && (
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
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 min-h-[44px]"
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
    }, [
      mode,
      isDrawerOpen,
      closeDrawer,
      showUserProfile,
      isAuthenticated,
      activeUser,
      visibleItems,
      isActivePath,
      getIcon,
      handleLogout,
    ]);

    // Render bottom navigation
    const renderBottomNavigation = useCallback(() => {
      if (mode === 'drawer') return null;

      return (
        <nav
          ref={bottomNavRef}
          className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 z-50 pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
          role="navigation"
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around">
            {bottomNavItems.map(item => {
              const isActive = isActivePath(item.href);
              const icon = getIcon(item.icon);

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground active:text-foreground'
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="relative">
                    {icon}
                    {item.badge && Number(item.badge) > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-4 w-4 min-w-4 rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
                      >
                        {Number(item.badge) > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      );
    }, [mode, bottomNavItems, isActivePath, getIcon]);

    return (
      <div className={cn('mobile-navigation', className)}>
        {renderHeader()}
        {renderDrawer()}
        {renderBottomNavigation()}
      </div>
    );
  }
);

MobileNavigation.displayName = 'MobileNavigation';

export default MobileNavigation;
