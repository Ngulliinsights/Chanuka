/**
 * Touch Handler Module
 *
 * @deprecated This module is deprecated in favor of the unified SwipeGestures system.
 * Use SwipeGestures component or useSwipeGesture hook for touch gesture handling.
 *
 * Advanced touch gesture recognition system with support for multiple
 * simultaneous gestures and configurable thresholds.
 *
 * @module core/mobile/touch-handler
 */

import { logger } from '@/utils/logger';

import type { TouchEvent, TouchConfig } from './types';

/**
 * Advanced touch gesture recognition system with support for multiple
 * simultaneous gestures and configurable thresholds.
 */
export class TouchHandler {
  private static instance: TouchHandler;
  private listeners: Map<HTMLElement, Map<string, Set<(event: TouchEvent) => void>>> = new Map();
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private lastTapTime: number = 0;
  private lastTapPos: { x: number; y: number } = { x: 0, y: 0 };
  private longPressTimer: NodeJS.Timeout | null = null;
  private initialPinchDistance: number = 0;
  private config: Required<TouchConfig>;
  private boundHandlers: WeakMap<HTMLElement, {
    touchstart: (e: globalThis.TouchEvent) => void;
    touchend: (e: globalThis.TouchEvent) => void;
    touchmove: (e: globalThis.TouchEvent) => void;
    touchcancel: (e: globalThis.TouchEvent) => void;
  }> = new WeakMap();

  private constructor(config: TouchConfig = {}) {
    console.warn('TouchHandler is deprecated. Use SwipeGestures component or useSwipeGesture hook instead.');

    this.config = {
      enableSwipe: config.enableSwipe ?? true,
      enableLongPress: config.enableLongPress ?? true,
      enableTap: config.enableTap ?? true,
      tapThreshold: config.tapThreshold || 10,
      tapTimeout: config.tapTimeout || 300,
      doubleTapTimeout: config.doubleTapTimeout || 300,
      longPressDelay: config.longPressDelay || 500,
      swipeThreshold: config.swipeThreshold || 30,
      preventDefaultOnTouch: config.preventDefaultOnTouch ?? false,
      onSwipe: config.onSwipe || (() => {}),
      onLongPress: config.onLongPress || (() => {}),
      onTap: config.onTap || (() => {})
    };
  }

  static getInstance(config?: TouchConfig): TouchHandler {
    if (!TouchHandler.instance) {
      TouchHandler.instance = new TouchHandler(config);
    }
    return TouchHandler.instance;
  }

  /**
   * Updates the configuration for touch gesture recognition
   */
  updateConfig(config: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addTouchListener(
    element: HTMLElement,
    eventType: TouchEvent['type'],
    callback: (event: TouchEvent) => void
  ): void {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
      this.setupElementListeners(element);
    }

    const elementListeners = this.listeners.get(element)!;
    if (!elementListeners.has(eventType)) {
      elementListeners.set(eventType, new Set());
    }

    elementListeners.get(eventType)!.add(callback);
  }

  removeTouchListener(
    element: HTMLElement,
    eventType: TouchEvent['type'],
    callback: (event: TouchEvent) => void
  ): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    const typeListeners = elementListeners.get(eventType);
    if (!typeListeners) return;

    typeListeners.delete(callback);

    // Clean up empty listener sets
    if (typeListeners.size === 0) {
      elementListeners.delete(eventType);
    }

    if (elementListeners.size === 0) {
      this.listeners.delete(element);
      this.removeElementListeners(element);
    }
  }

  /**
   * Removes all listeners for a specific element
   */
  removeAllListeners(element: HTMLElement): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    elementListeners.clear();
    this.listeners.delete(element);
    this.removeElementListeners(element);
  }

  private setupElementListeners(element: HTMLElement): void {
    // Create bound handlers that we can properly remove later
    const handlers = {
      touchstart: this.handleTouchStart.bind(this),
      touchend: this.handleTouchEnd.bind(this),
      touchmove: this.handleTouchMove.bind(this),
      touchcancel: this.handleTouchCancel.bind(this)
    };

    this.boundHandlers.set(element, handlers);

    const options = { 
      passive: !this.config.preventDefaultOnTouch,
      capture: false
    };

    element.addEventListener('touchstart', handlers.touchstart, options);
    element.addEventListener('touchend', handlers.touchend, options);
    element.addEventListener('touchmove', handlers.touchmove, options);
    element.addEventListener('touchcancel', handlers.touchcancel, options);
  }

  private removeElementListeners(element: HTMLElement): void {
    const handlers = this.boundHandlers.get(element);
    if (!handlers) return;

    element.removeEventListener('touchstart', handlers.touchstart);
    element.removeEventListener('touchend', handlers.touchend);
    element.removeEventListener('touchmove', handlers.touchmove);
    element.removeEventListener('touchcancel', handlers.touchcancel);

    this.boundHandlers.delete(element);
  }

  private handleTouchStart(event: globalThis.TouchEvent): void {
    const touch = event.touches[0];
    const now = Date.now();

    this.touchStartTime = now;
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // Detect pinch gesture (two fingers)
    if (event.touches.length === 2) {
      this.initialPinchDistance = this.calculateDistance(
        event.touches[0],
        event.touches[1]
      );
    }

    // Setup long press detection
    this.longPressTimer = setTimeout(() => {
      const target = event.target as HTMLElement;
      this.triggerTouchEvent(target, {
        type: 'long-press',
        target,
        coordinates: this.touchStartPos,
        duration: Date.now() - this.touchStartTime,
        timestamp: Date.now()
      });
    }, this.config.longPressDelay);

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: globalThis.TouchEvent): void {
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const touch = event.changedTouches[0];
    const endPos = { x: touch.clientX, y: touch.clientY };
    const now = Date.now();
    const duration = now - this.touchStartTime;
    const distance = this.calculateDistanceFromPoints(this.touchStartPos, endPos);

    const target = event.target as HTMLElement;

    // Detect tap or double-tap
    if (distance < this.config.tapThreshold && duration < this.config.tapTimeout) {
      const timeSinceLastTap = now - this.lastTapTime;
      const distanceFromLastTap = this.calculateDistanceFromPoints(this.lastTapPos, endPos);

      if (
        timeSinceLastTap < this.config.doubleTapTimeout &&
        distanceFromLastTap < this.config.tapThreshold
      ) {
        // Double tap detected
        this.triggerTouchEvent(target, {
          type: 'double-tap',
          target,
          coordinates: endPos,
          duration,
          timestamp: now
        });
        // Reset to prevent triple-tap
        this.lastTapTime = 0;
      } else {
        // Single tap
        this.triggerTouchEvent(target, {
          type: 'tap',
          target,
          coordinates: endPos,
          duration,
          timestamp: now
        });
        this.lastTapTime = now;
        this.lastTapPos = endPos;
      }
    } 
    // Detect swipe
    else if (distance > this.config.swipeThreshold) {
      const direction = this.getSwipeDirection(this.touchStartPos, endPos);
      const velocity = distance / duration; // pixels per millisecond

      this.triggerTouchEvent(target, {
        type: 'swipe',
        target,
        coordinates: endPos,
        direction,
        distance,
        duration,
        velocity,
        timestamp: now
      });
    }

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchMove(event: globalThis.TouchEvent): void {
    // Cancel long press if finger moves too much
    if (this.longPressTimer) {
      const touch = event.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = this.calculateDistanceFromPoints(this.touchStartPos, currentPos);

      if (distance > this.config.tapThreshold) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;

        // Trigger pan gesture
        const target = event.target as HTMLElement;
        const direction = this.getSwipeDirection(this.touchStartPos, currentPos);
        
        this.triggerTouchEvent(target, {
          type: 'pan',
          target,
          coordinates: currentPos,
          direction,
          distance,
          duration: Date.now() - this.touchStartTime,
          timestamp: Date.now()
        });
      }
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && this.initialPinchDistance > 0) {
      const currentDistance = this.calculateDistance(
        event.touches[0],
        event.touches[1]
      );
      const scale = currentDistance / this.initialPinchDistance;

      const target = event.target as HTMLElement;
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      this.triggerTouchEvent(target, {
        type: 'pinch',
        target,
        coordinates: { x: centerX, y: centerY },
        scale,
        duration: Date.now() - this.touchStartTime,
        timestamp: Date.now()
      });
    }

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchCancel(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private calculateDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateDistanceFromPoints(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getSwipeDirection(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): TouchEvent['direction'] {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private triggerTouchEvent(element: HTMLElement, touchEvent: TouchEvent): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    const typeListeners = elementListeners.get(touchEvent.type);
    if (!typeListeners) return;

    // Use Array.from to avoid issues if callbacks modify the set
    Array.from(typeListeners).forEach(callback => {
      try {
        callback(touchEvent);
      } catch (error) {
        logger.error('Touch event callback error', { 
          error, 
          touchEvent: { ...touchEvent, target: undefined } // Avoid circular refs
        });
      }
    });
  }

  /**
   * Cleans up all listeners and timers
   */
  destroy(): void {
    // Clear any active timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Remove all element listeners
    this.listeners.forEach((_, element) => {
      this.removeElementListeners(element);
    });

    this.listeners.clear();
  }
}

// Singleton instance
export const touchHandler = TouchHandler.getInstance();
