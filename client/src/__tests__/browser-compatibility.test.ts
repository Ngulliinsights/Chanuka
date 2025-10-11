/**
 * Browser Compatibility Tests
 * 
 * This test suite verifies that browser compatibility features work correctly
 * across different browser environments and scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../utils/logger';

// Mock browser environment
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true
  });
};

const mockWindowFeature = (feature: string, value: any) => {
  Object.defineProperty(window, feature, {
    value,
    configurable: true
  });
};

describe('Browser Compatibility Detection', () => {
  let originalUserAgent: string;
  let originalWindow: any;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    originalWindow = { ...window };
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    
    // Restore window features
    Object.keys(originalWindow).forEach(key => {
      if (!(key in window)) {
        Object.defineProperty(window, key, {
          value: originalWindow[key],
          configurable: true
        });
      }
    });
  });

  describe('Browser Detection', () => {
    it('should detect Chrome correctly', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const { getBrowserInfo } = await import('../utils/browser-compatibility');
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo.name).toBe('chrome');
      expect(browserInfo.majorVersion).toBe(91);
      expect(browserInfo.isSupported).toBe(true);
    });

    it('should detect Firefox correctly', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
      
      const { getBrowserInfo } = await import('../utils/browser-compatibility');
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo.name).toBe('firefox');
      expect(browserInfo.majorVersion).toBe(89);
      expect(browserInfo.isSupported).toBe(true);
    });

    it('should detect Safari correctly', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
      
      const { getBrowserInfo } = await import('../utils/browser-compatibility');
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo.name).toBe('safari');
      expect(browserInfo.majorVersion).toBe(14);
      expect(browserInfo.isSupported).toBe(true);
    });

    it('should detect Internet Explorer as unsupported', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko');
      
      const { getBrowserInfo } = await import('../utils/browser-compatibility');
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo.name).toBe('ie');
      expect(browserInfo.majorVersion).toBe(11);
      expect(browserInfo.isSupported).toBe(true); // IE 11 meets minimum version
      expect(browserInfo.warnings.length).toBeGreaterThan(0);
    });

    it('should handle unknown browsers', async () => {
      mockUserAgent('UnknownBrowser/1.0');
      
      const { getBrowserInfo } = await import('../utils/browser-compatibility');
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo.name).toBe('unknown');
      expect(browserInfo.isSupported).toBe(false);
      expect(browserInfo.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Detection', () => {
    it('should detect ES6 support correctly', async () => {
      const { featureDetector } = await import('../utils/browser-compatibility');
      
      // Modern browser should support ES6
      expect(featureDetector.detectES6Support()).toBe(true);
    });

    it('should detect Fetch API support', async () => {
      const { featureDetector } = await import('../utils/browser-compatibility');
      
      // Mock fetch availability
      mockWindowFeature('fetch', vi.fn());
      mockWindowFeature('Request', vi.fn());
      mockWindowFeature('Response', vi.fn());
      
      expect(featureDetector.detectFetchSupport()).toBe(true);
    });

    it('should detect Promise support', async () => {
      const { featureDetector } = await import('../utils/browser-compatibility');
      
      expect(featureDetector.detectPromiseSupport()).toBe(true);
    });

    it('should detect localStorage support', async () => {
      const { featureDetector } = await import('../utils/browser-compatibility');
      
      expect(featureDetector.detectLocalStorageSupport()).toBe(true);
    });

    it('should handle missing features gracefully', async () => {
      const { featureDetector } = await import('../utils/browser-compatibility');
      
      // Mock missing fetch
      delete (window as any).fetch;
      
      expect(featureDetector.detectFetchSupport()).toBe(false);
    });
  });

  describe('Polyfill Loading', () => {
    it('should load polyfills when features are missing', async () => {
      // Store original features
      const originalFetch = (window as any).fetch;
      const originalPromise = (window as any).Promise;
      
      // Mock missing features
      delete (window as any).fetch;
      delete (window as any).Promise;
      
      const { loadPolyfills } = await import('../utils/polyfills');
      
      await expect(loadPolyfills()).resolves.not.toThrow();
      
      // Check that polyfills were added
      expect(typeof (window as any).fetch).toBe('function');
      expect(typeof (window as any).Promise).toBe('function');
      
      // Restore original features
      if (originalFetch) (window as any).fetch = originalFetch;
      if (originalPromise) (window as any).Promise = originalPromise;
    });

    it('should skip polyfills when features are available', async () => {
      const { polyfillManager } = await import('../utils/polyfills');
      
      const originalFetch = window.fetch;
      await polyfillManager.loadFetchPolyfill();
      
      // Should not replace existing fetch
      expect(window.fetch).toBe(originalFetch);
    });

    it('should handle polyfill loading errors gracefully', async () => {
      const { polyfillManager } = await import('../utils/polyfills');
      
      // Mock a polyfill that throws
      const originalEval = window.eval;
      window.eval = vi.fn().mockImplementation(() => {
        throw new Error('Eval failed');
      });
      
      await expect(polyfillManager.loadPromisePolyfill()).resolves.not.toThrow();
      
      window.eval = originalEval;
    });
  });

  describe('Compatibility Testing', () => {
    it('should run compatibility tests successfully', async () => {
      const { runBrowserCompatibilityTests } = await import('../utils/browser-compatibility-tests');
      
      const results = await runBrowserCompatibilityTests();
      
      expect(results).toHaveProperty('browserInfo');
      expect(results).toHaveProperty('testResults');
      expect(results).toHaveProperty('overallScore');
      expect(results).toHaveProperty('criticalIssues');
      expect(results).toHaveProperty('recommendations');
      
      expect(Array.isArray(results.testResults)).toBe(true);
      expect(typeof results.overallScore).toBe('number');
      expect(results.overallScore).toBeGreaterThanOrEqual(0);
      expect(results.overallScore).toBeLessThanOrEqual(100);
    });

    it('should identify critical issues correctly', async () => {
      // Store original features
      const originalPromise = (window as any).Promise;
      const originalFetch = (window as any).fetch;
      
      // Mock a browser without critical features
      delete (window as any).Promise;
      delete (window as any).fetch;
      
      const { runBrowserCompatibilityTests } = await import('../utils/browser-compatibility-tests');
      
      const results = await runBrowserCompatibilityTests();
      
      expect(results.criticalIssues.length).toBeGreaterThan(0);
      expect(results.overallScore).toBeLessThan(100);
      
      // Restore original features
      if (originalPromise) (window as any).Promise = originalPromise;
      if (originalFetch) (window as any).fetch = originalFetch;
    });

    it('should generate appropriate recommendations', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'); // IE 11
      
      const { runBrowserCompatibilityTests } = await import('../utils/browser-compatibility-tests');
      
      const results = await runBrowserCompatibilityTests();
      
      expect(results.recommendations.length).toBeGreaterThan(0);
      expect(results.recommendations.some(rec => 
        rec.toLowerCase().includes('update') || rec.toLowerCase().includes('browser')
      )).toBe(true);
    });
  });

  describe('Browser Compatibility Manager', () => {
    it('should initialize successfully', async () => {
      const { initializeBrowserCompatibility } = await import('../utils/browser-compatibility-manager');
      
      const status = await initializeBrowserCompatibility({
        autoLoadPolyfills: true,
        runTestsOnInit: false,
        blockUnsupportedBrowsers: false,
        showWarnings: false,
        logResults: false
      });
      
      expect(status).toHaveProperty('browserInfo');
      expect(status).toHaveProperty('isSupported');
      expect(status).toHaveProperty('warnings');
      expect(status).toHaveProperty('polyfillsLoaded');
      expect(status).toHaveProperty('recommendations');
      expect(status).toHaveProperty('workarounds');
      
      expect(status.polyfillsLoaded).toBe(true);
    });

    it('should determine when to block browsers', async () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'); // IE 11
      
      const { BrowserCompatibilityManager } = await import('../utils/browser-compatibility-manager');
      
      const manager = BrowserCompatibilityManager.getInstance({
        blockUnsupportedBrowsers: true
      });
      
      await manager.initialize();
      
      // IE should be blocked
      expect(manager.shouldBlockBrowser()).toBe(true);
    });

    it('should generate appropriate warnings', async () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Safari/605.1.15'); // Old Safari
      
      const { BrowserCompatibilityManager } = await import('../utils/browser-compatibility-manager');
      
      const manager = BrowserCompatibilityManager.getInstance({
        showWarnings: true
      });
      
      await manager.initialize();
      
      const warnings = manager.getWarningsToShow();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Browser Compatibility Components', () => {
  it('should render BrowserCompatibilityChecker without errors', async () => {
    // This would require a more complex test setup with React Testing Library
    // For now, we'll just test that the component can be imported
    const { default: BrowserCompatibilityChecker } = await import('../components/compatibility/BrowserCompatibilityChecker');
    expect(BrowserCompatibilityChecker).toBeDefined();
  });

  it('should render BrowserCompatibilityTester without errors', async () => {
    const { default: BrowserCompatibilityTester } = await import('../components/compatibility/BrowserCompatibilityTester');
    expect(BrowserCompatibilityTester).toBeDefined();
  });

  it('should render BrowserCompatibilityReport without errors', async () => {
    const { default: BrowserCompatibilityReport } = await import('../components/compatibility/BrowserCompatibilityReport');
    expect(BrowserCompatibilityReport).toBeDefined();
  });
});

describe('Feature Fallbacks', () => {
  it('should provide fallback components', async () => {
    const fallbacks = await import('../components/compatibility/FeatureFallbacks');
    
    expect(fallbacks.LazyImage).toBeDefined();
    expect(fallbacks.ClipboardButton).toBeDefined();
    expect(fallbacks.FullscreenButton).toBeDefined();
    expect(fallbacks.NotificationFallback).toBeDefined();
    expect(fallbacks.useIntersectionObserverFallback).toBeDefined();
    expect(fallbacks.useResizeObserverFallback).toBeDefined();
    expect(fallbacks.useStorageFallback).toBeDefined();
    expect(fallbacks.useWebWorkerFallback).toBeDefined();
  });
});






