/**
 * Core mobile type declarations
 */

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenSize: {
    width: number;
    height: number;
  };
  touchSupport: boolean;
}

export interface MobileGesture {
  type: 'swipe' | 'pinch' | 'tap' | 'longPress';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
}

export interface MobileConfig {
  enableGestures: boolean;
  swipeThreshold: number;
  tapTimeout: number;
  longPressTimeout: number;
}
