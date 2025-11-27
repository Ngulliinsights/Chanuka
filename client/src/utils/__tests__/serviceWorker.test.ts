import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  getServiceWorkerRegistration,
  sendMessageToServiceWorker,
  clearAllCaches,
  skipWaiting,
  getServiceWorkerVersion,
  isContentCached,
  preloadCriticalResources,
  ServiceWorkerUpdateNotifier,
  isOnline,
  addNetworkStatusListener,
} from '@client/serviceWorker';
import { logger } from '@client/utils/logger';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock navigation service
vi.mock('../services/navigation', () => ({
  navigationService: {
    reload: vi.fn(),
  },
}));

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn(),
};

const mockController = {
  postMessage: vi.fn(),
};

const mockRegistration = {
  addEventListener: vi.fn(),
  unregister: vi.fn(),
  waiting: null,
  installing: null,
  active: null,
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true,
});

Object.defineProperty(navigator.serviceWorker, 'controller', {
  value: mockController,
  configurable: true,
});

// Mock caches
const mockCaches = {
  keys: vi.fn(),
  open: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
  match: vi.fn(),
} as any;

Object.defineProperty(window, 'caches', {
  value: mockCaches,
  configurable: true,
});

// Mock MessageChannel
const mockMessageChannel = vi.fn();
const mockPort1 = { onmessage: vi.fn() };
const mockPort2 = {};

global.MessageChannel = mockMessageChannel as any;
mockMessageChannel.mockImplementation(() => ({
  port1: mockPort1,
  port2: mockPort2,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock matchMedia for PWA detection
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
});

describe('Service Worker Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceWorker.register.mockResolvedValue(mockRegistration);
    mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
    mockRegistration.unregister.mockResolvedValue(true);
  });

  describe('isServiceWorkerSupported', () => {
    it('should return true when service workers are supported', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('should return false when service workers are not supported', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });
      expect(isServiceWorkerSupported()).toBe(false);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        configurable: true,
      });
    });
  });

  describe('registerServiceWorker', () => {
    it('should skip registration in development mode', async () => {
      (global as any).import = { meta: { env: { DEV: true } } };

      const result = await registerServiceWorker();

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        'Skipping service worker registration in development mode',
        { component: 'ServiceWorker' }
      );

      delete (global as any).import;
    });

    it('should return null when service workers are not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });

      const result = await registerServiceWorker();

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        'Service workers are not supported in this browser',
        { component: 'ServiceWorker' }
      );

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        configurable: true,
      });
    });

    it('should register service worker successfully', async () => {
      (global as any).import = { meta: { env: { DEV: false } } };

      const result = await registerServiceWorker();

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(result).toBe(mockRegistration);
      expect(logger.info).toHaveBeenCalled();

      delete (global as any).import;
    });

    it('should handle registration errors', async () => {
      (global as any).import = { meta: { env: { DEV: false } } };
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

      const onError = vi.fn();
      const result = await registerServiceWorker({ onError });

      expect(result).toBeNull();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(logger.error).toHaveBeenCalled();

      delete (global as any).import;
    });

    it('should handle update events', async () => {
      (global as any).import = { meta: { env: { DEV: false } } };

      let updateCallback: any;
      mockRegistration.addEventListener.mockImplementation((event, callback) => {
        if (event === 'updatefound') {
          updateCallback = callback;
        }
      });

      const onUpdate = vi.fn();
      await registerServiceWorker({ onUpdate });

      // Simulate update found
      const mockNewWorker = { state: 'installed' };
      mockRegistration.installing = mockNewWorker as any;

      updateCallback();
      mockNewWorker.state = 'installed';
      updateCallback();

      expect(onUpdate).toHaveBeenCalledWith(mockRegistration);

      delete (global as any).import;
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', async () => {
      const result = await unregisterServiceWorker();

      expect(result).toBe(true);
      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return false when no registration exists', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(null);

      const result = await unregisterServiceWorker();

      expect(result).toBe(false);
    });

    it('should handle unregistration errors', async () => {
      mockRegistration.unregister.mockRejectedValue(new Error('Unregister failed'));

      const result = await unregisterServiceWorker();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('isStandalone', () => {
    it('should detect standalone mode via matchMedia', () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      expect(isStandalone()).toBe(true);
    });

    it('should detect standalone mode via navigator.standalone', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      (navigator as any).standalone = true;

      expect(isStandalone()).toBe(true);

      delete (navigator as any).standalone;
    });

    it('should return false when not in standalone mode', () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      expect(isStandalone()).toBe(false);
    });
  });

  describe('getServiceWorkerRegistration', () => {
    it('should return service worker registration', async () => {
      const result = await getServiceWorkerRegistration();

      expect(result).toBe(mockRegistration);
    });

    it('should return null when service workers not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });

      const result = await getServiceWorkerRegistration();

      expect(result).toBeNull();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        configurable: true,
      });
    });

    it('should handle errors', async () => {
      mockServiceWorker.getRegistration.mockRejectedValue(new Error('Get registration failed'));

      const result = await getServiceWorkerRegistration();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('sendMessageToServiceWorker', () => {
    it('should send message successfully', async () => {
      mockPort1.onmessage = vi.fn();

      const promise = sendMessageToServiceWorker({ type: 'TEST' });

      // Simulate response
      mockPort1.onmessage({ data: { result: 'success' } });

      const result = await promise;
      expect(result).toBe('success');
      expect(mockController.postMessage).toHaveBeenCalled();
    });

    it('should handle error responses', async () => {
      const promise = sendMessageToServiceWorker({ type: 'TEST' });

      mockPort1.onmessage({ data: { error: 'Test error' } });

      await expect(promise).rejects.toThrow('Test error');
    });

    it('should throw when service worker not available', async () => {
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: undefined,
        configurable: true,
      });

      await expect(sendMessageToServiceWorker({ type: 'TEST' })).rejects.toThrow(
        'Service worker not available'
      );

      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: mockController,
        configurable: true,
      });
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches successfully', async () => {
      mockCaches.keys.mockResolvedValue(['cache1', 'cache2']);
      const mockCache = { delete: vi.fn() };
      mockCaches.open.mockResolvedValue(mockCache as any);

      await clearAllCaches();

      expect(logger.info).toHaveBeenCalledWith('All caches cleared', { component: 'ServiceWorker' });
    });

    it('should handle cache clearing errors', async () => {
      mockCaches.keys.mockRejectedValue(new Error('Cache error'));

      await expect(clearAllCaches()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('skipWaiting', () => {
    it('should send skip waiting message', async () => {
      await skipWaiting();

      expect(logger.info).toHaveBeenCalledWith('Service worker skip waiting triggered', {
        component: 'ServiceWorker',
      });
    });

    it('should do nothing when no controller', async () => {
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: undefined,
        configurable: true,
      });

      await skipWaiting();

      expect(mockController.postMessage).not.toHaveBeenCalled();
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: mockController,
        configurable: true,
      });
    });
  });

  describe('getServiceWorkerVersion', () => {
    it('should return service worker version', async () => {
      const promise = getServiceWorkerVersion();

      mockPort1.onmessage({ data: { version: '1.0.0' } });

      const result = await promise;
      expect(result).toBe('1.0.0');
    });

    it('should return null on error', async () => {
      mockController.postMessage.mockImplementation(() => {
        throw new Error('Message failed');
      });

      const result = await getServiceWorkerVersion();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('isContentCached', () => {
    it('should return true when content is cached', async () => {
      mockCaches.keys.mockResolvedValue(['cache1']);
      const mockCache = { match: vi.fn().mockResolvedValue({}) };
      mockCaches.open.mockResolvedValue(mockCache as any);

      const result = await isContentCached('test-url');

      expect(result).toBe(true);
    });

    it('should return false when content is not cached', async () => {
      mockCaches.keys.mockResolvedValue(['cache1']);
      const mockCache = { match: vi.fn().mockResolvedValue(null) };
      mockCaches.open.mockResolvedValue(mockCache as any);

      const result = await isContentCached('test-url');

      expect(result).toBe(false);
    });

    it('should return false when caches not available', async () => {
      delete (window as any).caches;

      const result = await isContentCached('test-url');

      expect(result).toBe(false);
      window.caches = mockCaches;
    });
  });

  describe('preloadCriticalResources', () => {
    it('should preload resources successfully', async () => {
      mockCaches.keys.mockResolvedValue([]);
      const mockCache = { match: vi.fn().mockResolvedValue(null), put: vi.fn() };
      mockCaches.open.mockResolvedValue(mockCache as any);
      mockFetch.mockResolvedValue({ ok: true, clone: vi.fn() } as any);

      await preloadCriticalResources(['url1', 'url2']);

      expect(logger.info).toHaveBeenCalledWith('Critical resources preloaded with retry logic', {
        component: 'ServiceWorker',
      });
    });

    it('should handle fetch failures with retry', async () => {
      mockCaches.keys.mockResolvedValue([]);
      const mockCache = { match: vi.fn().mockResolvedValue(null), put: vi.fn() };
      mockCaches.open.mockResolvedValue(mockCache as any);
      mockFetch.mockRejectedValueOnce(new Error('Fetch failed')).mockResolvedValueOnce({
        ok: true,
        clone: vi.fn(),
      });

      await preloadCriticalResources(['url1']);

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should skip when caches not available', async () => {
      delete (window as any).caches;

      await preloadCriticalResources(['url1']);

      expect(mockFetch).not.toHaveBeenCalled();
      window.caches = mockCaches;
    });
  });

  describe('ServiceWorkerUpdateNotifier', () => {
    it('should initialize and handle updates', async () => {
      const onUpdateAvailable = vi.fn();
      const onUpdateInstalled = vi.fn();

      const notifier = new ServiceWorkerUpdateNotifier({
        onUpdateAvailable,
        onUpdateInstalled,
      });

      await notifier.initialize();

      expect(onUpdateAvailable).toHaveBeenCalled();
      expect(onUpdateInstalled).toHaveBeenCalled();
    });

    it('should apply updates', async () => {
      const notifier = new ServiceWorkerUpdateNotifier();
      notifier['registration'] = mockRegistration as any;
      notifier['updateAvailable'] = true;
      const mockWaitingWorker = { postMessage: vi.fn() };
      mockRegistration.waiting = mockWaitingWorker as any;

      await notifier.applyUpdate();

      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });

  describe('Network Status Utilities', () => {
    it('should return online status', () => {
      expect(isOnline()).toBe(navigator.onLine);
    });

    it('should add network status listener', () => {
      const callback = vi.fn();
      const removeListener = addNetworkStatusListener(callback);

      expect(typeof removeListener).toBe('function');

      // Cleanup
      removeListener();
    });
  });
});