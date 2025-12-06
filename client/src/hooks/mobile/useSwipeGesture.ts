/**
 * useSwipeGesture Hook
 *
 * Detects swipe gestures and provides directional callbacks.
 * Extracted from SwipeGestures component.
 *
 * @hook
 * @example
 * ```tsx
 * import { useSwipeGesture } from '@/hooks/mobile';
 *
 * export function MyComponent() {
 *   const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
 *     onSwipeLeft: () => console.log('left'),
 *     onSwipeRight: () => console.log('right'),
 *   });
 *
 *   return <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>Content</div>;
 * }
 * ```
 */

import { useCallback, useRef } from 'react';

import { GESTURE_CONFIG } from '@client/config/gestures';
import type { SwipeGestureData } from '@client/types/mobile';

interface SwipeEvent extends SwipeGestureData {}

interface UseSwipeGestureOptions {
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  minDistance?: number;
  maxVerticalDeviation?: number;
  velocityThreshold?: number;
  maxDuration?: number;
}

export function useSwipeGesture({
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  minDistance = GESTURE_CONFIG.SWIPE.minDistance,
  maxVerticalDeviation = GESTURE_CONFIG.SWIPE.maxVerticalDeviation,
  velocityThreshold = GESTURE_CONFIG.SWIPE.velocityThreshold,
  maxDuration = GESTURE_CONFIG.SWIPE.maxDuration,
}: UseSwipeGestureOptions) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = Math.abs(touchEnd.current.y - touchStart.current.y);
    const timeElapsed = touchEnd.current.time - touchStart.current.time;

    if (timeElapsed > maxDuration) return;

    const distance = Math.abs(deltaX);
    const velocity = distance / Math.max(timeElapsed, 1);

    const isValidSwipe =
      distance > minDistance &&
      deltaY < Math.abs(deltaX) * maxVerticalDeviation &&
      velocity > velocityThreshold;

    if (isValidSwipe) {
      const event: SwipeEvent = {
        direction: deltaX > 0 ? 'right' : 'left',
        distance,
        velocity,
        duration: timeElapsed,
        startX: touchStart.current.x,
        startY: touchStart.current.y,
        endX: touchEnd.current.x,
        endY: touchEnd.current.y,
      };

      onSwipe?.(event);
      if (deltaX > 0) {
        onSwipeRight?.(event);
      } else {
        onSwipeLeft?.(event);
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipe, onSwipeLeft, onSwipeRight, minDistance, maxVerticalDeviation, velocityThreshold, maxDuration]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
