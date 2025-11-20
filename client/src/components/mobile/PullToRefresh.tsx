/**
 * Pull to Refresh Component
 * 
 * Implements native-like pull-to-refresh functionality for mobile devices.
 * Provides visual feedback and smooth animations during the refresh process.
 * 
 * Features:
 * - Touch-optimized pull gesture detection
 * - Smooth animations and visual feedback
 * - Customizable refresh threshold and styling
 * - Accessibility support with screen reader announcements
 * - Works with any scrollable content
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number; // Distance in pixels to trigger refresh
  maxPullDistance?: number; // Maximum pull distance
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  showIcon?: boolean;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull down to refresh',
  releaseText = 'Release to refresh',
  showIcon = true,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if container is at the top
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isAtTop()) return;

    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
    setRefreshState('idle');
  }, [disabled, isAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled || isRefreshing) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;

    // Only handle downward pulls when at the top
    if (deltaY > 0 && isAtTop()) {
      e.preventDefault(); // Prevent default scroll behavior
      
      // Calculate pull distance with resistance
      const resistance = 0.5;
      const distance = Math.min(deltaY * resistance, maxPullDistance);
      
      setPullDistance(distance);
      
      // Update refresh state based on distance
      if (distance >= threshold) {
        setRefreshState('ready');
      } else {
        setRefreshState('pulling');
      }
    }
  }, [isDragging, disabled, isRefreshing, startY, isAtTop, threshold, maxPullDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isDragging || disabled) return;

    setIsDragging(false);

    if (refreshState === 'ready' && !isRefreshing) {
      setRefreshState('refreshing');
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setRefreshState('idle');
        setPullDistance(0);
      }
    } else {
      // Animate back to original position
      setRefreshState('idle');
      setPullDistance(0);
    }
  }, [isDragging, disabled, refreshState, isRefreshing, onRefresh]);

  // Reset state when refreshing completes
  useEffect(() => {
    if (!isRefreshing && refreshState === 'refreshing') {
      setRefreshState('idle');
      setPullDistance(0);
    }
  }, [isRefreshing, refreshState]);

  // Get refresh indicator content
  const getRefreshContent = () => {
    switch (refreshState) {
      case 'pulling':
        return (
          <>
            {showIcon && (
              <ArrowDown 
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  pullDistance >= threshold * 0.8 ? 'rotate-180' : ''
                )}
              />
            )}
            <span>{pullText}</span>
          </>
        );
      case 'ready':
        return (
          <>
            {showIcon && <ArrowDown className="h-5 w-5 rotate-180" />}
            <span>{releaseText}</span>
          </>
        );
      case 'refreshing':
        return (
          <>
            {showIcon && <RefreshCw className="h-5 w-5 animate-spin" />}
            <span>{refreshingText}</span>
          </>
        );
      default:
        return null;
    }
  };

  // Calculate indicator opacity and transform
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorTransform = `translateY(${Math.max(pullDistance - 60, -60)}px)`;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: refreshState === 'refreshing' ? `translateY(${threshold}px)` : `translateY(${pullDistance}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Refresh Indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'bg-background/95 backdrop-blur-sm border-b',
          'text-sm text-muted-foreground',
          'transition-opacity duration-200',
          'z-10'
        )}
        style={{
          height: `${threshold}px`,
          opacity: indicatorOpacity,
          transform: indicatorTransform,
        }}
        role="status"
        aria-live="polite"
        aria-label={
          refreshState === 'refreshing' 
            ? refreshingText 
            : refreshState === 'ready' 
            ? releaseText 
            : pullText
        }
      >
        <div className="flex items-center gap-2">
          {getRefreshContent()}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Hook for managing pull-to-refresh state
 */
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const refresh = useCallback(async (refreshFn: () => Promise<void> | void) => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshFn();
      setLastRefreshTime(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return {
    isRefreshing,
    lastRefreshTime,
    refresh,
  };
}