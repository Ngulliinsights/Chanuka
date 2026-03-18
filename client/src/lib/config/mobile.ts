/**
 * Mobile Configuration
 *
 * Global configuration for mobile-specific settings including breakpoints,
 * safe areas, and default behaviors.
 *
 * @module config/mobile
 */

import { DeviceDetector } from '@client/infrastructure/mobile';

/**
 * Mobile device breakpoints
 * Used for responsive design decisions
 */
export 
/**
 * Device type detection helpers
 */
export 
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
export 
/**
 * Viewport orientation types
 */
export 
/**
 * Get viewport orientation using device detection
 */
export function getOrientation(): string {
  return DeviceDetector.getInstance().getOrientation();
}

/**
 * Mobile-specific feature detection
 */
export 
/**
 * Performance thresholds for mobile
 */
export 
/**
 * Mobile animation timing defaults
 */
export 