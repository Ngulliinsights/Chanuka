/**
 * useSwipeGesture Hook
 *
 * Unified swipe gesture detection using SwipeGestures component internally.
 * Provides touch, mouse, and keyboard gesture support with accessibility.
 *
 * @hook
 * @example
 * ```tsx
 * import { useSwipeGesture } from '@/hooks/mobile';
 *
 * export function MyComponent() {
 *   const { ref } = useSwipeGesture({
 *     onSwipeLeft: () => console.log('left'),
 *     onSwipeRight: () => console.log('right'),
 *   });
 *
 *   return <div ref={ref}>Content</div>;
 * }
 * ```
 */

import React, { useCallback, useRef } from 'react';

import { GESTURE_CONFIG } from '@client/config/gestures';
import type { SwipeGestureData } from '@client/types/mobile';

interface SwipeEvent extends SwipeGestureData {}

interface UseSwipeGestureOptions {
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  onSwipeUp?: (event: SwipeEvent) => void;
  onSwipeDown?: (event: SwipeEvent) => void;
  minDistance?: number;
  minVelocity?: number;
  maxDuration?: number;
  disabled?: boolean;
}

export function useSwipeGesture({
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = GESTURE_CONFIG.SWIPE.minDistance,
  minVelocity = GESTURE_CONFIG.SWIPE.velocityThreshold,
  maxDuration = GESTURE_CONFIG.SWIPE.maxDuration,
  disabled = false,
}: UseSwipeGestureOptions) {
  const elementRef = useRef<HTMLElement>(null);
  const swipeData = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
    isMouseDown: false,
  });

  const createSwipeEvent = useCallback(
    (endX: number, endY: number, endTime: number): SwipeEvent => {
      const deltaX = endX - swipeData.current.startX;
      const deltaY = endY - swipeData.current.startY;
      const duration = endTime - swipeData.current.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / duration;

      const direction: 'up' | 'down' | 'left' | 'right' = Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX > 0 ? 'right' : 'left'
        : deltaY > 0 ? 'down' : 'up';

      return {
        direction,
        distance,
        velocity,
        duration,
        startX: swipeData.current.startX,
        startY: swipeData.current.startY,
        endX,
        endY,
      };
    },
    []
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    swipeData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isSwiping: true,
      isMouseDown: false,
    };
  }, [disabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !swipeData.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const event = createSwipeEvent(touch.clientX, touch.clientY, Date.now());

    swipeData.current.isSwiping = false;

    if (event.distance < minDistance || event.velocity < minVelocity) return;
    if (event.duration > maxDuration) return;

    onSwipe?.(event);
    switch (event.direction) {
      case 'left':
        onSwipeLeft?.(event);
        break;
      case 'right':
        onSwipeRight?.(event);
        break;
      case 'up':
        onSwipeUp?.(event);
        break;
      case 'down':
        onSwipeDown?.(event);
        break;
    }
  }, [disabled, minDistance, minVelocity, maxDuration, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, createSwipeEvent]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (disabled) return;

    swipeData.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      isSwiping: true,
      isMouseDown: true,
    };
  }, [disabled]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (disabled || !swipeData.current.isMouseDown) return;

    const event = createSwipeEvent(e.clientX, e.clientY, Date.now());

    swipeData.current.isSwiping = false;
    swipeData.current.isMouseDown = false;

    if (event.distance < minDistance || event.velocity < minVelocity) return;
    if (event.duration > maxDuration) return;

    onSwipe?.(event);
    switch (event.direction) {
      case 'left':
        onSwipeLeft?.(event);
        break;
      case 'right':
        onSwipeRight?.(event);
        break;
      case 'up':
        onSwipeUp?.(event);
        break;
      case 'down':
        onSwipeDown?.(event);
        break;
    }
  }, [disabled, minDistance, minVelocity, maxDuration, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, createSwipeEvent]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    const keyToDirection: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };

    const direction = keyToDirection[e.key];
    if (direction) {
      e.preventDefault();
      const event: SwipeEvent = {
        direction,
        distance: minDistance,
        velocity: 1,
        duration: 100,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
      };
      onSwipe?.(event);
      switch (direction) {
        case 'left': onSwipeLeft?.(event); break;
        case 'right': onSwipeRight?.(event); break;
        case 'up': onSwipeUp?.(event); break;
        case 'down': onSwipeDown?.(event); break;
      }
    }
  }, [disabled, minDistance, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Set up event listeners when element is available
  const setupListeners = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTouchStart, handleTouchEnd, handleMouseDown, handleMouseUp, handleKeyDown]);

  // Use effect to set up listeners when ref is attached
  React.useEffect(() => {
    return setupListeners();
  }, [setupListeners]);

  return { ref: elementRef };
}
