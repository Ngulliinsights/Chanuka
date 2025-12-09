/**
 * PullToRefresh - Canonical pull-to-refresh component with accessibility
 * Provides native-like refresh experience with visual feedback
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GESTURE_CONFIG } from '@client/config/gestures';
import { cn } from '@client/lib/utils';
import type { PullToRefreshConfig } from '@client/types/mobile';

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  config?: Partial<PullToRefreshConfig>;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
  config: customConfig,
}: PullToRefreshProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const startY = useRef(0);
  const isDragging = useRef(false);

  const config = useMemo(
    () => ({ ...GESTURE_CONFIG.PULL_TO_REFRESH, ...customConfig }),
    [customConfig]
  );

  const isAtTop = useCallback((): boolean => {
    return containerRef.current ? containerRef.current.scrollTop === 0 : false;
  }, []);

  // Announce state changes to screen readers
  useEffect(() => {
    let message = '';
    switch (state) {
      case 'pulling':
        message = 'Pull down to refresh';
        break;
      case 'ready':
        message = 'Release to refresh';
        break;
      case 'refreshing':
        message = 'Refreshing content';
        break;
      default:
        message = '';
    }
    setAnnouncement(message);
  }, [state]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || !isAtTop()) return;

    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    setState('idle');
  }, [disabled, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled || state === 'refreshing') return;

    if (!isAtTop()) {
      isDragging.current = false;
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    if (deltaY > 0) {
      const resistedDistance = Math.min(
        deltaY * config.resistance,
        config.maxPullDistance
      );

      setPullDistance(resistedDistance);
      setState(resistedDistance >= config.threshold ? 'ready' : 'pulling');
    }
  }, [disabled, state, isAtTop, config]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;

    isDragging.current = false;

    if (state === 'ready') {
      setState('refreshing');
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        setAnnouncement('Refresh failed');
      } finally {
        setState('idle');
        setPullDistance(0);
      }
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [disabled, state, onRefresh]);

  const indicatorOpacity = Math.min(pullDistance / config.threshold, 1);
  const indicatorTransform = `translateY(${Math.max(pullDistance - config.threshold, -config.threshold)}px)`;

  const pullStyle = {
    transform: `translateY(${pullDistance}px)`,
    transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
  };

  const indicatorStyle = {
    height: `${config.threshold}px`,
    opacity: indicatorOpacity,
    transform: indicatorTransform,
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // Dynamic styles required for animation (cannot be moved to CSS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={pullStyle as any}
    >
      {/* Hidden live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'bg-background/95 backdrop-blur-sm border-b',
          'text-sm text-muted-foreground transition-opacity duration-200',
          'z-10 pointer-events-none'
        )}
        // Dynamic styles required for animation (cannot be moved to CSS)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={indicatorStyle as any}
        role="status"
        aria-label={state === 'refreshing' ? 'Refreshing content' : 'Pull to refresh'}
      >
        <div className="flex items-center gap-2">
          {(state === 'pulling' || state === 'ready') && (
            <span className={cn('transition-transform', state === 'ready' && 'rotate-180')}>
              ↓
            </span>
          )}
          {state === 'refreshing' && (
            <span className="animate-spin">⟳</span>
          )}
          <span>
            {state === 'pulling' && 'Pull down to refresh'}
            {state === 'ready' && 'Release to refresh'}
            {state === 'refreshing' && 'Refreshing...'}
          </span>
        </div>
      </div>

      <div className="relative z-0">{children}</div>
    </div>
  );
}
