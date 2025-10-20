import React, { useState, ReactNode, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  Search, 
  User, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { MobileTouchHandler, MobileTouchUtils } from '@/utils/mobile-touch-handler';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import NotificationCenter from '@/components/notifications/notification-center';
import NavigationPreferencesDialog from '@/components/navigation/navigation-preferences-dialog';
import QuickAccessNav from '@/components/navigation/quick-access-nav';
import { useNavigationPreferences } from '@/hooks/use-navigation-preferences';
import { 
  ResponsiveLayoutProvider, 
  useResponsiveLayoutContext, 
  TouchButton, 
  SafeAreaWrapper 
} from '@/components/mobile/responsive-layout-manager';
import { 
  MobileTabBar, 
  SwipeableHeader 
} from '@/components/mobile/mobile-navigation-enhancements';
import { 
  MobileNavigationProps,
  NavigationItem as LayoutNavigationItem,
  User as LayoutUser,
  LayoutError,
  LayoutRenderError,
  LayoutNavigationError,
  safeValidateNavigationItem
} from './index';

// Type definitions for better TypeScript safety
interface User {
  id: string;
  name: string;
  email: string;
  role: 'public' | 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
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



// Constants moved outside component to prevent recreation on every render
const NAVIGATION_ITEMS: LayoutNavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: <Home className="h-5 w-5" />
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: <FileText className="h-5 w-5" />
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: <Search className="h-5 w-5" />
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <User className="h-5 w-5" />
  }
];



const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  isOpen: controlledIsOpen,
  onClose,
  navigationItems = NAVIGATION_ITEMS,
  user,
  onLogout,
  className,
  enableSwipeGestures = true,
  enableTouchOptimization = true
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [touchOptimized, setTouchOptimized] = useState(false);
  const [navigationError, setNavigationError] = useState<LayoutError | null>(null);
  const location = useLocation();

  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledIsOpen !== undefined ? (open: boolean) => {
    if (!open) onClose?.();
  } : setInternalIsOpen;

  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);

  // Validate navigation items
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

  // Error recovery function
  const recoverFromError = useCallback(() => {
    setNavigationError(null);
    setIsOpen(false);
  }, [setIsOpen]);

  // Memoized API functions to prevent recreation on every render
  const fetchUser = useCallback(async (): Promise<User | null> => {
    if (user) return user; // Use provided user if available
    
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      
      const data: AuthResponse = await response.json();
      return data.user;
    } catch (error) {
      const navError = new LayoutNavigationError(
        'Failed to fetch user data',
        'user-fetch',
        '/api/auth/verify',
        { error: (error as Error).message }
      );
      setNavigationError(navError);
      return null;
    }
  }, [user]);

  // Optimized queries with proper error handling (only if user not provided)
  const { data: fetchedUser } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !user, // Only fetch if user not provided
  });

  const currentUser = user || fetchedUser;

  // Memoized logout handler to prevent recreation
  const handleLogout = useCallback(() => {
    try {
      onLogout?.();
      localStorage.removeItem('token');
      window.location.href = '/auth';
    } catch (error) {
      const navError = new LayoutNavigationError(
        'Logout failed',
        'logout',
        '/auth',
        { error: (error as Error).message }
      );
      setNavigationError(navError);
    }
  }, [onLogout]);

  // Memoized path checker to prevent recreation
  const isActivePath = useCallback((path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Memoized close handler for sheet
  const handleSheetClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Touch optimization effect with cleanup
  useEffect(() => {
    if (!MobileTouchUtils.isTouchDevice()) return;
    
    setTouchOptimized(true);
    
    // Optimize touch targets for both refs
    const elements = [headerRef.current, bottomNavRef.current].filter(Boolean);
    
    elements.forEach(element => {
      if (element) {
        MobileTouchUtils.preventZoomOnDoubleTap(element);
      }
    });
  }, []);

  // Swipe gesture handler with proper cleanup
  useEffect(() => {
    if (!headerRef.current || !touchOptimized) return;

    const touchHandler = new MobileTouchHandler(headerRef.current, {
      threshold: 50,
      preventScroll: false,
    });

    touchHandler.onSwipe = (swipe) => {
      if (swipe.direction === 'right' && !isOpen) {
        setIsOpen(true);
      } else if (swipe.direction === 'left' && isOpen) {
        setIsOpen(false);
      }
    };

    // Cleanup function to prevent memory leaks
    return () => {
      touchHandler.destroy();
    };
  }, [isOpen, touchOptimized]);

  // Memoized touch-optimized class name
  const touchOptimizedClass = useMemo(
    () => touchOptimized ? 'min-w-[44px] min-h-[44px]' : '',
    [touchOptimized]
  );

  // Memoized header class names
  const headerClassName = useMemo(
    () => `lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between ${
      touchOptimized ? 'min-h-[56px]' : ''
    }`,
    [touchOptimized]
  );

  // Memoized navigation items for bottom nav
  const bottomNavItems = useMemo(() => navigationItems.slice(0, 4), [navigationItems]);

  // Error boundary rendering
  if (navigationError) {
    return (
      <div className={cn("bg-red-50 border-b border-red-200 p-4", className)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-red-600 text-sm font-medium">Navigation Error</div>
            <div className="text-red-500 text-xs">{navigationError.message}</div>
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

  try {
    return (
      <ResponsiveLayoutProvider>
        <MobileNavigationContent 
          isOpen={isOpen}
          onClose={onClose}
          navigationItems={navigationItems}
          user={currentUser}
          onLogout={handleLogout}
          className={className}
          enableSwipeGestures={enableSwipeGestures}
          enableTouchOptimization={enableTouchOptimization}
        />
      </ResponsiveLayoutProvider>
    );
  } catch (error) {
    const renderError = new LayoutRenderError(
      `Mobile navigation render failed: ${(error as Error).message}`,
      'MobileNavigation'
    );
    setNavigationError(renderError);
    return null;
  }
};

const MobileNavigationContent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();

  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);

  // Memoized API functions to prevent recreation on every render
  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      
      const data: AuthResponse = await response.json();
      return data.user;
    } catch (error) {
      logger.error('Failed to fetch user:', { component: 'Chanuka' }, error);
      return null;
    }
  }, []);

  // Optimized queries with proper error handling
  const { data: user } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Memoized logout handler to prevent recreation
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    window.location.href = '/auth';
  }, []);

  // Memoized path checker to prevent recreation
  const isActivePath = useCallback((path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Memoized close handler for sheet
  const handleSheetClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Touch optimization effect with cleanup
  useEffect(() => {
    if (!MobileTouchUtils.isTouchDevice()) return;
    
    // Optimize touch targets for both refs
    const elements = [headerRef.current, bottomNavRef.current].filter(Boolean);
    
    elements.forEach(element => {
      if (element) {
        MobileTouchUtils.preventZoomOnDoubleTap(element);
      }
    });
  }, []);

  // Swipe gesture handler with proper cleanup
  useEffect(() => {
    if (!headerRef.current || !touchOptimized) return;

    const touchHandler = new MobileTouchHandler(headerRef.current, {
      threshold: 50,
      preventScroll: false,
    });

    touchHandler.onSwipe = (swipe) => {
      if (swipe.direction === 'right' && !isOpen) {
        setIsOpen(true);
      } else if (swipe.direction === 'left' && isOpen) {
        setIsOpen(false);
      }
    };

    // Cleanup function to prevent memory leaks
    return () => {
      touchHandler.destroy();
    };
  }, [isOpen, touchOptimized]);

  // Navigation items for bottom tab bar
  const navigationItems = useMemo(() => [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: <Home className="h-5 w-5" />
    },
    {
      id: 'bills',
      label: 'Bills',
      href: '/bills',
      icon: <FileText className="h-5 w-5" />
    },
    {
      id: 'search',
      label: 'Search',
      href: '/search',
      icon: <Search className="h-5 w-5" />
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: <User className="h-5 w-5" />
    }
  ], []);

  // Bottom navigation items with badge support
  const bottomNavItems = useMemo(() => NAVIGATION_ITEMS.slice(0, 4), []);

  return (
    <>
      {/* Enhanced Mobile Header with Swipe Support */}
      <SwipeableHeader
        title="Chanuka"
        leftAction={{
          icon: <Menu className="h-6 w-6" />,
          onClick: () => setIsOpen(true),
          label: "Open navigation menu"
        }}
        rightActions={[
          ...(user ? [{
            icon: <Bell className="h-5 w-5" />,
            onClick: () => {/* Handle notifications */},
            label: "Notifications"
          }] : []),
          ...(!user ? [{
            icon: <User className="h-5 w-5" />,
            onClick: () => window.location.href = '/auth',
            label: "Sign In"
          }] : [])
        ]}
        onSwipeRight={() => setIsOpen(true)}
      />

      {/* Navigation Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-80">
          <div className="flex flex-col h-full">
            {/* Header */}
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

            {/* User Info */}
            {user && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Access Navigation */}
            <div className="mb-4">
              <QuickAccessNav showTitle={false} maxItems={3} />
            </div>

            <Separator className="mb-4" />

            {/* Navigation Items */}
            <nav className="flex-1 space-y-2">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = isActivePath(item.href);
                const linkClassName = `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  touchOptimized ? 'min-h-[44px]' : ''
                } ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}

              {user?.role === 'admin' && (
                <>
                  <Separator className="my-4" />
                  <Link
                    to="/admin"
                    onClick={handleSheetClose}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActivePath('/admin')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label="Navigate to Admin"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Admin</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Footer Actions */}
            <div className="pt-4 border-t space-y-2">
              {user && (
                <Link
                  to="/profile"
                  onClick={handleSheetClose}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Navigate to Profile"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Profile</span>
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
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </TouchButton>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Enhanced Bottom Tab Bar */}
      <MobileTabBar
        items={navigationItems}
        maxVisible={4}
        onItemClick={(item) => {
          // Handle navigation
          window.location.href = item.href;
        }}
      />

      {/* Bottom Navigation for Mobile */}
      <div 
        ref={bottomNavRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
      >
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = isActivePath(item.href);
            const linkClassName = `flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              touchOptimized ? 'min-w-[44px] min-h-[44px]' : ''
            } ${
              isActive
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700 active:text-gray-800'
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
    </>
  );
};

export default MobileNavigation;
