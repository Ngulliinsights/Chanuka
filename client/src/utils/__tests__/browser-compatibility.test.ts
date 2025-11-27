import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  FeatureDetector,
  BrowserDetector,
  featureDetector,
  browserDetector,
  getBrowserInfo,
  isBrowserSupported,
  getBrowserWarnings,
  getBrowserRecommendations,
  hasFeature,
  hasCriticalFeatures,
} from '@client/browser-compatibility';

// Mock environment
const mockNavigator = {
  userAgent: '',
  onLine: true,
};

const mockWindow = {
  location: { href: 'http://localhost' },
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

// Mock various APIs
const mockFetch = vi.fn();
const mockRequest = vi.fn();
const mockResponse = vi.fn();
const mockHeaders = vi.fn();
const mockWorker = vi.fn();
const mockIntersectionObserver = vi.fn();
const mockResizeObserver = vi.fn();
const mockCustomElements = vi.fn();
const mockShadowRoot = vi.fn();
const mockAsyncFunction = vi.fn();
const mockCanvas = vi.fn();
const mockGetContext = vi.fn();
const mockRTCPeerConnection = vi.fn();
const mockGeolocation = vi.fn();
const mockNotification = vi.fn();
const mockRequestFullscreen = vi.fn();
const mockClipboard = vi.fn();

global.fetch = mockFetch as any;
global.Request = mockRequest as any;
global.Response = mockResponse as any;
global.Headers = mockHeaders as any;
global.Worker = mockWorker as any;
global.IntersectionObserver = mockIntersectionObserver as any;
global.ResizeObserver = mockResizeObserver as any;
global.customElements = mockCustomElements as any;
global.RTCPeerConnection = mockRTCPeerConnection as any;
global.webkitRTCPeerConnection = mockRTCPeerConnection as any;
global.mozRTCPeerConnection = mockRTCPeerConnection as any;
global.Notification = mockNotification as any;

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    noModule: true,
    attachShadow: mockShadowRoot,
  })),
  writable: true,
});

Object.defineProperty(document.documentElement, 'requestFullscreen', {
  value: mockRequestFullscreen,
  writable: true,
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    getContext: mockGetContext,
  })),
  writable: true,
});

describe('FeatureDetector', () => {
  let detector: FeatureDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (FeatureDetector as any).instance = null;
    detector = FeatureDetector.getInstance();
    detector.clearCache();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FeatureDetector.getInstance();
      const instance2 = FeatureDetector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(featureDetector).toBeInstanceOf(FeatureDetector);
    });
  });

  describe('ES6 Support Detection', () => {
    it('should detect ES6 support successfully', () => {
      const result = detector.detectES6Support();
      expect(result).toBe(true);
      expect(detector['cache'].es6).toBe(true);
    });

    it('should cache ES6 detection result', () => {
      detector.detectES6Support();
      detector.detectES6Support(); // Should use cache
      expect(detector['cache'].es6).toBe(true);
    });

    it('should handle ES6 detection failure', () => {
      const originalFunction = global.Function;
      global.Function = vi.fn(() => {
        throw new Error('Syntax error');
      }) as any;

      const result = detector.detectES6Support();
      expect(result).toBe(false);

      global.Function = originalFunction;
    });
  });

  describe('Fetch API Detection', () => {
    it('should detect fetch support', () => {
      const result = detector.detectFetchSupport();
      expect(result).toBe(true);
    });

    it('should detect missing fetch', () => {
      delete (global as any).fetch;
      const result = detector.detectFetchSupport();
      expect(result).toBe(false);
      global.fetch = mockFetch as any;
    });
  });

  describe('Promise Support Detection', () => {
    it('should detect promise support', () => {
      const result = detector.detectPromiseSupport();
      expect(result).toBe(true);
    });

    it('should detect missing promise methods', () => {
      const originalPromise = global.Promise;
      global.Promise = {} as any;
      const result = detector.detectPromiseSupport();
      expect(result).toBe(false);
      global.Promise = originalPromise;
    });
  });

  describe('Storage Detection', () => {
    beforeEach(() => {
      // Mock localStorage and sessionStorage
      const mockStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });
      mockStorage.getItem.mockReturnValue('test');
    });

    it('should detect localStorage support', () => {
      const result = detector.detectLocalStorageSupport();
      expect(result).toBe(true);
    });

    it('should detect localStorage disabled', () => {
      const mockStorage = {
        setItem: vi.fn(() => {
          throw new Error('Storage disabled');
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
      });

      const result = detector.detectLocalStorageSupport();
      expect(result).toBe(false);
    });

    it('should detect sessionStorage support', () => {
      const result = detector.detectSessionStorageSupport();
      expect(result).toBe(true);
    });
  });

  describe('Web Workers Detection', () => {
    it('should detect web workers support', () => {
      const result = detector.detectWebWorkersSupport();
      expect(result).toBe(true);
    });

    it('should detect missing web workers', () => {
      delete (global as any).Worker;
      const result = detector.detectWebWorkersSupport();
      expect(result).toBe(false);
      global.Worker = mockWorker as any;
    });
  });

  describe('Service Workers Detection', () => {
    it('should detect service workers support', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        writable: true,
      });
      const result = detector.detectServiceWorkersSupport();
      expect(result).toBe(true);
    });

    it('should detect missing service workers', () => {
      const originalServiceWorker = navigator.serviceWorker;
      delete (navigator as any).serviceWorker;
      const result = detector.detectServiceWorkersSupport();
      expect(result).toBe(false);
      (navigator as any).serviceWorker = originalServiceWorker;
    });
  });

  describe('Intersection Observer Detection', () => {
    it('should detect intersection observer support', () => {
      const result = detector.detectIntersectionObserverSupport();
      expect(result).toBe(true);
    });

    it('should detect missing intersection observer', () => {
      delete (global as any).IntersectionObserver;
      const result = detector.detectIntersectionObserverSupport();
      expect(result).toBe(false);
      global.IntersectionObserver = mockIntersectionObserver as any;
    });
  });

  describe('Resize Observer Detection', () => {
    it('should detect resize observer support', () => {
      const result = detector.detectResizeObserverSupport();
      expect(result).toBe(true);
    });
  });

  describe('Custom Elements Detection', () => {
    it('should detect custom elements support', () => {
      const result = detector.detectCustomElementsSupport();
      expect(result).toBe(true);
    });
  });

  describe('Shadow DOM Detection', () => {
    it('should detect shadow DOM support', () => {
      const result = detector.detectShadowDOMSupport();
      expect(result).toBe(true);
    });
  });

  describe('Modules Detection', () => {
    it('should detect modules support', () => {
      const result = detector.detectModulesSupport();
      expect(result).toBe(true);
    });
  });

  describe('Async/Await Detection', () => {
    it('should detect async/await support', () => {
      const result = detector.detectAsyncAwaitSupport();
      expect(result).toBe(true);
    });

    it('should detect missing async/await', () => {
      const originalFunction = global.Function;
      global.Function = vi.fn(() => {
        throw new Error('Syntax error');
      }) as any;

      const result = detector.detectAsyncAwaitSupport();
      expect(result).toBe(false);

      global.Function = originalFunction;
    });
  });

  describe('WebGL Detection', () => {
    it('should detect WebGL support', () => {
      mockGetContext.mockReturnValue({});
      const result = detector.detectWebGLSupport();
      expect(result).toBe(true);
    });

    it('should detect missing WebGL', () => {
      mockGetContext.mockReturnValue(null);
      const result = detector.detectWebGLSupport();
      expect(result).toBe(false);
    });

    it('should skip WebGL detection in test environment', () => {
      // Mock isTestEnv to return true
      const originalProcess = global.process;
      global.process = { env: { NODE_ENV: 'test' } } as any;

      const result = detector.detectWebGLSupport();
      expect(result).toBe(false);

      global.process = originalProcess;
    });
  });

  describe('WebRTC Detection', () => {
    it('should detect WebRTC support', () => {
      const result = detector.detectWebRTCSupport();
      expect(result).toBe(true);
    });

    it('should detect missing WebRTC', () => {
      delete (global as any).RTCPeerConnection;
      delete (global as any).webkitRTCPeerConnection;
      delete (global as any).mozRTCPeerConnection;

      const result = detector.detectWebRTCSupport();
      expect(result).toBe(false);
    });
  });

  describe('Geolocation Detection', () => {
    it('should detect geolocation support', () => {
      const result = detector.detectGeolocationSupport();
      expect(result).toBe(true);
    });
  });

  describe('Notifications Detection', () => {
    it('should detect notifications support', () => {
      const result = detector.detectNotificationsSupport();
      expect(result).toBe(true);
    });
  });

  describe('Fullscreen Detection', () => {
    it('should detect fullscreen support', () => {
      const result = detector.detectFullscreenSupport();
      expect(result).toBe(true);
    });
  });

  describe('Clipboard Detection', () => {
    it('should detect clipboard support', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn(),
          readText: vi.fn(),
        },
        writable: true,
      });
      const result = detector.detectClipboardSupport();
      expect(result).toBe(true);
    });

    it('should detect missing clipboard', () => {
      const originalClipboard = navigator.clipboard;
      delete (navigator as any).clipboard;
      const result = detector.detectClipboardSupport();
      expect(result).toBe(false);
      (navigator as any).clipboard = originalClipboard;
    });
  });

  describe('getAllFeatures', () => {
    it('should return all features', () => {
      const features = detector.getAllFeatures();
      expect(features).toHaveProperty('es6');
      expect(features).toHaveProperty('fetch');
      expect(features).toHaveProperty('localStorage');
      expect(typeof features.es6).toBe('boolean');
    });
  });

  describe('hasCriticalFeatures', () => {
    it('should check critical features', () => {
      const result = detector.hasCriticalFeatures();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      detector.detectES6Support();
      expect(detector['cache'].es6).toBeDefined();

      detector.clearCache();
      expect(detector['cache']).toEqual({});
    });
  });
});

describe('BrowserDetector', () => {
  let browserDetectorInstance: BrowserDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (BrowserDetector as any).instance = null;
    browserDetectorInstance = BrowserDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BrowserDetector.getInstance();
      const instance2 = BrowserDetector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(browserDetector).toBeInstanceOf(BrowserDetector);
    });
  });

  describe('User Agent Parsing', () => {
    it('should parse Chrome user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('chrome');
      expect(result.majorVersion).toBe(91);
    });

    it('should parse Firefox user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('firefox');
      expect(result.majorVersion).toBe(89);
    });

    it('should parse Safari user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('safari');
      expect(result.majorVersion).toBe(14);
    });

    it('should parse Edge user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('edge');
      expect(result.majorVersion).toBe(91);
    });

    it('should parse IE user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('ie');
      expect(result.majorVersion).toBe(11);
    });

    it('should parse iOS Safari user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('safari');
      expect(result.majorVersion).toBe(14);
    });

    it('should parse Android Chrome user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('chrome');
      expect(result.majorVersion).toBe(91);
    });

    it('should handle unknown browser', () => {
      mockNavigator.userAgent = 'Unknown Browser/1.0';
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('unknown');
      expect(result.majorVersion).toBe(0);
    });

    it('should handle non-browser environment', () => {
      delete (global as any).window;
      delete (global as any).navigator;
      const result = browserDetectorInstance['parseUserAgent']();
      expect(result.name).toBe('unknown');
      expect(result.majorVersion).toBe(0);
    });
  });

  describe('Browser Support Check', () => {
    it('should check supported browser', () => {
      const result = browserDetectorInstance['checkBrowserSupport']('chrome', 91);
      expect(result).toBe(true);
    });

    it('should check unsupported browser version', () => {
      const result = browserDetectorInstance['checkBrowserSupport']('chrome', 60);
      expect(result).toBe(false);
    });

    it('should check unknown browser', () => {
      const result = browserDetectorInstance['checkBrowserSupport']('unknown', 1);
      expect(result).toBe(false);
    });
  });

  describe('getBrowserInfo', () => {
    it('should return browser info', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const info = browserDetectorInstance.getBrowserInfo();
      expect(info.name).toBe('unknown');
      expect(info.version).toBe('0.0');
      expect(info.majorVersion).toBe(0);
      expect(info.isSupported).toBe(false);
      expect(info.features).toBeDefined();
      expect(info.warnings).toBeDefined();
      expect(info.recommendations).toBeDefined();
    });

    it('should cache browser info', () => {
      browserDetectorInstance.getBrowserInfo();
      const info2 = browserDetectorInstance.getBrowserInfo();
      expect(info2).toBe(browserDetectorInstance['cachedInfo']);
    });
  });

  describe('Convenience Functions', () => {
    it('should export getBrowserInfo', () => {
      const info = getBrowserInfo();
      expect(info).toBeDefined();
    });

    it('should export isBrowserSupported', () => {
      const result = isBrowserSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should export getBrowserWarnings', () => {
      const warnings = getBrowserWarnings();
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('should export getBrowserRecommendations', () => {
      const recommendations = getBrowserRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should export hasFeature', () => {
      const result = hasFeature('es6');
      expect(typeof result).toBe('boolean');
    });

    it('should export hasCriticalFeatures', () => {
      const result = hasCriticalFeatures();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing critical features', () => {
      // Mock missing ES6
      const originalFunction = global.Function;
      global.Function = vi.fn(() => {
        throw new Error('Syntax error');
      }) as any;

      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const info = browserDetectorInstance.getBrowserInfo();

      expect(info.warnings).toContain('Browser not recognized. Compatibility cannot be guaranteed.');

      global.Function = originalFunction;
    });

    it('should generate recommendations for old browser versions', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
      const info = browserDetectorInstance.getBrowserInfo();

      expect(info.recommendations).toContain('For the best experience, we recommend Chrome 70+, Firefox 65+, Safari 12+, or Edge 79+.');
    });

    it('should handle IE browser warnings', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko';
      const info = browserDetectorInstance.getBrowserInfo();

      expect(info.warnings).toContain('Browser not recognized. Compatibility cannot be guaranteed.');
    });
  });
});