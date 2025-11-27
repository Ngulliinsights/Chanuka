/**
 * Browser Polyfills - Optimized Final Edition
 * 
 * Provides lightweight, production-ready polyfills for legacy browsers to ensure
 * the Chanuka Legislative Platform functions across different browser versions.
 * 
 * Key optimizations:
 * - Minimal polyfill implementations that prioritize correctness over completeness
 * - Lazy loading with deduplication to avoid redundant work
 * - Enhanced error handling with graceful degradation
 * - Memory-efficient caching and state management
 * - Better coordination with feature detection system
 */

import { featureDetector } from './browser-compatibility';
import { logger } from './logger';

/**
 * Tracks the loading state of individual polyfills including success, failure,
 * and any errors encountered during the loading process
 */
interface PolyfillStatus {
  loaded: boolean;
  error?: Error;
  feature: string;
  timestamp: number;
}

/**
 * PolyfillManager orchestrates the loading of polyfills with intelligent caching,
 * deduplication, and coordination with the feature detection system.
 * 
 * The manager follows these principles:
 * - Only load polyfills for genuinely missing features
 * - Never load the same polyfill twice
 * - Fail gracefully without blocking application startup
 * - Provide detailed logging for debugging
 */
class PolyfillManager {
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
   * Load a polyfill only if the feature is genuinely missing from the browser.
   * This method handles caching, deduplication, and coordinated loading to ensure
   * each polyfill is evaluated and loaded exactly once.
   */
  private async loadPolyfillIfNeeded(
    feature: string,
    checkFunction: () => boolean,
    polyfillFunction: () => Promise<void> | void
  ): Promise<void> {
    // Check if we've already processed this polyfill
    const existing = this.loadedPolyfills.get(feature);
    if (existing) {
      if (existing.error) {
        throw existing.error;
      }
      return;
    }

    // Check if another call is already loading this polyfill
    const loadingPromise = this.loadingPromises.get(feature);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Feature exists natively, no polyfill needed
    if (checkFunction()) {
      this.loadedPolyfills.set(feature, { 
        loaded: true, 
        feature,
        timestamp: Date.now()
      });
      return;
    }

    // Load the polyfill
    const promise = this.loadPolyfill(feature, polyfillFunction);
    this.loadingPromises.set(feature, promise);
    
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(feature);
    }
  }

  /**
   * Execute the polyfill loading function with proper error handling and logging
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
      
      logger.info(`Polyfill loaded: ${feature}`, { component: 'Polyfills' });
    } catch (error) {
      const polyfillError = error as Error;
      this.loadedPolyfills.set(feature, { 
        loaded: false, 
        error: polyfillError, 
        feature,
        timestamp: Date.now()
      });
      
      logger.error(`Failed to load polyfill: ${feature}`, { component: 'Polyfills' }, polyfillError);
      throw polyfillError;
    }
  }

  /**
   * Fetch API polyfill using XMLHttpRequest as a fallback.
   * This provides basic fetch functionality for legacy browsers while maintaining
   * a similar API surface to the native implementation.
   */
  async loadFetchPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'fetch',
      () => featureDetector.detectFetchSupport(),
      () => {
        if (typeof fetch !== 'undefined') return;

        // Simple but functional fetch polyfill
        (window as any).fetch = function(url: string, options: any = {}): Promise<any> {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const method = options.method || 'GET';
            
            xhr.open(method, url);
            
            // Set headers if provided
            if (options.headers) {
              Object.keys(options.headers).forEach(key => {
                xhr.setRequestHeader(key, options.headers[key]);
              });
            }
            
            xhr.onload = () => {
              // Create a response-like object
              const response = {
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Map(),
                url: url,
                text: () => Promise.resolve(xhr.responseText),
                json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                blob: () => Promise.resolve(new Blob([xhr.response])),
                arrayBuffer: () => Promise.resolve(xhr.response)
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
   * Promise polyfill providing essential Promise functionality for browsers
   * that lack native support. This implementation follows the Promises/A+ spec
   * for the core then/catch behavior.
   */
  async loadPromisePolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'promises',
      () => featureDetector.detectPromiseSupport(),
      () => {
        if (typeof Promise !== 'undefined') return;

        (window as any).Promise = class SimplePromise {
          private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
          private value: any;
          private handlers: Array<{
            onFulfilled?: (value: any) => any;
            onRejected?: (reason: any) => any;
            resolve: (value: any) => void;
            reject: (reason: any) => void;
          }> = [];

          constructor(executor: (resolve: (value: any) => void, reject: (reason: any) => void) => void) {
            try {
              executor(
                (value) => this.resolve(value),
                (reason) => this.reject(reason)
              );
            } catch (error) {
              this.reject(error);
            }
          }

          private resolve(value: any): void {
            if (this.state === 'pending') {
              this.state = 'fulfilled';
              this.value = value;
              this.handlers.forEach(handler => this.handle(handler));
              this.handlers = [];
            }
          }

          private reject(reason: any): void {
            if (this.state === 'pending') {
              this.state = 'rejected';
              this.value = reason;
              this.handlers.forEach(handler => this.handle(handler));
              this.handlers = [];
            }
          }

          private handle(handler: any): void {
            if (this.state === 'pending') {
              this.handlers.push(handler);
              return;
            }

            // Execute asynchronously to match native Promise behavior
            setTimeout(() => {
              if (this.state === 'fulfilled') {
                if (handler.onFulfilled) {
                  try {
                    const result = handler.onFulfilled(this.value);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else {
                  handler.resolve(this.value);
                }
              } else if (this.state === 'rejected') {
                if (handler.onRejected) {
                  try {
                    const result = handler.onRejected(this.value);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else {
                  handler.reject(this.value);
                }
              }
            }, 0);
          }

          then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any): SimplePromise {
            return new SimplePromise((resolve, reject) => {
              this.handle({
                onFulfilled,
                onRejected,
                resolve,
                reject
              });
            });
          }

          catch(onRejected: (reason: any) => any): SimplePromise {
            return this.then(undefined, onRejected);
          }

          static resolve(value: any): SimplePromise {
            return new SimplePromise(resolve => resolve(value));
          }

          static reject(reason: any): SimplePromise {
            return new SimplePromise((_, reject) => reject(reason));
          }

          static all(promises: SimplePromise[]): SimplePromise {
            return new SimplePromise((resolve, reject) => {
              if (promises.length === 0) {
                resolve([]);
                return;
              }

              const results: any[] = new Array(promises.length);
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

          static race(promises: SimplePromise[]): SimplePromise {
            return new SimplePromise((resolve, reject) => {
              promises.forEach(promise => {
                promise.then(resolve, reject);
              });
            });
          }
        };
      }
    );
  }

  /**
   * Intersection Observer polyfill that provides basic functionality for legacy browsers.
   * This simplified version triggers immediately rather than observing actual intersections,
   * which is sufficient for many use cases like lazy loading.
   */
  async loadIntersectionObserverPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'intersectionObserver',
      () => featureDetector.detectIntersectionObserverSupport(),
      () => {
        if ('IntersectionObserver' in window) return;

        (window as any).IntersectionObserver = class IntersectionObserverPolyfill {
          private callback: (entries: any[]) => void;
          private elements: Set<Element> = new Set();

          constructor(callback: (entries: any[]) => void, _options: any = {}) {
            this.callback = callback;
          }

          observe(element: Element): void {
            if (this.elements.has(element)) return;
            
            this.elements.add(element);
            
            // Trigger callback immediately assuming element is visible
            // This is a simplified approach that works for basic lazy loading
            setTimeout(() => {
              this.callback([{
                target: element,
                isIntersecting: true,
                intersectionRatio: 1,
                boundingClientRect: element.getBoundingClientRect(),
                rootBounds: null,
                intersectionRect: element.getBoundingClientRect(),
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
   * Resize Observer polyfill that uses window resize events as a fallback.
   * While less efficient than native ResizeObserver, this provides basic
   * functionality for responsive components.
   */
  async loadResizeObserverPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'resizeObserver',
      () => featureDetector.detectResizeObserverSupport(),
      () => {
        if ('ResizeObserver' in window) return;

        (window as any).ResizeObserver = class ResizeObserverPolyfill {
          private callback: (entries: any[]) => void;
          private elements: Map<Element, () => void> = new Map();

          constructor(callback: (entries: any[]) => void) {
            this.callback = callback;
          }

          observe(element: Element): void {
            if (this.elements.has(element)) return;

            const handleResize = () => {
              this.callback([{
                target: element,
                contentRect: element.getBoundingClientRect(),
                contentBoxSize: [{
                  inlineSize: element.clientWidth,
                  blockSize: element.clientHeight
                }]
              }]);
            };
            
            window.addEventListener('resize', handleResize);
            this.elements.set(element, handleResize);
            
            // Trigger initial callback
            setTimeout(handleResize, 0);
          }

          unobserve(element: Element): void {
            const handler = this.elements.get(element);
            if (handler) {
              window.removeEventListener('resize', handler);
              this.elements.delete(element);
            }
          }

          disconnect(): void {
            this.elements.forEach((handler) => {
              window.removeEventListener('resize', handler);
            });
            this.elements.clear();
          }
        };
      }
    );
  }

  /**
   * Storage polyfills for browsers that don't support localStorage or sessionStorage.
   * These provide in-memory storage that mimics the Storage API but doesn't persist.
   */
  async loadStoragePolyfills(): Promise<void> {
    // localStorage polyfill
    await this.loadPolyfillIfNeeded(
      'localStorage',
      () => featureDetector.detectLocalStorageSupport(),
      () => {
        if (typeof localStorage !== 'undefined') return;

        const storage: { [key: string]: string } = {};
        (window as any).localStorage = {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => { storage[key] = String(value); },
          removeItem: (key: string) => { delete storage[key]; },
          clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() { return Object.keys(storage).length; }
        };
      }
    );

    // sessionStorage polyfill
    await this.loadPolyfillIfNeeded(
      'sessionStorage',
      () => featureDetector.detectSessionStorageSupport(),
      () => {
        if (typeof sessionStorage !== 'undefined') return;

        const storage: { [key: string]: string } = {};
        (window as any).sessionStorage = {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, value: string) => { storage[key] = String(value); },
          removeItem: (key: string) => { delete storage[key]; },
          clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() { return Object.keys(storage).length; }
        };
      }
    );
  }

  /**
   * Array method polyfills for essential ES6+ array operations that may be
   * missing in older browsers. These are commonly used throughout modern applications.
   */
  async loadArrayPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'arrayMethods',
      () => {
        return typeof Array.prototype.find === 'function' && 
               typeof Array.prototype.includes === 'function' && 
               typeof Array.from === 'function' &&
               typeof Array.prototype.findIndex === 'function';
      },
      () => {
        // Array.prototype.find
        if (!Array.prototype.find) {
          Array.prototype.find = function<T>(
            predicate: (value: T, index: number, obj: T[]) => boolean
          ): T | undefined {
            for (let i = 0; i < this.length; i++) {
              if (predicate(this[i], i, this)) {
                return this[i];
              }
            }
            return undefined;
          };
        }

        // Array.prototype.findIndex
        if (!Array.prototype.findIndex) {
          Array.prototype.findIndex = function<T>(
            predicate: (value: T, index: number, obj: T[]) => boolean
          ): number {
            for (let i = 0; i < this.length; i++) {
              if (predicate(this[i], i, this)) {
                return i;
              }
            }
            return -1;
          };
        }

        // Array.prototype.includes
        if (!Array.prototype.includes) {
          Array.prototype.includes = function<T>(searchElement: T, fromIndex?: number): boolean {
            const start = fromIndex || 0;
            for (let i = start; i < this.length; i++) {
              // Use SameValueZero comparison (handles NaN correctly)
              if (this[i] === searchElement || (this[i] !== this[i] && searchElement !== searchElement)) {
                return true;
              }
            }
            return false;
          };
        }

        // Array.from
        if (!Array.from) {
          Array.from = function<T>(
            arrayLike: ArrayLike<T>,
            mapFn?: (v: T | undefined, k: number) => T
          ): (T | undefined)[] {
            const result: (T | undefined)[] = [];
            for (let i = 0; i < arrayLike.length; i++) {
              const value = mapFn ? mapFn(arrayLike[i], i) : arrayLike[i];
              result.push(value);
            }
            return result;
          };
        }
      }
    );
  }

  /**
   * Object method polyfills for essential object manipulation functions
   * that are commonly used in modern JavaScript applications.
   */
  async loadObjectPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'objectMethods',
      () => {
        return typeof Object.assign === 'function' && 
               typeof Object.keys === 'function' && 
               typeof Object.values === 'function' &&
               typeof Object.entries === 'function';
      },
      () => {
        // Object.assign
        if (!Object.assign) {
          Object.assign = function(target: any, ...sources: any[]): any {
            if (target == null) {
              throw new TypeError('Cannot convert undefined or null to object');
            }
            
            const to = Object(target);
            
            for (let i = 0; i < sources.length; i++) {
              const source = sources[i];
              if (source != null) {
                for (const key in source) {
                  if (Object.prototype.hasOwnProperty.call(source, key)) {
                    to[key] = source[key];
                  }
                }
              }
            }
            
            return to;
          };
        }

        // Object.values
        if (!Object.values) {
          Object.values = function(obj: any): any[] {
            const values: any[] = [];
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                values.push(obj[key]);
              }
            }
            return values;
          };
        }

        // Object.entries
        if (!Object.entries) {
          Object.entries = function(obj: any): [string, any][] {
            const entries: [string, any][] = [];
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                entries.push([key, obj[key]]);
              }
            }
            return entries;
          };
        }
      }
    );
  }

  /**
   * String method polyfills for common string operations used in modern code
   */
  async loadStringPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'stringMethods',
      () => {
        return typeof String.prototype.includes === 'function' && 
               typeof String.prototype.startsWith === 'function' && 
               typeof String.prototype.endsWith === 'function' &&
               typeof String.prototype.repeat === 'function';
      },
      () => {
        // String.prototype.includes
        if (!String.prototype.includes) {
          String.prototype.includes = function(search: string, start?: number): boolean {
            if (typeof start !== 'number') {
              start = 0;
            }
            
            if (start + search.length > this.length) {
              return false;
            }
            
            return this.indexOf(search, start) !== -1;
          };
        }

        // String.prototype.startsWith
        if (!String.prototype.startsWith) {
          String.prototype.startsWith = function(searchString: string, position?: number): boolean {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
          };
        }

        // String.prototype.endsWith
        if (!String.prototype.endsWith) {
          String.prototype.endsWith = function(searchString: string, length?: number): boolean {
            if (length === undefined || length > this.length) {
              length = this.length;
            }
            return this.substring(length - searchString.length, length) === searchString;
          };
        }

        // String.prototype.repeat
        if (!String.prototype.repeat) {
          String.prototype.repeat = function(count: number): string {
            if (count < 0) {
              throw new RangeError('repeat count must be non-negative');
            }
            if (count === Infinity) {
              throw new RangeError('repeat count must be less than infinity');
            }
            
            count = Math.floor(count);
            if (this.length === 0 || count === 0) {
              return '';
            }
            
            let result = '';
            let pattern = this.valueOf();
            
            while (count > 1) {
              if (count & 1) {
                result += pattern;
              }
              count >>>= 1;
              pattern += pattern;
            }
            
            return result + pattern;
          };
        }
      }
    );
  }

  /**
   * Number method polyfills for type checking and parsing operations
   */
  async loadNumberPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'numberMethods',
      () => {
        return typeof Number.isNaN === 'function' && 
               typeof Number.isFinite === 'function' && 
               typeof Number.isInteger === 'function';
      },
      () => {
        // Number.isNaN (different from global isNaN)
        if (!Number.isNaN) {
          Number.isNaN = function(value: any): boolean {
            return typeof value === 'number' && isNaN(value);
          };
        }

        // Number.isFinite (different from global isFinite)
        if (!Number.isFinite) {
          Number.isFinite = function(value: any): boolean {
            return typeof value === 'number' && isFinite(value);
          };
        }

        // Number.isInteger
        if (!Number.isInteger) {
          Number.isInteger = function(value: any): boolean {
            return typeof value === 'number' && 
                   isFinite(value) && 
                   Math.floor(value) === value;
          };
        }

        // Number.parseInt (just aliases global)
        if (!Number.parseInt) {
          Number.parseInt = parseInt;
        }

        // Number.parseFloat (just aliases global)
        if (!Number.parseFloat) {
          Number.parseFloat = parseFloat;
        }
      }
    );
  }

  /**
   * AbortController polyfill for request cancellation support
   */
  async loadAbortControllerPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'abortController',
      () => typeof AbortController !== 'undefined' && typeof AbortSignal !== 'undefined',
      () => {
        if (typeof AbortController !== 'undefined') return;

        // Simple AbortController polyfill
        class AbortSignalPolyfill extends EventTarget {
          public aborted: boolean = false;
          public reason: any = undefined;

          constructor() {
            super();
          }

          throwIfAborted(): void {
            if (this.aborted) {
              throw this.reason || new Error('AbortError');
            }
          }

          static timeout(delay: number): AbortSignalPolyfill {
            const signal = new AbortSignalPolyfill();
            setTimeout(() => {
              signal.aborted = true;
              signal.reason = new Error('TimeoutError');
              signal.dispatchEvent(new Event('abort'));
            }, delay);
            return signal;
          }
        }

        class AbortControllerPolyfill {
          public signal: AbortSignalPolyfill;

          constructor() {
            this.signal = new AbortSignalPolyfill();
          }

          abort(reason?: any): void {
            if (this.signal.aborted) return;
            
            this.signal.aborted = true;
            this.signal.reason = reason || new Error('AbortError');
            this.signal.dispatchEvent(new Event('abort'));
          }
        }

        (window as any).AbortController = AbortControllerPolyfill;
        (window as any).AbortSignal = AbortSignalPolyfill;
      }
    );
  }

  /**
   * URL and URLSearchParams polyfills for URL manipulation
   */
  async loadURLPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'urlSearchParams',
      () => typeof URLSearchParams !== 'undefined',
      () => {
        if (typeof URLSearchParams !== 'undefined') return;

        (window as any).URLSearchParams = class URLSearchParamsPolyfill {
          private params: Map<string, string[]> = new Map();

          constructor(init?: string | URLSearchParamsPolyfill | Record<string, string>) {
            if (typeof init === 'string') {
              this.parseString(init);
            } else if (init instanceof URLSearchParamsPolyfill) {
              this.params = new Map(init.params);
            } else if (init && typeof init === 'object') {
              Object.entries(init).forEach(([key, value]) => {
                this.append(key, value);
              });
            }
          }

          private parseString(str: string): void {
            const pairs = str.replace(/^\?/, '').split('&');
            pairs.forEach(pair => {
              if (pair) {
                const [key, value = ''] = pair.split('=');
                this.append(decodeURIComponent(key), decodeURIComponent(value));
              }
            });
          }

          append(name: string, value: string): void {
            const values = this.params.get(name) || [];
            values.push(String(value));
            this.params.set(name, values);
          }

          delete(name: string): void {
            this.params.delete(name);
          }

          get(name: string): string | null {
            const values = this.params.get(name);
            return values ? values[0] : null;
          }

          getAll(name: string): string[] {
            return this.params.get(name) || [];
          }

          has(name: string): boolean {
            return this.params.has(name);
          }

          set(name: string, value: string): void {
            this.params.set(name, [String(value)]);
          }

          toString(): string {
            const pairs: string[] = [];
            this.params.forEach((values, name) => {
              values.forEach(value => {
                pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
              });
            });
            return pairs.join('&');
          }

          *[Symbol.iterator](): Iterator<[string, string]> {
            for (const [name, values] of this.params) {
              for (const value of values) {
                yield [name, value];
              }
            }
          }
        };
      }
    );
  }

  /**
   * FormData polyfill for form handling
   */
  async loadFormDataPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'formData',
      () => typeof FormData !== 'undefined',
      () => {
        if (typeof FormData !== 'undefined') return;

        (window as any).FormData = class FormDataPolyfill {
          private data: Map<string, (string | File)[]> = new Map();

          append(name: string, value: string | File, filename?: string): void {
            const values = this.data.get(name) || [];
            if (value instanceof File && filename) {
              // Create a new File with the specified filename
              const newFile = new File([value], filename, { type: value.type });
              values.push(newFile);
            } else {
              values.push(value);
            }
            this.data.set(name, values);
          }

          delete(name: string): void {
            this.data.delete(name);
          }

          get(name: string): string | File | null {
            const values = this.data.get(name);
            return values ? values[0] : null;
          }

          getAll(name: string): (string | File)[] {
            return this.data.get(name) || [];
          }

          has(name: string): boolean {
            return this.data.has(name);
          }

          set(name: string, value: string | File, filename?: string): void {
            if (value instanceof File && filename) {
              const newFile = new File([value], filename, { type: value.type });
              this.data.set(name, [newFile]);
            } else {
              this.data.set(name, [value]);
            }
          }

          *[Symbol.iterator](): Iterator<[string, string | File]> {
            for (const [name, values] of this.data) {
              for (const value of values) {
                yield [name, value];
              }
            }
          }
        };
      }
    );
  }

  /**
   * Load all critical polyfills in parallel for optimal performance.
   * This method orchestrates loading all necessary polyfills while handling
   * failures gracefully to prevent blocking application startup.
   */
  async loadAllPolyfills(): Promise<void> {
    const startTime = Date.now();

    // Critical polyfills that must load first (Promise is needed for others)
    await this.loadPromisePolyfill();

    // Load remaining polyfills in parallel for best performance
    const polyfillPromises = [
      this.loadFetchPolyfill(),
      this.loadAbortControllerPolyfill(),
      this.loadURLPolyfills(),
      this.loadFormDataPolyfill(),
      this.loadStoragePolyfills(),
      this.loadArrayPolyfills(),
      this.loadObjectPolyfills(),
      this.loadStringPolyfills(),
      this.loadNumberPolyfills(),
      this.loadIntersectionObserverPolyfill(),
      this.loadResizeObserverPolyfill()
    ];

    // Use Promise.allSettled if available, otherwise use our polyfilled Promise.all
    const results = await Promise.all(
      polyfillPromises.map(p => p.catch(error => ({ error })))
    );

    const failures = results.filter((r: any) => r && r.error);
    const elapsed = Date.now() - startTime;

    if (failures.length === 0) {
      logger.info(`All polyfills loaded successfully in ${elapsed}ms`, { component: 'Polyfills' });
    } else {
      logger.warn(
        `Polyfills loaded with ${failures.length} failures in ${elapsed}ms`, 
        { component: 'Polyfills' }
      );
    }
  }

  /**
   * Get the current status of all loaded polyfills for debugging and monitoring
   */
  getPolyfillStatus(): Map<string, PolyfillStatus> {
    return new Map(this.loadedPolyfills);
  }

  /**
   * Check if all critical polyfills that the application depends on are loaded
   */
  areCriticalPolyfillsLoaded(): boolean {
    const critical = ['promises', 'fetch', 'localStorage'];
    return critical.every(feature => {
      const status = this.loadedPolyfills.get(feature);
      return status && status.loaded;
    });
  }

  /**
   * Get a summary of polyfill loading for display or logging purposes
   */
  getLoadingSummary(): {
    total: number;
    loaded: number;
    failed: number;
    features: string[];
  } {
    const statuses = Array.from(this.loadedPolyfills.values());
    return {
      total: statuses.length,
      loaded: statuses.filter(s => s.loaded).length,
      failed: statuses.filter(s => s.error).length,
      features: statuses.filter(s => s.loaded).map(s => s.feature)
    };
  }

  /**
   * Reset the manager state (primarily for testing)
   */
  reset(): void {
    this.loadedPolyfills.clear();
    this.loadingPromises.clear();
  }
}

// Export singleton instance for application-wide access
export const polyfillManager = PolyfillManager.getInstance();

// Convenience function to load all polyfills with a simple call
export async function loadPolyfills(): Promise<void> {
  return polyfillManager.loadAllPolyfills();
}

// Export individual polyfill loaders for selective loading when needed
export async function loadFetchPolyfill(): Promise<void> {
  return polyfillManager.loadFetchPolyfill();
}

export async function loadPromisePolyfill(): Promise<void> {
  return polyfillManager.loadPromisePolyfill();
}

export async function loadStoragePolyfills(): Promise<void> {
  return polyfillManager.loadStoragePolyfills();
}

export async function loadAbortControllerPolyfill(): Promise<void> {
  return polyfillManager.loadAbortControllerPolyfill();
}

export async function loadURLPolyfills(): Promise<void> {
  return polyfillManager.loadURLPolyfills();
}

export async function loadFormDataPolyfill(): Promise<void> {
  return polyfillManager.loadFormDataPolyfill();
}

// Export status checking functions for monitoring
export function getPolyfillStatus(): Map<string, PolyfillStatus> {
  return polyfillManager.getPolyfillStatus();
}

export function areCriticalPolyfillsLoaded(): boolean {
  return polyfillManager.areCriticalPolyfillsLoaded();
}

export function getPolyfillLoadingSummary() {
  return polyfillManager.getLoadingSummary();
}