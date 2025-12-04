/**
 * Mobile Utilities - Optimized Consolidated Module
 * 
 * This module provides comprehensive mobile support including:
 * - Advanced Touch Gesture Recognition
 * - Intelligent Device Detection
 * - Responsive Layout Management
 * - Mobile-Specific Error Handling
 * - Performance Optimization for Mobile Devices
 * 
 * @module mobile-utils
 * @version 2.0.0
 */

import { logger } from './logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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

// ============================================================================
// DEVICE DETECTION
// ============================================================================

/**
 * Singleton class for detecting and monitoring device characteristics.
 * Uses modern APIs and fallbacks to accurately identify mobile devices,
 * screen sizes, and capabilities.
 */
export class DeviceDetector {
  private static instance: DeviceDetector;
  private deviceInfo: DeviceInfo | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private orientationMediaQuery: MediaQueryList | null = null;
  private callbacks: Set<(info: DeviceInfo) => void> = new Set();

  private constructor() {
    this.detectDevice();
    this.setupEventListeners();
  }

  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * Performs comprehensive device detection using multiple signals
   * to ensure accurate identification across different browsers
   */
  private detectDevice(): void {
    // Handle server-side rendering gracefully
    if (typeof window === 'undefined') {
      this.deviceInfo = this.getDefaultDeviceInfo();
      return;
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform || '';
    const vendor = navigator.vendor || '';
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Improved mobile detection using multiple signals
    const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = width < 768;

    // Combine signals for accurate detection
    const isMobile = (isMobileUA || (isTouchDevice && isSmallScreen)) && !isTabletUA;
    const isTablet = isTabletUA || (isTouchDevice && width >= 768 && width < 1024);
    const isDesktop = !isMobile && !isTablet;

    // Detect specific platforms
    const isIOS = /iphone|ipad|ipod/i.test(userAgent) || 
                  (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(userAgent);

    // Detect browser engine
    const browserEngine = this.detectBrowserEngine(userAgent);

    this.deviceInfo = {
      isMobile,
      isTablet,
      isDesktop,
      screenSize: this.calculateScreenSize(width),
      orientation: width > height ? 'landscape' : 'portrait',
      hasTouch: isTouchDevice,
      pixelRatio: window.devicePixelRatio || 1,
      viewportWidth: width,
      viewportHeight: height,
      platform,
      vendor,
      isIOS,
      isAndroid,
      browserEngine
    };

    // Notify subscribers of device info changes
    this.notifyCallbacks();
  }

  private detectBrowserEngine(userAgent: string): DeviceInfo['browserEngine'] {
    if (/webkit/i.test(userAgent) && !/chrome|chromium|edg/i.test(userAgent)) {
      return 'webkit';
    } else if (/gecko/i.test(userAgent) && /firefox/i.test(userAgent)) {
      return 'gecko';
    } else if (/chrome|chromium|edg/i.test(userAgent)) {
      return 'blink';
    }
    return 'unknown';
  }

  private getDefaultDeviceInfo(): DeviceInfo {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenSize: 'lg',
      orientation: 'landscape',
      hasTouch: false,
      pixelRatio: 1,
      viewportWidth: 1024,
      viewportHeight: 768,
      platform: 'unknown',
      vendor: 'unknown',
      isIOS: false,
      isAndroid: false,
      browserEngine: 'unknown'
    };
  }

  private calculateScreenSize(width: number): DeviceInfo['screenSize'] {
    if (width < 576) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    return 'xl';
  }

  /**
   * Sets up efficient event listeners using modern APIs where available.
   * Falls back to traditional events for broader compatibility.
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Use ResizeObserver for efficient resize detection
    if ('ResizeObserver' in window && window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.detectDevice();
      });
      this.resizeObserver.observe(document.documentElement);
    } else {
      // Fallback to resize event with debouncing
      let resizeTimeout: NodeJS.Timeout;
      (window as Window).addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.detectDevice(), 150);
      });
    }

    // Use matchMedia for orientation changes (more reliable than orientationchange)
    if (window.matchMedia) {
      this.orientationMediaQuery = window.matchMedia('(orientation: portrait)');
      if (this.orientationMediaQuery) {
        this.orientationMediaQuery.addEventListener('change', () => {
          // Small delay to ensure dimensions are updated
          setTimeout(() => this.detectDevice(), 100);
        });
      }
    } else {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.detectDevice(), 100);
      });
    }
  }

  /**
   * Registers a callback to be notified when device info changes.
   * Useful for components that need to respond to orientation or resize events.
   */
  onChange(callback: (info: DeviceInfo) => void): () => void {
    this.callbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyCallbacks(): void {
    if (!this.deviceInfo) return;
    this.callbacks.forEach(callback => {
      try {
        callback(this.deviceInfo!);
      } catch (error) {
        logger.error('Error in device info callback', { error });
      }
    });
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo || this.getDefaultDeviceInfo();
  }

  isMobile(): boolean {
    return this.deviceInfo?.isMobile || false;
  }

  isTablet(): boolean {
    return this.deviceInfo?.isTablet || false;
  }

  isDesktop(): boolean {
    return this.deviceInfo?.isDesktop || true;
  }

  hasTouch(): boolean {
    return this.deviceInfo?.hasTouch || false;
  }

  isIOS(): boolean {
    return this.deviceInfo?.isIOS || false;
  }

  isAndroid(): boolean {
    return this.deviceInfo?.isAndroid || false;
  }

  getScreenSize(): DeviceInfo['screenSize'] {
    return this.deviceInfo?.screenSize || 'lg';
  }

  getOrientation(): DeviceInfo['orientation'] {
    return this.deviceInfo?.orientation || 'landscape';
  }

  /**
   * Cleans up all event listeners and observers
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.orientationMediaQuery) {
      this.orientationMediaQuery.removeEventListener('change', () => {});
      this.orientationMediaQuery = null;
    }
    this.callbacks.clear();
  }
}

// ============================================================================
// TOUCH HANDLER
// ============================================================================

/**
 * Advanced touch gesture recognition system with support for multiple
 * simultaneous gestures and configurable thresholds.
 */
export class TouchHandler {
  private static instance: TouchHandler;
  private listeners: Map<HTMLElement, Map<string, Set<(event: TouchEvent) => void>>> = new Map();
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private lastTapTime: number = 0;
  private lastTapPos: { x: number; y: number } = { x: 0, y: 0 };
  private longPressTimer: NodeJS.Timeout | null = null;
  private initialPinchDistance: number = 0;
  private config: Required<TouchConfig>;
  private boundHandlers: WeakMap<HTMLElement, {
    touchstart: (e: globalThis.TouchEvent) => void;
    touchend: (e: globalThis.TouchEvent) => void;
    touchmove: (e: globalThis.TouchEvent) => void;
    touchcancel: (e: globalThis.TouchEvent) => void;
  }> = new WeakMap();

  private constructor(config: TouchConfig = {}) {
    this.config = {
      tapThreshold: config.tapThreshold || 10,
      tapTimeout: config.tapTimeout || 300,
      doubleTapTimeout: config.doubleTapTimeout || 300,
      longPressDelay: config.longPressDelay || 500,
      swipeThreshold: config.swipeThreshold || 30,
      preventDefaultOnTouch: config.preventDefaultOnTouch ?? false
    };
  }

  static getInstance(config?: TouchConfig): TouchHandler {
    if (!TouchHandler.instance) {
      TouchHandler.instance = new TouchHandler(config);
    }
    return TouchHandler.instance;
  }

  /**
   * Updates the configuration for touch gesture recognition
   */
  updateConfig(config: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addTouchListener(
    element: HTMLElement,
    eventType: TouchEvent['type'],
    callback: (event: TouchEvent) => void
  ): void {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
      this.setupElementListeners(element);
    }

    const elementListeners = this.listeners.get(element)!;
    if (!elementListeners.has(eventType)) {
      elementListeners.set(eventType, new Set());
    }

    elementListeners.get(eventType)!.add(callback);
  }

  removeTouchListener(
    element: HTMLElement,
    eventType: TouchEvent['type'],
    callback: (event: TouchEvent) => void
  ): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    const typeListeners = elementListeners.get(eventType);
    if (!typeListeners) return;

    typeListeners.delete(callback);

    // Clean up empty listener sets
    if (typeListeners.size === 0) {
      elementListeners.delete(eventType);
    }

    if (elementListeners.size === 0) {
      this.listeners.delete(element);
      this.removeElementListeners(element);
    }
  }

  /**
   * Removes all listeners for a specific element
   */
  removeAllListeners(element: HTMLElement): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    elementListeners.clear();
    this.listeners.delete(element);
    this.removeElementListeners(element);
  }

  private setupElementListeners(element: HTMLElement): void {
    // Create bound handlers that we can properly remove later
    const handlers = {
      touchstart: this.handleTouchStart.bind(this),
      touchend: this.handleTouchEnd.bind(this),
      touchmove: this.handleTouchMove.bind(this),
      touchcancel: this.handleTouchCancel.bind(this)
    };

    this.boundHandlers.set(element, handlers);

    const options = { 
      passive: !this.config.preventDefaultOnTouch,
      capture: false
    };

    element.addEventListener('touchstart', handlers.touchstart, options);
    element.addEventListener('touchend', handlers.touchend, options);
    element.addEventListener('touchmove', handlers.touchmove, options);
    element.addEventListener('touchcancel', handlers.touchcancel, options);
  }

  private removeElementListeners(element: HTMLElement): void {
    const handlers = this.boundHandlers.get(element);
    if (!handlers) return;

    element.removeEventListener('touchstart', handlers.touchstart);
    element.removeEventListener('touchend', handlers.touchend);
    element.removeEventListener('touchmove', handlers.touchmove);
    element.removeEventListener('touchcancel', handlers.touchcancel);

    this.boundHandlers.delete(element);
  }

  private handleTouchStart(event: globalThis.TouchEvent): void {
    const touch = event.touches[0];
    const now = Date.now();

    this.touchStartTime = now;
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // Detect pinch gesture (two fingers)
    if (event.touches.length === 2) {
      this.initialPinchDistance = this.calculateDistance(
        event.touches[0],
        event.touches[1]
      );
    }

    // Setup long press detection
    this.longPressTimer = setTimeout(() => {
      const target = event.target as HTMLElement;
      this.triggerTouchEvent(target, {
        type: 'long-press',
        target,
        coordinates: this.touchStartPos,
        duration: Date.now() - this.touchStartTime,
        timestamp: Date.now()
      });
    }, this.config.longPressDelay);

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: globalThis.TouchEvent): void {
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const touch = event.changedTouches[0];
    const endPos = { x: touch.clientX, y: touch.clientY };
    const now = Date.now();
    const duration = now - this.touchStartTime;
    const distance = this.calculateDistanceFromPoints(this.touchStartPos, endPos);

    const target = event.target as HTMLElement;

    // Detect tap or double-tap
    if (distance < this.config.tapThreshold && duration < this.config.tapTimeout) {
      const timeSinceLastTap = now - this.lastTapTime;
      const distanceFromLastTap = this.calculateDistanceFromPoints(this.lastTapPos, endPos);

      if (
        timeSinceLastTap < this.config.doubleTapTimeout &&
        distanceFromLastTap < this.config.tapThreshold
      ) {
        // Double tap detected
        this.triggerTouchEvent(target, {
          type: 'double-tap',
          target,
          coordinates: endPos,
          duration,
          timestamp: now
        });
        // Reset to prevent triple-tap
        this.lastTapTime = 0;
      } else {
        // Single tap
        this.triggerTouchEvent(target, {
          type: 'tap',
          target,
          coordinates: endPos,
          duration,
          timestamp: now
        });
        this.lastTapTime = now;
        this.lastTapPos = endPos;
      }
    } 
    // Detect swipe
    else if (distance > this.config.swipeThreshold) {
      const direction = this.getSwipeDirection(this.touchStartPos, endPos);
      const velocity = distance / duration; // pixels per millisecond

      this.triggerTouchEvent(target, {
        type: 'swipe',
        target,
        coordinates: endPos,
        direction,
        distance,
        duration,
        velocity,
        timestamp: now
      });
    }

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchMove(event: globalThis.TouchEvent): void {
    // Cancel long press if finger moves too much
    if (this.longPressTimer) {
      const touch = event.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = this.calculateDistanceFromPoints(this.touchStartPos, currentPos);

      if (distance > this.config.tapThreshold) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;

        // Trigger pan gesture
        const target = event.target as HTMLElement;
        const direction = this.getSwipeDirection(this.touchStartPos, currentPos);
        
        this.triggerTouchEvent(target, {
          type: 'pan',
          target,
          coordinates: currentPos,
          direction,
          distance,
          duration: Date.now() - this.touchStartTime,
          timestamp: Date.now()
        });
      }
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && this.initialPinchDistance > 0) {
      const currentDistance = this.calculateDistance(
        event.touches[0],
        event.touches[1]
      );
      const scale = currentDistance / this.initialPinchDistance;

      const target = event.target as HTMLElement;
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      this.triggerTouchEvent(target, {
        type: 'pinch',
        target,
        coordinates: { x: centerX, y: centerY },
        scale,
        duration: Date.now() - this.touchStartTime,
        timestamp: Date.now()
      });
    }

    if (this.config.preventDefaultOnTouch) {
      event.preventDefault();
    }
  }

  private handleTouchCancel(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private calculateDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateDistanceFromPoints(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getSwipeDirection(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): TouchEvent['direction'] {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private triggerTouchEvent(element: HTMLElement, touchEvent: TouchEvent): void {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return;

    const typeListeners = elementListeners.get(touchEvent.type);
    if (!typeListeners) return;

    // Use Array.from to avoid issues if callbacks modify the set
    Array.from(typeListeners).forEach(callback => {
      try {
        callback(touchEvent);
      } catch (error) {
        logger.error('Touch event callback error', { 
          error, 
          touchEvent: { ...touchEvent, target: undefined } // Avoid circular refs
        });
      }
    });
  }

  /**
   * Cleans up all listeners and timers
   */
  destroy(): void {
    // Clear any active timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Remove all element listeners
    this.listeners.forEach((_, element) => {
      this.removeElementListeners(element);
    });

    this.listeners.clear();
  }
}

// ============================================================================
// RESPONSIVE LAYOUT UTILITIES
// ============================================================================

/**
 * Utility class for managing responsive layouts and breakpoints.
 * Provides methods for creating responsive styles and checking breakpoint states.
 */
export class ResponsiveUtils {
  private static instance: ResponsiveUtils;
  private breakpoints: ResponsiveBreakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200
  };
  private mediaQueries: Map<string, MediaQueryList> = new Map();

  private constructor() {
    this.setupMediaQueries();
  }

  static getInstance(): ResponsiveUtils {
    if (!ResponsiveUtils.instance) {
      ResponsiveUtils.instance = new ResponsiveUtils();
    }
    return ResponsiveUtils.instance;
  }

  /**
   * Sets up MediaQueryList objects for efficient breakpoint monitoring
   */
  private setupMediaQueries(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    Object.entries(this.breakpoints).forEach(([name, width]) => {
      if (width > 0) {
        const mq = window.matchMedia(`(min-width: ${width}px)`);
        this.mediaQueries.set(name, mq);
      }
    });
  }

  setBreakpoints(breakpoints: Partial<ResponsiveBreakpoints>): void {
    this.breakpoints = { ...this.breakpoints, ...breakpoints };
    this.mediaQueries.clear();
    this.setupMediaQueries();
  }

  getBreakpoints(): Readonly<ResponsiveBreakpoints> {
    return { ...this.breakpoints };
  }

  getCurrentBreakpoint(): keyof ResponsiveBreakpoints {
    if (typeof window === 'undefined') return 'lg';

    const width = window.innerWidth;
    const breakpoints = Object.entries(this.breakpoints)
      .sort(([, a], [, b]) => b - a);

    for (const [name, minWidth] of breakpoints) {
      if (width >= minWidth) {
        return name as keyof ResponsiveBreakpoints;
      }
    }

    return 'xs';
  }

  isBreakpoint(breakpoint: keyof ResponsiveBreakpoints): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  isBreakpointUp(breakpoint: keyof ResponsiveBreakpoints): boolean {
    if (typeof window === 'undefined') return true;
    
    const mq = this.mediaQueries.get(breakpoint);
    if (mq) return mq.matches;
    
    return window.innerWidth >= this.breakpoints[breakpoint];
  }

  isBreakpointDown(breakpoint: keyof ResponsiveBreakpoints): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < this.breakpoints[breakpoint];
  }

  /**
   * Registers a callback for when a specific breakpoint becomes active or inactive
   */
  onBreakpointChange(
    breakpoint: keyof ResponsiveBreakpoints,
    callback: (matches: boolean) => void
  ): () => void {
    const mq = this.mediaQueries.get(breakpoint);
    if (!mq) {
      logger.warn(`No media query for breakpoint: ${breakpoint}`);
      return () => {};
    }

    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    mq.addEventListener('change', handler);

    // Return cleanup function
    return () => mq.removeEventListener('change', handler);
  }

  /**
   * Creates a style object based on the current breakpoint.
   * Applies styles progressively from smallest to current breakpoint.
   */
  createResponsiveStyles(
    styles: Partial<Record<keyof ResponsiveBreakpoints, Record<string, unknown>>>
  ): Record<string, unknown> {
    const currentBreakpoint = this.getCurrentBreakpoint();
    const breakpointOrder: (keyof ResponsiveBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    
    let finalStyles: Record<string, unknown> = {};

    for (const bp of breakpointOrder) {
      if (styles[bp]) {
        finalStyles = { ...finalStyles, ...styles[bp] };
      }
      if (bp === currentBreakpoint) break;
    }

    return finalStyles;
  }

  generateMediaQuery(
    breakpoint: keyof ResponsiveBreakpoints,
    direction: 'up' | 'down' = 'up'
  ): string {
    const width = this.breakpoints[breakpoint];
    return direction === 'up' 
      ? `@media (min-width: ${width}px)`
      : `@media (max-width: ${width - 1}px)`;
  }

  /**
   * Returns a number value based on current breakpoint from provided map
   */
  getResponsiveValue<T>(values: Partial<Record<keyof ResponsiveBreakpoints, T>>): T | undefined {
    const currentBp = this.getCurrentBreakpoint();
    const breakpointOrder: (keyof ResponsiveBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    
    let result: T | undefined;
    
    for (const bp of breakpointOrder) {
      if (values[bp] !== undefined) {
        result = values[bp];
      }
      if (bp === currentBp) break;
    }
    
    return result;
  }
}

// ============================================================================
// MOBILE ERROR HANDLER
// ============================================================================

/**
 * Specialized error handler for mobile devices that provides context-aware
 * error handling and automatic recovery strategies.
 */
export class MobileErrorHandler {
  private static instance: MobileErrorHandler;
  private deviceDetector: DeviceDetector;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private readonly ERROR_THRESHOLD = 5;
  private readonly ERROR_WINDOW = 10000; // 10 seconds

  private constructor() {
    this.deviceDetector = DeviceDetector.getInstance();
    this.setupMobileErrorHandling();
  }

  static getInstance(): MobileErrorHandler {
    if (!MobileErrorHandler.instance) {
      MobileErrorHandler.instance = new MobileErrorHandler();
    }
    return MobileErrorHandler.instance;
  }

  private setupMobileErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleMobileError(event.error, {
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleMobileError(event.reason, {
        type: 'promise',
        promise: event.promise
      });
    });

    // Network status monitoring
    window.addEventListener('offline', () => {
      this.handleMobileError(new Error('Network connection lost'), {
        type: 'network',
        status: 'offline'
      });
    });

    window.addEventListener('online', () => {
      logger.info('Network connection restored', {
        deviceInfo: this.deviceDetector.getDeviceInfo()
      });
      this.errorCount = 0; // Reset error count on network recovery
    });

    // Monitor visibility changes (important for mobile battery conservation)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background - good time to reduce resource usage
        this.handleBackgroundTransition();
      } else {
        // App came to foreground - resume normal operations
        this.handleForegroundTransition();
      }
    });
  }

  private handleMobileError(error: unknown, context: unknown): void {
    const now = Date.now();
    
    // Track error rate to detect cascading failures
    if (now - this.lastErrorTime < this.ERROR_WINDOW) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    const deviceInfo = this.deviceDetector.getDeviceInfo();
    const mobileContext: MobileErrorContext = {
      deviceInfo,
      touchSupport: deviceInfo.hasTouch,
      ...this.getNetworkInfo(),
      ...this.getMemoryInfo(),
      timestamp: now
    };

    logger.error('Mobile error occurred', {
      error: (error as Error)?.message || String(error),
      stack: (error as Error)?.stack,
      context,
      mobileContext,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      errorCount: this.errorCount
    });

    // Implement progressive recovery strategies based on error frequency
    if (this.errorCount >= this.ERROR_THRESHOLD) {
      logger.warn('Error threshold exceeded, initiating emergency recovery');
      this.initiateEmergencyRecovery();
    } else if (deviceInfo.isMobile || deviceInfo.isTablet) {
      this.attemptMobileRecovery(error, context);
    }
  }

  private getNetworkInfo(): Partial<MobileErrorContext> {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return {};
    }

    const connection = (navigator as Navigator & { 
      connection?: { effectiveType?: string; type?: string; downlink?: number };
      mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
      webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
    }).connection || 
    (navigator as Navigator & { 
      connection?: { effectiveType?: string; type?: string; downlink?: number };
      mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
      webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
    }).mozConnection || 
    (navigator as Navigator & { 
      connection?: { effectiveType?: string; type?: string; downlink?: number };
      mozConnection?: { effectiveType?: string; type?: string; downlink?: number };
      webkitConnection?: { effectiveType?: string; type?: string; downlink?: number };
    }).webkitConnection;
    if (!connection) return {};

    return {
      networkType: connection.effectiveType || connection.type,
      connectionSpeed: connection.downlink ? `${connection.downlink} Mbps` : undefined
    };
  }

  private getMemoryInfo(): Partial<MobileErrorContext> {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return {};
    }

    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!memory) return {};

    return {
      memoryInfo: {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    };
  }

  private attemptMobileRecovery(error: unknown, context: unknown): void {
    const deviceInfo = this.deviceDetector.getDeviceInfo();

    // Strategy 1: Reduce functionality on low-end devices or small screens
    if (deviceInfo.screenSize === 'xs' || deviceInfo.pixelRatio < 2) {
      this.enableLowPowerMode();
    }

    // Strategy 2: Handle touch-specific errors by resetting touch state
    if ((context as { type?: string })?.type === 'touch' && deviceInfo.hasTouch) {
      this.resetTouchHandlers();
    }

    // Strategy 3: Handle memory pressure on mobile devices
    const errorMessage = String((error as Error)?.message || error).toLowerCase();
    if (errorMessage.includes('memory') || errorMessage.includes('quota') || errorMessage.includes('heap')) {
      this.clearMobileCaches();
    }

    // Strategy 4: Handle network-related errors
    if ((context as { type?: string })?.type === 'network' || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      this.handleNetworkError();
    }

    // Strategy 5: iOS-specific error handling
    if (deviceInfo.isIOS && errorMessage.includes('webkit')) {
      this.handleIOSSpecificError();
    }
  }

  private initiateEmergencyRecovery(): void {
    logger.warn('Initiating emergency recovery procedures');

    // Notify the application of critical error state
    const event = new CustomEvent('mobile:emergencyRecovery', {
      detail: {
        errorCount: this.errorCount,
        deviceInfo: this.deviceDetector.getDeviceInfo(),
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);

    // Apply all recovery strategies
    this.enableLowPowerMode();
    this.clearMobileCaches();
    this.resetTouchHandlers();

    // Reset error count after a delay to allow recovery
    setTimeout(() => {
      this.errorCount = 0;
      logger.info('Error count reset after recovery period');
    }, 30000);
  }

  private enableLowPowerMode(): void {
    logger.info('Enabling low power mode for mobile device');
    
    // Reduce or disable animations globally
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }
    
    // Dispatch event for application to reduce functionality
    const event = new CustomEvent('mobile:lowPowerMode', {
      detail: { 
        enabled: true,
        reason: 'performance_optimization'
      }
    });
    window.dispatchEvent(event);
  }

  private resetTouchHandlers(): void {
    logger.info('Resetting touch handlers due to touch-related error');
    
    // Dispatch event to notify components to reset their touch state
    const event = new CustomEvent('mobile:resetTouch', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  private clearMobileCaches(): void {
    logger.info('Clearing mobile caches due to memory pressure');
    
    try {
      // Clear Cache API if available
      if ('caches' in window) {
        caches.keys().then(names => {
          // Only clear non-essential caches, preserve critical assets
          names.forEach(name => {
            if (!name.includes('critical') && !name.includes('essential')) {
              caches.delete(name);
            }
          });
        }).catch(err => {
          logger.error('Failed to clear cache API', { error: err });
        });
      }

      // Selectively clear localStorage to free memory
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('cache_') || key.startsWith('temp_'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // Ignore individual removal errors
          }
        });

        logger.info(`Cleared ${keysToRemove.length} cached items from localStorage`);
      }

      // Notify application to clear in-memory caches
      const event = new CustomEvent('mobile:clearCaches', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);

    } catch (error) {
      logger.error('Failed to clear mobile caches', { error });
    }
  }

  private handleNetworkError(): void {
    logger.info('Handling network-related error');
    
    // Notify application to switch to offline mode or retry logic
    const event = new CustomEvent('mobile:networkError', {
      detail: {
        online: navigator.onLine,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  private handleIOSSpecificError(): void {
    logger.info('Handling iOS-specific error');
    
    // iOS has specific quirks, especially with viewport and touch events
    // Notify application to apply iOS-specific fixes
    const event = new CustomEvent('mobile:iosError', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  private handleBackgroundTransition(): void {
    logger.debug('Application moved to background');
    
    // Notify application to reduce resource usage
    const event = new CustomEvent('mobile:background', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  private handleForegroundTransition(): void {
    logger.debug('Application moved to foreground');
    
    // Notify application to resume normal operations
    const event = new CustomEvent('mobile:foreground', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Manually report an error with mobile context
   */
  reportError(error: Error, context?: Record<string, unknown>): void {
    this.handleMobileError(error, { type: 'manual', ...context });
  }

  /**
   * Reset error tracking (useful after successful recovery)
   */
  resetErrorTracking(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    logger.info('Error tracking reset');
  }

  /**
   * Get current error state
   */
  getErrorState(): { count: number; lastErrorTime: number; isInErrorState: boolean } {
    return {
      count: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isInErrorState: this.errorCount >= this.ERROR_THRESHOLD
    };
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Utility class for mobile performance optimization including
 * frame rate monitoring, resource management, and adaptive quality settings.
 */
export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer;
  private frameTimestamps: number[] = [];
  private readonly MAX_FRAME_SAMPLES = 60;
  private rafId: number | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  static getInstance(): MobilePerformanceOptimizer {
    if (!MobilePerformanceOptimizer.instance) {
      MobilePerformanceOptimizer.instance = new MobilePerformanceOptimizer();
    }
    return MobilePerformanceOptimizer.instance;
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor frame rate using requestAnimationFrame
    this.startFrameRateMonitoring();

    // Use PerformanceObserver for detailed metrics if available
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' || entry.entryType === 'longtask') {
              logger.debug('Performance entry', {
                name: entry.name,
                duration: entry.duration,
                type: entry.entryType
              });
            }
          }
        });

        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'resource', 'longtask'] 
        });
      } catch (error) {
        logger.warn('PerformanceObserver not fully supported', { error });
      }
    }
  }

  private startFrameRateMonitoring(): void {
    const measureFrame = (timestamp: number) => {
      this.frameTimestamps.push(timestamp);

      // Keep only recent frames
      if (this.frameTimestamps.length > this.MAX_FRAME_SAMPLES) {
        this.frameTimestamps.shift();
      }

      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Calculate average frames per second over recent samples
   */
  getAverageFPS(): number {
    if (this.frameTimestamps.length < 2) return 60; // Assume 60 FPS if not enough data

    const first = this.frameTimestamps[0];
    const last = this.frameTimestamps[this.frameTimestamps.length - 1];
    const elapsed = last - first;
    const frameCount = this.frameTimestamps.length - 1;

    return Math.round((frameCount / elapsed) * 1000);
  }

  /**
   * Check if device is experiencing performance issues
   */
  isPerformanceDegraded(): boolean {
    const fps = this.getAverageFPS();
    return fps < 30; // Consider performance degraded below 30 FPS
  }

  /**
   * Get performance recommendations based on current metrics
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const fps = this.getAverageFPS();
    const deviceInfo = DeviceDetector.getInstance().getDeviceInfo();

    if (fps < 30) {
      recommendations.push('Reduce animation complexity');
      recommendations.push('Disable non-essential visual effects');
    }

    if (deviceInfo.pixelRatio > 2) {
      recommendations.push('Consider reducing image resolution for high-DPI displays');
    }

    if (deviceInfo.screenSize === 'xs') {
      recommendations.push('Simplify layout for small screens');
      recommendations.push('Reduce concurrent network requests');
    }

    if (typeof performance !== 'undefined' && (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 80) {
        recommendations.push('Memory usage high - clear caches and reduce in-memory data');
      }
    }

    return recommendations;
  }

  /**
   * Apply automatic performance optimizations based on device capabilities
   */
  applyAutoOptimizations(): void {
    const deviceInfo = DeviceDetector.getInstance().getDeviceInfo();
    const fps = this.getAverageFPS();

    logger.info('Applying automatic performance optimizations', {
      fps,
      deviceInfo: {
        screenSize: deviceInfo.screenSize,
        pixelRatio: deviceInfo.pixelRatio,
        isMobile: deviceInfo.isMobile
      }
    });

    // Reduce quality on low-end devices
    if (fps < 30 || deviceInfo.screenSize === 'xs') {
      const event = new CustomEvent('mobile:reduceQuality', {
        detail: {
          level: fps < 20 ? 'low' : 'medium',
          reason: fps < 30 ? 'low_fps' : 'small_screen'
        }
      });
      window.dispatchEvent(event);
    }

    // Optimize for high-DPI displays
    if (deviceInfo.pixelRatio > 2) {
      const event = new CustomEvent('mobile:optimizeForHighDPI', {
        detail: { pixelRatio: deviceInfo.pixelRatio }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Measure the execution time of a function
   */
  measurePerformance<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-measure`;

    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);

    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];
      
      logger.debug(`Performance: ${name}`, {
        duration: measure.duration.toFixed(2) + 'ms'
      });

      // Clean up marks and measures
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    } catch (error) {
      logger.warn('Performance measurement failed', { name, error });
    }

    return result;
  }

  /**
   * Clean up performance monitoring
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.frameTimestamps = [];
  }
}

// ============================================================================
// CONVENIENCE INSTANCES
// ============================================================================

export const deviceDetector = DeviceDetector.getInstance();
export const touchHandler = TouchHandler.getInstance();
export const responsiveUtils = ResponsiveUtils.getInstance();
export const mobileErrorHandler = MobileErrorHandler.getInstance();
export const mobilePerformanceOptimizer = MobilePerformanceOptimizer.getInstance();

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
export function getCurrentScreenSize(): DeviceInfo['screenSize'] {
  return deviceDetector.getScreenSize();
}

/**
 * Get the current device orientation
 */
export function getDeviceOrientation(): DeviceInfo['orientation'] {
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
export function getDeviceInfo(): DeviceInfo {
  return deviceDetector.getDeviceInfo();
}

/**
 * Add a touch gesture listener to an element
 */
export function addTouchGesture(
  element: HTMLElement,
  gesture: TouchEvent['type'],
  callback: (event: TouchEvent) => void
): void {
  touchHandler.addTouchListener(element, gesture, callback);
}

/**
 * Remove a touch gesture listener from an element
 */
export function removeTouchGesture(
  element: HTMLElement,
  gesture: TouchEvent['type'],
  callback: (event: TouchEvent) => void
): void {
  touchHandler.removeTouchListener(element, gesture, callback);
}

/**
 * Create responsive styles based on current breakpoint
 */
export function createResponsiveStyles(
  styles: Partial<Record<keyof ResponsiveBreakpoints, Record<string, unknown>>>
): Record<string, unknown> {
  return responsiveUtils.createResponsiveStyles(styles);
}

/**
 * Check if a specific breakpoint is currently active
 */
export function isBreakpointActive(breakpoint: keyof ResponsiveBreakpoints): boolean {
  return responsiveUtils.isBreakpoint(breakpoint);
}

/**
 * Check if viewport is at or above a breakpoint
 */
export function isBreakpointUp(breakpoint: keyof ResponsiveBreakpoints): boolean {
  return responsiveUtils.isBreakpointUp(breakpoint);
}

/**
 * Check if viewport is below a breakpoint
 */
export function isBreakpointDown(breakpoint: keyof ResponsiveBreakpoints): boolean {
  return responsiveUtils.isBreakpointDown(breakpoint);
}

/**
 * Get a responsive value based on current breakpoint
 */
export function getResponsiveValue<T>(
  values: Partial<Record<keyof ResponsiveBreakpoints, T>>
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
  breakpoint: keyof ResponsiveBreakpoints,
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
  touchConfig?: TouchConfig;
  breakpoints?: Partial<ResponsiveBreakpoints>;
  autoOptimize?: boolean;
}): void {
  logger.info('Initializing mobile utilities', { config });

  // Initialize device detection
  const device = DeviceDetector.getInstance();
  const deviceInfo = device.getDeviceInfo();

  // Configure touch handler if config provided
  if (config?.touchConfig) {
    TouchHandler.getInstance(config.touchConfig);
  }

  // Configure responsive breakpoints if provided
  if (config?.breakpoints) {
    ResponsiveUtils.getInstance().setBreakpoints(config.breakpoints);
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
  touchHandler.destroy();
  mobilePerformanceOptimizer.destroy();
  
  logger.info('Mobile utilities destroyed');
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Classes
  DeviceDetector,
  TouchHandler,
  ResponsiveUtils,
  MobileErrorHandler,
  MobilePerformanceOptimizer,
  
  // Instances
  deviceDetector,
  touchHandler,
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
  addTouchGesture,
  removeTouchGesture,
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