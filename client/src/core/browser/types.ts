/**
 * Browser Compatibility Types
 * 
 * Centralized type definitions for browser detection, feature testing,
 * and compatibility management.
 */

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

// Internal types for polyfill management
export interface PolyfillStatus {
  loaded: boolean;
  error?: Error;
  feature: string;
  timestamp: number;
}

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer;
  timeout?: number;
}

export interface FetchResponse {
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

export interface IntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRect;
  rootBounds: DOMRect | null;
  intersectionRect: DOMRect;
  time: number;
}

export interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export interface StoragePolyfill {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
}
