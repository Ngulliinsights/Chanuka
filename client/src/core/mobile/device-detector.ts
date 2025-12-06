/**
 * Device Detector Module
 * 
 * Singleton class for detecting and monitoring device characteristics.
 * Uses modern APIs and fallbacks to accurately identify mobile devices,
 * screen sizes, and capabilities.
 * 
 * @module core/mobile/device-detector
 */

import { logger } from '@/utils/logger';
import type { DeviceInfo } from './types';

/**
 * Singleton class for detecting and monitoring device characteristics.
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

// Singleton instance
export const deviceDetector = DeviceDetector.getInstance();
