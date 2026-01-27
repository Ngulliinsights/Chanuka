/**
 * usePullToRefresh Hook
 *
 * Manages pull-to-refresh state and animations.
 * Extracted from PullToRefresh component.
 *
 * @hook
 * @example
 * ```tsx
 * import { usePullToRefresh } from '@client/lib/hooks/mobile';
 *
 * export function MyScrollableContent() {
 *   const { isRefreshing, pullDistance, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh({
 *     onRefresh: async () => {
 *       await fetchNewData();
 *     },
 *     threshold: 80,
 *   });
 *
 *   return (
 *     <div
 *       onTouchStart={onTouchStart}
 *       onTouchMove={onTouchMove}
 *       onTouchEnd={onTouchEnd}
 *     >
 *       {isRefreshing && <div>Pulling... {pullDistance}px</div>}
 *       <Content />
 *     </div>
 *   );
 * }
 * ```
 */

import { GESTURE_CONFIG } from '@client/config/gestures';
import { useCallback, useRef, useState } from 'react';

import type { PullToRefreshConfig } from '@client/lib/types/mobile';

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Hook for managing pull-to-refresh state.
 *
 * @param config - Pull to refresh configuration
 * @returns Object with refresh state and touch handlers
 */
export function usePullToRefresh(config: PullToRefreshConfig): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = GESTURE_CONFIG.PULL_TO_REFRESH.threshold,
    maxDistance = GESTURE_CONFIG.PULL_TO_REFRESH.maxPullDistance,
    refreshing,
    disabled,
  } = config;

  const [isRefreshing, setIsRefreshing] = useState(refreshing || false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      const touch = e.touches[0];
      startY.current = touch.clientY;
      isPulling.current = false;
    },
    [disabled, isRefreshing]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !startY.current) return;

      const touch = e.touches[0];
      const currentY = touch.clientY;
      const deltaY = currentY - startY.current;

      // Only handle downward pulls from top
      if (deltaY > 0 && window.scrollY === 0) {
        isPulling.current = true;
        const distance = Math.min(deltaY * GESTURE_CONFIG.PULL_TO_REFRESH.resistance, maxDistance);
        setPullDistance(distance);
      }
    },
    [disabled, isRefreshing, maxDistance]
  );

  const onTouchEnd = useCallback(async () => {
    if (disabled || !isPulling.current) return;

    const shouldRefresh = pullDistance >= threshold;

    if (shouldRefresh && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    startY.current = null;
    isPulling.current = false;
  }, [disabled, pullDistance, threshold, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
