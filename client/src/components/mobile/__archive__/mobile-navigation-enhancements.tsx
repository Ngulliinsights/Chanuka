/**
 * Mobile Navigation Enhancements
 * Production-ready mobile navigation components with gesture support,
 * performance optimizations, and comprehensive accessibility features
 */
/* eslint-disable react/prop-types */

import { MoreVertical } from 'lucide-react';
import './mobile-navigation-enhancements.css';
import PropTypes from 'prop-types';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { cloneElement } from '../../utils/react-helpers';

import {
  useResponsiveLayoutContext,
  TouchButton,
  SafeAreaWrapper,
} from './responsive-layout-manager';

// ============================================================================
// Type Definitions
// ============================================================================

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  is_active?: boolean;
}

interface MobileTabBarProps {
  items: NavigationItem[];
  maxVisible?: number;
  onItemClick?: (item: NavigationItem) => void;
  className?: string;
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

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  maxPullDistance?: number;
  className?: string;
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

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

// ============================================================================
// Enhanced Touch Handler Utility
// ============================================================================

/**
 * Robust touch handler for swipe gestures with velocity tracking
 * and configurable thresholds for better gesture recognition
 */
class EnhancedTouchHandler {
  private element: HTMLElement;
  private threshold: number;
  private velocityThreshold: number;
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private isSwiping: boolean = false;
  public onSwipe?: (gesture: SwipeGesture) => void;
  public onSwipeStart?: () => void;
  public onSwipeEnd?: () => void;

  constructor(
    element: HTMLElement,
    options: { threshold?: number; velocityThreshold?: number } = {}
  ) {
    this.element = element;
    this.threshold = options.threshold || 50;
    this.velocityThreshold = options.velocityThreshold || 0.3;
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.element.addEventListener('touchstart', this.handleTouchStart, {
      passive: true,
    });
    this.element.addEventListener('touchmove', this.handleTouchMove, {
      passive: true,
    });
    this.element.addEventListener('touchend', this.handleTouchEnd, {
      passive: true,
    });
  }

  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;

    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isSwiping = false;

    if (this.onSwipeStart) {
      this.onSwipeStart();
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isSwiping) {
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - this.startX);
      const deltaY = Math.abs(touch.clientY - this.startY);

      // Determine if this is a swipe gesture based on initial movement
      if (deltaX > 10 || deltaY > 10) {
        this.isSwiping = true;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const deltaTime = endTime - this.startTime;

    // Prevent division by zero
    const timeInSeconds = Math.max(deltaTime, 1) / 1000;

    // Calculate absolute distances
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Calculate velocity in pixels per second
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / timeInSeconds;

    // Determine if gesture meets threshold requirements
    const meetsDistanceThreshold = absX > this.threshold || absY > this.threshold;
    const meetsVelocityThreshold = velocity > this.velocityThreshold;

    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      let direction: SwipeGesture['direction'];
      let distance: number;

      // Determine primary direction based on larger movement
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
        distance = absX;
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
        distance = absY;
      }

      if (this.onSwipe) {
        this.onSwipe({ direction, distance, velocity });
      }
    }

    if (this.onSwipeEnd) {
      this.onSwipeEnd();
    }

    this.isSwiping = false;
  }

  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }
}

// ============================================================================
// Mobile Tab Bar Component
// ============================================================================

/**
 * A mobile-optimized tab bar with intelligent overflow handling.
 * This component automatically manages visible tabs and provides a "More"
 * menu for additional navigation items, ensuring optimal use of screen space.
 */
export function MobileTabBar({
  items,
  maxVisible = 4,
  onItemClick,
  className = '',
}: MobileTabBarProps) {
  const { touchOptimized } = useResponsiveLayoutContext();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const tabBarRef = useRef(null);
  const moreButtonRef = useRef(null);

  // Intelligently split items into visible and hidden groups
  const { visibleItems, hiddenItems } = useMemo(() => {
    if (items.length <= maxVisible) {
      return { visibleItems: items, hiddenItems: [] };
    }

    // Reserve one slot for the "More" button
    const visible = items.slice(0, maxVisible - 1);
    const hidden = items.slice(maxVisible - 1);

    return { visibleItems: visible, hiddenItems: hidden };
  }, [items, maxVisible]);

  // Update active states based on current location with smart matching
  const updatedItems = useMemo(() => {
    const updateActive = (itemList: NavigationItem[]) =>
      itemList.map(item => ({
        ...item,
        is_active:
          location.pathname === item.href ||
          (item.href !== '/' && location.pathname.startsWith(item.href)),
      }));

    return {
      visible: updateActive(visibleItems),
      hidden: updateActive(hiddenItems),
    };
  }, [visibleItems, hiddenItems, location.pathname]);

  const handleItemClick = useCallback(
    (item: NavigationItem) => {
      if (onItemClick) {
        onItemClick(item);
      }
      setMoreMenuOpen(false);
    },
    [onItemClick]
  );

  // Enhanced outside click detection with proper cleanup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tabBarRef.current && !tabBarRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }

    return undefined;
  }, [moreMenuOpen]);

  // Handle keyboard navigation for the more menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && moreMenuOpen) {
        setMoreMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return undefined;
  }, [moreMenuOpen]);

  // Individual tab bar item component with proper prop types
  const TabBarItem = ({ item }: { item: NavigationItem }) => (
    <Link
      to={item.href}
      onClick={() => handleItemClick(item)}
      className={`
        flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200
        ${touchOptimized ? 'min-w-[60px] min-h-[60px]' : 'min-w-[50px] min-h-[50px]'}
        ${
          item.is_active
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      aria-label={
        item.badge && item.badge > 0 ? `${item.label} (${item.badge} notifications)` : item.label
      }
      aria-current={item.is_active ? 'page' : undefined}
    >
      <div className="relative">
        {cloneElement(item.icon as React.ReactElement, {
          className: `h-5 w-5 ${item.is_active ? 'text-blue-600' : 'text-current'}`,
          'aria-hidden': 'true',
        })}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] font-semibold"
            aria-hidden="true"
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span
        className={`text-xs mt-1 font-medium ${item.is_active ? 'text-blue-600' : 'text-current'}`}
      >
        {item.label}
      </span>
    </Link>
  );

  TabBarItem.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
      badge: PropTypes.number,
      is_active: PropTypes.bool,
    }).isRequired,
  };

  return (
    <SafeAreaWrapper edges={['bottom', 'left', 'right']}>
      <nav
        ref={tabBarRef}
        className={`bg-white border-t border-gray-200 px-2 py-1 relative ${className}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around">
          {updatedItems.visible.map((item: NavigationItem) => (
            <TabBarItem key={item.id} item={item} />
          ))}

          {updatedItems.hidden.length > 0 && (
            <div className="relative">
              <TouchButton
                ref={moreButtonRef}
                variant="ghost"
                size="md"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900"
                aria-label="More navigation options"
                aria-expanded={moreMenuOpen}
                aria-haspopup="true"
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs mt-1 font-medium">More</span>
              </TouchButton>

              {moreMenuOpen && (
                <div
                  className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50"
                  role="menu"
                  aria-label="Additional navigation options"
                >
                  {updatedItems.hidden.map((item: NavigationItem) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => handleItemClick(item)}
                      className={`
                        flex items-center px-4 py-3 text-sm transition-colors
                        ${touchOptimized ? 'min-h-[44px]' : ''}
                        ${
                          item.is_active
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                      role="menuitem"
                      aria-label={
                        item.badge && item.badge > 0
                          ? `${item.label} (${item.badge} notifications)`
                          : item.label
                      }
                    >
                      <div className="mr-3 relative">
                        {cloneElement(item.icon as React.ReactElement, {
                          className: 'h-5 w-5',
                          'aria-hidden': 'true',
                        })}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold"
                            aria-hidden="true"
                          >
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
      </nav>
    </SafeAreaWrapper>
  );
}

// ============================================================================
// Swipeable Header Component
// ============================================================================

/**
 * A mobile header that responds to swipe gestures for navigation.
 * This pattern is commonly used for going back, switching between views,
 * or revealing additional options through natural touch interactions.
 */
export function SwipeableHeader({
  title,
  subtitle,
  leftAction,
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className = '',
}: SwipeableHeaderProps) {
  const { touchOptimized } = useResponsiveLayoutContext();
  const headerRef = useRef(null);
  const [isSwipingActive, setIsSwipingActive] = useState(false);

  // Initialize enhanced touch handler for gesture recognition
  useEffect(() => {
    if (headerRef.current && (onSwipeLeft || onSwipeRight)) {
      const handler = new EnhancedTouchHandler(headerRef.current, {
        threshold: 50,
        velocityThreshold: 0.3,
      });

      handler.onSwipeStart = () => {
        setIsSwipingActive(true);
      };

      handler.onSwipe = (gesture: SwipeGesture) => {
        // Only trigger if swipe has sufficient velocity or distance
        if (gesture.velocity > 0.5 || gesture.distance > 80) {
          if (gesture.direction === 'left' && onSwipeLeft) {
            onSwipeLeft();
          } else if (gesture.direction === 'right' && onSwipeRight) {
            onSwipeRight();
          }
        }
      };

      handler.onSwipeEnd = () => {
        setIsSwipingActive(false);
      };

      return () => {
        handler.destroy();
      };
    }

    return undefined;
  }, [onSwipeLeft, onSwipeRight]);

  return (
    <SafeAreaWrapper edges={['top', 'left', 'right']}>
      <header
        ref={headerRef}
        className={`
          bg-white border-b border-gray-200 px-4 py-3
          ${touchOptimized ? 'min-h-[60px]' : 'min-h-[56px]'}
          ${isSwipingActive ? 'transition-none' : 'transition-all duration-200'}
          ${className}
        `}
        role="banner"
      >
        <div className="flex items-center justify-between h-full">
          {/* Left section with optional action button */}
          <div className="flex items-center flex-1 min-w-0">
            {leftAction && (
              <TouchButton
                variant="ghost"
                size="md"
                onClick={leftAction.onClick}
                className="mr-3 p-2 flex-shrink-0"
                aria-label={leftAction.label}
              >
                {cloneElement(leftAction.icon as React.ReactElement, {
                  'aria-hidden': 'true',
                })}
              </TouchButton>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
            </div>
          </div>

          {/* Right actions section */}
          {rightActions.length > 0 && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              {rightActions.map((action, index) => (
                <TouchButton
                  key={index}
                  variant="ghost"
                  size="md"
                  onClick={action.onClick}
                  className="p-2"
                  aria-label={action.label}
                >
                  {cloneElement(action.icon as React.ReactElement, {
                    'aria-hidden': 'true',
                  })}
                </TouchButton>
              ))}
            </div>
          )}
        </div>
      </header>
    </SafeAreaWrapper>
  );
}

// ============================================================================
// Pull to Refresh Component
// ============================================================================

/**
 * Implements the pull-to-refresh gesture pattern with elastic resistance.
 * This provides users with an intuitive way to refresh content by pulling
 * down from the top of a scrollable container.
 */
export function PullToRefresh({
  children,
  onRefresh,
  refreshThreshold = 80,
  maxPullDistance = 150,
  className = '',
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const touch = e.touches[0];
      if (touch) {
        startY.current = touch.clientY;
        isDragging.current = true;
      }
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        !isDragging.current ||
        isRefreshing ||
        !containerRef.current ||
        containerRef.current.scrollTop > 0
      ) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const currentY = touch.clientY;
      const distance = currentY - startY.current;

      // Only handle downward pulls
      if (distance > 0) {
        // Prevent default scrolling behavior during pull
        e.preventDefault();

        // Apply elastic resistance curve for natural feel
        const resistanceFactor = 1 - distance / maxPullDistance;
        const adjustedDistance = Math.min(
          distance * Math.max(resistanceFactor, 0.3),
          maxPullDistance
        );

        setPullDistance(adjustedDistance);
        setCanRefresh(adjustedDistance >= refreshThreshold);
      }
    },
    [isRefreshing, refreshThreshold, maxPullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    isDragging.current = false;

    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(refreshThreshold); // Lock to threshold during refresh

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    } else {
      // Animate back to resting position
      setPullDistance(0);
      setCanRefresh(false);
    }
  }, [canRefresh, isRefreshing, onRefresh, refreshThreshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false, // Must be false to prevent scrolling
    });
    container.addEventListener('touchend', handleTouchEnd, {
      passive: true,
    });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate indicator visual properties
  const indicatorOpacity = Math.min(pullDistance / refreshThreshold, 1);
  const spinnerRotation = isRefreshing ? 0 : pullDistance * 2;

  // Dynamic styles for animation - using CSS custom properties for better performance
  const dynamicStyles = useMemo(
    () => ({
      '--pull-distance': `${pullDistance}px`,
      '--indicator-opacity': indicatorOpacity,
      '--spinner-rotation': `${spinnerRotation}deg`,
      '--content-translate': `${isRefreshing ? refreshThreshold : pullDistance}px`,
    }),
    [pullDistance, indicatorOpacity, spinnerRotation, isRefreshing, refreshThreshold]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto h-full ${className}`}
      role="region"
      aria-label="Scrollable content area with pull-to-refresh"
    >
      {/* Pull to refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gradient-to-b from-blue-50 to-transparent transition-all duration-200 z-10 pointer-events-none pull-indicator"
        style={dynamicStyles}
        aria-live="polite"
        aria-atomic="true"
      >
        {pullDistance > 10 && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div
              className={`w-6 h-6 border-2 border-blue-600 rounded-full border-t-transparent transition-transform spinner ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">
              {isRefreshing
                ? 'Refreshing...'
                : canRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content with smooth transition during refresh */}
      <div className="transition-transform duration-200 content-container" style={dynamicStyles}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Floating Action Button Component
// ============================================================================

/**
 * A floating action button positioned for easy thumb access on mobile devices.
 * This component follows Material Design principles for primary actions and
 * includes smooth animations and proper touch feedback.
 */
export function FloatingActionButton({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  size = 'md',
  variant = 'primary',
  className = '',
}: FloatingActionButtonProps) {
  const { touchOptimized } = useResponsiveLayoutContext();
  const [isPressed, setIsPressed] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  const sizeClasses = {
    sm: touchOptimized ? 'w-12 h-12' : 'w-10 h-10',
    md: touchOptimized ? 'w-14 h-14' : 'w-12 h-12',
    lg: touchOptimized ? 'w-16 h-16' : 'w-14 h-14',
  };

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  const variantClasses = {
    primary:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg hover:shadow-xl',
    secondary:
      'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white shadow-lg hover:shadow-xl',
  };

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  return (
    <TouchButton
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        fixed ${positionClasses[position]} ${sizeClasses[size]} ${variantClasses[variant]}
        rounded-full flex items-center justify-center transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${isPressed ? 'scale-90' : 'scale-100 hover:scale-105'}
        z-50
        ${className}
      `}
      aria-label={label}
    >
      {cloneElement(icon as React.ReactElement, {
        className: iconSizeClasses[size],
        'aria-hidden': 'true',
      })}
    </TouchButton>
  );
}

// ============================================================================
// Export all components
// ============================================================================

export default {
  MobileTabBar,
  SwipeableHeader,
  PullToRefresh,
  FloatingActionButton,
};
