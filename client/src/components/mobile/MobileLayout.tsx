/**
 * Mobile Layout Component
 * 
 * A comprehensive mobile layout that integrates all mobile-optimized patterns.
 * Provides responsive design with touch-friendly interactions and accessibility.
 * 
 * Features:
 * - Responsive breakpoints with mobile-first design
 * - Touch-optimized interactions with 44px minimum touch targets
 * - Swipe gestures for navigation
 * - Pull-to-refresh functionality
 * - Bottom sheet for filters and actions
 * - Mobile navigation drawer
 * - Safe area support for devices with notches
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useMediaQuery } from '../../hooks/use-mobile';
import { cn } from '../../lib/utils';
import { MobileNavigationDrawer, useMobileNavigationDrawer } from './MobileNavigationDrawer';
import { MobileBottomSheet, useBottomSheet } from './MobileBottomSheet';
import { PullToRefresh } from './PullToRefresh';
import { SwipeGestures } from './SwipeGestures';
import { Button } from '../ui/button';
import { Menu, Filter, ArrowUp } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
  showPullToRefresh?: boolean;
  onRefresh?: () => Promise<void> | void;
  showScrollToTop?: boolean;
  filterContent?: React.ReactNode;
  showFilterButton?: boolean;
  navigationItems?: Array<{
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
    requiresAuth?: boolean;
  }>;
}

export function MobileLayout({
  children,
  className,
  showNavigation = true,
  showPullToRefresh = false,
  onRefresh,
  showScrollToTop = true,
  filterContent,
  showFilterButton = false,
  navigationItems,
}: MobileLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  // Mobile navigation drawer
  const navigationDrawer = useMobileNavigationDrawer();
  
  // Filter bottom sheet
  const filterSheet = useBottomSheet();

  // Handle scroll events for scroll-to-top button and header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide scroll to top button
      setShowScrollTop(currentScrollY > 300);
      
      // Show/hide header based on scroll direction (mobile only)
      if (isMobile) {
        const scrollingDown = currentScrollY > lastScrollY;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        // Only hide/show header if scroll delta is significant
        if (scrollDelta > 10) {
          setHeaderVisible(!scrollingDown || currentScrollY < 100);
        }
      } else {
        setHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobile]);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // Handle swipe gestures for navigation
  const handleSwipeRight = useCallback(() => {
    if (isMobile && !navigationDrawer.isOpen) {
      navigationDrawer.open();
    }
  }, [isMobile, navigationDrawer]);

  // Mobile header component
  const MobileHeader = () => (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b',
        'transition-transform duration-300 ease-in-out',
        'safe-area-inset-top', // Support for devices with notches
        headerVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Navigation Menu Button */}
        {showNavigation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={navigationDrawer.open}
            className="h-10 w-10 p-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Title */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-lg font-semibold">Chanuka</h1>
        </div>

        {/* Filter Button */}
        {showFilterButton && filterContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={filterSheet.open}
            className="h-10 w-10 p-0"
            aria-label="Open filters"
          >
            <Filter className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );

  // Desktop/Tablet layout
  if (!isMobile) {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        {children}
        
        {/* Scroll to top button */}
        {showScrollToTop && showScrollTop && (
          <Button
            onClick={scrollToTop}
            className={cn(
              'fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg',
              'transition-all duration-300 ease-in-out',
              showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            )}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
  }

  // Mobile layout
  const content = (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="relative">
        {showPullToRefresh && onRefresh ? (
          <PullToRefresh onRefresh={onRefresh}>
            <SwipeGestures
              onSwipeRight={handleSwipeRight}
              minDistance={30}
              className="min-h-[calc(100vh-3.5rem)]"
            >
              {children}
            </SwipeGestures>
          </PullToRefresh>
        ) : (
          <SwipeGestures
            onSwipeRight={handleSwipeRight}
            minDistance={30}
            className="min-h-[calc(100vh-3.5rem)]"
          >
            {children}
          </SwipeGestures>
        )}
      </main>

      {/* Mobile Navigation Drawer */}
      {showNavigation && (
        <MobileNavigationDrawer
          isOpen={navigationDrawer.isOpen}
          onClose={navigationDrawer.close}
          navigationItems={navigationItems}
        />
      )}

      {/* Filter Bottom Sheet */}
      {filterContent && (
        <MobileBottomSheet
          isOpen={filterSheet.isOpen}
          onClose={filterSheet.close}
          title="Filters"
          maxHeight="80vh"
        >
          {filterContent}
        </MobileBottomSheet>
      )}

      {/* Scroll to Top Button */}
      {showScrollToTop && showScrollTop && (
        <Button
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg',
            'transition-all duration-300 ease-in-out',
            'safe-area-inset-bottom', // Support for devices with home indicators
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );

  return content;
}

/**
 * Mobile-specific utility components
 */

// Mobile-optimized container with safe areas
export function MobileContainer({ 
  children, 
  className,
  padding = 'default' 
}: { 
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'default' | 'lg';
}) {
  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2',
    default: 'px-4 py-4',
    lg: 'px-6 py-6',
  };

  return (
    <div className={cn(
      'w-full mx-auto',
      'safe-area-inset-left safe-area-inset-right',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized section with proper spacing
export function MobileSection({ 
  children, 
  className,
  title,
  description 
}: { 
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Mobile-optimized grid with responsive columns
export function MobileGrid({ 
  children, 
  className,
  columns = 1,
  gap = 'default'
}: { 
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2;
  gap?: 'sm' | 'default' | 'lg';
}) {
  const gapClasses = {
    sm: 'gap-2',
    default: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
  };

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}