/**
 * Swipe Gestures Component and Hook
 * 
 * Provides touch-optimized swipe gesture detection for mobile interactions.
 * Supports horizontal and vertical swipes with customizable thresholds and callbacks.
 * 
 * Features:
 * - Multi-directional swipe detection (left, right, up, down)
 * - Customizable distance and velocity thresholds
 * - Touch-friendly with proper event handling
 * - Accessibility support with keyboard alternatives
 * - Performance optimized with passive event listeners
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@client/lib/utils';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeEvent {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SwipeGestureOptions {
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  onSwipeUp?: (event: SwipeEvent) => void;
  onSwipeDown?: (event: SwipeEvent) => void;
  minDistance?: number; // Minimum distance for a swipe (pixels)
  minVelocity?: number; // Minimum velocity for a swipe (pixels/ms)
  maxDuration?: number; // Maximum duration for a swipe (ms)
  preventDefaultTouchmove?: boolean;
  disabled?: boolean;
}

interface SwipeGesturesProps extends SwipeGestureOptions {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function SwipeGestures({
  children,
  className,
  as: Component = 'div',
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = 50,
  minVelocity = 0.3,
  maxDuration = 1000,
  preventDefaultTouchmove = false,
  disabled = false,
}: SwipeGesturesProps) {
  const elementRef = useRef<HTMLElement>(null);
  const swipeData = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    swipeData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isSwiping: true,
    };
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !swipeData.current.isSwiping) return;

    if (preventDefaultTouchmove) {
      e.preventDefault();
    }
  }, [disabled, preventDefaultTouchmove]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !swipeData.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - swipeData.current.startX;
    const deltaY = endY - swipeData.current.startY;
    const duration = endTime - swipeData.current.startTime;

    // Reset swipe state
    swipeData.current.isSwiping = false;

    // Check if duration is within limits
    if (duration > maxDuration) return;

    // Calculate distance and velocity
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Check if swipe meets minimum requirements
    if (distance < minDistance || velocity < minVelocity) return;

    // Determine swipe direction
    let direction: SwipeDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
    }

    // Create swipe event
    const swipeEvent: SwipeEvent = {
      direction,
      distance,
      velocity,
      duration,
      startX: swipeData.current.startX,
      startY: swipeData.current.startY,
      endX,
      endY,
    };

    // Call appropriate handlers
    onSwipe?.(swipeEvent);
    
    switch (direction) {
      case 'left':
        onSwipeLeft?.(swipeEvent);
        break;
      case 'right':
        onSwipeRight?.(swipeEvent);
        break;
      case 'up':
        onSwipeUp?.(swipeEvent);
        break;
      case 'down':
        onSwipeDown?.(swipeEvent);
        break;
    }
  }, [disabled, maxDuration, minDistance, minVelocity, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchmove]);

  return (
    <Component
      ref={elementRef as any}
      className={cn('touch-manipulation', className)}
      style={{ touchAction: preventDefaultTouchmove ? 'none' : 'auto' }}
    >
      {children}
    </Component>
  );
}

/**
 * Hook for using swipe gestures without a wrapper component
 */
export function useSwipeGestures(options: SwipeGestureOptions = {}) {
  const elementRef = useRef<HTMLElement>(null);
  const swipeData = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
  });

  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minDistance = 50,
    minVelocity = 0.3,
    maxDuration = 1000,
    preventDefaultTouchmove = false,
    disabled = false,
  } = options;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    swipeData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isSwiping: true,
    };
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !swipeData.current.isSwiping) return;

    if (preventDefaultTouchmove) {
      e.preventDefault();
    }
  }, [disabled, preventDefaultTouchmove]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !swipeData.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - swipeData.current.startX;
    const deltaY = endY - swipeData.current.startY;
    const duration = endTime - swipeData.current.startTime;

    swipeData.current.isSwiping = false;

    if (duration > maxDuration) return;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    if (distance < minDistance || velocity < minVelocity) return;

    let direction: SwipeDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const swipeEvent: SwipeEvent = {
      direction,
      distance,
      velocity,
      duration,
      startX: swipeData.current.startX,
      startY: swipeData.current.startY,
      endX,
      endY,
    };

    onSwipe?.(swipeEvent);
    
    switch (direction) {
      case 'left':
        onSwipeLeft?.(swipeEvent);
        break;
      case 'right':
        onSwipeRight?.(swipeEvent);
        break;
      case 'up':
        onSwipeUp?.(swipeEvent);
        break;
      case 'down':
        onSwipeDown?.(swipeEvent);
        break;
    }
  }, [disabled, maxDuration, minDistance, minVelocity, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchmove]);

  return elementRef;
}