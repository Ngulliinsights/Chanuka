/**
 * Unified Mobile Layout Component - Core Layout & Navigation
 * 
 * This component handles the primary structure and navigation patterns for mobile interfaces.
 * It provides gesture-based interactions, auto-hiding headers, bottom navigation, and 
 * pull-to-refresh functionality. The layout is touch-optimized with WCAG 2.1 Level AA compliance.
 * 
 * Key Responsibilities:
 * - Main layout structure and navigation shell
 * - Touch gesture handling (swipe, pull-to-refresh)
 * - Header with auto-hide behavior based on scroll
 * - Bottom navigation bar with active state
 * - Navigation drawer with user profile
 * - Scroll-to-top functionality
 * - Offline status indicators
 */

import {
  Menu,
  Bell,
  User,
  Home,
  FileText,
  Users,
  TrendingUp,
  Search,
  ChevronRight,
  X,
  Filter,
  Settings,
  ArrowUp,
  WifiOff
} from 'lucide-react';
import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Sheet, SheetContent } from '@client/components/ui/sheet';
import { useMediaQuery } from '@client/hooks/useMediaQuery';
import { cn } from '@client/lib/utils';
import { useAppStore, useOnlineStatus } from '@client/store/unified-state-manager';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UnifiedMobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
  showPullToRefresh?: boolean;
  onRefresh?: () => Promise<void> | void;
  showScrollToTop?: boolean;
  filterContent?: React.ReactNode;
  showFilterButton?: boolean;
  customNavigationItems?: NavigationItem[];
  onNavigationClick?: (itemId: string) => void;
}

export interface NavigationItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string | number;
  disabled?: boolean;
  requiresAuth?: boolean;
  ariaLabel?: string;
}

interface SwipeGestureConfig {
  minDistance: number;
  maxVerticalDeviation: number;
  velocityThreshold: number;
}

// ============================================================================
// Configuration Constants
// ============================================================================

const SWIPE_CONFIG: SwipeGestureConfig = {
  minDistance: 50,
  maxVerticalDeviation: 0.5,
  velocityThreshold: 0.3
};

const PULL_TO_REFRESH_CONFIG = {
  maxPullDistance: 80,
  triggerThreshold: 60,
  resistanceFactor: 0.5
} as const;

const SCROLL_CONFIG = {
  headerToggleThreshold: 10,
  scrollTopButtonThreshold: 300,
  velocitySmoothing: 0.2
} as const;

// ============================================================================
// Custom Hooks for Gesture Handling
// ============================================================================

/**
 * Hook that detects horizontal swipe gestures, primarily used for opening
 * the navigation drawer with a right swipe from the edge of the screen.
 * It tracks touch start, move, and end events to calculate swipe velocity
 * and direction, ensuring the gesture meets minimum distance and velocity
 * thresholds while remaining primarily horizontal.
 */
function useSwipeGesture(
  onSwipeRight?: () => void, 
  config: SwipeGestureConfig = SWIPE_CONFIG
) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const distanceX = touchEnd.current.x - touchStart.current.x;
    const distanceY = Math.abs(touchEnd.current.y - touchStart.current.y);
    const timeElapsed = touchEnd.current.time - touchStart.current.time;
    const velocity = Math.abs(distanceX) / Math.max(timeElapsed, 1);

    const isValidSwipe = 
      distanceX > config.minDistance && 
      distanceY < distanceX * config.maxVerticalDeviation &&
      velocity > config.velocityThreshold;

    if (isValidSwipe) {
      onSwipeRight?.();
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeRight, config]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * Hook that implements pull-to-refresh functionality with elastic resistance.
 * When the user pulls down from the top of the page, it tracks the pull distance
 * and applies a resistance factor to create a natural elastic feel. Once the pull
 * exceeds the trigger threshold, it initiates the refresh callback.
 */
function usePullToRefresh(onRefresh?: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const rawDistance = currentY - startY.current;

    if (rawDistance > 0) {
      const resistedDistance = Math.min(
        rawDistance * PULL_TO_REFRESH_CONFIG.resistanceFactor,
        PULL_TO_REFRESH_CONFIG.maxPullDistance
      );

      setIsPulling(true);
      setPullDistance(resistedDistance);

      if (resistedDistance > 5) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > PULL_TO_REFRESH_CONFIG.triggerThreshold && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [pullDistance, onRefresh, isRefreshing]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}

// ============================================================================
// Offline Status Banner
// ============================================================================

const OfflineStatusBanner = memo(function OfflineStatusBanner() {
  const { isOnline, syncStatus } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(!isOnline);

  useEffect(() => {
    setShowBanner(!isOnline);
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div 
      className="bg-orange-100 border-b border-orange-200 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 text-orange-600 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-orange-800 truncate">
            You're offline. Some features may be limited.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBanner(false)}
          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800 flex-shrink-0"
          aria-label="Dismiss offline notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {syncStatus === 'syncing' && (
        <div className="mt-2 flex items-center gap-2">
          <div 
            className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Syncing"
          />
          <span className="text-xs text-orange-700">Syncing when connection returns...</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Mobile Navigation Drawer
// ============================================================================

const MobileNavigationDrawer = memo(function MobileNavigationDrawer({
  isOpen,
  onClose,
  navigationItems,
  onNavigationClick
}: {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
  onNavigationClick?: (itemId: string) => void;
}) {
  const user = useAppStore(state => state.user.user);

  const handleItemClick = useCallback((item: NavigationItem, e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    onNavigationClick?.(item.id);
    onClose();
  }, [onNavigationClick, onClose]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-base">Chanuka Platform</h2>
                <p className="text-sm text-muted-foreground truncate">
                  Legislative Transparency
                </p>
              </div>
            </div>
          </div>

          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground capitalize truncate">
                    {user.persona} User
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 p-4 overflow-y-auto" role="navigation">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-colors",
                      "min-h-[44px]",
                      item.disabled 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-accent active:bg-accent/80 focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                    onClick={(e) => handleItemClick(item, e)}
                    aria-disabled={item.disabled}
                    aria-label={item.ariaLabel || item.label}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full min-h-[44px] justify-center" 
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

// ============================================================================
// Mobile Header
// ============================================================================

const MobileHeader = memo(function MobileHeader({
  headerVisible,
  onMenuClick,
  onFilterClick,
  showFilterButton,
  notificationCount = 0
}: {
  headerVisible: boolean;
  onMenuClick: () => void;
  onFilterClick?: () => void;
  showFilterButton: boolean;
  notificationCount?: number;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b',
        'transition-transform duration-300 ease-in-out',
        'will-change-transform',
        headerVisible ? 'translate-y-0' : '-translate-y-full'
      )}
      role="banner"
    >
      <div className="flex items-center justify-between h-14 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="h-10 w-10 p-0 focus-visible:ring-2"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold">Chanuka</span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 focus-visible:ring-2"
            aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px] bg-red-500 text-white flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {showFilterButton && onFilterClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilterClick}
              className="h-10 w-10 p-0 focus-visible:ring-2"
              aria-label="Open filters"
            >
              <Filter className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
});

// ============================================================================
// Bottom Navigation Bar
// ============================================================================

const BottomNavigationBar = memo(function BottomNavigationBar({ 
  navigationItems,
  activeItemId,
  onNavigationClick
}: { 
  navigationItems: NavigationItem[];
  activeItemId?: string;
  onNavigationClick?: (itemId: string) => void;
}) {
  const handleClick = useCallback((item: NavigationItem, e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    onNavigationClick?.(item.id);
  }, [onNavigationClick]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Primary navigation"
    >
      <div className="grid grid-cols-5 gap-1 p-2">
        {navigationItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;
          
          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleClick(item, e)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative",
                "min-h-[44px] justify-center focus-visible:ring-2 focus-visible:ring-primary",
                item.disabled 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-accent active:bg-accent/80",
                isActive && "text-primary"
              )}
              aria-disabled={item.disabled}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.ariaLabel || item.label}
            >
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              {item.badge && (
                <Badge 
                  className="absolute top-1 right-1 h-4 w-4 rounded-full p-0 text-[10px] bg-red-500 text-white flex items-center justify-center pointer-events-none"
                  aria-label={`${item.badge} items`}
                >
                  {item.badge}
                </Badge>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
});

// ============================================================================
// Scroll to Top Button
// ============================================================================

const ScrollToTopButton = memo(function ScrollToTopButton({ show }: { show: boolean }) {
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  if (!show) return null;

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg',
        'transition-all duration-300 ease-in-out md:bottom-6',
        'will-change-transform',
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
});

// ============================================================================
// Main Unified Mobile Layout Component
// ============================================================================

export function UnifiedMobileLayout({
  children,
  className,
  showNavigation = true,
  showPullToRefresh = false,
  onRefresh,
  showScrollToTop = true,
  filterContent,
  showFilterButton = false,
  customNavigationItems,
  onNavigationClick
}: UnifiedMobileLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [activeNavItemId, setActiveNavItemId] = useState<string>();
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);

  const navigationItems = useMemo(() => {
    if (customNavigationItems) return customNavigationItems;
    
    return [
      { id: 'home', icon: Home, label: 'Home', href: '/' },
      { id: 'bills', icon: FileText, label: 'Bills', href: '/bills' },
      { id: 'dashboard', icon: TrendingUp, label: 'Dashboard', href: '/dashboard' },
      { id: 'community', icon: Users, label: 'Community', href: '/community', badge: '3' },
      { id: 'search', icon: Search, label: 'Search', href: '/search' },
    ] as NavigationItem[];
  }, [customNavigationItems]);

  const swipeGesture = useSwipeGesture(
    useCallback(() => {
      if (isMobile && !isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }, [isMobile, isDrawerOpen])
  );

  const pullToRefresh = usePullToRefresh(onRefresh);

  useEffect(() => {
    if (!isMobile && !showScrollToTop) return;

    let rafId: number;
    let lastTimestamp = 0;

    const handleScroll = (timestamp: number) => {
      const currentScrollY = window.scrollY;
      const deltaTime = timestamp - lastTimestamp || 16;
      const deltaScroll = currentScrollY - lastScrollY.current;
      
      scrollVelocity.current = 
        scrollVelocity.current * (1 - SCROLL_CONFIG.velocitySmoothing) +
        (deltaScroll / deltaTime) * SCROLL_CONFIG.velocitySmoothing;
      
      if (showScrollToTop) {
        setShowScrollTop(currentScrollY > SCROLL_CONFIG.scrollTopButtonThreshold);
      }
      
      if (isMobile && showNavigation) {
        const scrollingDown = scrollVelocity.current > 0;
        const scrollDelta = Math.abs(deltaScroll);
        
        if (scrollDelta > SCROLL_CONFIG.headerToggleThreshold) {
          setHeaderVisible(!scrollingDown || currentScrollY < 50);
        }
      }
      
      lastScrollY.current = currentScrollY;
      lastTimestamp = timestamp;
    };

    const onScroll = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [isMobile, showScrollToTop, showNavigation]);

  const handleNavigationClick = useCallback((itemId: string) => {
    setActiveNavItemId(itemId);
    onNavigationClick?.(itemId);
  }, [onNavigationClick]);

  if (!isMobile) {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        {children}
        {showScrollToTop && <ScrollToTopButton show={showScrollTop} />}
      </div>
    );
  }

  return (
    <div 
      className={cn('min-h-screen bg-background', className)}
      {...(showPullToRefresh ? {
        onTouchStart: pullToRefresh.handleTouchStart,
        onTouchMove: pullToRefresh.handleTouchMove,
        onTouchEnd: pullToRefresh.handleTouchEnd
      } : {})}
      {...swipeGesture}
    >
      <OfflineStatusBanner />

      {showPullToRefresh && pullToRefresh.isPulling && (
        <div 
          className="fixed top-14 left-0 right-0 z-30 flex justify-center pointer-events-none"
          style={{ 
            transform: `translateY(${pullToRefresh.pullDistance}px)`,
            transition: pullToRefresh.isRefreshing ? 'transform 0.3s ease-out' : 'none'
          }}
        >
          <div className="bg-background rounded-full p-2 shadow-md">
            <div className={cn(
              "w-6 h-6 border-2 border-primary border-t-transparent rounded-full",
              pullToRefresh.isRefreshing && "animate-spin"
            )} 
            role="status"
            aria-label="Refreshing content"
            />
          </div>
        </div>
      )}

      {showNavigation && (
        <MobileHeader
          headerVisible={headerVisible}
          onMenuClick={() => setIsDrawerOpen(true)}
          onFilterClick={() => {/* Implement filter sheet */}}
          showFilterButton={showFilterButton && !!filterContent}
          notificationCount={3}
        />
      )}

      <main className="pb-20 px-4 py-6">
        {children}
      </main>

      {showNavigation && (
        <MobileNavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          navigationItems={navigationItems}
          onNavigationClick={handleNavigationClick}
        />
      )}

      {showNavigation && (
        <BottomNavigationBar 
          navigationItems={navigationItems}
          activeItemId={activeNavItemId}
          onNavigationClick={handleNavigationClick}
        />
      )}

      {showScrollToTop && <ScrollToTopButton show={showScrollTop} />}

      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="a11y-announcements"
        role="status"
      />
    </div>
  );
}