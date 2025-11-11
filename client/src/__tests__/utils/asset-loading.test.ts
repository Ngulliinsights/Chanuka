import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { AssetLoadingManager } from '../../utils/asset-loading';
import { logger } from '../../utils/logger';

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Mock performance API
const mockPerformanceNow = vi.fn(() => Date.now());
const mockPerformanceObserver = vi.fn();

// Mock fetch API
const mockFetch = vi.fn();

// Mock navigator
const mockNavigator = {
  onLine: true,
  connection: {
    effectiveType: '4g',
    addEventListener: vi.fn(),
  },
};

// Setup DOM mocks
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
  
  // Mock document
  global.document = {
    createElement: mockCreateElement,
    head: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  } as any;
  
  // Mock window
  global.window = {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    performance: {
      now: mockPerformanceNow,
    },
    PerformanceObserver: mockPerformanceObserver,
    fetch: mockFetch,
    FontFace: vi.fn(),
    Image: vi.fn(),
  } as any;
  
  // Mock navigator
  global.navigator = mockNavigator as any;
  
  // Mock element creation
  mockCreateElement.mockImplementation((tagName: string) => {
    const element = {
      tagName: tagName.toUpperCase(),
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      src: '',
      href: '',
      rel: '',
      type: '',
      crossOrigin: '',
    };
    
    // Simulate successful loading after a short delay
    setTimeout(() => {
      const loadEvent = new Event('load');
      mockAddEventListener.mock.calls
        .filter(call => call[0] === 'load')
        .forEach(call => call[1](loadEvent));
    }, 10);
    
    return element;
  });
  
  // Mock fetch to return successful responses
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    clone: () => ({ ok: true }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AssetLoadingManager', () => {
  let manager: AssetLoadingManager;
  
  beforeEach(() => {
    manager = new AssetLoadingManager();
  });
  
  describe('loadAsset', () => {
    it('should load a script asset successfully', async () => {
      const result = await manager.loadAsset('/test-script.js', 'script');
      
      expect(result.success).toBe(true);
      expect(result.retries).toBe(0);
      expect(mockCreateElement).toHaveBeenCalledWith('script');
      expect(mockAppendChild).toHaveBeenCalled();
    });
    
    it('should load a stylesheet asset successfully', async () => {
      const result = await manager.loadAsset('/test-style.css', 'style');
      
      expect(result.success).toBe(true);
      expect(result.retries).toBe(0);
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });
    
    it('should load an image asset successfully', async () => {
      const mockImage = {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        src: '',
        complete: false,
      };
      
      global.window.Image = vi.fn(() => {
        // Simulate successful image loading
        setTimeout(() => {
          mockImage.complete = true;
          const loadEvent = new Event('load');
          mockAddEventListener.mock.calls
            .filter(call => call[0] === 'load')
            .forEach(call => call[1](loadEvent));
        }, 10);
        
        return mockImage;
      }) as any;
      
      const result = await manager.loadAsset('/test-image.png', 'image');
      
      expect(result.success).toBe(true);
      expect(result.retries).toBe(0);
      expect(global.window.Image).toHaveBeenCalled();
    });
    
    it('should retry failed asset loading', async () => {
      // Mock element creation to fail first time, succeed second time
      let callCount = 0;
      mockCreateElement.mockImplementation((tagName: string) => {
        callCount++;
        const element = {
          tagName: tagName.toUpperCase(),
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
          src: '',
          href: '',
          rel: '',
          type: '',
          crossOrigin: '',
        };
        
        setTimeout(() => {
          if (callCount === 1) {
            // First call fails
            const errorEvent = new Event('error');
            mockAddEventListener.mock.calls
              .filter(call => call[0] === 'error')
              .forEach(call => call[1](errorEvent));
          } else {
            // Second call succeeds
            const loadEvent = new Event('load');
            mockAddEventListener.mock.calls
              .filter(call => call[0] === 'load')
              .forEach(call => call[1](loadEvent));
          }
        }, 10);
        
        return element;
      });
      
      const result = await manager.loadAsset('/test-script.js', 'script');
      
      expect(result.success).toBe(true);
      expect(result.retries).toBe(1);
      expect(mockCreateElement).toHaveBeenCalledTimes(2);
    });
    
    it('should handle connection-aware loading', async () => {
      // Mock slow connection
      mockNavigator.connection.effectiveType = '3g';
      
      const result = await manager.loadAsset('/test-image.png', 'image', {
        priority: 'low',
        connectionAware: true,
      });
      
      // Should skip loading on slow connection for low priority assets
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('slow connection');
    });
    
    it('should handle offline state', async () => {
      // Mock offline state
      mockNavigator.onLine = false;
      
      const result = await manager.loadAsset('/test-script.js', 'script', {
        connectionAware: true,
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('offline');
    });
  });
  
  describe('loadAssets', () => {
    it('should load multiple assets with progress tracking', async () => {
      const assets = [
        { url: '/script1.js', type: 'script' as const },
        { url: '/script2.js', type: 'script' as const },
        { url: '/style1.css', type: 'style' as const },
      ];
      
      const progressUpdates: any[] = [];
      manager.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });
      
      const results = await manager.loadAssets(assets);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(3);
    });
    
    it('should handle concurrency control on slow connections', async () => {
      // Mock slow connection
      mockNavigator.connection.effectiveType = '3g';
      
      const assets = Array.from({ length: 10 }, (_, i) => ({
        url: `/script${i}.js`,
        type: 'script' as const,
      }));
      
      const startTime = Date.now();
      await manager.loadAssets(assets);
      const endTime = Date.now();
      
      // Should take longer due to reduced concurrency
      expect(endTime - startTime).toBeGreaterThan(50);
    });
  });
  
  describe('preloadCriticalAssets', () => {
    it('should preload critical assets', async () => {
      await manager.preloadCriticalAssets();
      
      // Should have attempted to load critical assets
      expect(mockCreateElement).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });
  });
  
  describe('progress tracking', () => {
    it('should track loading progress correctly', async () => {
      const progressUpdates: any[] = [];
      const unsubscribe = manager.onProgress((progress) => {
        progressUpdates.push({ ...progress });
      });
      
      const assets = [
        { url: '/script1.js', type: 'script' as const },
        { url: '/script2.js', type: 'script' as const },
      ];
      
      await manager.loadAssets(assets);
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(2);
      expect(progressUpdates[progressUpdates.length - 1].loaded).toBe(2);
      
      unsubscribe();
    });
  });
  
  describe('caching', () => {
    it('should return cached results for already loaded assets', async () => {
      // Load asset first time
      const result1 = await manager.loadAsset('/test-script.js', 'script');
      expect(result1.success).toBe(true);
      expect(result1.fromCache).toBe(false);
      
      // Load same asset second time
      const result2 = await manager.loadAsset('/test-script.js', 'script');
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);
      expect(result2.loadTime).toBe(0);
    });
  });
  
  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      // Mock element creation to never trigger load/error events
      mockCreateElement.mockImplementation((tagName: string) => ({
        tagName: tagName.toUpperCase(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        src: '',
        href: '',
        rel: '',
        type: '',
        crossOrigin: '',
      }));
      
      const result = await manager.loadAsset('/test-script.js', 'script', {
        timeout: 100, // Very short timeout
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
    
    it('should handle maximum retry limit', async () => {
      // Mock element creation to always fail
      mockCreateElement.mockImplementation((tagName: string) => {
        const element = {
          tagName: tagName.toUpperCase(),
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
          src: '',
          href: '',
          rel: '',
          type: '',
          crossOrigin: '',
        };
        
        setTimeout(() => {
          const errorEvent = new Event('error');
          mockAddEventListener.mock.calls
            .filter(call => call[0] === 'error')
            .forEach(call => call[1](errorEvent));
        }, 10);
        
        return element;
      });
      
      const result = await manager.loadAsset('/test-script.js', 'script', {
        maxRetries: 2,
      });
      
      expect(result.success).toBe(false);
      expect(result.retries).toBe(2);
      expect(mockCreateElement).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
  
  describe('statistics', () => {
    it('should provide loading statistics', async () => {
      await manager.loadAsset('/test-script.js', 'script');
      
      const stats = manager.getLoadingStats();
      expect(stats.loaded).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.isOnline).toBe(true);
      expect(stats.connectionType).toBeDefined();
    });
    
    it('should track failed assets', async () => {
      // Mock element creation to always fail
      mockCreateElement.mockImplementation((tagName: string) => {
        const element = {
          tagName: tagName.toUpperCase(),
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
          src: '',
          href: '',
          rel: '',
          type: '',
          crossOrigin: '',
        };
        
        setTimeout(() => {
          const errorEvent = new Event('error');
          mockAddEventListener.mock.calls
            .filter(call => call[0] === 'error')
            .forEach(call => call[1](errorEvent));
        }, 10);
        
        return element;
      });
      
      await manager.loadAsset('/test-script.js', 'script');
      
      const stats = manager.getLoadingStats();
      expect(stats.loaded).toBe(0);
      expect(stats.failed).toBe(1);
    });
  });
  
  describe('reset', () => {
    it('should reset manager state', async () => {
      await manager.loadAsset('/test-script.js', 'script');
      
      let stats = manager.getLoadingStats();
      expect(stats.loaded).toBe(1);
      
      manager.reset();
      
      stats = manager.getLoadingStats();
      expect(stats.loaded).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });
});












































