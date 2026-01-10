/**
 * Mobile Configuration
 *
 * Global configuration for mobile-specific settings including breakpoints,
 * safe areas, and default behaviors.
 *
 * @module config/mobile
 */

import { DeviceDetector } from '@client/core/mobile';

/**
 * Mobile device breakpoints
 * Used for responsive design decisions
 */
export const MOBILE_BREAKPOINTS = {
  /** Extra small phones (320px and up) */
  XS: 320,
  /** Small phones (480px and up) */
  SM: 480,
  /** Medium phones/small tablets (640px and up) */
  MD: 640,
  /** Large tablets (768px and up) */
  LG: 768,
  /** Extra large tablets/small desktops (1024px and up) */
  XL: 1024,
  /** Large desktops (1280px and up) */
  '2XL': 1280,
} as const;

/**
 * Device type detection helpers
 */
export const DEVICE_TYPES = {
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

/**
 * Determine device type using comprehensive device detection
 */
export function getDeviceType(): string {
  return DeviceDetector.getInstance().getDeviceInfo().deviceType;
}

/**
 * Mobile safe area insets (notch support)
 * Populated by viewport-fit detection
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Get default safe area insets
 * These are overridden by actual viewport-fit values
 */
export const DEFAULT_SAFE_AREA_INSETS: SafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

/**
 * Mobile view dimensions
 */
export const MOBILE_DIMENSIONS = {
  /** Standard iOS tab bar height */
  TAB_BAR_HEIGHT: 49,
  /** Standard iOS navigation bar height */
  NAV_BAR_HEIGHT: 44,
  /** Standard touch target size (WCAG) */
  TOUCH_TARGET: 44,
  /** Standard spacing unit */
  SPACING_UNIT: 4,
} as const;

/**
 * Viewport orientation types
 */
export const ORIENTATIONS = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
} as const;

/**
 * Get viewport orientation using device detection
 */
export function getOrientation(): string {
  return DeviceDetector.getInstance().getOrientation();
}

/**
 * Mobile-specific feature detection
 */
export const MOBILE_FEATURES = {
  /** Support for touch events */
  TOUCH_EVENTS: typeof window !== 'undefined' && 'ontouchstart' in window,
  /** Support for pointer events */
  POINTER_EVENTS: typeof window !== 'undefined' && 'PointerEvent' in window,
  /** Support for device motion API */
  MOTION_EVENTS: typeof window !== 'undefined' && 'DeviceMotionEvent' in window,
  /** Support for orientation API */
  ORIENTATION_API: typeof window !== 'undefined' && 'orientationchange' in window,
  /** Support for vibration API */
  VIBRATION_API: typeof window !== 'undefined' && 'vibrate' in navigator,
  /** Support for battery API */
  BATTERY_API: typeof window !== 'undefined' && 'getBattery' in navigator,
  /** Support for page visibility API */
  VISIBILITY_API: typeof window !== 'undefined' && 'visibilityState' in document,
} as const;

/**
 * Performance thresholds for mobile
 */
export const MOBILE_PERFORMANCE_THRESHOLDS = {
  /** Maximum time for first paint (ms) */
  FIRST_PAINT_MAX: 1000,
  /** Maximum time for first contentful paint (ms) */
  FIRST_CONTENTFUL_PAINT_MAX: 1500,
  /** Maximum cumulative layout shift */
  CUMULATIVE_LAYOUT_SHIFT_MAX: 0.1,
  /** Maximum first input delay (ms) */
  FIRST_INPUT_DELAY_MAX: 100,
  /** Maximum bundle size (bytes) */
  BUNDLE_SIZE_MAX: 150000, // 150KB
  /** Maximum chunk count */
  CHUNK_COUNT_MAX: 10,
} as const;

/**
 * Mobile animation timing defaults
 */
export const MOBILE_ANIMATION_TIMING = {
  /** Fast animations (ms) */
  FAST: 150,
  /** Standard animations (ms) */
  STANDARD: 300,
  /** Slow animations (ms) */
  SLOW: 500,
  /** Transition between views (ms) */
  VIEW_TRANSITION: 400,
  /** Gesture response time (ms) */
  GESTURE_RESPONSE: 50,
} as const;
