/**
 * Feature Detection Module
 *
 * Singleton class that performs feature detection for modern web APIs.
 * Results are cached to avoid redundant checks, which can be expensive.
 */

import { CRITICAL_FEATURES } from './constants';
import { isBrowserEnv, isTestEnv } from './environment';
import type { FeatureSet } from './types';

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
      // Test ES6 features using safer feature detection
      // Test arrow functions
      const testArrowFunction = () => true;

      // Test let/const, destructuring, template literals, classes
      const testES6Features = (() => {
        const x = 1;
        const y = 2;
        const [a, b] = [1, 2];
        const { c } = { c: 3 };
        const str = `template ${x} literal`;
        class Test {}
        return a + b + c + x + y + str.length;
      })();

      // If we get here, all ES6 features work
      this.cache.es6 = testArrowFunction() && testES6Features > 0;
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
      // Test async/await support safely
      (async () => {
        await Promise.resolve();
        return true;
      })();
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
      clipboard: this.detectClipboardSupport(),
    };
  }

  /**
   * Quick check for whether all critical features are present.
   * If this returns false, the application may not function at all.
   */
  hasCriticalFeatures(): boolean {
    return CRITICAL_FEATURES.every(feature => {
      const methodName =
        `detect${feature.charAt(0).toUpperCase() + feature.slice(1)}Support` as keyof this;
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

export const featureDetector = FeatureDetector.getInstance();
