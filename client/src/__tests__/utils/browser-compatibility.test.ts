/**
 * Browser Compatibility Tests
 * 
 * Tests for browser detection, feature detection, and compatibility checking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { 
import { logger } from '../../utils/browser-logger';
  BrowserDetector, 
  FeatureDetector, 
  getBrowserInfo, 
  isBrowserSupported,
  getBrowserWarnings,
  getBrowserRecommendations
} from '../../utils/browser-compatibility';

// Mock navigator and window objects
const mockNavigator = {
  user_agent: '',
  onLine: true,
  clipboard: {
    writeText: vi.fn()
  },
  serviceWorker: {
    register: vi.fn()
  },
  geolocation: {}
};

const mockWindow = {
  Promise: Promise,
  fetch: fetch,
  localStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn()
  },
  sessionStorage: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn()
  },
  Worker: vi.fn(),
  IntersectionObserver: vi.fn(),
  ResizeObserver: vi.fn(),
  customElements: {
    define: vi.fn()
  },
  RTCPeerConnection: vi.fn(),
  Notification: vi.fn()
};

describe('FeatureDetector', () => {
  let featureDetector: FeatureDetector;

  beforeEach(() => {
    // Reset global objects
    global.navigator = mockNavigator as any;
    global.window = mockWindow as any;
    global.localStorage = mockWindow.localStorage as any;
    global.sessionStorage = mockWindow.sessionStorage as any;
    global.Promise = Promise; // Ensure Promise is available
    global.fetch = fetch; // Ensure fetch is available
    
    featureDetector = FeatureDetector.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ES6 Support Detection', () => {
    it('should detect ES6 support when available', () => {
      const result = featureDetector.detectES6Support();
      expect(result).toBe(true);
    });

    it('should cache ES6 detection result', () => {
      const spy = vi.spyOn(global, 'eval');
      
      // First call
      featureDetector.detectES6Support();
      const firstCallCount = spy.mock.calls.length;
      
      // Second call should use cached result
      featureDetector.detectES6Support();
      expect(spy.mock.calls.length).toBe(firstCallCount);
      
      spy.mockRestore();
    });
  });

  describe('Fetch API Detection', () => {
    it('should detect fetch support when available', () => {
      global.fetch = vi.fn() as any;
      global.Request = vi.fn() as any;
      global.Response = vi.fn() as any;
      
      const result = featureDetector.detectFetchSupport();
      expect(result).toBe(true);
    });

    it('should detect lack of fetch support', () => {
      delete (global as any).fetch;
      delete (global as any).Request;
      delete (global as any).Response;
      
      const result = featureDetector.detectFetchSupport();
      expect(result).toBe(false);
    });
  });

  describe('Promise Support Detection', () => {
    it('should detect Promise support when available', () => {
      const result = featureDetector.detectPromiseSupport();
      expect(result).toBe(true);
    });

    it('should detect lack of Promise support', () => {
      const originalPromise = global.Promise;
      delete (global as any).Promise;
      
      const result = featureDetector.detectPromiseSupport();
      expect(result).toBe(false);
      
      global.Promise = originalPromise;
    });
  });

  describe('Storage Support Detection', () => {
    it('should detect localStorage support', () => {
      const result = featureDetector.detectLocalStorageSupport();
      expect(result).toBe(true);
    });

    it('should detect sessionStorage support', () => {
      const result = featureDetector.detectSessionStorageSupport();
      expect(result).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      
      const result = featureDetector.detectLocalStorageSupport();
      expect(result).toBe(false);
    });
  });

  describe('Web Workers Detection', () => {
    it('should detect Web Workers support', () => {
      global.Worker = vi.fn() as any;
      
      const result = featureDetector.detectWebWorkersSupport();
      expect(result).toBe(true);
    });

    it('should detect lack of Web Workers support', () => {
      delete (global as any).Worker;
      
      const result = featureDetector.detectWebWorkersSupport();
      expect(result).toBe(false);
    });
  });

  describe('Service Workers Detection', () => {
    it('should detect Service Workers support', () => {
      const result = featureDetector.detectServiceWorkersSupport();
      expect(result).toBe(true);
    });

    it('should detect lack of Service Workers support', () => {
      delete mockNavigator.serviceWorker;
      
      const result = featureDetector.detectServiceWorkersSupport();
      expect(result).toBe(false);
    });
  });

  describe('Observer APIs Detection', () => {
    it('should detect Intersection Observer support', () => {
      global.IntersectionObserver = vi.fn() as any;
      
      const result = featureDetector.detectIntersectionObserverSupport();
      expect(result).toBe(true);
    });

    it('should detect Resize Observer support', () => {
      global.ResizeObserver = vi.fn() as any;
      
      const result = featureDetector.detectResizeObserverSupport();
      expect(result).toBe(true);
    });
  });

  describe('Get All Features', () => {
    it('should return all feature detection results', () => {
      const features = featureDetector.getAllFeatures();
      
      expect(features).toHaveProperty('es6');
      expect(features).toHaveProperty('fetch');
      expect(features).toHaveProperty('promises');
      expect(features).toHaveProperty('localStorage');
      expect(features).toHaveProperty('sessionStorage');
      expect(features).toHaveProperty('webWorkers');
      expect(features).toHaveProperty('serviceWorkers');
      expect(features).toHaveProperty('intersectionObserver');
      expect(features).toHaveProperty('resizeObserver');
      expect(features).toHaveProperty('customElements');
      expect(features).toHaveProperty('shadowDOM');
      expect(features).toHaveProperty('modules');
      expect(features).toHaveProperty('asyncAwait');
      expect(features).toHaveProperty('webGL');
      expect(features).toHaveProperty('webRTC');
      expect(features).toHaveProperty('geolocation');
      expect(features).toHaveProperty('notifications');
      expect(features).toHaveProperty('fullscreen');
      expect(features).toHaveProperty('clipboard');
    });
  });
});

describe('BrowserDetector', () => {
  let browserDetector: BrowserDetector;

  beforeEach(() => {
    global.navigator = mockNavigator as any;
    browserDetector = BrowserDetector.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Chrome Detection', () => {
    it('should detect Chrome browser', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.name).toBe('chrome');
      expect(browserInfo.majorVersion).toBe(91);
    });

    it('should detect supported Chrome version', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.isSupported).toBe(true);
    });

    it('should detect unsupported Chrome version', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.isSupported).toBe(false);
    });
  });

  describe('Firefox Detection', () => {
    it('should detect Firefox browser', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.name).toBe('firefox');
      expect(browserInfo.majorVersion).toBe(89);
    });

    it('should detect supported Firefox version', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.isSupported).toBe(true);
    });
  });

  describe('Safari Detection', () => {
    it('should detect Safari browser', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.name).toBe('safari');
      expect(browserInfo.majorVersion).toBe(14);
    });
  });

  describe('Edge Detection', () => {
    it('should detect Edge browser', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.name).toBe('edge');
      expect(browserInfo.majorVersion).toBe(91);
    });
  });

  describe('Unknown Browser Detection', () => {
    it('should handle unknown browsers', () => {
      mockNavigator.user_agent = 'Unknown Browser/1.0';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.name).toBe('unknown');
      expect(browserInfo.isSupported).toBe(false);
    });
  });

  describe('Warnings and Recommendations', () => {
    it('should generate warnings for unsupported features', () => {
      // Mock unsupported features
      global.Promise = undefined as any;
      global.fetch = undefined as any;
      
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.warnings.length).toBeGreaterThan(0);
      expect(browserInfo.warnings.some(w => w.includes('Promises'))).toBe(true);
    });

    it('should generate recommendations for old browsers', () => {
      mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
      
      const browserInfo = browserDetector.getBrowserInfo();
      expect(browserInfo.recommendations.length).toBeGreaterThan(0);
      expect(browserInfo.recommendations.some(r => r.includes('update'))).toBe(true);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    global.navigator = mockNavigator as any;
    global.window = mockWindow as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should provide browser info through convenience function', () => {
    mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    const browserInfo = getBrowserInfo();
    expect(browserInfo.name).toBe('chrome');
    expect(browserInfo.majorVersion).toBe(91);
  });

  it('should provide browser support status through convenience function', () => {
    mockNavigator.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    const isSupported = isBrowserSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should provide browser warnings through convenience function', () => {
    const warnings = getBrowserWarnings();
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('should provide browser recommendations through convenience function', () => {
    const recommendations = getBrowserRecommendations();
    expect(Array.isArray(recommendations)).toBe(true);
  });
});

describe('Singleton Pattern', () => {
  it('should return same instance for BrowserDetector', () => {
    const instance1 = BrowserDetector.getInstance();
    const instance2 = BrowserDetector.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should return same instance for FeatureDetector', () => {
    const instance1 = FeatureDetector.getInstance();
    const instance2 = FeatureDetector.getInstance();
    expect(instance1).toBe(instance2);
  });
});












































