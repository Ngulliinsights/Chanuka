/**
 * Polyfills Tests
 * 
 * Tests for browser polyfills and compatibility fixes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadPolyfills, loadFetchPolyfill, loadPromisePolyfill, getPolyfillStatus } from '../../utils/polyfills';
import { logger } from '@shared/core';

// Mock feature detector
vi.mock('../../utils/browser-compatibility', () => ({
  featureDetector: {
    detectFetchSupport: vi.fn(() => false),
    detectPromiseSupport: vi.fn(() => false),
    detectLocalStorageSupport: vi.fn(() => false),
    detectSessionStorageSupport: vi.fn(() => false),
    detectIntersectionObserverSupport: vi.fn(() => false),
    detectResizeObserverSupport: vi.fn(() => false),
    detectCustomElementsSupport: vi.fn(() => false)
  }
}));

describe('Polyfills', () => {
  beforeEach(() => {
    // Clear any existing polyfills
    delete (global as any).fetch;
    delete (global as any).Promise;
    delete (global as any).localStorage;
    delete (global as any).sessionStorage;
    delete (global as any).IntersectionObserver;
    delete (global as any).ResizeObserver;
    delete (global as any).customElements;
    
    // Reset XMLHttpRequest mock
    global.XMLHttpRequest = vi.fn(() => ({
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
      onload: null,
      onerror: null,
      ontimeout: null,
      status: 200,
      statusText: 'OK',
      responseText: '{"success": true}',
      response: '{"success": true}'
    })) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetch Polyfill', () => {
    it('should add fetch polyfill when not supported', async () => {
      expect(global.fetch).toBeUndefined();
      
      await loadFetchPolyfill();
      
      expect(global.fetch).toBeDefined();
      expect(typeof global.fetch).toBe('function');
    });

    it('should make HTTP requests using XMLHttpRequest', async () => {
      const mockXHR = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        onload: null,
        onerror: null,
        ontimeout: null,
        status: 200,
        statusText: 'OK',
        responseText: '{"data": "test"}',
        response: '{"data": "test"}'
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

      await loadFetchPolyfill();

      const response = await (global as any).fetch('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });

      // Simulate successful response
      if (mockXHR.onload) {
        mockXHR.onload();
      }

      expect(mockXHR.open).toHaveBeenCalledWith('POST', '/test');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockXHR.send).toHaveBeenCalledWith('{"test":true}');
    });

    it('should handle network errors', async () => {
      const mockXHR = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        onload: null,
        onerror: null,
        ontimeout: null,
        status: 0,
        statusText: '',
        responseText: '',
        response: ''
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

      await loadFetchPolyfill();

      const fetchPromise = (global as any).fetch('/test');

      // Simulate network error
      if (mockXHR.onerror) {
        mockXHR.onerror();
      }

      await expect(fetchPromise).rejects.toThrow('Network error');
    });
  });

  describe('Promise Polyfill', () => {
    it('should add Promise polyfill when not supported', async () => {
      expect(global.Promise).toBeUndefined();
      
      await loadPromisePolyfill();
      
      expect(global.Promise).toBeDefined();
      expect(typeof global.Promise).toBe('function');
    });

    it('should support basic Promise functionality', async () => {
      await loadPromisePolyfill();

      const PromiseClass = (global as any).Promise;
      
      // Test Promise constructor
      const promise = new PromiseClass((resolve: any) => {
        setTimeout(() => resolve('success'), 10);
      });

      expect(promise).toBeDefined();
      expect(typeof promise.then).toBe('function');
      expect(typeof promise.catch).toBe('function');
    });

    it('should support Promise.resolve', async () => {
      await loadPromisePolyfill();

      const PromiseClass = (global as any).Promise;
      const resolved = PromiseClass.resolve('test');
      
      expect(resolved).toBeDefined();
      expect(typeof resolved.then).toBe('function');
    });

    it('should support Promise.reject', async () => {
      await loadPromisePolyfill();

      const PromiseClass = (global as any).Promise;
      const rejected = PromiseClass.reject('error');
      
      expect(rejected).toBeDefined();
      expect(typeof rejected.catch).toBe('function');
    });

    it('should support Promise.all', async () => {
      await loadPromisePolyfill();

      const PromiseClass = (global as any).Promise;
      const promise1 = PromiseClass.resolve(1);
      const promise2 = PromiseClass.resolve(2);
      const all = PromiseClass.all([promise1, promise2]);
      
      expect(all).toBeDefined();
      expect(typeof all.then).toBe('function');
    });
  });

  describe('Storage Polyfills', () => {
    it('should add localStorage polyfill when not supported', async () => {
      expect(global.localStorage).toBeUndefined();
      
      await loadPolyfills();
      
      expect(global.localStorage).toBeDefined();
      expect(typeof global.localStorage.getItem).toBe('function');
      expect(typeof global.localStorage.setItem).toBe('function');
      expect(typeof global.localStorage.removeItem).toBe('function');
      expect(typeof global.localStorage.clear).toBe('function');
    });

    it('should support localStorage operations', async () => {
      await loadPolyfills();

      const storage = (global as any).localStorage;
      
      storage.setItem('test', 'value');
      expect(storage.getItem('test')).toBe('value');
      
      storage.removeItem('test');
      expect(storage.getItem('test')).toBeNull();
      
      storage.setItem('test1', 'value1');
      storage.setItem('test2', 'value2');
      expect(storage.length).toBe(2);
      
      storage.clear();
      expect(storage.length).toBe(0);
    });

    it('should add sessionStorage polyfill when not supported', async () => {
      expect(global.sessionStorage).toBeUndefined();
      
      await loadPolyfills();
      
      expect(global.sessionStorage).toBeDefined();
      expect(typeof global.sessionStorage.getItem).toBe('function');
      expect(typeof global.sessionStorage.setItem).toBe('function');
    });
  });

  describe('Array Polyfills', () => {
    it('should add Array.prototype.find when not supported', async () => {
      delete Array.prototype.find;
      
      await loadPolyfills();
      
      expect(Array.prototype.find).toBeDefined();
      
      const arr = [1, 2, 3, 4, 5];
      const found = arr.find(x => x > 3);
      expect(found).toBe(4);
    });

    it('should add Array.prototype.includes when not supported', async () => {
      delete Array.prototype.includes;
      
      await loadPolyfills();
      
      expect(Array.prototype.includes).toBeDefined();
      
      const arr = [1, 2, 3];
      expect(arr.includes(2)).toBe(true);
      expect(arr.includes(4)).toBe(false);
    });

    it('should add Array.from when not supported', async () => {
      delete (Array as any).from;
      
      await loadPolyfills();
      
      expect(Array.from).toBeDefined();
      
      const arrayLike = { 0: 'a', 1: 'b', length: 2 };
      const arr = Array.from(arrayLike);
      expect(arr).toEqual(['a', 'b']);
    });
  });

  describe('Object Polyfills', () => {
    it('should add Object.assign when not supported', async () => {
      delete (Object as any).assign;
      
      await loadPolyfills();
      
      expect(Object.assign).toBeDefined();
      
      const target = { a: 1 };
      const source = { b: 2 };
      const result = Object.assign(target, source);
      
      expect(result).toEqual({ a: 1, b: 2 });
      expect(result).toBe(target);
    });

    it('should add Object.values when not supported', async () => {
      delete (Object as any).values;
      
      await loadPolyfills();
      
      expect(Object.values).toBeDefined();
      
      const obj = { a: 1, b: 2, c: 3 };
      const values = Object.values(obj);
      expect(values).toEqual([1, 2, 3]);
    });
  });

  describe('Observer Polyfills', () => {
    it('should add IntersectionObserver polyfill when not supported', async () => {
      expect(global.IntersectionObserver).toBeUndefined();
      
      await loadPolyfills();
      
      expect(global.IntersectionObserver).toBeDefined();
      
      const callback = vi.fn();
      const observer = new (global as any).IntersectionObserver(callback);
      
      expect(observer).toBeDefined();
      expect(typeof observer.observe).toBe('function');
      expect(typeof observer.unobserve).toBe('function');
      expect(typeof observer.disconnect).toBe('function');
    });

    it('should add ResizeObserver polyfill when not supported', async () => {
      expect(global.ResizeObserver).toBeUndefined();
      
      await loadPolyfills();
      
      expect(global.ResizeObserver).toBeDefined();
      
      const callback = vi.fn();
      const observer = new (global as any).ResizeObserver(callback);
      
      expect(observer).toBeDefined();
      expect(typeof observer.observe).toBe('function');
      expect(typeof observer.unobserve).toBe('function');
      expect(typeof observer.disconnect).toBe('function');
    });
  });

  describe('Custom Elements Polyfill', () => {
    it('should add customElements polyfill when not supported', async () => {
      expect(global.customElements).toBeUndefined();
      
      await loadPolyfills();
      
      expect(global.customElements).toBeDefined();
      expect(typeof global.customElements.define).toBe('function');
      expect(typeof global.customElements.get).toBe('function');
      expect(typeof global.customElements.upgrade).toBe('function');
      expect(typeof global.customElements.whenDefined).toBe('function');
    });
  });

  describe('Polyfill Status', () => {
    it('should track polyfill loading status', async () => {
      await loadPolyfills();
      
      const status = getPolyfillStatus();
      expect(status).toBeInstanceOf(Map);
      expect(status.size).toBeGreaterThan(0);
      
      // Check that some polyfills were loaded
      const polyfillNames = Array.from(status.keys());
      expect(polyfillNames).toContain('promises');
      expect(polyfillNames).toContain('fetch');
      expect(polyfillNames).toContain('localStorage');
    });

    it('should indicate successful polyfill loading', async () => {
      await loadPolyfills();
      
      const status = getPolyfillStatus();
      const promiseStatus = status.get('promises');
      
      expect(promiseStatus).toBeDefined();
      expect(promiseStatus?.loaded).toBe(true);
      expect(promiseStatus?.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle polyfill loading errors gracefully', async () => {
      // Mock a polyfill that throws an error
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      // This should not throw, even if individual polyfills fail
      await expect(loadPolyfills()).resolves.not.toThrow();
      
      console.error = originalConsoleError;
    });

    it('should continue loading other polyfills if one fails', async () => {
      await loadPolyfills();
      
      const status = getPolyfillStatus();
      
      // Even if some polyfills fail, others should still load
      expect(status.size).toBeGreaterThan(0);
      
      // Check that at least some polyfills loaded successfully
      const loadedPolyfills = Array.from(status.values()).filter(s => s.loaded);
      expect(loadedPolyfills.length).toBeGreaterThan(0);
    });
  });
});












































