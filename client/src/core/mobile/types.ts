/**
 * Mobile Types and Interfaces
 * 
 * Type definitions for mobile utilities including touch gestures, device info,
 * responsive design, and error handling.
 * 
 * @module core/mobile/types
 */

/**
 * Represents a recognized touch gesture with detailed metadata
 */
export interface TouchEvent {
  readonly type: 'tap' | 'double-tap' | 'swipe' | 'pinch' | 'long-press' | 'pan';
  readonly target: HTMLElement;
  readonly coordinates: Readonly<{ x: number; y: number }>;
  readonly direction?: 'up' | 'down' | 'left' | 'right';
  readonly distance?: number;
  readonly duration?: number;
  readonly velocity?: number;
  readonly scale?: number; // For pinch gestures
  readonly timestamp: number;
}

/**
 * Comprehensive device information for responsive behavior
 */
export interface DeviceInfo {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly orientation: 'portrait' | 'landscape';
  readonly hasTouch: boolean;
  readonly pixelRatio: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly platform: string;
  readonly vendor: string;
  readonly isIOS: boolean;
  readonly isAndroid: boolean;
  readonly browserEngine: 'webkit' | 'gecko' | 'blink' | 'unknown';
}

/**
 * Configurable breakpoints for responsive design
 */
export interface ResponsiveBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/**
 * Mobile-specific error context for better debugging
 */
export interface MobileErrorContext {
  readonly deviceInfo: DeviceInfo;
  readonly touchSupport: boolean;
  readonly networkType?: string;
  readonly connectionSpeed?: string;
  readonly memoryInfo?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  readonly timestamp: number;
}

/**
 * Configuration options for touch gestures
 */
export interface TouchConfig {
  tapThreshold?: number; // Max distance in pixels for tap
  tapTimeout?: number; // Max duration in ms for tap
  doubleTapTimeout?: number; // Max time between taps for double-tap
  longPressDelay?: number; // Duration for long press in ms
  swipeThreshold?: number; // Min distance for swipe
  preventDefaultOnTouch?: boolean;
}
