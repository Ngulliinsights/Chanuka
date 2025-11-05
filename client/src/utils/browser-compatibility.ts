/**
 * Browser Compatibility Utilities - Optimized Edition
 * 
 * Provides comprehensive browser compatibility detection, feature testing,
 * and user guidance for the Chanuka Legislative Platform.
 * 
 * Key optimizations:
 * - Lazy evaluation with intelligent caching
 * - Reduced memory footprint through shared constants
 * - Enhanced SSR/test environment safety
 * - Improved type safety and documentation
 */

/**
 * Defines comprehensive browser information including identification,
 * version data, support status, and feature availability matrix
 */
export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  isSupported: boolean;
  features: FeatureSet;
  warnings: string[];
  recommendations: string[];
}

/**
 * Complete feature detection matrix covering modern web capabilities
 */
export interface FeatureSet {
  es6: boolean;
  fetch: boolean;
  promises: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  webWorkers: boolean;
  serviceWorkers: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
  customElements: boolean;
  shadowDOM: boolean;
  modules: boolean;
  asyncAwait: boolean;
  webGL: boolean;
  webRTC: boolean;
  geolocation: boolean;
  notifications: boolean;
  fullscreen: boolean;
  clipboard: boolean;
}

/**
 * Minimum browser versions required for full platform functionality.
 * These represent tested, stable releases supporting all critical features.
 */
const MINIMUM_VERSIONS = {
  chrome: 70,
  firefox: 65,
  safari: 12,
  edge: 79,
  opera: 57,
  samsung: 10,
  ios: 12,
  android: 70,
  ie: 11
} as const;

/**
 * Critical features that must be present for basic functionality.
 * Used to generate meaningful warnings when absent.
 */
const CRITICAL_FEATURES: ReadonlyArray<keyof FeatureSet> = [
  'es6',
  'fetch',
  'promises',
  'localStorage',
  'modules'
] as const;

/**
 * Safe environment check ensuring feature detection only runs in browser contexts.
 * Prevents ReferenceErrors in SSR, Node test runners, or other non-browser environments.
 */
function isBrowserEnv(): boolean {
  return (
    typeof window !== 'undefined' && 
    typeof document !== 'undefined' && 
    typeof navigator !== 'undefined'
  );
}

/**
 * Checks if running in a test environment where certain features should be skipped
 */
function isTestEnv(): boolean {
  return (
    typeof process !== 'undefined' && 
    process.env?.NODE_ENV === 'test'
  );
}

/**
 * FeatureDetector performs runtime detection of browser capabilities using
 * a singleton pattern with lazy evaluation for optimal performance.
 * 
 * Each detection method follows a consistent pattern:
 * 1. Check cache to avoid redundant work
 * 2. Verify environment safety
 * 3. Perform actual feature test
 * 4. Cache and return result
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
   * Tests ES6 support by attempting to execute key ES6 syntax patterns.
   * Uses Function constructor for safe syntax testing without eval.
   */
  detectES6Support(): boolean {
    if (this.cache.es6 !== undefined) return this.cache.es6;

    try {
      // Test comprehensive ES6 feature set in a single evaluation
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
   * Checks for modern Fetch API availability including related constructors
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
   * Verifies Promise support including essential methods for async operations
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
   * Tests localStorage with actual read/write operations to catch browsers
   * where the API exists but is disabled (such as private/incognito mode)
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
   * Tests sessionStorage with actual operations, similar to localStorage verification
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

  detectShadowDOMSupport(): boolean {
    if (this.cache.shadowDOM !== undefined) return this.cache.shadowDOM;

    this.cache.shadowDOM = 
      isBrowserEnv() && 
      typeof Element !== 'undefined' && 
      Element.prototype !== undefined &&
      'attachShadow' in Element.prototype;
    
    return this.cache.shadowDOM;
  }

  detectModulesSupport(): boolean {
    if (this.cache.modules !== undefined) return this.cache.modules;

    if (!isBrowserEnv()) {
      this.cache.modules = false;
      return false;
    }

    // The noModule attribute exists only in browsers that support ES modules
    const script = document.createElement('script');
    this.cache.modules = 'noModule' in script;
    return this.cache.modules;
  }

  /**
   * Tests async/await syntax support through safe function construction
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
   * Tests WebGL by attempting to create a rendering context.
   * Gracefully handles test environments where canvas may not exist.
   */
  detectWebGLSupport(): boolean {
    if (this.cache.webGL !== undefined) return this.cache.webGL;

    // Skip in non-browser or test environments to avoid errors
    if (!isBrowserEnv() || isTestEnv()) {
      this.cache.webGL = false;
      return false;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.cache.webGL = !!gl;
      
      // Clean up context to prevent memory leaks
      if (gl && typeof (gl as any).getExtension === 'function') {
        const loseContext = (gl as any).getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
    } catch {
      this.cache.webGL = false;
    }
    
    return this.cache.webGL;
  }

  /**
   * Checks for WebRTC support across different vendor implementations
   */
  detectWebRTCSupport(): boolean {
    if (this.cache.webRTC !== undefined) return this.cache.webRTC;

    if (!isBrowserEnv()) {
      this.cache.webRTC = false;
      return false;
    }

    this.cache.webRTC = !!(
      (window as any).RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
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
   * Checks for Fullscreen API across vendor prefixes
   */
  detectFullscreenSupport(): boolean {
    if (this.cache.fullscreen !== undefined) return this.cache.fullscreen;

    if (!isBrowserEnv()) {
      this.cache.fullscreen = false;
      return false;
    }

    const elem = document.documentElement;
    this.cache.fullscreen = !!(
      (elem as any).requestFullscreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).msRequestFullscreen
    );
    
    return this.cache.fullscreen;
  }

  /**
   * Verifies modern Clipboard API availability (async clipboard, not execCommand)
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
   * Executes all feature detection tests and returns complete feature set.
   * Triggers all lazy evaluations and caches results for future calls.
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
   * Clears the feature detection cache, forcing re-evaluation on next access.
   * Useful for testing or when browser capabilities may have changed.
   */
  clearCache(): void {
    this.cache = {};
  }
}

/**
 * BrowserDetector identifies the browser and version from user agent strings,
 * combines this with feature detection, and provides comprehensive compatibility reporting.
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
   * Parses user agent string to identify browser name and version.
   * Detection order is critical: Edge before Chrome, Chrome before Safari, etc.
   * to avoid misidentification due to overlapping UA strings.
   */
  private parseUserAgent(): { name: string; version: string; majorVersion: number } {
    // Safe fallback for non-browser environments
    if (!isBrowserEnv()) {
      return { name: 'unknown', version: '0.0', majorVersion: 0 };
    }

    const ua = navigator.userAgent;
    
    // Internet Explorer (IE11 and legacy versions)
    if (ua.includes('MSIE') || ua.includes('Trident/')) {
      const match = ua.match(/(?:MSIE |rv:)(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'ie',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Edge Legacy (EdgeHTML-based, pre-Chromium)
    if (ua.includes('Edge/')) {
      const match = ua.match(/Edge\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge-legacy',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Modern Edge (Chromium-based)
    if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Chrome (must precede Safari check due to UA overlap)
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'chrome',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Firefox
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'firefox',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Safari (must follow Chrome check)
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'safari',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Opera (modern, Chromium-based)
    if (ua.includes('OPR/')) {
      const match = ua.match(/OPR\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'opera',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Samsung Internet Browser
    if (ua.includes('SamsungBrowser')) {
      const match = ua.match(/SamsungBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'samsung',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // iOS Safari (mobile)
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      const match = ua.match(/OS (\d+)_(\d+)/);
      if (match) {
        return {
          name: 'ios',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1], 10)
        };
      }
    }
    
    // Android Chrome or WebView
    if (ua.includes('Android')) {
      const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)/);
      if (chromeMatch) {
        return {
          name: 'android',
          version: `${chromeMatch[1]}.${chromeMatch[2]}`,
          majorVersion: parseInt(chromeMatch[1], 10)
        };
      }
      
      const androidMatch = ua.match(/Android (\d+)\.(\d+)/);
      if (androidMatch) {
        return {
          name: 'android',
          version: `${androidMatch[1]}.${androidMatch[2]}`,
          majorVersion: parseInt(androidMatch[1], 10)
        };
      }
    }
    
    // Unrecognized browser fallback
    return { name: 'unknown', version: '0.0', majorVersion: 0 };
  }

  /**
   * Determines if detected browser meets minimum version requirements
   */
  private checkBrowserSupport(name: string, majorVersion: number): boolean {
    const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
    return minVersion !== undefined && majorVersion >= minVersion;
  }

  /**
   * Generates user-facing warnings about missing critical features
   */
  private generateWarnings(features: FeatureSet, browserName: string): string[] {
    const warnings: string[] = [];
    
    // Check each critical feature and generate specific warnings
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
    
    if (!features.sessionStorage) {
      warnings.push('Session storage is unavailable. Temporary data cannot be preserved.');
    }
    
    if (!features.serviceWorkers) {
      warnings.push('Service workers are unsupported. Offline functionality is not available.');
    }
    
    if (!features.modules) {
      warnings.push('ES module support is missing. The application may fail to load.');
    }
    
    if (browserName === 'unknown') {
      warnings.push('Browser not recognized. Compatibility cannot be guaranteed.');
    }
    
    if (browserName === 'ie') {
      warnings.push('Internet Explorer is no longer supported. Please switch to a modern browser.');
    }
    
    return warnings;
  }

  /**
   * Generates actionable recommendations for improving user experience
   */
  private generateRecommendations(
    features: FeatureSet, 
    browserName: string, 
    majorVersion: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Check version against minimum requirements
    const minVersion = MINIMUM_VERSIONS[browserName as keyof typeof MINIMUM_VERSIONS];
    if (minVersion !== undefined && majorVersion < minVersion) {
      recommendations.push(
        `Please update ${this.formatBrowserName(browserName)} to version ${minVersion} or higher for optimal performance.`
      );
    }
    
    // Recommend updates for missing modern features
    if (!features.intersectionObserver) {
      recommendations.push('Update your browser to enable improved lazy loading and scroll performance.');
    }
    
    if (!features.resizeObserver) {
      recommendations.push('A browser update would enable enhanced responsive design features.');
    }
    
    if (!features.webGL) {
      recommendations.push('WebGL support would significantly improve chart and visualization rendering.');
    }
    
    if (!features.clipboard) {
      recommendations.push('Modern clipboard API support would improve copy-paste functionality.');
    }
    
    // Suggest mainstream browsers for unknown or legacy browsers
    if (browserName === 'unknown' || browserName === 'ie' || browserName === 'edge-legacy') {
      recommendations.push(
        'For the best experience, we recommend Chrome 70+, Firefox 65+, Safari 12+, or Edge 79+.'
      );
    }
    
    return recommendations;
  }

  /**
   * Formats browser name for user-facing messages
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
   * Returns complete browser information including features, warnings, and recommendations.
   * Results are cached after first call to optimize performance.
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

  /**
   * Quick check if browser meets minimum requirements
   */
  isBrowserSupported(): boolean {
    return this.getBrowserInfo().isSupported;
  }

  /**
   * Returns array of warning messages for unsupported features
   */
  getBrowserWarnings(): string[] {
    return this.getBrowserInfo().warnings;
  }

  /**
   * Returns array of recommendations for improving compatibility
   */
  getBrowserRecommendations(): string[] {
    return this.getBrowserInfo().recommendations;
  }

  /**
   * Checks if a specific feature is supported
   */
  hasFeature(feature: keyof FeatureSet): boolean {
    return this.getBrowserInfo().features[feature];
  }

  /**
   * Clears cached browser information, forcing fresh detection on next access
   */
  clearCache(): void {
    this.cachedInfo = null;
  }
}

// Export singleton instances for convenient global access
export const browserDetector = BrowserDetector.getInstance();
export const featureDetector = FeatureDetector.getInstance();

// Convenience functions that delegate to singleton instances
export function getBrowserInfo(): BrowserInfo {
  return browserDetector.getBrowserInfo();
}

export function isBrowserSupported(): boolean {
  return browserDetector.isBrowserSupported();
}

export function getBrowserWarnings(): string[] {
  return browserDetector.getBrowserWarnings();
}

export function getBrowserRecommendations(): string[] {
  return browserDetector.getBrowserRecommendations();
}

export function hasFeature(feature: keyof FeatureSet): boolean {
  return browserDetector.hasFeature(feature);
}