/**
 * Mobile Navigation Enhancements
 * Advanced mobile navigation components with gesture support and performance optimizations
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Search,
  Bell,
  User,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { useResponsiveLayoutContext, TouchButton, SafeAreaWrapper } from './responsive-layout-manager';
import { MobileTouchHandler, MobileTouchUtils } from '../../utils/mobile-touch-handler';
import { Link, useLocation } from 'react-router-dom';
import { logger } from '../../utils/browser-logger';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  isActive?: boolean;
}

interface MobileTabBarProps {
  items: NavigationItem[];
  maxVisible?: number;
  onItemClick?: (item: NavigationItem) => void;
  className?: string;
}

export function MobileTabBar({ 
  items, 
  maxVisible = 4, 
  onItemClick,
  className = ''
}: MobileTabBarProps) {
  const { touchOptimized } = useResponsiveLayoutContext();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Determine which items to show and which to hide in "more" menu
  const { visibleItems, hiddenItems } = useMemo(() => {
    if (items.length <= maxVisible) {
      return { visibleItems: items, hiddenItems: [] };
    }

    const visible = items.slice(0, maxVisible - 1);
    const hidden = items.slice(maxVisible - 1);
    
    return { visibleItems: visible, hiddenItems: hidden };
  }, [items, maxVisible]);

  // Update active states based on current location
  const itemsWithActiveState = useMemo(() => {
    return items.map(item => ({
      ...item,
      isActive: location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href))
    }));
  }, [items, location.pathname]);

  const handleItemClick = useCallback((item: NavigationItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
    setMoreMenuOpen(false);
  }, [onItemClick]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabBarRef.current && !tabBarRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreMenuOpen]);

  const TabBarItem = ({ item }: { item: NavigationItem }) => (
    <Link
      to={item.href}
      onClick={() => handleItemClick(item)}
      className={`
        flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200
        ${touchOptimized ? 'min-w-[60px] min-h-[60px]' : 'min-w-[50px] min-h-[50px]'}
        ${item.isActive 
          ? 'text-blue-600 bg-blue-50' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      aria-label={`Navigate to ${item.label}`}
      aria-current={item.isActive ? 'page' : undefined}
    >
      <div className="relative">
        {React.cloneElement(item.icon as React.ReactElement, {
          className: `h-5 w-5 ${item.isActive ? 'text-blue-600' : 'text-current'}`
        })}
        {item.badge && item.badge > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span className={`text-xs mt-1 font-medium ${item.isActive ? 'text-blue-600' : 'text-current'}`}>
        {item.label}
      </span>
    </Link>
  );

  return (
    <SafeAreaWrapper edges={['bottom', 'left', 'right']}>
      <div 
        ref={tabBarRef}
        className={`
          bg-white border-t border-gray-200 px-2 py-1 relative
          ${className}
        `}
      >
        <div className="flex items-center justify-around">
          {visibleItems.map(item => (
            <TabBarItem key={item.id} item={item} />
          ))}
          
          {hiddenItems.length > 0 && (
            <div className="relative">
              <TouchButton
                variant="ghost"
                size="md"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
                aria-label="More navigation options"
                aria-expanded={moreMenuOpen}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">More</span>
              </TouchButton>
              
              {moreMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                  {hiddenItems.map(item => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => handleItemClick(item)}
                      className={`
                        flex items-center px-4 py-3 text-sm transition-colors
                        ${touchOptimized ? 'min-h-[44px]' : ''}
                        ${item.isActive 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                    >
                      <div className="mr-3 relative">
                        {React.cloneElement(item.icon as React.ReactElement, {
                          className: 'h-5 w-5'
                        })}
                        {item.badge && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SafeAreaWrapper>
  );
}

interface SwipeableHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
  rightActions?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  }[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableHeader({
  title,
  subtitle,
  leftAction,
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className = ''
}: SwipeableHeaderProps) {
  const { touchOptimized } = useResponsiveLayoutContext();
  const headerRef = useRef<HTMLDivElement>(null);
  const [touchHandler, setTouchHandler] = useState<MobileTouchHandler | null>(null);

  // Initialize touch handler for swipe gestures
  useEffect(() => {
    if (headerRef.current && (onSwipeLeft || onSwipeRight)) {
      const handler = new MobileTouchHandler(headerRef.current, {
        threshold: 50,
        preventScroll: false
      });

      handler.onSwipe = (swipe) => {
        if (swipe.direction === 'left' && onSwipeLeft) {
          onSwipeLeft();
        } else if (swipe.direction === 'right' && onSwipeRight) {
          onSwipeRight();
        }
      };

      setTouchHandler(handler);

      return () => {
        handler.destroy();
      };
    }
  }, [onSwipeLeft, onSwipeRight]);

  return (
    <SafeAreaWrapper edges={['top', 'left', 'right']}>
      <header 
        ref={headerRef}
        className={`
          bg-white border-b border-gray-200 px-4 py-3
          ${touchOptimized ? 'min-h-[60px]' : 'min-h-[56px]'}
          ${className}
        `}
      >
        <div className="flex items-center justify-between h-full">
          {/* Left section */}
          <div className="flex items-center flex-1">
            {leftAction && (
              <TouchButton
                variant="ghost"
                size="md"
                onClick={leftAction.onClick}
                className="mr-3 p-2"
                aria-label={leftAction.label}
              >
                {leftAction.icon}
              </TouchButton>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right actions */}
          {rightActions.length > 0 && (
            <div className="flex items-center space-x-2">
              {rightActions.map((action, index) => (
                <TouchButton
                  key={index}
                  variant="ghost"
                  size="md"
                  onClick={action.onClick}
                  className="p-2"
                  aria-label={action.label}
                >
                  {action.icon}
                </TouchButton>
              ))}
            </div>
          )}
        </div>
      </header>
    </SafeAreaWrapper>
  );
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshThreshold = 80,
  className = ''
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isRefreshing || !containerRef.current || containerRef.current.scrollTop > 0) {
      return;
    }

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;

    if (distance > 0) {
      e.preventDefault();
      const adjustedDistance = Math.min(distance * 0.5, refreshThreshold * 1.5);
      setPullDistance(adjustedDistance);
      setCanRefresh(adjustedDistance >= refreshThreshold);
    }
  }, [isRefreshing, refreshThreshold]);

  const handleTouchEnd = useCallback(async () => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  }, [canRefresh, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: '100%' }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 transition-all duration-200 z-10"
        style={{ 
          height: `${pullDistance}px`,
          transform: `translateY(-${Math.max(0, refreshThreshold - pullDistance)}px)`
        }}
      >
        {pullDistance > 0 && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div 
              className={`w-6 h-6 border-2 border-blue-600 rounded-full ${
                isRefreshing ? 'animate-spin border-t-transparent' : ''
              } ${
                canRefresh ? 'border-t-transparent animate-spin' : ''
              }`}
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : canRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ paddingTop: isRefreshing ? `${refreshThreshold}px` : '0' }}>
        {children}
      </div>
    </div>
  );
}

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  size = 'md',
  variant = 'primary',
  className = ''
}: FloatingActionButtonProps) {
  const { touchOptimized } = useResponsiveLayoutContext();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };

  const sizeClasses = {
    sm: touchOptimized ? 'w-12 h-12' : 'w-10 h-10',
    md: touchOptimized ? 'w-14 h-14' : 'w-12 h-12',
    lg: touchOptimized ? 'w-16 h-16' : 'w-14 h-14'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl'
  };

  return (
    <TouchButton
      onClick={onClick}
      className={`
        fixed ${positionClasses[position]} ${sizeClasses[size]} ${variantClasses[variant]}
        rounded-full flex items-center justify-center transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        active:scale-95 z-50
        ${className}
      `}
      aria-label={label}
    >
      {React.cloneElement(icon as React.ReactElement, {
        className: size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-6 w-6' : 'h-7 w-7'
      })}
    </TouchButton>
  );
}

export default {
  MobileTabBar,
  SwipeableHeader,
  PullToRefresh,
  FloatingActionButton
};

