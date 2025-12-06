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
  | 'swipe'
  | 'tap'
  | 'long-press'
  | 'pull-to-refresh'
  | 'pinch'
  | 'rotate';

/**
 * Gesture event data
 */
export interface GestureEvent {
  type: GestureType;
  timestamp: number;
  target?: EventTarget;
  direction?: SwipeDirection;
  velocity?: number;
  distance?: number;
  angle?: number;
  scale?: number;
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
 * Touch event configuration
 */
export interface TouchConfig {
  enableSwipe?: boolean;
  enableLongPress?: boolean;
  enableTap?: boolean;
  onSwipe?: (data: SwipeGestureData) => void;
  onLongPress?: (e: TouchEvent) => void;
  onTap?: (e: TouchEvent) => void;
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
