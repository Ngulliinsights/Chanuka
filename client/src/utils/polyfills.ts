/**
 * Polyfills for Browser Compatibility
 * 
 * This module provides polyfills for older browsers to ensure
 * the Chanuka Legislative Platform works across different browser versions.
 */

import { featureDetector } from './browser-compatibility';
import { logger } from './browser-logger';

// Polyfill loading status
interface PolyfillStatus {
  loaded: boolean;
  error?: Error;
  feature: string;
}

class PolyfillManager {
  private static instance: PolyfillManager;
  private loadedPolyfills: Map<string, PolyfillStatus> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  static getInstance(): PolyfillManager {
    if (!PolyfillManager.instance) {
      PolyfillManager.instance = new PolyfillManager();
    }
    return PolyfillManager.instance;
  }

  /**
   * Load a polyfill if needed
   */
  private async loadPolyfillIfNeeded(
    feature: string,
    checkFunction: () => boolean,
    polyfillFunction: () => Promise<void> | void
  ): Promise<void> {
    // Check if already loaded
    const existing = this.loadedPolyfills.get(feature);
    if (existing) {
      if (existing.error) {
        throw existing.error;
      }
      return;
    }

    // Check if already loading
    const loadingPromise = this.loadingPromises.get(feature);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Check if polyfill is needed
    if (checkFunction()) {
      this.loadedPolyfills.set(feature, { loaded: true, feature });
      return;
    }

    // Load polyfill
    const promise = this.loadPolyfill(feature, polyfillFunction);
    this.loadingPromises.set(feature, promise);
    
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(feature);
    }
  }

  /**
   * Load a polyfill
   */
  private async loadPolyfill(
    feature: string,
    polyfillFunction: () => Promise<void> | void
  ): Promise<void> {
    try {
      console.log(`Loading polyfill for ${feature}...`);
      await polyfillFunction();
      
      this.loadedPolyfills.set(feature, { loaded: true, feature });
      console.log(`Polyfill for ${feature} loaded successfully`);
    } catch (error) {
      const polyfillError = error as Error;
      this.loadedPolyfills.set(feature, { 
        loaded: false, 
        error: polyfillError, 
        feature 
      });
      console.error(`Failed to load polyfill for ${feature}:`, polyfillError);
      throw polyfillError;
    }
  }

  /**
   * Fetch API polyfill
   */
  async loadFetchPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'fetch',
      () => featureDetector.detectFetchSupport(),
      async () => {
        // Simple fetch polyfill using XMLHttpRequest
        if (typeof fetch === 'undefined') {
          (window as any).fetch = function(url: string, options: any = {}) {
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              const method = options.method || 'GET';
              
              xhr.open(method, url);
              
              // Set headers
              if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                  xhr.setRequestHeader(key, options.headers[key]);
                });
              }
              
              xhr.onload = () => {
                const response = {
                  ok: xhr.status >= 200 && xhr.status < 300,
                  status: xhr.status,
                  statusText: xhr.statusText,
                  headers: new Map(),
                  text: () => Promise.resolve(xhr.responseText),
                  json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                  blob: () => Promise.resolve(new Blob([xhr.response])),
                  arrayBuffer: () => Promise.resolve(xhr.response)
                };
                resolve(response);
              };
              
              xhr.onerror = () => reject(new Error('Network error'));
              xhr.ontimeout = () => reject(new Error('Request timeout'));
              
              if (options.timeout) {
                xhr.timeout = options.timeout;
              }
              
              xhr.send(options.body || null);
            });
          };
        }
      }
    );
  }

  /**
   * Promise polyfill
   */
  async loadPromisePolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'promises',
      () => featureDetector.detectPromiseSupport(),
      () => {
        // Simple Promise polyfill
        if (typeof Promise === 'undefined') {
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
              } else {
                if (this.state === 'fulfilled' && handler.onFulfilled) {
                  try {
                    const result = handler.onFulfilled(this.value);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else if (this.state === 'rejected' && handler.onRejected) {
                  try {
                    const result = handler.onRejected(this.value);
                    handler.resolve(result);
                  } catch (error) {
                    handler.reject(error);
                  }
                } else if (this.state === 'fulfilled') {
                  handler.resolve(this.value);
                } else {
                  handler.reject(this.value);
                }
              }
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

                const results: any[] = [];
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
      }
    );
  }

  /**
   * Intersection Observer polyfill
   */
  async loadIntersectionObserverPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'intersectionObserver',
      () => featureDetector.detectIntersectionObserverSupport(),
      () => {
        // Simple Intersection Observer polyfill
        if (!('IntersectionObserver' in window)) {
          (window as any).IntersectionObserver = class IntersectionObserverPolyfill {
            private callback: (entries: any[]) => void;
            private elements: Set<Element> = new Set();
            private options: any;

            constructor(callback: (entries: any[]) => void, options: any = {}) {
              this.callback = callback;
              this.options = {
                root: options.root || null,
                rootMargin: options.rootMargin || '0px',
                threshold: options.threshold || 0
              };
            }

            observe(element: Element): void {
              this.elements.add(element);
              // Immediately trigger callback for simplicity
              setTimeout(() => {
                this.callback([{
                  target: element,
                  isIntersecting: true,
                  intersectionRatio: 1,
                  boundingClientRect: element.getBoundingClientRect(),
                  rootBounds: null,
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
      }
    );
  }

  /**
   * Resize Observer polyfill
   */
  async loadResizeObserverPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'resizeObserver',
      () => featureDetector.detectResizeObserverSupport(),
      () => {
        // Simple Resize Observer polyfill
        if (!('ResizeObserver' in window)) {
          (window as any).ResizeObserver = class ResizeObserverPolyfill {
            private callback: (entries: any[]) => void;
            private elements: Set<Element> = new Set();

            constructor(callback: (entries: any[]) => void) {
              this.callback = callback;
            }

            observe(element: Element): void {
              this.elements.add(element);
              // Use window resize as fallback
              const handleResize = () => {
                this.callback([{
                  target: element,
                  contentRect: element.getBoundingClientRect()
                }]);
              };
              
              window.addEventListener('resize', handleResize);
              (element as any)._resizeHandler = handleResize;
            }

            unobserve(element: Element): void {
              this.elements.delete(element);
              if ((element as any)._resizeHandler) {
                window.removeEventListener('resize', (element as any)._resizeHandler);
                delete (element as any)._resizeHandler;
              }
            }

            disconnect(): void {
              this.elements.forEach(element => this.unobserve(element));
            }
          };
        }
      }
    );
  }

  /**
   * Custom Elements polyfill
   */
  async loadCustomElementsPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'customElements',
      () => featureDetector.detectCustomElementsSupport(),
      () => {
        // Basic Custom Elements polyfill
        if (!('customElements' in window)) {
          (window as any).customElements = {
            define: (name: string, constructor: any) => {
              console.warn(`Custom element ${name} defined but not fully supported`);
            },
            get: (name: string) => undefined,
            upgrade: (element: Element) => {},
            whenDefined: (name: string) => Promise.resolve()
          };
        }
      }
    );
  }

  /**
   * Storage polyfills for browsers that don't support localStorage/sessionStorage
   */
  async loadStoragePolyfills(): Promise<void> {
    // localStorage polyfill
    await this.loadPolyfillIfNeeded(
      'localStorage',
      () => featureDetector.detectLocalStorageSupport(),
      () => {
        if (typeof localStorage === 'undefined') {
          const storage: { [key: string]: string } = {};
          (window as any).localStorage = {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => { storage[key] = value; },
            removeItem: (key: string) => { delete storage[key]; },
            clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
            key: (index: number) => Object.keys(storage)[index] || null,
            get length() { return Object.keys(storage).length; }
          };
        }
      }
    );

    // sessionStorage polyfill
    await this.loadPolyfillIfNeeded(
      'sessionStorage',
      () => featureDetector.detectSessionStorageSupport(),
      () => {
        if (typeof sessionStorage === 'undefined') {
          const storage: { [key: string]: string } = {};
          (window as any).sessionStorage = {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => { storage[key] = value; },
            removeItem: (key: string) => { delete storage[key]; },
            clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
            key: (index: number) => Object.keys(storage)[index] || null,
            get length() { return Object.keys(storage).length; }
          };
        }
      }
    );
  }

  /**
   * Array polyfills for older browsers
   */
  async loadArrayPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'arrayMethods',
      () => typeof Array.prototype.find === 'function' && typeof Array.prototype.includes === 'function' && typeof Array.from === 'function',
      () => {
        // Array.prototype.find
        if (!Array.prototype.find) {
          Array.prototype.find = function<T>(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
            for (let i = 0; i < this.length; i++) {
              if (predicate(this[i], i, this)) {
                return this[i];
              }
            }
            return undefined;
          };
        }

        // Array.prototype.includes
        if (!Array.prototype.includes) {
          Array.prototype.includes = function<T>(searchElement: T, fromIndex?: number): boolean {
            const start = fromIndex || 0;
            for (let i = start; i < this.length; i++) {
              if (this[i] === searchElement) {
                return true;
              }
            }
            return false;
          };
        }

        // Array.from
        if (!Array.from) {
          Array.from = function<T>(arrayLike: ArrayLike<T>, mapFn?: (v: T, k: number) => any): any[] {
            const result: any[] = [];
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
   * Object polyfills for older browsers
   */
  async loadObjectPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'objectMethods',
      () => typeof Object.assign === 'function' && typeof Object.keys === 'function' && typeof Object.values === 'function',
      () => {
        // Object.assign
        if (!Object.assign) {
          Object.assign = function(target: any, ...sources: any[]) {
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

        // Object.keys (should be available in most browsers, but just in case)
        if (!Object.keys) {
          Object.keys = function(obj: any): string[] {
            const keys: string[] = [];
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                keys.push(key);
              }
            }
            return keys;
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
      }
    );
  }

  /**
   * String polyfills for older browsers
   */
  async loadStringPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'stringMethods',
      () => typeof String.prototype.includes === 'function' && typeof String.prototype.startsWith === 'function' && typeof String.prototype.endsWith === 'function',
      () => {
        // String.prototype.includes
        if (!String.prototype.includes) {
          String.prototype.includes = function(search: string, start?: number): boolean {
            if (typeof start !== 'number') {
              start = 0;
            }
            
            if (start + search.length > this.length) {
              return false;
            } else {
              return this.indexOf(search, start) !== -1;
            }
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

        // String.prototype.padStart
        if (!String.prototype.padStart) {
          String.prototype.padStart = function(targetLength: number, padString?: string): string {
            targetLength = targetLength >> 0;
            padString = String(padString !== undefined ? padString : ' ');
            if (this.length > targetLength) {
              return String(this);
            } else {
              targetLength = targetLength - this.length;
              if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
              }
              return padString.slice(0, targetLength) + String(this);
            }
          };
        }

        // String.prototype.padEnd
        if (!String.prototype.padEnd) {
          String.prototype.padEnd = function(targetLength: number, padString?: string): string {
            targetLength = targetLength >> 0;
            padString = String(padString !== undefined ? padString : ' ');
            if (this.length > targetLength) {
              return String(this);
            } else {
              targetLength = targetLength - this.length;
              if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
              }
              return String(this) + padString.slice(0, targetLength);
            }
          };
        }
      }
    );
  }

  /**
   * Number polyfills for older browsers
   */
  async loadNumberPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'numberMethods',
      () => typeof Number.isNaN === 'function' && typeof Number.isFinite === 'function' && typeof Number.parseInt === 'function',
      () => {
        // Number.isNaN
        if (!Number.isNaN) {
          Number.isNaN = function(value: any): boolean {
            return typeof value === 'number' && isNaN(value);
          };
        }

        // Number.isFinite
        if (!Number.isFinite) {
          Number.isFinite = function(value: any): boolean {
            return typeof value === 'number' && isFinite(value);
          };
        }

        // Number.parseInt
        if (!Number.parseInt) {
          Number.parseInt = parseInt;
        }

        // Number.parseFloat
        if (!Number.parseFloat) {
          Number.parseFloat = parseFloat;
        }

        // Number.isInteger
        if (!Number.isInteger) {
          Number.isInteger = function(value: any): boolean {
            return typeof value === 'number' && 
                   isFinite(value) && 
                   Math.floor(value) === value;
          };
        }
      }
    );
  }

  /**
   * Map and Set polyfills for older browsers
   */
  async loadMapSetPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'mapSet',
      () => typeof Map === 'function' && typeof Set === 'function',
      () => {
        // Simple Map polyfill
        if (typeof Map === 'undefined') {
          (window as any).Map = class MapPolyfill {
            private items: Array<[any, any]> = [];

            constructor(iterable?: Iterable<[any, any]>) {
              if (iterable) {
                for (const [key, value] of iterable) {
                  this.set(key, value);
                }
              }
            }

            set(key: any, value: any): this {
              const existingIndex = this.items.findIndex(([k]) => k === key);
              if (existingIndex >= 0) {
                this.items[existingIndex][1] = value;
              } else {
                this.items.push([key, value]);
              }
              return this;
            }

            get(key: any): any {
              const item = this.items.find(([k]) => k === key);
              return item ? item[1] : undefined;
            }

            has(key: any): boolean {
              return this.items.some(([k]) => k === key);
            }

            delete(key: any): boolean {
              const index = this.items.findIndex(([k]) => k === key);
              if (index >= 0) {
                this.items.splice(index, 1);
                return true;
              }
              return false;
            }

            clear(): void {
              this.items = [];
            }

            get size(): number {
              return this.items.length;
            }

            keys(): IterableIterator<any> {
              let index = 0;
              const items = this.items;
              return {
                [Symbol.iterator]() { return this; },
                next() {
                  if (index < items.length) {
                    return { value: items[index++][0], done: false };
                  }
                  return { value: undefined, done: true };
                }
              } as IterableIterator<any>;
            }

            values(): IterableIterator<any> {
              let index = 0;
              const items = this.items;
              return {
                [Symbol.iterator]() { return this; },
                next() {
                  if (index < items.length) {
                    return { value: items[index++][1], done: false };
                  }
                  return { value: undefined, done: true };
                }
              } as IterableIterator<any>;
            }

            entries(): IterableIterator<[any, any]> {
              let index = 0;
              const items = this.items;
              return {
                [Symbol.iterator]() { return this; },
                next() {
                  if (index < items.length) {
                    return { value: items[index++], done: false };
                  }
                  return { value: undefined, done: true };
                }
              } as IterableIterator<[any, any]>;
            }

            forEach(callback: (value: any, key: any, map: this) => void): void {
              this.items.forEach(([key, value]) => {
                callback(value, key, this);
              });
            }
          };
        }

        // Simple Set polyfill
        if (typeof Set === 'undefined') {
          (window as any).Set = class SetPolyfill {
            private items: any[] = [];

            constructor(iterable?: Iterable<any>) {
              if (iterable) {
                for (const value of iterable) {
                  this.add(value);
                }
              }
            }

            add(value: any): this {
              if (!this.has(value)) {
                this.items.push(value);
              }
              return this;
            }

            has(value: any): boolean {
              return this.items.indexOf(value) >= 0;
            }

            delete(value: any): boolean {
              const index = this.items.indexOf(value);
              if (index >= 0) {
                this.items.splice(index, 1);
                return true;
              }
              return false;
            }

            clear(): void {
              this.items = [];
            }

            get size(): number {
              return this.items.length;
            }

            values(): IterableIterator<any> {
              let index = 0;
              const items = this.items;
              return {
                [Symbol.iterator]() { return this; },
                next() {
                  if (index < items.length) {
                    return { value: items[index++], done: false };
                  }
                  return { value: undefined, done: true };
                }
              } as IterableIterator<any>;
            }

            keys(): IterableIterator<any> {
              return this.values();
            }

            entries(): IterableIterator<[any, any]> {
              let index = 0;
              const items = this.items;
              return {
                [Symbol.iterator]() { return this; },
                next() {
                  if (index < items.length) {
                    const value = items[index++];
                    return { value: [value, value], done: false };
                  }
                  return { value: undefined, done: true };
                }
              } as IterableIterator<[any, any]>;
            }

            forEach(callback: (value: any, value2: any, set: this) => void): void {
              this.items.forEach(value => {
                callback(value, value, this);
              });
            }
          };
        }
      }
    );
  }

  /**
   * Symbol polyfill for older browsers
   */
  async loadSymbolPolyfill(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'symbol',
      () => typeof Symbol === 'function',
      () => {
        if (typeof Symbol === 'undefined') {
          let symbolCounter = 0;
          
          (window as any).Symbol = function(description?: string): symbol {
            const symbol = `__symbol_${symbolCounter++}_${description || 'undefined'}__`;
            return symbol as any;
          };

          (window as any).Symbol.for = function(key: string): symbol {
            return `__symbol_for_${key}__` as any;
          };

          (window as any).Symbol.keyFor = function(symbol: symbol): string | undefined {
            const str = String(symbol);
            const match = str.match(/__symbol_for_(.+)__/);
            return match ? match[1] : undefined;
          };

          // Common well-known symbols
          (window as any).Symbol.iterator = '__symbol_iterator__';
          (window as any).Symbol.toStringTag = '__symbol_toStringTag__';
          (window as any).Symbol.hasInstance = '__symbol_hasInstance__';
          (window as any).Symbol.species = '__symbol_species__';
        }
      }
    );
  }

  /**
   * WeakMap and WeakSet polyfills for older browsers
   */
  async loadWeakMapSetPolyfills(): Promise<void> {
    await this.loadPolyfillIfNeeded(
      'weakMapSet',
      () => typeof WeakMap === 'function' && typeof WeakSet === 'function',
      () => {
        // Simple WeakMap polyfill (not truly weak, but functional)
        if (typeof WeakMap === 'undefined') {
          (window as any).WeakMap = class WeakMapPolyfill {
            private items: Array<[object, any]> = [];

            set(key: object, value: any): this {
              if (typeof key !== 'object' || key === null) {
                throw new TypeError('Invalid value used as weak map key');
              }
              
              const existingIndex = this.items.findIndex(([k]) => k === key);
              if (existingIndex >= 0) {
                this.items[existingIndex][1] = value;
              } else {
                this.items.push([key, value]);
              }
              return this;
            }

            get(key: object): any {
              const item = this.items.find(([k]) => k === key);
              return item ? item[1] : undefined;
            }

            has(key: object): boolean {
              return this.items.some(([k]) => k === key);
            }

            delete(key: object): boolean {
              const index = this.items.findIndex(([k]) => k === key);
              if (index >= 0) {
                this.items.splice(index, 1);
                return true;
              }
              return false;
            }
          };
        }

        // Simple WeakSet polyfill (not truly weak, but functional)
        if (typeof WeakSet === 'undefined') {
          (window as any).WeakSet = class WeakSetPolyfill {
            private items: object[] = [];

            add(value: object): this {
              if (typeof value !== 'object' || value === null) {
                throw new TypeError('Invalid value used in weak set');
              }
              
              if (!this.has(value)) {
                this.items.push(value);
              }
              return this;
            }

            has(value: object): boolean {
              return this.items.indexOf(value) >= 0;
            }

            delete(value: object): boolean {
              const index = this.items.indexOf(value);
              if (index >= 0) {
                this.items.splice(index, 1);
                return true;
              }
              return false;
            }
          };
        }
      }
    );
  }

  /**
   * Load all necessary polyfills
   */
  async loadAllPolyfills(): Promise<void> {
    const polyfillPromises = [
      this.loadPromisePolyfill(),
      this.loadFetchPolyfill(),
      this.loadStoragePolyfills(),
      this.loadArrayPolyfills(),
      this.loadObjectPolyfills(),
      this.loadStringPolyfills(),
      this.loadNumberPolyfills(),
      this.loadMapSetPolyfills(),
      this.loadSymbolPolyfill(),
      this.loadWeakMapSetPolyfills(),
      this.loadIntersectionObserverPolyfill(),
      this.loadResizeObserverPolyfill(),
      this.loadCustomElementsPolyfill()
    ];

    try {
      await Promise.all(polyfillPromises);
      logger.info('All polyfills loaded successfully', { component: 'Polyfills' });
    } catch (error) {
      logger.error('Some polyfills failed to load:', { component: 'Polyfills' }, error);
      // Don't throw - allow app to continue with partial polyfill support
    }
  }

  /**
   * Get polyfill status
   */
  getPolyfillStatus(): Map<string, PolyfillStatus> {
    return new Map(this.loadedPolyfills);
  }

  /**
   * Check if all critical polyfills are loaded
   */
  areCriticalPolyfillsLoaded(): boolean {
    const critical = ['promises', 'fetch', 'localStorage'];
    return critical.every(feature => {
      const status = this.loadedPolyfills.get(feature);
      return status && status.loaded;
    });
  }
}

// Export singleton instance
export const polyfillManager = PolyfillManager.getInstance();

// Convenience function to load all polyfills
export async function loadPolyfills(): Promise<void> {
  return polyfillManager.loadAllPolyfills();
}

// Export individual polyfill loaders for selective loading
export async function loadFetchPolyfill(): Promise<void> {
  return polyfillManager.loadFetchPolyfill();
}

export async function loadPromisePolyfill(): Promise<void> {
  return polyfillManager.loadPromisePolyfill();
}

export async function loadStoragePolyfills(): Promise<void> {
  return polyfillManager.loadStoragePolyfills();
}

export function getPolyfillStatus(): Map<string, PolyfillStatus> {
  return polyfillManager.getPolyfillStatus();
}












































