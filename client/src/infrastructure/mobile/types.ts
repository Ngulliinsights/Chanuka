export interface ResponsiveBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'phone' | 'tablet' | 'desktop';
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string;
  screenWidth: number;
  screenHeight: number;
  orientation: 'landscape' | 'portrait';
  hasTouch: boolean;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  platform: string;
  vendor: string;
  isIOS: boolean;
  isAndroid: boolean;
  browserEngine: 'webkit' | 'gecko' | 'blink' | 'unknown';
}

export interface TouchEvent {
  type: string;
  target: EventTarget | null;
  // Coordinates as expected by TouchHandler
  coordinates: { x: number; y: number };
  x?: number; // legacy support if needed
  y?: number; // legacy support if needed
  timestamp: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
  velocity?: number;
  scale?: number;
}

export interface TouchConfig {
  threshold?: number;
  velocity?: number;
  preventDefault?: boolean;
  
  // Expanded properties for TouchHandler
  enableSwipe?: boolean;
  enableLongPress?: boolean;
  enableTap?: boolean;
  tapThreshold?: number;
  tapTimeout?: number;
  doubleTapTimeout?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  preventDefaultOnTouch?: boolean;
  
  onSwipe?: (e: TouchEvent) => void;
  onLongPress?: (e: TouchEvent) => void;
  onTap?: (e: TouchEvent) => void;
}

export type MobileErrorContext = Record<string, unknown>;
