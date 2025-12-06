/**
 * Browser Utilities - Consolidated Module
 * 
 * Consolidates all browser-related utilities into a single module:
 * - Browser detection and feature testing
 * - Compatibility management and polyfill loading
 * - User agent parsing and version checking
 * - Cross-browser API normalization
 * - Performance optimization for different browsers
 * 
 * Replaces: browser-compatibility.ts, browser-compatibility-manager.ts, polyfills.ts
 */

/**
 * Browser Utilities - Consolidated Module
 * 
 * A comprehensive solution for browser detection, feature testing, and compatibility management.
 * This module consolidates browser-related utilities into a single, well-organized system that:
 * - Detects browser type and version using user agent parsing
 * - Tests for modern web API support through feature detection
 * - Manages polyfills for missing features automatically
 * - Provides compatibility scoring and recommendations
 * - Handles graceful degradation for unsupported browsers
 * 
 * The design follows the singleton pattern for efficient caching and resource management,
 * ensuring that expensive operations like feature detection only run once per session.
 */

import { logger } from './logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Complete information about the user's browser, including version details,
 * feature support matrix, and actionable recommendations for compatibility.
 */
export interface BrowserInfo {
  name: string;                    // Browser identifier (chrome, firefox, safari, etc.)
  version: string;                 // Full version string (e.g., "120.0")
  majorVersion: number;            // Major version number for comparison
  isSupported: boolean;            // Whether browser meets minimum requirements
  features: FeatureSet;            // Complete feature detection results
  warnings: string[];              // Critical compatibility warnings
  recommendations: string[];       // Suggestions for improving compatibility
}

/**
 * Comprehensive feature detection results for modern web APIs.
 * Each boolean indicates native support without polyfills.
 */
export interface FeatureSet {
  es6: boolean;                    // Modern JavaScript syntax (arrow functions, classes, etc.)
  fetch: boolean;                  // Native fetch API for HTTP requests
  promises: boolean;               // Promise support for async operations
  localStorage: boolean;           // Persistent local storage
  sessionStorage: boolean;         // Session-scoped storage
  webWorkers: boolean;             // Background thread support
  serviceWorkers: boolean;         // Offline functionality and caching
  intersectionObserver: boolean;   // Efficient scroll-based visibility detection
  resizeObserver: boolean;         // Element resize detection
  customElements: boolean;         // Web components support
  shadowDOM: boolean;              // Encapsulated DOM trees
  modules: boolean;                // ES6 module support
  asyncAwait: boolean;             // Async/await syntax
  webGL: boolean;                  // 3D graphics rendering
  webRTC: boolean;                 // Real-time communication
  geolocation: boolean;            // Location services
  notifications: boolean;          // System notifications
  fullscreen: boolean;             // Fullscreen API
  clipboard: boolean;              // Modern clipboard API
}

/**
 * Complete compatibility assessment including polyfill status and scoring.
 */
export interface CompatibilityStatus {
  browserInfo: BrowserInfo;
  isSupported: boolean;
  warnings: string[];
  polyfillsLoaded: boolean;
  polyfillsRequired: string[];
  recommendations: CompatibilityRecommendation[];
  compatibilityScore: number;      // 0-100 score indicating overall compatibility
  shouldBlock: boolean;            // Whether to block app access entirely
  timestamp: number;
}

/**
 * Structured recommendations for improving browser compatibility.
 */
export interface CompatibilityRecommendation {
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'browser-version' | 'feature-missing' | 'polyfill' | 'performance';
  actionable: boolean;             // Whether user can take action
}

interface PolyfillStatus {
  loaded: boolean;
  error?: Error;
  feature: string;
  timestamp: number;
}

// ============================================================================
// POLYFILL TYPE DEFINITIONS
// ============================================================================

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer;
  timeout?: number;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  clone: () => FetchResponse;
  formData: () => Promise<FormData>;
}

interface IntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRect;
  rootBounds: DOMRect | null;
  intersectionRect: DOMRect;
  time: number;
}

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

interface StoragePolyfill {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum supported browser versions. These thresholds ensure that critical
 * features like ES6, Fetch API, and modern CSS are available natively.
 */
const MINIMUM_VERSIONS = {
  chrome: 70,      // Released Oct 2018
  firefox: 65,     // Released Jan 2019
  safari: 12,      // Released Sep 2018
  edge: 79,        // Released Jan 2020 (Chromium-based)
  opera: 57,       // Released Dec 2018
  samsung: 10,     // Released Feb 2019
  ios: 12,         // Released Sep 2018
  android: 70,     // Based on Chrome version
  ie: 11           // Not truly supported, but included for detection
} as const;

/**
 * Features that are absolutely required for the application to function.
 * If any of these are missing, even with polyfills, the app may be unstable.
 */
const CRITICAL_FEATURES: ReadonlyArray<keyof FeatureSet> = [
  'es6',
  'fetch',
  'promises',
  'localStorage',
  'modules'
] as const;

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Determines if code is running in a browser environment rather than Node.js or SSR.
 * This check prevents errors when accessing browser-only APIs during server-side rendering.
 */
function isBrowserEnv(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof global === 'undefined'
  );
}

/**
 * Detects test environment to avoid operations that fail in test runners.
 * For example, WebGL context creation often fails in headless test environments.
 */
function isTestEnv(): boolean {
  if (typeof process === 'undefined') {
    return false;
  }
  const nodeEnv = process.env?.NODE_ENV;
  return nodeEnv === 'test';
}

// ============================================================================
// FEATURE DETECTION
// ============================================================================

/**
 * Singleton class that performs feature detection for modern web APIs.
 * Results are cached to avoid redundant checks, which can be expensive.
 * 
 * The detection methods test actual functionality rather than just checking
 * for existence, ensuring that features are truly usable (e.g., localStorage
 * might exist but be disabled in private browsing mode).
 */
export class FeatureDetector {
  private static instance: FeatureDetector;
  private cache: Partial<FeatureSet> = {};

  private constructor() {}

  static getInstance(): FeatureDetector {
    if (!FeatureDetector.instance) {
      FeatureDetector.instance = new FeatureDetector();
    }
    return FeatureDetector.instance;
  }

  /**
   * Tests ES6 support by attempting to execute modern JavaScript syntax.
   * This includes let/const, destructuring, template literals, and classes.
   */
  detectES6Support(): boolean {
    if (this.cache.es6 !== undefined) return this.cache.es6;

    try {
      // Create a function that uses multiple ES6 features to ensure comprehensive support
      new Function(`
        return (() => {
          let x = 1;
          const y = 2;
          const [a, b] = [1, 2];
          const {c} = {c: 3};
          const str = \`template \${x} literal\`;
          class Test {}
          return a + b + c + x + y;
        })();
      `)();
      
      this.cache.es6 = true;
    } catch {
      this.cache.es6 = false;
    }
    
    return this.cache.es6;
  }

  /**
   * Verifies that the Fetch API is fully available, including Request, Response, and Headers.
   * The Fetch API is the modern replacement for XMLHttpRequest.
   */
  detectFetchSupport(): boolean {
    if (this.cache.fetch !== undefined) return this.cache.fetch;

    this.cache.fetch = 
      typeof fetch === 'function' && 
      typeof Request === 'function' && 
      typeof Response === 'function' &&
      typeof Headers === 'function';
    
    return this.cache.fetch;
  }

  /**
   * Checks for complete Promise support including all essential methods.
   * Promises are fundamental to modern asynchronous JavaScript.
   */
  detectPromiseSupport(): boolean {
    if (this.cache.promises !== undefined) return this.cache.promises;

    this.cache.promises = 
      typeof Promise === 'function' &&
      typeof Promise.resolve === 'function' &&
      typeof Promise.reject === 'function' &&
      typeof Promise.all === 'function' &&
      typeof Promise.race === 'function';
    
    return this.cache.promises;
  }

  /**
   * Tests localStorage by actually writing and reading a value.
   * This is important because localStorage may exist but throw errors
   * in private browsing mode or when storage quota is exceeded.
   */
  detectLocalStorageSupport(): boolean {
    if (this.cache.localStorage !== undefined) return this.cache.localStorage;

    if (!isBrowserEnv() || typeof localStorage === 'undefined') {
      this.cache.localStorage = false;
      return false;
    }

    try {
      const testKey = '__compat_test_ls__';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      this.cache.localStorage = retrieved === 'test';
    } catch {
      this.cache.localStorage = false;
    }
    
    return this.cache.localStorage;
  }

  /**
   * Tests sessionStorage with the same rigorous approach as localStorage.
   * Session storage is cleared when the browser tab closes.
   */
  detectSessionStorageSupport(): boolean {
    if (this.cache.sessionStorage !== undefined) return this.cache.sessionStorage;

    if (!isBrowserEnv() || typeof sessionStorage === 'undefined') {
      this.cache.sessionStorage = false;
      return false;
    }

    try {
      const testKey = '__compat_test_ss__';
      sessionStorage.setItem(testKey, 'test');
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      this.cache.sessionStorage = retrieved === 'test';
    } catch {
      this.cache.sessionStorage = false;
    }
    
    return this.cache.sessionStorage;
  }

  detectWebWorkersSupport(): boolean {
    if (this.cache.webWorkers !== undefined) return this.cache.webWorkers;
    
    this.cache.webWorkers = isBrowserEnv() && typeof Worker === 'function';
    return this.cache.webWorkers;
  }

  detectServiceWorkersSupport(): boolean {
    if (this.cache.serviceWorkers !== undefined) return this.cache.serviceWorkers;
    
    this.cache.serviceWorkers = isBrowserEnv() && 'serviceWorker' in navigator;
    return this.cache.serviceWorkers;
  }

  /**
   * IntersectionObserver enables efficient lazy loading and scroll-based animations
   * by detecting when elements enter or exit the viewport without polling.
   */
  detectIntersectionObserverSupport(): boolean {
    if (this.cache.intersectionObserver !== undefined) return this.cache.intersectionObserver;
    
    this.cache.intersectionObserver = isBrowserEnv() && 'IntersectionObserver' in window;
    return this.cache.intersectionObserver;
  }

  detectResizeObserverSupport(): boolean {
    if (this.cache.resizeObserver !== undefined) return this.cache.resizeObserver;
    
    this.cache.resizeObserver = isBrowserEnv() && 'ResizeObserver' in window;
    return this.cache.resizeObserver;
  }

  detectCustomElementsSupport(): boolean {
    if (this.cache.customElements !== undefined) return this.cache.customElements;
    
    this.cache.customElements = isBrowserEnv() && 'customElements' in window;
    return this.cache.customElements;
  }

  /**
   * Shadow DOM enables true encapsulation for web components by creating
   * isolated DOM trees with their own scoped styles.
   */
  detectShadowDOMSupport(): boolean {
    if (this.cache.shadowDOM !== undefined) return this.cache.shadowDOM;

    this.cache.shadowDOM = 
      isBrowserEnv() && 
      typeof Element !== 'undefined' && 
      Element.prototype !== undefined &&
      'attachShadow' in Element.prototype;
    
    return this.cache.shadowDOM;
  }

  /**
   * ES6 modules support is detected via the noModule attribute, which modern
   * browsers support but older browsers ignore.
   */
  detectModulesSupport(): boolean {
    if (this.cache.modules !== undefined) return this.cache.modules;

    if (!isBrowserEnv()) {
      this.cache.modules = false;
      return false;
    }

    const script = document.createElement('script');
    this.cache.modules = 'noModule' in script;
    return this.cache.modules;
  }

  /**
   * Tests async/await support, which provides cleaner syntax for promise-based code.
   */
  detectAsyncAwaitSupport(): boolean {
    if (this.cache.asyncAwait !== undefined) return this.cache.asyncAwait;

    try {
      new Function('return (async function() { await Promise.resolve(); })();')();
      this.cache.asyncAwait = true;
    } catch {
      this.cache.asyncAwait = false;
    }
    
    return this.cache.asyncAwait;
  }

  /**
   * WebGL detection with proper cleanup to avoid memory leaks.
   * We skip this in test environments where canvas operations often fail.
   */
  detectWebGLSupport(): boolean {
    if (this.cache.webGL !== undefined) return this.cache.webGL;

    if (!isBrowserEnv() || isTestEnv()) {
      this.cache.webGL = false;
      return false;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.cache.webGL = !!gl;
      
      // Clean up the WebGL context to free GPU resources
      if (gl && typeof (gl as WebGLRenderingContext).getExtension === 'function') {
        const loseContext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
    } catch {
      this.cache.webGL = false;
    }
    
    return this.cache.webGL;
  }

  /**
   * WebRTC enables peer-to-peer communication for video chat, file sharing, etc.
   * Different browsers use different prefixes, so we check all variants.
   */
  detectWebRTCSupport(): boolean {
    if (this.cache.webRTC !== undefined) return this.cache.webRTC;

    if (!isBrowserEnv()) {
      this.cache.webRTC = false;
      return false;
    }

    this.cache.webRTC = !!(
      (window as unknown as Record<string, unknown>).RTCPeerConnection ||
      (window as unknown as Record<string, unknown>).webkitRTCPeerConnection ||
      (window as unknown as Record<string, unknown>).mozRTCPeerConnection
    );
    
    return this.cache.webRTC;
  }

  detectGeolocationSupport(): boolean {
    if (this.cache.geolocation !== undefined) return this.cache.geolocation;
    
    this.cache.geolocation = isBrowserEnv() && 'geolocation' in navigator;
    return this.cache.geolocation;
  }

  detectNotificationsSupport(): boolean {
    if (this.cache.notifications !== undefined) return this.cache.notifications;
    
    this.cache.notifications = isBrowserEnv() && 'Notification' in window;
    return this.cache.notifications;
  }

  /**
   * Fullscreen API detection with vendor prefix support for older browsers.
   */
  detectFullscreenSupport(): boolean {
    if (this.cache.fullscreen !== undefined) return this.cache.fullscreen;

    if (!isBrowserEnv()) {
      this.cache.fullscreen = false;
      return false;
    }

    const elem = document.documentElement;
    this.cache.fullscreen = !!(
      elem.requestFullscreen ||
      (elem as unknown as Record<string, unknown>).webkitRequestFullscreen ||
      (elem as unknown as Record<string, unknown>).mozRequestFullScreen ||
      (elem as unknown as Record<string, unknown>).msRequestFullscreen
    );
    
    return this.cache.fullscreen;
  }

  /**
   * Modern clipboard API provides secure access to copy/paste functionality.
   */
  detectClipboardSupport(): boolean {
    if (this.cache.clipboard !== undefined) return this.cache.clipboard;

    this.cache.clipboard = 
      isBrowserEnv() && 
      !!navigator.clipboard && 
      typeof navigator.clipboard.writeText === 'function' &&
      typeof navigator.clipboard.readText === 'function';
    
    return this.cache.clipboard;
  }

  /**
   * Returns the complete feature set by running all detection methods.
   * This is the primary method for getting a full picture of browser capabilities.
   */
  getAllFeatures(): FeatureSet {
    return {
      es6: this.detectES6Support(),
      fetch: this.detectFetchSupport(),
      promises: this.detectPromiseSupport(),
      localStorage: this.detectLocalStorageSupport(),
      sessionStorage: this.detectSessionStorageSupport(),
      webWorkers: this.detectWebWorkersSupport(),
      serviceWorkers: this.detectServiceWorkersSupport(),
      intersectionObserver: this.detectIntersectionObserverSupport(),
      resizeObserver: this.detectResizeObserverSupport(),
      customElements: this.detectCustomElementsSupport(),
      shadowDOM: this.detectShadowDOMSupport(),
      modules: this.detectModulesSupport(),
      asyncAwait: this.detectAsyncAwaitSupport(),
      webGL: this.detectWebGLSupport(),
      webRTC: this.detectWebRTCSupport(),
      geolocation: this.detectGeolocationSupport(),
      notifications: this.detectNotificationsSupport(),
      fullscreen: this.detectFullscreenSupport(),
      clipboard: this.detectClipboardSupport()
    };
  }

  /**
   * Quick check for whether all critical features are present.
   * If this returns false, the application may not function at all.
   */
  hasCriticalFeatures(): boolean {
    return CRITICAL_FEATURES.every(feature => {
      const methodName = `detect${feature.charAt(0).toUpperCase() + feature.slice(1)}Support` as keyof this;
      const method = this[methodName];
      return typeof method === 'function' ? (method as () => boolean).call(this) : false;
    });
  }

  /**
   * Clears the detection cache, forcing fresh feature tests.
   * Useful after polyfills are loaded or for testing purposes.
   */
  clearCache(): void {
    this.cache = {};
  }
}

// ============================================================================
// BROWSER DETECTION
// ============================================================================

/**
 * Singleton class for parsing user agents and detecting browser information.
 * This includes identifying the browser name, version, and whether it meets
 * minimum version requirements.
 */
export class BrowserDetector {
  private static instance: BrowserDetector;
  private cachedInfo: BrowserInfo | null = null;

  private constructor() {}

  static getInstance(): BrowserDetector {
    if (!BrowserDetector.instance) {
      BrowserDetector.instance = new BrowserDetector();
    }
    return BrowserDetector.instance;
  }

  /**
   * Parses the user agent string to extract browser name and version.
   * The order of checks matters because some browsers include others in their UA
   * (e.g., Edge includes Chrome, Chrome includes Safari).
   */
  private parseUserAgent(): { name: string; version: string; majorVersion: number } {
    if (!isBrowserEnv()) {
      return { name: 'unknown', version: '0.0', majorVersion: 0 };
    }

    const ua = navigator.userAgent;
    
    // Internet Explorer: Check for MSIE or Trident (IE11 uses Trident without MSIE)
    if (ua.includes('MSIE') || ua.includes('Trident/')) {
      const match = ua.match(/(?:MSIE |rv:)(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'ie',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Edge Legacy: Pre-Chromium Edge (before version 79)
    if (ua.includes('Edge/')) {
      const match = ua.match(/Edge\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge-legacy',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Modern Edge: Chromium-based Edge uses "Edg/" identifier
    if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Chrome: Must check after Edge since Edge includes "Chrome" in UA
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'chrome',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Firefox: Straightforward detection
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'firefox',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Safari: Must check after Chrome since Chrome includes "Safari" in UA
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'safari',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Opera: Modern Opera uses "OPR/" identifier
    if (ua.includes('OPR/')) {
      const match = ua.match(/OPR\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'opera',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Samsung Internet: Popular mobile browser
    if (ua.includes('SamsungBrowser')) {
      const match = ua.match(/SamsungBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'samsung',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // iOS Safari: Uses iOS version rather than Safari version
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      const match = ua.match(/OS (\d+)_(\d+)/);
      if (match) {
        return {
          name: 'ios',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1] || '0', 10)
        };
      }
    }
    
    // Android: Detect Chrome on Android devices
    if (ua.includes('Android')) {
      const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (chromeMatch) {
        return {
          name: 'android',
          version: `${chromeMatch[1]}.${chromeMatch[2]}`,
          majorVersion: parseInt(chromeMatch[1] || '0', 10)
        };
      }
    }
    
    return { name: 'unknown', version: '0.0', majorVersion: 0 };
  }

  /**
   * Compares browser version against minimum requirements.
   */
  private checkBrowserSupport(name: string, majorVersion: number): boolean {
    const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
    return minVersion !== undefined && majorVersion >= minVersion;
  }

  /**
   * Generates user-facing warning messages based on missing features.
   * These are critical issues that will likely break the application.
   */
  private generateWarnings(features: FeatureSet, browserName: string): string[] {
    const warnings: string[] = [];
    
    if (!features.es6) {
      warnings.push('ES6 support is missing. Core application features will not function.');
    }
    
    if (!features.fetch) {
      warnings.push('Fetch API is unavailable. Network operations will fail.');
    }
    
    if (!features.promises) {
      warnings.push('Promise support is missing. Asynchronous operations cannot execute.');
    }
    
    if (!features.localStorage) {
      warnings.push('Local storage is unavailable. Settings and preferences cannot be saved.');
    }
    
    if (browserName === 'ie') {
      warnings.push('Internet Explorer is no longer supported. Please switch to a modern browser.');
    }
    
    return warnings;
  }

  /**
   * Generates actionable recommendations for improving compatibility.
   * These are softer suggestions for optional features or performance improvements.
   */
  private generateRecommendations(
    features: FeatureSet, 
    browserName: string, 
    majorVersion: number
  ): string[] {
    const recommendations: string[] = [];
    
    const minVersion = MINIMUM_VERSIONS[browserName as keyof typeof MINIMUM_VERSIONS];
    if (minVersion !== undefined && majorVersion < minVersion) {
      recommendations.push(
        `Please update ${this.formatBrowserName(browserName)} to version ${minVersion} or higher for optimal performance.`
      );
    }
    
    if (!features.intersectionObserver) {
      recommendations.push('Update your browser to enable improved lazy loading and scroll performance.');
    }
    
    if (!features.webGL) {
      recommendations.push('WebGL support would significantly improve chart and visualization rendering.');
    }
    
    if (browserName === 'unknown' || browserName === 'ie' || browserName === 'edge-legacy') {
      recommendations.push(
        'For the best experience, we recommend Chrome 70+, Firefox 65+, Safari 12+, or Edge 79+.'
      );
    }
    
    return recommendations;
  }

  /**
   * Converts internal browser identifiers to user-friendly names.
   */
  private formatBrowserName(name: string): string {
    const nameMap: Record<string, string> = {
      chrome: 'Chrome',
      firefox: 'Firefox',
      safari: 'Safari',
      edge: 'Edge',
      'edge-legacy': 'Edge Legacy',
      opera: 'Opera',
      samsung: 'Samsung Internet',
      ios: 'iOS Safari',
      android: 'Android Chrome',
      ie: 'Internet Explorer',
      unknown: 'your browser'
    };
    
    return nameMap[name] || name;
  }

  /**
   * Returns complete browser information including all detected capabilities.
   * Results are cached for performance.
   */
  getBrowserInfo(): BrowserInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const { name, version, majorVersion } = this.parseUserAgent();
    const featureDetector = FeatureDetector.getInstance();
    const features = featureDetector.getAllFeatures();
    const isSupported = this.checkBrowserSupport(name, majorVersion);
    const warnings = this.generateWarnings(features, name);
    const recommendations = this.generateRecommendations(features, name, majorVersion);

    this.cachedInfo = {
      name,
      version,
      majorVersion,
      isSupported,
      features,
      warnings,
      recommendations
    };

    return this.cachedInfo;
  }

  isBrowserSupported(): boolean {
    return this.getBrowserInfo().isSupported;
  }

  hasFeature(feature: keyof FeatureSet): boolean {
    return this.getBrowserInfo().features[feature];
  }

  clearCache(): void {
    this.cachedInfo = null;
  }
}

// ============================================================================
// POLYFILL MANAGER
// ============================================================================

/**
 * Manages the loading and tracking of polyfills for missing browser features.
 * Polyfills provide JavaScript implementations of features that browsers don't support natively.
 * 
 * This manager ensures that polyfills are only loaded when needed and only loaded once,
 * preventing duplicate work and potential conflicts.
 */
export class PolyfillManager {
  private static instance: PolyfillManager;
  private loadedPolyfills: Map<string, PolyfillStatus> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): PolyfillManager {
    if (!PolyfillManager.instance) {
      PolyfillManager.instance = new PolyfillManager();
    }
    return PolyfillManager.instance;
  }

  /**
   * Generic polyfill loading mechanism that handles caching and concurrent requests.
   * If a polyfill is already loaded or loading, we reuse that work instead of duplicating it.
   */
  private async loadPolyfillIfNeeded(
    feature: string,
    checkFunction: () => boolean,
    polyfillFunction: () => Promise<void> | void
  ): Promise<void> {
    // Check if we've already attempted to load this polyfill
    const existing = this.loadedPolyfills.get(feature);
    if (existing) {
      if (existing.error) {
        throw existing.error;
      }
      return;
    }

    // Check if this polyfill is currently being loaded by another call
    const loadingPromise = this.loadingPromises.get(feature);
    if (loadingPromise) {
      return loadingPromise;
    }

    // If the feature is natively supported, skip the polyfill
    if (checkFunction()) {
      this.loadedPolyfills.set(feature, { 
        loaded: true, 
        feature,
        timestamp: Date.now()
      });
      return;
    }

    // Load the polyfill and track the promise to prevent duplicate loads
    const promise = this.loadPolyfill(feature, polyfillFunction);
    this.loadingPromises.set(feature, promise);
    
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(feature);
    }
  }

  /**
   * Executes the polyfill function and records the result in our tracking map.
   * All errors are caught and stored so that repeated calls don't retry failed polyfills.
   */
  private async loadPolyfill(
    feature: string,
    polyfillFunction: () => Promise<void> | void
  ): Promise<void> {
    try {
      await polyfillFunction();
      
      this.loadedPolyfills.set(feature, { 
        loaded: true, 
        feature,
        timestamp: Date.now()
      });
      
      logger.info(`Polyfill loaded: ${feature}`, { component: 'PolyfillManager' });
    } catch (error) {
      const polyfillError = error as Error;
      this.loadedPolyfills.set(feature, { 
        loaded: false, 
        error: polyfillError, 
        feature,
        timestamp: Date.now()
      });
      
      logger.error(`Failed to load polyfill: ${feature}`, { component: 'PolyfillManager' }, polyfillError);
      throw polyfillError;
    }
  }

  /**
   * Provides a polyfill for the Fetch API using XMLHttpRequest.
   * This polyfill creates a simplified version of fetch that handles basic HTTP requests.
   * 
   * Note: This is a minimal implementation focused on common use cases. It doesn't support
   * all Fetch API features like streaming responses or request cancellation.
   */
  async loadFetchPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'fetch',
      () => featureDetector.detectFetchSupport(),
      () => {
        if (typeof fetch !== 'undefined') return;

        // Create a basic fetch implementation using XMLHttpRequest
        (window as unknown as Record<string, unknown>).fetch = function(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const method = options.method || 'GET';
            
            xhr.open(method, url);
            
            // Apply any custom headers from the options
            if (options.headers) {
              Object.keys(options.headers).forEach(key => {
                xhr.setRequestHeader(key, options.headers![key]);
              });
            }
            
            // When the request completes, build a Response-like object
            xhr.onload = () => {
              const response = {
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Map(),
                url: url,
                text: () => Promise.resolve(xhr.responseText),
                json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                blob: () => Promise.resolve(new Blob([xhr.response])),
                arrayBuffer: () => Promise.resolve(xhr.response),
                clone: function() {
                  return Object.assign({}, this);
                },
                formData: () => Promise.reject(new Error('formData() method not implemented in fetch polyfill'))
              };
              resolve(response);
            };
            
            xhr.onerror = () => reject(new Error('Network request failed'));
            xhr.ontimeout = () => reject(new Error('Network request timed out'));
            
            if (options.timeout) {
              xhr.timeout = options.timeout;
            }
            
            xhr.send(options.body || null);
          });
        };
      }
    );
  }

  /**
   * Provides a polyfill for Promises, implementing the core Promise API.
   * This is a simplified but functional implementation that handles the essential
   * Promise behaviors: chaining, error handling, and resolution/rejection.
   * 
   * The implementation uses a state machine approach where promises transition
   * from pending to either fulfilled or rejected, and handlers are queued until
   * the promise settles.
   */
  async loadPromisePolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'promises',
      () => featureDetector.detectPromiseSupport(),
      () => {
        if (typeof Promise !== 'undefined') return;

        (window as unknown as Record<string, unknown>).Promise = class SimplePromise<T = unknown> {
          private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
          private value: T | undefined;
          private handlers: Array<{
            onFulfilled?: (value: T) => unknown;
            onRejected?: (reason: unknown) => unknown;
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
          }> = [];

          constructor(executor: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => void) {
            try {
              executor(
                (value) => this.resolve(value as T),
                (reason) => this.reject(reason)
              );
            } catch (error) {
              this.reject(error);
            }
          }

          private resolve(value: T): void {
            if (this.state === 'pending') {
              this.state = 'fulfilled';
              this.value = value;
              this.handlers.forEach(handler => this.handle(handler));
              this.handlers = [];
            }
          }

          private reject(reason: unknown): void {
            if (this.state === 'pending') {
              this.state = 'rejected';
              this.value = reason as T;
              this.handlers.forEach(handler => this.handle(handler));
              this.handlers = [];
            }
          }

          private handle(handler: {
            onFulfilled?: (value: T) => unknown;
            onRejected?: (reason: unknown) => unknown;
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
          }): void {
            if (this.state === 'pending') {
              this.handlers.push(handler);
              return;
            }

            // Use setTimeout to ensure handlers are called asynchronously
            setTimeout(() => {
              if (this.state === 'fulfilled') {
                if (handler.onFulfilled) {
                  try {
                    const result = handler.onFulfilled(this.value!);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else {
                  handler.resolve(this.value!);
                }
              } else if (this.state === 'rejected') {
                if (handler.onRejected) {
                  try {
                    const result = handler.onRejected(this.value!);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else {
                  handler.reject(this.value!);
                }
              }
            }, 0);
          }

          then<U>(onFulfilled?: (value: T) => U, onRejected?: (reason: unknown) => U): SimplePromise<U> {
            return new SimplePromise<U>((resolve, reject) => {
              this.handle({
                onFulfilled,
                onRejected,
                resolve,
                reject
              });
            });
          }

          catch<U>(onRejected: (reason: unknown) => U): SimplePromise<U> {
            return this.then(undefined, onRejected);
          }

          static resolve<U>(value: U): SimplePromise<U> {
            return new SimplePromise<U>(resolve => resolve(value));
          }

          static reject<U>(reason: unknown): SimplePromise<U> {
            return new SimplePromise<U>((_, reject) => reject(reason));
          }

          static all<U>(promises: SimplePromise<U>[]): SimplePromise<U[]> {
            return new SimplePromise<U[]>((resolve, reject) => {
              if (promises.length === 0) {
                resolve([]);
                return;
              }

              const results: U[] = new Array(promises.length);
              let completed = 0;

              promises.forEach((promise, index) => {
                promise.then(
                  (value) => {
                    results[index] = value;
                    completed++;
                    if (completed === promises.length) {
                      resolve(results);
                    }
                  },
                  reject
                );
              });
            });
          }
        };
      }
    );
  }

  /**
   * Provides a polyfill for IntersectionObserver, which is used for lazy loading
   * and scroll-based animations. This polyfill provides basic functionality but
   * doesn't implement all the advanced features of the native API.
   * 
   * The polyfill uses getBoundingClientRect to calculate visibility, which is
   * less efficient than the native implementation but works in older browsers.
   */
  async loadIntersectionObserverPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'intersectionObserver',
      () => featureDetector.detectIntersectionObserverSupport(),
      () => {
        if ('IntersectionObserver' in window) return;

        (window as unknown as Record<string, unknown>).IntersectionObserver = class IntersectionObserverPolyfill {
          private callback: (entries: IntersectionObserverEntry[]) => void;
          private elements: Set<Element> = new Set();

          constructor(callback: (entries: IntersectionObserverEntry[]) => void, _options: IntersectionObserverOptions = {}) {
            this.callback = callback;
          }

          observe(element: Element): void {
            if (this.elements.has(element)) return;

            this.elements.add(element);

            // Schedule the initial intersection check
            setTimeout(() => {
              const rect = element.getBoundingClientRect();
              const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
              const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

              // Calculate the intersection between element and viewport
              const elementLeft = Math.max(0, rect.left);
              const elementTop = Math.max(0, rect.top);
              const elementRight = Math.min(viewportWidth, rect.right);
              const elementBottom = Math.min(viewportHeight, rect.bottom);

              const intersectionWidth = Math.max(0, elementRight - elementLeft);
              const intersectionHeight = Math.max(0, elementBottom - elementTop);
              const intersectionArea = intersectionWidth * intersectionHeight;
              const elementArea = rect.width * rect.height;

              const isIntersecting = intersectionArea > 0;
              const intersectionRatio = elementArea > 0 ? intersectionArea / elementArea : 0;

              const intersectionRect = {
                left: elementLeft,
                top: elementTop,
                right: elementRight,
                bottom: elementBottom,
                width: intersectionWidth,
                height: intersectionHeight,
                x: elementLeft,
                y: elementTop,
                toJSON: () => ({ left: elementLeft, top: elementTop, right: elementRight, bottom: elementBottom, width: intersectionWidth, height: intersectionHeight, x: elementLeft, y: elementTop })
              };

              this.callback([{
                target: element,
                isIntersecting,
                intersectionRatio,
                boundingClientRect: rect,
                rootBounds: {
                  left: 0,
                  top: 0,
                  right: viewportWidth,
                  bottom: viewportHeight,
                  width: viewportWidth,
                  height: viewportHeight,
                  x: 0,
                  y: 0,
                  toJSON: () => ({ left: 0, top: 0, right: viewportWidth, bottom: viewportHeight, width: viewportWidth, height: viewportHeight, x: 0, y: 0 })
                },
                intersectionRect,
                time: Date.now()
              }]);
            }, 0);
          }

          unobserve(element: Element): void {
            this.elements.delete(element);
          }

          disconnect(): void {
            this.elements.clear();
          }
        };
      }
    );
  }

  /**
   * Provides polyfills for both localStorage and sessionStorage using in-memory objects.
   * These polyfills allow code to run without throwing errors, though data won't persist
   * across page reloads (for localStorage) or tabs (for sessionStorage).
   * 
   * This is useful for private browsing modes or browsers that disable storage APIs.
   */
  async loadStoragePolyfills(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    
    await this.loadPolyfillIfNeeded(
      'localStorage',
      () => featureDetector.detectLocalStorageSupport(),
      () => {
        if (typeof localStorage !== 'undefined') return;

        const storage: { [key: string]: string } = {};
        const localStoragePolyfill: StoragePolyfill = {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => { storage[key] = String(value); },
          removeItem: (key: string) => { delete storage[key]; },
          clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() { return Object.keys(storage).length; }
        };
        (window as unknown as Record<string, unknown>).localStorage = localStoragePolyfill;
      }
    );

    await this.loadPolyfillIfNeeded(
      'sessionStorage',
      () => featureDetector.detectSessionStorageSupport(),
      () => {
        if (typeof sessionStorage !== 'undefined') return;

        const storage: { [key: string]: string } = {};
        const sessionStoragePolyfill: StoragePolyfill = {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => { storage[key] = String(value); },
          removeItem: (key: string) => { delete storage[key]; },
          clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() { return Object.keys(storage).length; }
        };
        (window as unknown as Record<string, unknown>).sessionStorage = sessionStoragePolyfill;
      }
    );
  }

  /**
   * Loads all critical polyfills in parallel for maximum efficiency.
   * This is the recommended way to ensure browser compatibility on application startup.
   */
  async loadAllPolyfills(): Promise<void> {
    try {
      await Promise.all([
        this.loadFetchPolyfill(),
        this.loadPromisePolyfill(),
        this.loadIntersectionObserverPolyfill(),
        this.loadStoragePolyfills()
      ]);
      
      logger.info('All polyfills loaded successfully', { component: 'PolyfillManager' });
    } catch (error) {
      logger.error('Failed to load some polyfills', { component: 'PolyfillManager' }, error);
      throw error;
    }
  }

  getPolyfillStatus(): Map<string, PolyfillStatus> {
    return new Map(this.loadedPolyfills);
  }
}

// ============================================================================
// BROWSER COMPATIBILITY MANAGER
// ============================================================================

/**
 * High-level manager that orchestrates browser detection, feature testing,
 * polyfill loading, and compatibility scoring. This is the main entry point
 * for checking if a browser can run the application.
 * 
 * The manager produces a comprehensive compatibility status that includes:
 * - Browser identification and version checking
 * - Feature detection results
 * - Polyfill loading status
 * - Compatibility score (0-100)
 * - Actionable recommendations for users
 * - Whether to block the browser entirely
 */
export class BrowserCompatibilityManager {
  private static instance: BrowserCompatibilityManager;
  private status: CompatibilityStatus | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): BrowserCompatibilityManager {
    if (!BrowserCompatibilityManager.instance) {
      BrowserCompatibilityManager.instance = new BrowserCompatibilityManager();
    }
    return BrowserCompatibilityManager.instance;
  }

  /**
   * Initializes the compatibility system by detecting the browser, testing features,
   * loading polyfills, and generating a comprehensive status report.
   * 
   * This is an async operation because polyfill loading may be asynchronous.
   * The results are cached so subsequent calls return immediately.
   */
  async initialize(): Promise<CompatibilityStatus> {
    if (this.initialized && this.status) {
      return this.status;
    }

    try {
      const browserDetector = BrowserDetector.getInstance();
      const browserInfo = browserDetector.getBrowserInfo();
      const isSupported = browserDetector.isBrowserSupported();

      // Create initial status before polyfill loading
      this.status = {
        browserInfo,
        isSupported,
        warnings: browserInfo.warnings,
        polyfillsLoaded: false,
        polyfillsRequired: this.identifyRequiredPolyfills(browserInfo.features),
        recommendations: [],
        compatibilityScore: 0,
        shouldBlock: false,
        timestamp: Date.now()
      };

      // Load polyfills for missing features
      await this.loadPolyfills();

      // Calculate final compatibility metrics
      this.status.compatibilityScore = this.calculateCompatibilityScore();
      this.status.recommendations = this.generateRecommendations();
      this.status.shouldBlock = this.determineIfShouldBlock();

      this.initialized = true;
      return this.status;

    } catch (error) {
      logger.error('Failed to initialize browser compatibility manager', { component: 'BrowserCompatibilityManager' }, error);
      throw error;
    }
  }

  private async loadPolyfills(): Promise<void> {
    if (!this.status) return;

    try {
      const polyfillManager = PolyfillManager.getInstance();
      await polyfillManager.loadAllPolyfills();
      this.status.polyfillsLoaded = true;
    } catch (error) {
      logger.error('Failed to load polyfills', { component: 'BrowserCompatibilityManager' }, error);
      this.status.polyfillsLoaded = false;
    }
  }

  /**
   * Analyzes the feature set to determine which polyfills are needed.
   * This helps inform users about what's being patched in their browser.
   */
  private identifyRequiredPolyfills(features: FeatureSet): string[] {
    const required: string[] = [];

    if (!features.fetch) required.push('fetch');
    if (!features.promises) required.push('promise');
    if (!features.intersectionObserver) required.push('intersection-observer');
    if (!features.localStorage) required.push('localStorage');
    if (!features.sessionStorage) required.push('sessionStorage');

    return required;
  }

  /**
   * Calculates a 0-100 compatibility score based on multiple factors:
   * - Browser version support (40 points)
   * - Critical feature availability (40 points)
   * - Polyfill status (20 points)
   * 
   * This score helps determine whether to warn users or block them entirely.
   * Scores below 70 indicate significant compatibility issues.
   */
  private calculateCompatibilityScore(): number {
    if (!this.status) return 0;

    let score = 0;

    // Browser version component: Full points if version meets requirements
    if (this.status.isSupported) {
      score += 40;
    } else {
      score += 10; // Partial credit for being a recognized browser
    }

    // Critical features component: Proportional to how many are supported
    const features = this.status.browserInfo.features;
    const criticalSupported = CRITICAL_FEATURES.filter(f => features[f]).length;
    score += (criticalSupported / CRITICAL_FEATURES.length) * 40;

    // Polyfill component: Best if no polyfills needed, good if loaded successfully
    if (this.status.polyfillsRequired.length === 0) {
      score += 20;
    } else if (this.status.polyfillsLoaded) {
      score += 16;
    } else {
      score += 4;
    }

    return Math.round(score);
  }

  /**
   * Generates structured recommendations sorted by severity.
   * These provide actionable guidance for users experiencing compatibility issues.
   */
  private generateRecommendations(): CompatibilityRecommendation[] {
    if (!this.status) return [];

    const recommendations: CompatibilityRecommendation[] = [];
    const { browserInfo, compatibilityScore, polyfillsLoaded } = this.status;

    // Critical: Internet Explorer is completely unsupported
    if (browserInfo.name === 'ie') {
      recommendations.push({
        message: 'Internet Explorer is no longer supported. Switch to Chrome, Firefox, Safari, or Edge immediately.',
        severity: 'critical',
        category: 'browser-version',
        actionable: true
      });
    }

    // High: Outdated browser version
    if (!browserInfo.isSupported && browserInfo.name !== 'ie') {
      recommendations.push({
        message: `Your browser version is outdated. Update to the latest version for optimal compatibility.`,
        severity: 'high',
        category: 'browser-version',
        actionable: true
      });
    }

    // Medium: Low compatibility score
    if (compatibilityScore < 70) {
      recommendations.push({
        message: `Browser compatibility score is ${compatibilityScore}%. Update your browser for better performance.`,
        severity: 'medium',
        category: 'browser-version',
        actionable: true
      });
    }

    // High: Missing ES6 without polyfills
    if (!browserInfo.features.es6 && !polyfillsLoaded) {
      recommendations.push({
        message: 'Modern JavaScript features are not supported. The application may not function correctly.',
        severity: 'high',
        category: 'feature-missing',
        actionable: false
      });
    }

    // Low: Missing optional features
    if (!browserInfo.features.serviceWorkers) {
      recommendations.push({
        message: 'Offline functionality is not available. Update your browser to enable working without internet.',
        severity: 'low',
        category: 'feature-missing',
        actionable: true
      });
    }

    // Sort by severity: critical issues first
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Determines if the browser is so incompatible that we should prevent app access.
   * This is only done for Internet Explorer or browsers with extremely low scores.
   */
  private determineIfShouldBlock(): boolean {
    if (!this.status) return false;

    if (this.status.browserInfo.name === 'ie') {
      return true;
    }

    if (this.status.compatibilityScore < 30) {
      return true;
    }

    return false;
  }

  getStatus(): CompatibilityStatus | null {
    return this.status;
  }

  shouldBlockBrowser(): boolean {
    return this.status?.shouldBlock ?? false;
  }

  /**
   * Returns all warnings that should be displayed to the user.
   * This includes both feature warnings and critical recommendations.
   */
  getWarningsToShow(): string[] {
    if (!this.status) return [];

    const warnings: string[] = [];
    warnings.push(...this.status.warnings);

    const criticalRecs = this.status.recommendations
      .filter(r => r.severity === 'critical' || r.severity === 'high')
      .map(r => r.message);
    warnings.push(...criticalRecs);

    return warnings;
  }
}

// ============================================================================
// SINGLETON INSTANCES - CONVENIENCE EXPORTS
// ============================================================================

export const featureDetector = FeatureDetector.getInstance();
export const browserDetector = BrowserDetector.getInstance();
export const polyfillManager = PolyfillManager.getInstance();
export const browserCompatibilityManager = BrowserCompatibilityManager.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS - SIMPLIFIED API
// ============================================================================

/**
 * Quick access to browser information without needing to understand the singleton pattern.
 */
export function getBrowserInfo(): BrowserInfo {
  return browserDetector.getBrowserInfo();
}

export function isBrowserSupported(): boolean {
  return browserDetector.isBrowserSupported();
}

export function hasFeature(feature: keyof FeatureSet): boolean {
  return browserDetector.hasFeature(feature);
}

export function hasCriticalFeatures(): boolean {
  return featureDetector.hasCriticalFeatures();
}

/**
 * Initialize the entire compatibility system. Call this early in your application startup.
 */
export async function initializeBrowserCompatibility(): Promise<CompatibilityStatus> {
  return browserCompatibilityManager.initialize();
}

export function getBrowserCompatibilityStatus(): CompatibilityStatus | null {
  return browserCompatibilityManager.getStatus();
}

export function shouldBlockBrowser(): boolean {
  return browserCompatibilityManager.shouldBlockBrowser();
}

export function getCompatibilityWarnings(): string[] {
  return browserCompatibilityManager.getWarningsToShow();
}

export async function loadPolyfills(): Promise<void> {
  return polyfillManager.loadAllPolyfills();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Automatically initialize compatibility checking when this module loads in a browser.
 * This ensures that compatibility issues are detected as early as possible.
 * 
 * We skip this in test environments to avoid false failures from headless browsers.
 */
if (isBrowserEnv() && !isTestEnv()) {
  initializeBrowserCompatibility().catch(error => {
    logger.error('Failed to initialize browser compatibility', { component: 'BrowserUtils' }, error);
  });
}

// ============================================================================
// DEFAULT EXPORT - EVERYTHING IN ONE OBJECT
// ============================================================================

export default {
  // Classes
  FeatureDetector,
  BrowserDetector,
  PolyfillManager,
  BrowserCompatibilityManager,
  
  // Singleton instances
  featureDetector,
  browserDetector,
  polyfillManager,
  browserCompatibilityManager,
  
  // Convenience functions
  getBrowserInfo,
  isBrowserSupported,
  hasFeature,
  hasCriticalFeatures,
  initializeBrowserCompatibility,
  getBrowserCompatibilityStatus,
  shouldBlockBrowser,
  getCompatibilityWarnings,
  loadPolyfills,
};