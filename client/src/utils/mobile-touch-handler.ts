/**
 * Mobile Touch Handler Utility
 * Provides enhanced touch interaction support for mobile devices
 */

import { useState, useEffect } from 'react';

export interface TouchHandlerOptions {
  preventScroll?: boolean;
  threshold?: number;
  timeout?: number;
  enableHapticFeedback?: boolean;
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

export interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

export class MobileTouchHandler {
  private startTouch: TouchPosition | null = null;
  private currentTouch: TouchPosition | null = null;
  private options: Required<TouchHandlerOptions>;
  private element: HTMLElement;
  private is_active = false;

  constructor(element: HTMLElement, options: TouchHandlerOptions = {}) {
    this.element = element;
    this.options = {
      preventScroll: options.preventScroll ?? false,
      threshold: options.threshold ?? 50,
      timeout: options.timeout ?? 300,
      enableHapticFeedback: options.enableHapticFeedback ?? true,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use passive listeners for better performance
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { 
      passive: !this.options.preventScroll 
    });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { 
      passive: !this.options.preventScroll 
    });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { 
      passive: true 
    });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { 
      passive: true 
    });

    // Add pointer events for better cross-device support
    if ('PointerEvent' in window) {
      this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
      this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
      this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
      this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0]!;
    this.startTouch = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
    this.currentTouch = { ...this.startTouch };
    this.is_active = true;

    if (this.options.preventScroll) {
      event.preventDefault();
    }

    // Provide haptic feedback on supported devices
    this.triggerHapticFeedback('light');
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.is_active || event.touches.length !== 1) return;

    const touch = event.touches[0]!;
    this.currentTouch = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    if (this.options.preventScroll) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(): void {
    if (!this.is_active || !this.startTouch || !this.currentTouch) return;

    const swipe = this.calculateSwipe();
    if (swipe) {
      this.onSwipe?.(swipe);
      this.triggerHapticFeedback('medium');
    } else {
      this.onTap?.({
        x: this.currentTouch.x,
        y: this.currentTouch.y,
        duration: this.currentTouch.timestamp - this.startTouch.timestamp,
      });
      this.triggerHapticFeedback('light');
    }

    this.reset();
  }

  private handleTouchCancel(): void {
    this.reset();
  }

  // Pointer event handlers for cross-device compatibility
  private handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.startTouch = {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now(),
      };
      this.currentTouch = { ...this.startTouch };
      this.is_active = true;
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.is_active || event.pointerType !== 'touch') return;

    this.currentTouch = {
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now(),
    };
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.is_active || event.pointerType !== 'touch') return;
    this.handleTouchEnd();
  }

  private handlePointerCancel(): void {
    this.reset();
  }

  private calculateSwipe(): SwipeDirection | null {
    if (!this.startTouch || !this.currentTouch) return null;

    const deltaX = this.currentTouch.x - this.startTouch.x;
    const deltaY = this.currentTouch.y - this.startTouch.y;
    const deltaTime = this.currentTouch.timestamp - this.startTouch.timestamp;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < this.options.threshold || deltaTime > this.options.timeout) {
      return null;
    }

    const velocity = distance / deltaTime;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let direction: SwipeDirection['direction'];
    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return { direction, distance, velocity };
  }

  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy'): void {
    if (!this.options.enableHapticFeedback || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };

    navigator.vibrate(patterns[intensity]);
  }

  private reset(): void {
    this.startTouch = null;
    this.currentTouch = null;
    this.is_active = false;
  }

  // Event handlers (to be set by consumers)
  public onSwipe?: (swipe: SwipeDirection) => void;
  public onTap?: (tap: { x: number; y: number; duration: number }) => void;

  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));

    if ('PointerEvent' in window) {
      this.element.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
      this.element.removeEventListener('pointermove', this.handlePointerMove.bind(this));
      this.element.removeEventListener('pointerup', this.handlePointerUp.bind(this));
      this.element.removeEventListener('pointercancel', this.handlePointerCancel.bind(this));
    }

    this.reset();
  }
}

/**
 * Hook for using mobile touch handler in React components
 */
export function useMobileTouchHandler(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchHandlerOptions = {}
) {
  const [touchHandler, setTouchHandler] = useState<MobileTouchHandler | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const handler = new MobileTouchHandler(elementRef.current, options);
    setTouchHandler(handler);

    return () => {
      handler.destroy();
    };
  }, [elementRef, options]);

  return touchHandler;
}

/**
 * Utility functions for mobile touch detection and optimization
 */
export const MobileTouchUtils = {
  /**
   * Check if the device supports touch
   */
  isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  },

  /**
   * Get optimal touch target size based on device
   */
  getOptimalTouchTargetSize(): number {
    // iOS Human Interface Guidelines recommend 44pt minimum
    // Android Material Design recommends 48dp minimum
    // We use 44px as a safe minimum
    return Math.max(44, window.devicePixelRatio * 44);
  },

  /**
   * Check if device is in landscape mode
   */
  isLandscape(): boolean {
    return window.innerWidth > window.innerHeight;
  },

  /**
   * Get safe area insets for devices with notches
   */
  getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  },

  /**
   * Prevent zoom on double tap for specific elements
   */
  preventZoomOnDoubleTap(element: HTMLElement): void {
    let lastTouchEnd = 0;
    element.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  },

  /**
   * Optimize scrolling performance on mobile
   */
  optimizeScrolling(element: HTMLElement): void {
    (element.style as any).webkitOverflowScrolling = 'touch';
    element.style.overscrollBehavior = 'contain';
  },
};











































