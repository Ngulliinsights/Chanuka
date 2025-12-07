/**
 * Mobile Type Definitions
 *
 * Unified TypeScript types for all mobile components and hooks.
 * Single source of truth for mobile-specific interfaces.
 *
 * @module types/mobile
 */

/**
 * Gesture direction enumeration
 */
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Gesture types
 */
export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'swipe'
  | 'pinch'
  | 'long-press'
  | 'pan'
  | 'pull-to-refresh'
  | 'rotate';

/**
 * Gesture event data
 */
export interface GestureEvent {
  readonly type: GestureType;
  readonly timestamp: number;
  readonly target?: EventTarget;
  readonly coordinates?: Readonly<{ x: number; y: number }>;
  readonly direction?: SwipeDirection;
  readonly velocity?: number;
  readonly distance?: number;
  readonly duration?: number;
  readonly angle?: number;
  readonly scale?: number;
}

/**
 * Swipe gesture details
 */
export interface SwipeGestureData {
  direction: SwipeDirection;
  velocity: number;
  distance: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Alias for SwipeGestureData used in event handlers
 */
export type SwipeEvent = SwipeGestureData;

/**
 * Gesture configuration options
 */
export interface GestureConfig {
  // Enable flags
  enableSwipe?: boolean;
  enableLongPress?: boolean;
  enableTap?: boolean;
  // Thresholds
  tapThreshold?: number; // Max distance in pixels for tap
  tapTimeout?: number; // Max duration in ms for tap
  doubleTapTimeout?: number; // Max time between taps for double-tap
  longPressDelay?: number; // Duration for long press in ms
  swipeThreshold?: number; // Min distance for swipe
  // Callbacks
  onSwipe?: (data: SwipeGestureData) => void;
  onLongPress?: (e: GestureEvent) => void;
  onTap?: (e: GestureEvent) => void;
  // Other
  preventDefaultOnTouch?: boolean;
}

/**
 * Mobile layout context value
 */
export interface MobileLayoutContextValue {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: SafeAreaInsets;
  screenWidth: number;
  screenHeight: number;
  deviceType: 'phone' | 'tablet' | 'desktop';
}

/**
 * Safe area insets (notch support)
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Comprehensive device information for responsive behavior
 */
export interface DeviceInfo {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly deviceType: 'phone' | 'tablet' | 'desktop';
  readonly screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly orientation: 'portrait' | 'landscape';
  readonly hasTouch: boolean;
  readonly pixelRatio: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly platform: string;
  readonly vendor: string;
  readonly isIOS: boolean;
  readonly isAndroid: boolean;
  readonly browserEngine: 'webkit' | 'gecko' | 'blink' | 'unknown';
  readonly safeAreaInsets?: SafeAreaInsets;
}

/**
 * Mobile tab configuration
 */
export interface MobileTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

/**
 * Pull to refresh configuration
 */
export interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxDistance?: number;
  refreshing?: boolean;
  disabled?: boolean;
}

/**
 * Bottom sheet configuration
 */
export interface BottomSheetConfig {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[];
  initialSnap?: number;
  dismissOnBackdropPress?: boolean;
  dismissOnDrag?: boolean;
}

/**
 * Infinite scroll configuration
 */
export interface InfiniteScrollConfig {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

/**
 * Mobile viewport configuration
 */
export interface ViewportConfig {
  width: number;
  height: number;
  pixelRatio: number;
  safeArea: SafeAreaInsets;
  orientation: 'portrait' | 'landscape';
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
  '2xl': number;
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
 * Mobile animation options
 */
export interface MobileAnimationOptions {
  duration?: number;
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number;
  useNativeDriver?: boolean;
}

/**
 * Haptic feedback pattern types
 */
export type HapticFeedbackPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Haptic feedback configuration
 */
export interface HapticFeedbackConfig {
  enabled: boolean;
  intensity: number; // 0-1
  pattern?: HapticFeedbackPattern;
}

/**
 * Mobile responsive breakpoint
 */
export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Mobile component size variant
 */
export type MobileComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Data visualization point for charts
 */
export interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * Chart data structure
 */
export interface ChartData {
  title?: string;
  data: DataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * Mobile scroll position
 */
export interface ScrollPosition {
  x: number;
  y: number;
  isAtTop: boolean;
  isAtBottom: boolean;
}

/**
 * Mobile scroll state
 */
export interface ScrollState extends ScrollPosition {
  velocity: number;
  isScrolling: boolean;
}

/**
 * Mobile keyboard event
 */
export interface MobileKeyboardEvent {
  keyboardHeight: number;
  duration: number;
  easing: string;
}
