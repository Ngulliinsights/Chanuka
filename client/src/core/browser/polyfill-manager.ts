/**
 * Polyfill Manager Module
 *
 * Manages the loading and tracking of polyfills for missing browser features.
 * Polyfills provide JavaScript implementations of features that browsers don't support natively.
 */

import { logger } from '@client/utils/logger';

import { FeatureDetector } from './feature-detector';
import type {
  FetchOptions,
  FetchResponse,
  IntersectionObserverEntry,
  IntersectionObserverOptions,
  PolyfillStatus,
  StoragePolyfill,
} from './types';

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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
      });

      logger.info(`Polyfill loaded: ${feature}`, { component: 'PolyfillManager' });
    } catch (error) {
      const polyfillError = error as Error;
      this.loadedPolyfills.set(feature, {
        loaded: false,
        error: polyfillError,
        feature,
        timestamp: Date.now(),
      });

      logger.error(
        `Failed to load polyfill: ${feature}`,
        { component: 'PolyfillManager' },
        polyfillError
      );
      throw polyfillError;
    }
  }

  /**
   * Provides a polyfill for the Fetch API using XMLHttpRequest.
   * This polyfill creates a simplified version of fetch that handles basic HTTP requests.
   */
  async loadFetchPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'fetch',
      () => featureDetector.detectFetchSupport(),
      () => {
        if (typeof fetch !== 'undefined') return;

        // Create a basic fetch implementation using XMLHttpRequest
        (window as unknown as Record<string, unknown>).fetch = function (
          url: string,
          options: FetchOptions = {}
        ): Promise<FetchResponse> {
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
                clone: function () {
                  return Object.assign({}, this);
                },
                formData: () =>
                  Promise.reject(new Error('formData() method not implemented in fetch polyfill')),
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
   */
  async loadPromisePolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'promises',
      () => featureDetector.detectPromiseSupport(),
      () => {
        if (typeof Promise !== 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).Promise = class SimplePromise<T = unknown> {
          private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
          private value: T | undefined;
          private handlers: Array<{
            onFulfilled?: (value: T) => unknown;
            onRejected?: (reason: unknown) => unknown;
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
          }> = [];

          constructor(
            executor: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => void
          ) {
            try {
              executor(
                value => this.resolve(value as T),
                reason => this.reject(reason)
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

          then<U>(
            onFulfilled?: (value: T) => U,
            onRejected?: (reason: unknown) => U
          ): SimplePromise<U> {
            return new SimplePromise<U>((resolve, reject) => {
              this.handle({
                onFulfilled,
                onRejected,
                resolve,
                reject,
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
                promise.then(value => {
                  results[index] = value;
                  completed++;
                  if (completed === promises.length) {
                    resolve(results);
                  }
                }, reject);
              });
            });
          }
        };
      }
    );
  }

  /**
   * Provides a polyfill for IntersectionObserver using element intersection calculations.
   */
  async loadIntersectionObserverPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'intersectionObserver',
      () => featureDetector.detectIntersectionObserverSupport(),
      () => {
        if ('IntersectionObserver' in window) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).IntersectionObserver = class IntersectionObserverPolyfill {
          private callback: (entries: IntersectionObserverEntry[]) => void;
          private elements: Set<Element> = new Set();

          constructor(
            callback: (entries: IntersectionObserverEntry[]) => void,
            _options: IntersectionObserverOptions = {}
          ) {
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
                toJSON: () => ({
                  left: elementLeft,
                  top: elementTop,
                  right: elementRight,
                  bottom: elementBottom,
                  width: intersectionWidth,
                  height: intersectionHeight,
                  x: elementLeft,
                  y: elementTop,
                }),
              };

              this.callback([
                {
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
                    toJSON: () => ({
                      left: 0,
                      top: 0,
                      right: viewportWidth,
                      bottom: viewportHeight,
                      width: viewportWidth,
                      height: viewportHeight,
                      x: 0,
                      y: 0,
                    }),
                  },
                  intersectionRect,
                  time: Date.now(),
                },
              ]);
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
          setItem: (key: string, value: string) => {
            storage[key] = String(value);
          },
          removeItem: (key: string) => {
            delete storage[key];
          },
          clear: () => {
            Object.keys(storage).forEach(key => delete storage[key]);
          },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() {
            return Object.keys(storage).length;
          },
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
          setItem: (key: string, value: string) => {
            storage[key] = String(value);
          },
          removeItem: (key: string) => {
            delete storage[key];
          },
          clear: () => {
            Object.keys(storage).forEach(key => delete storage[key]);
          },
          key: (index: number) => Object.keys(storage)[index] || null,
          get length() {
            return Object.keys(storage).length;
          },
        };
        (window as unknown as Record<string, unknown>).sessionStorage = sessionStoragePolyfill;
      }
    );
  }

  /**
   * Provides a ResizeObserver polyfill using window resize events.
   */
  async loadResizeObserverPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'resizeObserver',
      () => featureDetector.detectResizeObserverSupport(),
      () => {
        if ('ResizeObserver' in window) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).ResizeObserver = class ResizeObserverPolyfill {
          private callback: ResizeObserverCallback;
          private elements: Set<Element> = new Set();
          private lastSizes: Map<Element, DOMRect> = new Map();
          private resizeHandler: () => void;
          private animationFrameId: number | null = null;

          constructor(callback: ResizeObserverCallback) {
            this.callback = callback;
            this.resizeHandler = this.checkSizes.bind(this);
          }

          private checkSizes(): void {
            const entries: ResizeObserverEntry[] = [];
            let hasChanges = false;

            this.elements.forEach(element => {
              const rect = element.getBoundingClientRect();
              const lastSize = this.lastSizes.get(element);

              // Check if size actually changed
              if (!lastSize || lastSize.width !== rect.width || lastSize.height !== rect.height) {
                hasChanges = true;
                this.lastSizes.set(element, rect);

                entries.push({
                  target: element,
                  contentRect: rect,
                  borderBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
                  contentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
                  devicePixelContentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
                } as ResizeObserverEntry);
              }
            });

            if (hasChanges && entries.length > 0) {
              this.callback(entries, this);
            }
          }

          observe(element: Element): void {
            if (this.elements.size === 0) {
              window.addEventListener('resize', this.resizeHandler);
            }
            this.elements.add(element);
            // Trigger initial callback with current size
            this.animationFrameId = requestAnimationFrame(() => this.checkSizes());
          }

          unobserve(element: Element): void {
            this.elements.delete(element);
            this.lastSizes.delete(element);
            if (this.elements.size === 0) {
              window.removeEventListener('resize', this.resizeHandler);
              if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
              }
            }
          }

          disconnect(): void {
            window.removeEventListener('resize', this.resizeHandler);
            this.elements.clear();
            this.lastSizes.clear();
            if (this.animationFrameId !== null) {
              cancelAnimationFrame(this.animationFrameId);
            }
          }
        };
      }
    );
  }

  /**
   * Provides a Fullscreen API polyfill that normalizes vendor prefixes.
   */
  async loadFullscreenPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'fullscreen',
      () => featureDetector.detectFullscreenSupport(),
      () => {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
          mozCancelFullScreen?: () => Promise<void>;
          msExitFullscreen?: () => Promise<void>;
        };
        const docElement = document.documentElement as HTMLElement & {
          requestFullscreen?: () => Promise<void>;
        };

        // Normalize exitFullscreen
        if (!document.exitFullscreen) {
          document.exitFullscreen = (
            doc.webkitExitFullscreen ||
            doc.mozCancelFullScreen ||
            doc.msExitFullscreen ||
            (() => Promise.reject(new Error('Fullscreen not supported')))
          ).bind(document);
        }

        // Normalize requestFullscreen on Element prototype
        if (!docElement.requestFullscreen) {
          Element.prototype.requestFullscreen = function (this: Element) {
            const element = this as HTMLElement & {
              requestFullscreen?: () => Promise<void>;
              webkitRequestFullscreen?: () => Promise<void>;
              mozRequestFullScreen?: () => Promise<void>;
              msRequestFullscreen?: () => Promise<void>;
            };
            const request =
              element.requestFullscreen ||
              element.webkitRequestFullscreen ||
              element.mozRequestFullScreen ||
              element.msRequestFullscreen;

            if (request) {
              return request.call(element);
            }
            return Promise.reject(new Error('Fullscreen not supported'));
          };
        }

        // Normalize fullscreenElement getter
        Object.defineProperty(document, 'fullscreenElement', {
          get: function () {
            const docWithVendor = document as Document & {
              webkitFullscreenElement?: Element | null;
              mozFullScreenElement?: Element | null;
              msFullscreenElement?: Element | null;
            };
            return (
              document.fullscreenElement ||
              docWithVendor.webkitFullscreenElement ||
              docWithVendor.mozFullScreenElement ||
              docWithVendor.msFullscreenElement ||
              null
            );
          },
          configurable: true,
        });

        // Normalize fullscreenchange event
        // cspell:ignore mozfullscreenchange
        const events = ['webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        const standardEventName = 'fullscreenchange';

        events.forEach(vendorEvent => {
          document.addEventListener(vendorEvent, () => {
            const standardEvent = new Event(standardEventName, { bubbles: true });
            document.dispatchEvent(standardEvent);
          });
        });
      }
    );
  }

  /**
   * Provides a Clipboard API polyfill using execCommand for older browsers.
   */
  async loadClipboardPolyfill(): Promise<void> {
    const featureDetector = FeatureDetector.getInstance();
    await this.loadPolyfillIfNeeded(
      'clipboard',
      () => featureDetector.detectClipboardSupport(),
      () => {
        if (navigator.clipboard) return;

        // Create a minimal clipboard API using execCommand
        const clipboardPolyfill = {
          writeText: (text: string): Promise<void> => {
            return new Promise((resolve, reject) => {
              const textArea = document.createElement('textarea');
              textArea.value = text;
              // Position off-screen so it doesn't affect layout
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';

              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();

              try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                  resolve();
                } else {
                  reject(new Error('Copy command failed'));
                }
              } catch (err) {
                document.body.removeChild(textArea);
                reject(err);
              }
            });
          },

          readText: (): Promise<string> => {
            return Promise.reject(new Error('Reading clipboard not supported in this browser'));
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).clipboard = clipboardPolyfill;
      }
    );
  }

  /**
   * Loads all critical polyfills in parallel for maximum efficiency.
   */
  async loadAllPolyfills(): Promise<void> {
    try {
      await Promise.all([
        this.loadFetchPolyfill(),
        this.loadPromisePolyfill(),
        this.loadIntersectionObserverPolyfill(),
        this.loadResizeObserverPolyfill(),
        this.loadStoragePolyfills(),
        this.loadFullscreenPolyfill(),
        this.loadClipboardPolyfill(),
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

export const polyfillManager = PolyfillManager.getInstance();
