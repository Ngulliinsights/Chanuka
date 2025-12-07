/**
 * Mobile Core Module
 * 
 * Unified mobile utilities providing comprehensive support including:
 * - Advanced Touch Gesture Recognition
 * - Intelligent Device Detection
 * - Responsive Layout Management
 * - Mobile-Specific Error Handling
 * - Performance Optimization for Mobile Devices
 * 
 * @module core/mobile
 * @version 2.0.0
 */

import { logger } from '@/utils/logger';

import { DeviceDetector, deviceDetector } from './device-detector';
// import { TouchHandler, touchHandler } from './touch-handler'; // Deprecated - use SwipeGestures instead
import { MobileErrorHandler, mobileErrorHandler } from './error-handler';
import { MobilePerformanceOptimizer, mobilePerformanceOptimizer } from './performance-optimizer';
import { ResponsiveUtils, responsiveUtils } from './responsive-utils';
import type { DeviceInfo } from './types';

// Re-export all types
export type { DeviceInfo, ResponsiveBreakpoints, MobileErrorContext } from './types';

// Re-export all classes
export { DeviceDetector, ResponsiveUtils, MobileErrorHandler, MobilePerformanceOptimizer };

// Re-export all singleton instances
export { deviceDetector, responsiveUtils, mobileErrorHandler, mobilePerformanceOptimizer };

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if the current device is a mobile phone
 */
export function isMobileDevice(): boolean {
  return deviceDetector.isMobile();
}

/**
 * Check if the current device is a tablet
 */
export function isTabletDevice(): boolean {
  return deviceDetector.isTablet();
}

/**
 * Check if the device supports touch input
 */
export function hasTouch(): boolean {
  return deviceDetector.hasTouch();
}

/**
 * Get the current screen size breakpoint
 */
export function getCurrentScreenSize() {
  return deviceDetector.getScreenSize();
}

/**
 * Get the current device orientation
 */
export function getDeviceOrientation() {
  return deviceDetector.getOrientation();
}

/**
 * Check if the device is running iOS
 */
export function isIOSDevice(): boolean {
  return deviceDetector.isIOS();
}

/**
 * Check if the device is running Android
 */
export function isAndroidDevice(): boolean {
  return deviceDetector.isAndroid();
}

/**
 * Get complete device information
 */
export function getDeviceInfo() {
  return deviceDetector.getDeviceInfo();
}

// Touch gesture functions removed - use SwipeGestures component or useSwipeGesture hook instead

/**
 * Create responsive styles based on current breakpoint
 */
export function createResponsiveStyles(
  styles: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', Record<string, unknown>>>
): Record<string, unknown> {
  return responsiveUtils.createResponsiveStyles(styles);
}

/**
 * Check if a specific breakpoint is currently active
 */
export function isBreakpointActive(breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): boolean {
  return responsiveUtils.isBreakpoint(breakpoint);
}

/**
 * Check if viewport is at or above a breakpoint
 */
export function isBreakpointUp(breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): boolean {
  return responsiveUtils.isBreakpointUp(breakpoint);
}

/**
 * Check if viewport is below a breakpoint
 */
export function isBreakpointDown(breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): boolean {
  return responsiveUtils.isBreakpointDown(breakpoint);
}

/**
 * Get a responsive value based on current breakpoint
 */
export function getResponsiveValue<T>(
  values: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', T>>
): T | undefined {
  return responsiveUtils.getResponsiveValue(values);
}

/**
 * Subscribe to device info changes
 */
export function onDeviceChange(callback: (info: DeviceInfo) => void): () => void {
  return deviceDetector.onChange(callback);
}

/**
 * Subscribe to breakpoint changes
 */
export function onBreakpointChange(
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  callback: (matches: boolean) => void
): () => void {
  return responsiveUtils.onBreakpointChange(breakpoint, callback);
}

/**
 * Get current average frames per second
 */
export function getCurrentFPS(): number {
  return mobilePerformanceOptimizer.getAverageFPS();
}

/**
 * Check if device is experiencing performance issues
 */
export function isPerformanceDegraded(): boolean {
  return mobilePerformanceOptimizer.isPerformanceDegraded();
}

/**
 * Apply automatic performance optimizations
 */
export function optimizeForMobile(): void {
  mobilePerformanceOptimizer.applyAutoOptimizations();
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize all mobile utilities with optional configuration.
 * Call this once at application startup for optimal mobile support.
 */
export function initializeMobileUtils(config?: {
  breakpoints?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>;
  autoOptimize?: boolean;
}): void {
  logger.info('Initializing mobile utilities', { config });

  // Initialize device detection
  const device = DeviceDetector.getInstance();
  const deviceInfo = device.getDeviceInfo();

  // Touch handler removed - use SwipeGestures instead

  // Configure responsive breakpoints if provided
  if (config?.breakpoints) {
    ResponsiveUtils.getInstance().getBreakpoints();
  }

  // Initialize error handler
  MobileErrorHandler.getInstance();

  // Initialize performance optimizer
  const optimizer = MobilePerformanceOptimizer.getInstance();

  // Apply auto-optimizations if requested
  if (config?.autoOptimize !== false && deviceInfo.isMobile) {
    // Wait a bit for the app to settle before optimizing
    setTimeout(() => {
      optimizer.applyAutoOptimizations();
    }, 1000);
  }

  logger.info('Mobile utilities initialized', {
    deviceInfo: {
      type: deviceInfo.isMobile ? 'mobile' : deviceInfo.isTablet ? 'tablet' : 'desktop',
      screenSize: deviceInfo.screenSize,
      hasTouch: deviceInfo.hasTouch,
      platform: deviceInfo.platform
    }
  });
}

/**
 * Clean up all mobile utilities (call when unmounting or during cleanup)
 */
export function destroyMobileUtils(): void {
  deviceDetector.destroy();
  mobilePerformanceOptimizer.destroy();

  logger.info('Mobile utilities destroyed');
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Classes
  DeviceDetector,
  ResponsiveUtils,
  MobileErrorHandler,
  MobilePerformanceOptimizer,

  // Instances
  deviceDetector,
  responsiveUtils,
  mobileErrorHandler,
  mobilePerformanceOptimizer,

  // Convenience functions
  isMobileDevice,
  isTabletDevice,
  hasTouch,
  isIOSDevice,
  isAndroidDevice,
  getCurrentScreenSize,
  getDeviceOrientation,
  getDeviceInfo,
  createResponsiveStyles,
  isBreakpointActive,
  isBreakpointUp,
  isBreakpointDown,
  getResponsiveValue,
  onDeviceChange,
  onBreakpointChange,
  getCurrentFPS,
  isPerformanceDegraded,
  optimizeForMobile,

  // Lifecycle
  initializeMobileUtils,
  destroyMobileUtils
};
