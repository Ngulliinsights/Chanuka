/**
 * Mobile Types and Interfaces
 *
 * Re-exports from unified types/mobile for backward compatibility.
 * This module is deprecated; import from types/mobile instead.
 *
 * @module core/mobile/types
 * @deprecated Use types/mobile instead
 */

// Re-export all unified types
export type {
  GestureType,
  SwipeDirection,
  GestureEvent,
  SwipeGestureData,
  SwipeEvent,
  GestureConfig,
  SafeAreaInsets,
  DeviceInfo,
  MobileLayoutContextValue,
  MobileTab,
  PullToRefreshConfig,
  BottomSheetConfig,
  InfiniteScrollConfig,
  ViewportConfig,
  MobileAnimationOptions,
  HapticFeedbackPattern,
  HapticFeedbackConfig,
  ResponsiveBreakpoint,
  MobileComponentSize,
  DataPoint,
  ChartData,
  ScrollPosition,
  ScrollState,
  MobileKeyboardEvent,
  ResponsiveBreakpoints,
  MobileErrorContext,
} from '../../shared/types/mobile';

// Backward compatibility aliases
/**
 * @deprecated Use GestureEvent instead
 */
export type TouchEvent = import('../../types/mobile').GestureEvent;

/**
 * @deprecated Use GestureConfig instead
 */
export type TouchConfig = import('../../types/mobile').GestureConfig;

export interface DeviceInfo {
  // Generated interface
  [key: string]: any;
}

export class MobileErrorContext extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MobileErrorContext';
  }
}

export type ResponsiveBreakpoints = any; // Generated type - please implement
