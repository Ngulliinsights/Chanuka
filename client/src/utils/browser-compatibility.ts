/**
 * Browser Compatibility Utilities
 * 
 * This module provides comprehensive browser compatibility detection,
 * polyfills, and fallback mechanisms for the Chanuka Legislative Platform.
 */

// Browser information interface
export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  isSupported: boolean;
  features: {
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
  };
  warnings: string[];
  recommendations: string[];
}

// Minimum browser version requirements
const MINIMUM_VERSIONS = {
  chrome: 70,
  firefox: 65,
  safari: 12,
  edge: 79,
  opera: 57,
  samsung: 10,
  ios: 12,
  android: 70,
  ie: 11 // Internet Explorer (deprecated but still checked)
};

// Feature detection utilities
export class FeatureDetector {
  private static instance: FeatureDetector;
  private detectedFeatures: Partial<BrowserInfo['features']> = {};

  static getInstance(): FeatureDetector {
    if (!FeatureDetector.instance) {
      FeatureDetector.instance = new FeatureDetector();
    }
    return FeatureDetector.instance;
  }

  /**
   * Detect if ES6 features are supported
   */
  detectES6Support(): boolean {
    if (this.detectedFeatures.es6 !== undefined) {
      return this.detectedFeatures.es6;
    }

    try {
      // Test arrow functions - safer detection
      const arrowTest = new Function('return () => {}');
      arrowTest();
      
      // Test let/const - safer detection
      const letConstTest = new Function('let x = 1; const y = 2; return x + y;');
      letConstTest();
      
      // Test template literals - safer detection
      const templateTest = new Function('const x = 1; return `template ${x} literal`;');
      templateTest();
      
      // Test destructuring - safer detection
      const destructureTest = new Function('const [a, b] = [1, 2]; const {c} = {c: 3}; return a + b + c;');
      destructureTest();
      
      // Test classes - safer detection
      const classTest = new Function('class Test {} return Test;');
      classTest();
      
      this.detectedFeatures.es6 = true;
      return true;
    } catch {
      this.detectedFeatures.es6 = false;
      return false;
    }
  }

  /**
   * Detect fetch API support
   */
  detectFetchSupport(): boolean {
    if (this.detectedFeatures.fetch !== undefined) {
      return this.detectedFeatures.fetch;
    }

    this.detectedFeatures.fetch = typeof fetch === 'function' && 
                                  typeof Request === 'function' && 
                                  typeof Response === 'function';
    return this.detectedFeatures.fetch;
  }

  /**
   * Detect Promise support
   */
  detectPromiseSupport(): boolean {
    if (this.detectedFeatures.promises !== undefined) {
      return this.detectedFeatures.promises;
    }

    this.detectedFeatures.promises = typeof Promise === 'function' &&
                                    typeof Promise.resolve === 'function' &&
                                    typeof Promise.reject === 'function' &&
                                    typeof Promise.all === 'function';
    return this.detectedFeatures.promises;
  }

  /**
   * Detect localStorage support
   */
  detectLocalStorageSupport(): boolean {
    if (this.detectedFeatures.localStorage !== undefined) {
      return this.detectedFeatures.localStorage;
    }

    try {
      const testKey = '__test_localStorage__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.detectedFeatures.localStorage = true;
      return true;
    } catch {
      this.detectedFeatures.localStorage = false;
      return false;
    }
  }

  /**
   * Detect sessionStorage support
   */
  detectSessionStorageSupport(): boolean {
    if (this.detectedFeatures.sessionStorage !== undefined) {
      return this.detectedFeatures.sessionStorage;
    }

    try {
      const testKey = '__test_sessionStorage__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      this.detectedFeatures.sessionStorage = true;
      return true;
    } catch {
      this.detectedFeatures.sessionStorage = false;
      return false;
    }
  }

  /**
   * Detect Web Workers support
   */
  detectWebWorkersSupport(): boolean {
    if (this.detectedFeatures.webWorkers !== undefined) {
      return this.detectedFeatures.webWorkers;
    }

    this.detectedFeatures.webWorkers = typeof Worker === 'function';
    return this.detectedFeatures.webWorkers;
  }

  /**
   * Detect Service Workers support
   */
  detectServiceWorkersSupport(): boolean {
    if (this.detectedFeatures.serviceWorkers !== undefined) {
      return this.detectedFeatures.serviceWorkers;
    }

    this.detectedFeatures.serviceWorkers = 'serviceWorker' in navigator;
    return this.detectedFeatures.serviceWorkers;
  }

  /**
   * Detect Intersection Observer support
   */
  detectIntersectionObserverSupport(): boolean {
    if (this.detectedFeatures.intersectionObserver !== undefined) {
      return this.detectedFeatures.intersectionObserver;
    }

    this.detectedFeatures.intersectionObserver = 'IntersectionObserver' in window;
    return this.detectedFeatures.intersectionObserver;
  }

  /**
   * Detect Resize Observer support
   */
  detectResizeObserverSupport(): boolean {
    if (this.detectedFeatures.resizeObserver !== undefined) {
      return this.detectedFeatures.resizeObserver;
    }

    this.detectedFeatures.resizeObserver = 'ResizeObserver' in window;
    return this.detectedFeatures.resizeObserver;
  }

  /**
   * Detect Custom Elements support
   */
  detectCustomElementsSupport(): boolean {
    if (this.detectedFeatures.customElements !== undefined) {
      return this.detectedFeatures.customElements;
    }

    this.detectedFeatures.customElements = 'customElements' in window;
    return this.detectedFeatures.customElements;
  }

  /**
   * Detect Shadow DOM support
   */
  detectShadowDOMSupport(): boolean {
    if (this.detectedFeatures.shadowDOM !== undefined) {
      return this.detectedFeatures.shadowDOM;
    }

    this.detectedFeatures.shadowDOM = 'attachShadow' in Element.prototype;
    return this.detectedFeatures.shadowDOM;
  }

  /**
   * Detect ES Modules support
   */
  detectModulesSupport(): boolean {
    if (this.detectedFeatures.modules !== undefined) {
      return this.detectedFeatures.modules;
    }

    // Check for script type="module" support
    const script = document.createElement('script');
    this.detectedFeatures.modules = 'noModule' in script;
    return this.detectedFeatures.modules;
  }

  /**
   * Detect async/await support
   */
  detectAsyncAwaitSupport(): boolean {
    if (this.detectedFeatures.asyncAwait !== undefined) {
      return this.detectedFeatures.asyncAwait;
    }

    try {
      const asyncTest = new Function('return async function test() { await Promise.resolve(); }');
      asyncTest();
      this.detectedFeatures.asyncAwait = true;
      return true;
    } catch {
      this.detectedFeatures.asyncAwait = false;
      return false;
    }
  }

  /**
   * Detect WebGL support
   */
  detectWebGLSupport(): boolean {
    if (this.detectedFeatures.webGL !== undefined) {
      return this.detectedFeatures.webGL;
    }

    try {
      // Check if we're in a test environment
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        this.detectedFeatures.webGL = false;
        return false;
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.detectedFeatures.webGL = !!context;
      return this.detectedFeatures.webGL;
    } catch {
      this.detectedFeatures.webGL = false;
      return false;
    }
  }

  /**
   * Detect WebRTC support
   */
  detectWebRTCSupport(): boolean {
    if (this.detectedFeatures.webRTC !== undefined) {
      return this.detectedFeatures.webRTC;
    }

    this.detectedFeatures.webRTC = !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    );
    return this.detectedFeatures.webRTC;
  }

  /**
   * Detect Geolocation support
   */
  detectGeolocationSupport(): boolean {
    if (this.detectedFeatures.geolocation !== undefined) {
      return this.detectedFeatures.geolocation;
    }

    this.detectedFeatures.geolocation = 'geolocation' in navigator;
    return this.detectedFeatures.geolocation;
  }

  /**
   * Detect Notifications support
   */
  detectNotificationsSupport(): boolean {
    if (this.detectedFeatures.notifications !== undefined) {
      return this.detectedFeatures.notifications;
    }

    this.detectedFeatures.notifications = 'Notification' in window;
    return this.detectedFeatures.notifications;
  }

  /**
   * Detect Fullscreen API support
   */
  detectFullscreenSupport(): boolean {
    if (this.detectedFeatures.fullscreen !== undefined) {
      return this.detectedFeatures.fullscreen;
    }

    const element = document.documentElement;
    this.detectedFeatures.fullscreen = !!(
      element.requestFullscreen ||
      (element as any).webkitRequestFullscreen ||
      (element as any).mozRequestFullScreen ||
      (element as any).msRequestFullscreen
    );
    return this.detectedFeatures.fullscreen;
  }

  /**
   * Detect Clipboard API support
   */
  detectClipboardSupport(): boolean {
    if (this.detectedFeatures.clipboard !== undefined) {
      return this.detectedFeatures.clipboard;
    }

    this.detectedFeatures.clipboard = !!(navigator.clipboard && navigator.clipboard.writeText);
    return this.detectedFeatures.clipboard;
  }

  /**
   * Get all detected features
   */
  getAllFeatures(): BrowserInfo['features'] {
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
}

// Browser detection utilities
export class BrowserDetector {
  private static instance: BrowserDetector;
  private browserInfo: BrowserInfo | null = null;

  static getInstance(): BrowserDetector {
    if (!BrowserDetector.instance) {
      BrowserDetector.instance = new BrowserDetector();
    }
    return BrowserDetector.instance;
  }

  /**
   * Parse user agent string to detect browser
   */
  private parseUserAgent(): { name: string; version: string; majorVersion: number } {
    const userAgent = navigator.userAgent;
    
    // Internet Explorer (legacy support)
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      const ieMatch = userAgent.match(/(?:MSIE |rv:)(\d+)\.(\d+)/);
      if (ieMatch) {
        return {
          name: 'ie',
          version: `${ieMatch[1]}.${ieMatch[2]}`,
          majorVersion: parseInt(ieMatch[1])
        };
      }
    }
    
    // Edge Legacy (EdgeHTML)
    if (userAgent.includes('Edge/')) {
      const match = userAgent.match(/Edge\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge-legacy',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Edge (Chromium-based)
    if (userAgent.includes('Edg/')) {
      const match = userAgent.match(/Edg\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'edge',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Chrome (must be checked before Safari)
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'chrome',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Firefox
    if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'firefox',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Safari (must be checked after Chrome)
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'safari',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Opera (modern)
    if (userAgent.includes('OPR/')) {
      const match = userAgent.match(/OPR\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'opera',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Opera (legacy)
    if (userAgent.includes('Opera')) {
      const match = userAgent.match(/Opera[\/\s](\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'opera',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Samsung Internet
    if (userAgent.includes('SamsungBrowser')) {
      const match = userAgent.match(/SamsungBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'samsung',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // iOS Safari
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      const match = userAgent.match(/OS (\d+)_(\d+)/);
      if (match) {
        return {
          name: 'ios',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Android Chrome
    if (userAgent.includes('Android')) {
      const chromeMatch = userAgent.match(/Chrome\/(\d+)\.(\d+)/);
      if (chromeMatch) {
        return {
          name: 'android',
          version: `${chromeMatch[1]}.${chromeMatch[2]}`,
          majorVersion: parseInt(chromeMatch[1])
        };
      }
      
      // Android WebView or other Android browsers
      const androidMatch = userAgent.match(/Android (\d+)\.(\d+)/);
      if (androidMatch) {
        return {
          name: 'android',
          version: `${androidMatch[1]}.${androidMatch[2]}`,
          majorVersion: parseInt(androidMatch[1])
        };
      }
    }
    
    // UC Browser
    if (userAgent.includes('UCBrowser')) {
      const match = userAgent.match(/UCBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'uc',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // QQ Browser
    if (userAgent.includes('QQBrowser')) {
      const match = userAgent.match(/QQBrowser\/(\d+)\.(\d+)/);
      if (match) {
        return {
          name: 'qq',
          version: `${match[1]}.${match[2]}`,
          majorVersion: parseInt(match[1])
        };
      }
    }
    
    // Unknown browser
    return {
      name: 'unknown',
      version: '0.0',
      majorVersion: 0
    };
  }

  /**
   * Check if browser version meets minimum requirements
   */
  private checkBrowserSupport(name: string, majorVersion: number): boolean {
    const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
    return minVersion ? majorVersion >= minVersion : false;
  }

  /**
   * Generate warnings for unsupported features
   */
  private generateWarnings(features: BrowserInfo['features'], browserName: string): string[] {
    const warnings: string[] = [];
    
    if (!features.es6) {
      warnings.push('ES6 features are not supported. The application may not function correctly.');
    }
    
    if (!features.fetch) {
      warnings.push('Fetch API is not supported. Network requests may fail.');
    }
    
    if (!features.promises) {
      warnings.push('Promises are not supported. Asynchronous operations may fail.');
    }
    
    if (!features.localStorage) {
      warnings.push('Local storage is not available. User preferences cannot be saved.');
    }
    
    if (!features.serviceWorkers) {
      warnings.push('Service workers are not supported. Offline functionality is not available.');
    }
    
    if (!features.modules) {
      warnings.push('ES modules are not supported. The application may not load properly.');
    }
    
    if (browserName === 'unknown') {
      warnings.push('Your browser is not recognized. Some features may not work correctly.');
    }
    
    return warnings;
  }

  /**
   * Generate recommendations for better experience
   */
  private generateRecommendations(features: BrowserInfo['features'], browserName: string, majorVersion: number): string[] {
    const recommendations: string[] = [];
    
    const minVersion = MINIMUM_VERSIONS[browserName as keyof typeof MINIMUM_VERSIONS];
    if (minVersion && majorVersion < minVersion) {
      recommendations.push(`Please update your browser to version ${minVersion} or higher for the best experience.`);
    }
    
    if (!features.intersectionObserver) {
      recommendations.push('Consider updating your browser for better performance with lazy loading.');
    }
    
    if (!features.resizeObserver) {
      recommendations.push('Update your browser for improved responsive design features.');
    }
    
    if (!features.webGL) {
      recommendations.push('WebGL support would improve chart and visualization performance.');
    }
    
    if (browserName === 'unknown') {
      recommendations.push('For the best experience, please use Chrome, Firefox, Safari, or Edge.');
    }
    
    return recommendations;
  }

  /**
   * Get comprehensive browser information
   */
  getBrowserInfo(): BrowserInfo {
    if (this.browserInfo) {
      return this.browserInfo;
    }

    const { name, version, majorVersion } = this.parseUserAgent();
    const featureDetector = FeatureDetector.getInstance();
    const features = featureDetector.getAllFeatures();
    const isSupported = this.checkBrowserSupport(name, majorVersion);
    const warnings = this.generateWarnings(features, name);
    const recommendations = this.generateRecommendations(features, name, majorVersion);

    this.browserInfo = {
      name,
      version,
      majorVersion,
      isSupported,
      features,
      warnings,
      recommendations
    };

    return this.browserInfo;
  }

  /**
   * Check if current browser is supported
   */
  isBrowserSupported(): boolean {
    return this.getBrowserInfo().isSupported;
  }

  /**
   * Get browser warnings
   */
  getBrowserWarnings(): string[] {
    return this.getBrowserInfo().warnings;
  }

  /**
   * Get browser recommendations
   */
  getBrowserRecommendations(): string[] {
    return this.getBrowserInfo().recommendations;
  }
}

// Export singleton instances
export const browserDetector = BrowserDetector.getInstance();
export const featureDetector = FeatureDetector.getInstance();

// Convenience functions
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